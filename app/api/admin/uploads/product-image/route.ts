import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin-access";
import { auth } from "@/lib/auth";
import { buildProductImageKey, createSignedImageUpload } from "@/lib/s3-storage";

type SessionWithEmail = {
  user?: {
    email?: string | null;
  } | null;
} | null;

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

type UploadSignPayload = {
  fileName?: unknown;
  fileSize?: unknown;
  fileType?: unknown;
  slugHint?: unknown;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function toStringOrEmpty(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNumberOrZero(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
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

  const payload = (await request.json().catch(() => ({}))) as UploadSignPayload;
  const fileName = toStringOrEmpty(payload.fileName);
  const fileType = toStringOrEmpty(payload.fileType);
  const fileSize = toNumberOrZero(payload.fileSize);
  const slugHint = slugify(toStringOrEmpty(payload.slugHint)) || "product";

  if (!fileName) {
    return NextResponse.json({ error: "File name is required." }, { status: 400 });
  }

  if (!fileType || !fileType.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image." }, { status: 400 });
  }

  if (fileSize <= 0 || fileSize > MAX_IMAGE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Image must be 8MB or smaller." },
      { status: 400 },
    );
  }

  try {
    const imageKey = buildProductImageKey(slugHint, fileName);
    const signedUpload = await createSignedImageUpload({
      key: imageKey,
      contentType: fileType,
    });

    return NextResponse.json(
      {
        imageKey,
        uploadUrl: signedUpload.uploadUrl,
        requiredHeaders: signedUpload.requiredHeaders,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to create upload URL." },
      { status: 500 },
    );
  }
}
