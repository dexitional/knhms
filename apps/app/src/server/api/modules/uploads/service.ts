import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { createPresignedUploadUrl } from "../../lib/storage.js";
import { AppError } from "../../middleware/error-handler.js";
import type { presignSchema } from "./schema.js";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const RECEIPT_TYPES = new Set([...IMAGE_TYPES, "application/pdf"]);

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

type PresignInput = z.infer<typeof presignSchema>;

export async function presignUpload(input: PresignInput) {
  const allowed = input.folder === "receipts" ? RECEIPT_TYPES : IMAGE_TYPES;
  if (!allowed.has(input.contentType)) {
    throw new AppError(
      input.folder === "receipts"
        ? "Only JPEG, PNG, WebP images or a PDF are allowed for receipts."
        : "Only JPEG, PNG, or WebP images are allowed.",
      400,
    );
  }

  const key = `${input.folder}/${randomUUID()}.${EXT_BY_TYPE[input.contentType]}`;
  return createPresignedUploadUrl(key, input.contentType);
}
