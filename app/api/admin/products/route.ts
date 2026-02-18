import { Prisma, ProductCategory, ProductStatus } from "@prisma/client";
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
const MAX_SKU_GENERATION_ATTEMPTS = 25;

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

function parseStockQuantity(rawValue: string) {
  if (!rawValue) {
    return null;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function generateSixDigitSku() {
  return (Math.floor(Math.random() * 900000) + 100000).toString();
}

function isSkuUniqueViolation(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;

  if (typeof target === "string") {
    return target.includes("sku");
  }

  return Array.isArray(target) && target.includes("sku");
}

async function assignSkuAfterCreation(
  tx: Prisma.TransactionClient,
  productId: string,
) {
  for (let attempt = 0; attempt < MAX_SKU_GENERATION_ATTEMPTS; attempt += 1) {
    try {
      return await tx.product.update({
        where: { id: productId },
        data: {
          sku: generateSixDigitSku(),
        },
      });
    } catch (error) {
      if (isSkuUniqueViolation(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unable to generate a unique SKU.");
}

async function createUniqueSlug(baseSlug: string) {
  let suffix = 0;
  let candidate = baseSlug;

  while (true) {
    const existingProduct = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existingProduct) {
      return candidate;
    }

    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
}

export async function POST(request: Request) {
  const session = (await auth.api.getSession({
    headers: request.headers,
  })) as SessionWithEmail;
  const email = session?.user?.email || "";

  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const formData = await request.formData();
  const name = parseRequiredText(formData.get("name"));
  const providedSlug = parseRequiredText(formData.get("slug"));
  const description = parseRequiredText(formData.get("description"));
  const price = parseRequiredText(formData.get("price"));
  const stockQuantityRaw = parseRequiredText(formData.get("stockQuantity"));
  const categoryRaw = parseRequiredText(formData.get("category"));
  const statusRaw = parseRequiredText(formData.get("status"));
  const imageKeyInput = parseRequiredText(formData.get("imageKey"));
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

  const stockQuantity = parseStockQuantity(stockQuantityRaw);
  if (stockQuantity === null) {
    return NextResponse.json(
      { error: "Enter a valid stock quantity of 0 or greater." },
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

  const slug = await createUniqueSlug(baseSlug);
  const category = categoryRaw as ProductCategory;
  const status = statusRaw === ProductStatus.DRAFT ? ProductStatus.DRAFT : ProductStatus.PUBLISHED;
  let imageKey = imageKeyInput;
  let uploadedImageKey = "";

  if (imageKeyInput && imageKeyInput.startsWith("products/")) {
    imageKey = imageKeyInput;
    uploadedImageKey = imageKeyInput;
  } else if (imageKeyInput) {
    return NextResponse.json(
      { error: "Invalid image key." },
      { status: 400 },
    );
  } else {
    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: "Product image is required." },
        { status: 400 },
      );
    }

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

    imageKey = buildProductImageKey(slug, image.name);
    uploadedImageKey = imageKey;
  }

  try {
    if (!imageKeyInput && image instanceof File) {
      await uploadImageToS3({ file: image, key: imageKey });
    }

    const imageUrl = getPublicImageUrl(imageKey);

    const product = await prisma.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
        data: {
          name,
          slug,
          category,
          description,
          priceInCents,
          stockQuantity,
          imageKey,
          imageUrl,
          status,
        },
      });

      return assignSkuAfterCreation(tx, createdProduct.id);
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch {
    if (uploadedImageKey) {
      try {
        await deleteImageFromS3(uploadedImageKey);
      } catch {
        // Non-blocking cleanup path.
      }
    }

    return NextResponse.json(
      {
        error:
          "Failed to save product. Check S3/CloudFront configuration and try again.",
      },
      { status: 500 },
    );
  }
}
