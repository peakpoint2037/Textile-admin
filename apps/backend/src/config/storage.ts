import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env.js';

/**
 * Cloudflare R2 exposes an S3-compatible API, so this same client (and every
 * call site using it) works unchanged against local MinIO in dev and real R2
 * in production — only R2_* env vars differ.
 */
export const s3Client = new S3Client({
  endpoint: env.R2_ENDPOINT,
  region: env.R2_REGION,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});
