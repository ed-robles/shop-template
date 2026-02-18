import { ProductCategory, ProductStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin-access";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isProductCategory } from "@/lib/product-categories";
import {
  buildProductImageKey,
  deleteImageFromS3,
  getPublicImageUrl,
  uploadImageToS3,
} from "@/lib/s3-storage";

type SessionWithEmail = {
  user?: {
    email?: string | null;
  } | null;
} | null;

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

function parseRequiredText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parsePriceToCents(rawValue: string) {
  if (!rawValue) {
    return null;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

async function isAuthorizedAdmin(request: Request) {
  const session = (await auth.api.getSession({
    headers: request.headers,
  })) as SessionWithEmail;
  const email = session?.user?.email || "";

  return Boolean(email) && isAdminEmail(email);
}

async function createUniqueSlug(baseSlug: string, productId: string) {
  let suffix = 0;
  let candidate = baseSlug;

  while (true) {
    const existingProduct = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existingProduct || existingProduct.id === productId) {
      return candidate;
    }

    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  if (!(await isAuthorizedAdmin(request))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { productId } = await params;
  const existingProduct = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!existingProduct) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const formData = await request.formData();
  const name = parseRequiredText(formData.get("name"));
  const providedSlug = parseRequiredText(formData.get("slug"));
  const description = parseRequiredText(formData.get("description"));
  const price = parseRequiredText(formData.get("price"));
  const categoryRaw = parseRequiredText(formData.get("category"));
  const statusRaw = parseRequiredText(formData.get("status"));
  const replacementImageKey = parseRequiredText(formData.get("replacementImageKey"));
  const image = formData.get("image");

  if (!name) {
    return NextResponse.json({ error: "Product name is required." }, { status: 400 });
  }

  if (!description) {
    return NextResponse.json(
      { error: "Product description is required." },
      { status: 400 },
    );
  }

  const priceInCents = parsePriceToCents(price);
  if (priceInCents === null) {
    return NextResponse.json(
      { error: "Enter a valid price greater than 0." },
      { status: 400 },
    );
  }

  if (!isProductCategory(categoryRaw)) {
    return NextResponse.json(
      { error: "Select a valid category." },
      { status: 400 },
    );
  }

  const baseSlug = slugify(providedSlug || name);
  if (!baseSlug) {
    return NextResponse.json(
      { error: "Could not build a valid slug from this product name." },
      { status: 400 },
    );
  }

  const category = categoryRaw as ProductCategory;
  const status = statusRaw === ProductStatus.DRAFT ? ProductStatus.DRAFT : ProductStatus.PUBLISHED;
  const slug = await createUniqueSlug(baseSlug, productId);

  let nextImageKey = existingProduct.imageKey;
  let nextImageUrl = existingProduct.imageUrl;
  let uploadedReplacementKey = "";
  let shouldDeleteOldImage = false;

  if (replacementImageKey && replacementImageKey.startsWith("products/")) {
    nextImageKey = replacementImageKey;
    nextImageUrl = getPublicImageUrl(nextImageKey);
    uploadedReplacementKey = replacementImageKey;
    shouldDeleteOldImage = replacementImageKey !== existingProduct.imageKey;
  } else if (replacementImageKey) {
    return NextResponse.json({ error: "Invalid image key." }, { status: 400 });
  } else if (image instanceof File && image.size > 0) {
    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Image file must be an image." },
        { status: 400 },
      );
    }

    if (image.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image must be 8MB or smaller." },
        { status: 400 },
      );
    }

    nextImageKey = buildProductImageKey(slug, image.name);
    nextImageUrl = getPublicImageUrl(nextImageKey);
    uploadedReplacementKey = nextImageKey;
    shouldDeleteOldImage = true;

    try {
      await uploadImageToS3({ file: image, key: nextImageKey });
    } catch {
      return NextResponse.json(
        { error: "Failed to upload replacement image." },
        { status: 500 },
      );
    }
  }

  try {
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        slug,
        category,
        description,
        priceInCents,
        status,
        imageKey: nextImageKey,
        imageUrl: nextImageUrl,
      },
    });

    if (shouldDeleteOldImage && existingProduct.imageKey !== nextImageKey) {
      try {
        await deleteImageFromS3(existingProduct.imageKey);
      } catch {
        // Non-blocking cleanup path.
      }
    }

    return NextResponse.json({ product: updatedProduct }, { status: 200 });
  } catch {
    if (
      uploadedReplacementKey &&
      uploadedReplacementKey !== existingProduct.imageKey
    ) {
      try {
        await deleteImageFromS3(uploadedReplacementKey);
      } catch {
        // Non-blocking cleanup path.
      }
    }

    return NextResponse.json(
      { error: "Failed to update product." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  if (!(await isAuthorizedAdmin(request))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { productId } = await params;
  const existingProduct = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      imageKey: true,
    },
  });

  if (!existingProduct) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  await prisma.product.delete({
    where: { id: productId },
  });

  try {
    await deleteImageFromS3(existingProduct.imageKey);
  } catch {
    // Non-blocking cleanup path.
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
