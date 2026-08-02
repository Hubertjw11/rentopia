import path from "path";
import { randomUUID } from "crypto";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const uploadFile = async (
  file: Express.Multer.File,
  prefix: string,
): Promise<string> => {
  const safeName = path
    .basename(file.originalname)
    .replace(/[^a-zA-Z0-9._-]/g, "_");

  const result = await new Upload({
    client: s3Client,
    params: {
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: `${prefix}/${randomUUID()}-${safeName}`,
      Body: file.buffer,
      ContentType: file.mimetype,
    },
  }).done();

  if (!result.Location) {
    throw new Error("S3 upload returned no Location");
  }
  return result.Location;
};