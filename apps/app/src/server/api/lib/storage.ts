import { S3Client, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.R2_BUCKET_NAME as string;
const PUBLIC_DOMAIN = (process.env.R2_PUBLIC_DOMAIN as string).replace(/\/$/, "");

const s3 = new S3Client({
  region: process.env.R2_REGION ?? "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY as string,
    secretAccessKey: process.env.R2_SECRET_KEY as string,
  },
});

export async function createPresignedUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  return { uploadUrl, publicUrl: `${PUBLIC_DOMAIN}/${key}` };
}

export async function deleteObjectByUrl(url: string) {
  if (!url.startsWith(PUBLIC_DOMAIN)) return; // not one of ours — nothing to delete
  const key = url.slice(PUBLIC_DOMAIN.length + 1);
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
