import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let s3Client: S3Client | undefined;

function getS3Client() {
  const region = process.env.AWS_REGION;
  if (!region) {
    throw new Error("AWS_REGION must be set to use S3 file storage.");
  }

  s3Client ??= new S3Client({ region });
  return s3Client;
}

function getBucketName() {
  const bucketName = process.env.S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("S3_BUCKET_NAME must be set to use S3 file storage.");
  }
  return bucketName;
}

export async function getPresignedUrl(storageKey: string) {
  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: getBucketName(),
      Key: storageKey,
    }),
    { expiresIn: 3600 },
  );
}

export async function getPresignedUploadUrl(
  storageKey: string,
  contentType: string,
  size: number,
) {
  return getSignedUrl(
    getS3Client(),
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: storageKey,
      ContentType: contentType,
      ContentLength: size,
    }),
    { expiresIn: 900 },
  );
}

export async function uploadObject(
  storageKey: string,
  body: Uint8Array,
  contentType: string,
) {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: storageKey,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function deleteObject(storageKey: string) {
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: storageKey,
    }),
  );
}
