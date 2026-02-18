type SignUploadResponse = {
  error?: string;
  imageKey?: string;
  uploadUrl?: string;
  requiredHeaders?: Record<string, string>;
};

function getErrorMessage(payload: SignUploadResponse, fallback: string) {
  return payload.error || fallback;
}

export async function uploadProductImageDirect({
  file,
  slugHint,
}: {
  file: File;
  slugHint: string;
}) {
  const signResponse = await fetch("/api/admin/uploads/product-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      slugHint,
    }),
  });
  const signPayload = (await signResponse.json().catch(() => ({}))) as SignUploadResponse;

  if (!signResponse.ok) {
    throw new Error(getErrorMessage(signPayload, "Failed to get upload URL."));
  }

  if (!signPayload.uploadUrl || !signPayload.imageKey) {
    throw new Error("Upload URL response is missing required fields.");
  }

  let uploadResponse: Response;

  try {
    uploadResponse = await fetch(signPayload.uploadUrl, {
      method: "PUT",
      headers: signPayload.requiredHeaders || {},
      body: file,
    });
  } catch {
    throw new Error(
      "Direct upload failed. Configure S3 CORS to allow PUT from this origin.",
    );
  }

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload image to S3 (${uploadResponse.status}).`);
  }

  return {
    imageKey: signPayload.imageKey,
  };
}
