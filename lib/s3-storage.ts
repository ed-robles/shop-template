import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type UploadImageInput = {
  file: File;
  key: string;
};

type SignedUploadInput = {
  contentType: string;
  key: string;
};

function getS3Config() {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION;

  if (!bucket || !region) {
    throw new Error("AWS_S3_BUCKET and AWS_REGION must be configured.");
  }

  return { bucket, region };
}

function getS3Client() {
  const { region } = getS3Config();
  return new S3Client({ region });
}

function getCloudFrontBaseUrl() {
  const rawValue =
    process.env.AWS_CLOUDFRONT_URL || process.env.CLOUDFRONT_URL || "";
  const trimmed = rawValue.trim();

  if (!trimmed) {
    return "";
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  return withProtocol.replace(/\/+$/, "");
}

function encodeS3Key(key: string) {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function cleanFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildProductImageKey(slug: string, fileName: string) {
  const cleanedFileName = cleanFileName(fileName) || "image";
  const timestamp = Date.now();
  const randomSuffix = crypto.randomUUID().slice(0, 8);
  return `products/${slug}/${timestamp}-${randomSuffix}-${cleanedFileName}`;
}

export function getPublicImageUrl(key: string) {
  const { bucket, region } = getS3Config();
  const encodedKey = encodeS3Key(key);
  const cloudFrontBaseUrl = getCloudFrontBaseUrl();

  if (cloudFrontBaseUrl) {
    return `${cloudFrontBaseUrl}/${encodedKey}`;
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
}

export async function uploadImageToS3({ file, key }: UploadImageInput) {
  const { bucket } = getS3Config();
  const bodyBuffer = Buffer.from(await file.arrayBuffer());
  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bodyBuffer,
      ContentType: file.type || "application/octet-stream",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

export async function deleteImageFromS3(key: string) {
  const { bucket } = getS3Config();
  const client = getS3Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

export async function createSignedImageUpload({
  contentType,
  key,
}: SignedUploadInput) {
  const { bucket } = getS3Config();
  const client = getS3Client();
  const cacheControl = "public, max-age=31536000, immutable";
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    CacheControl: cacheControl,
  });
  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: 60,
  });

  return {
    uploadUrl,
    requiredHeaders: {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
    },
  };
}
