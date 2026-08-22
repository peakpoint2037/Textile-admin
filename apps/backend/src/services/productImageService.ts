import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  AddProductImageInput,
  ProductImageDto,
  RequestUploadUrlInput,
  UpdateProductImageInput,
} from '@textile-admin/shared';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { pool, withTransaction } from '../config/db.js';
import { s3Client } from '../config/storage.js';
import { productImageRepository } from '../repositories/productImageRepository.js';
import { productRepository } from '../repositories/productRepository.js';
import { ApiError } from '../utils/apiError.js';
import { mapProductImage } from '../utils/mappers.js';

const UPLOAD_URL_TTL_SECONDS = 5 * 60;

async function assertProductExists(productId: string) {
  const product = await productRepository.findById(pool, productId);
  if (!product) throw ApiError.notFound('Product');
}

function extensionFor(contentType: string): string {
  switch (contentType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
}

export const productImageService = {
  async requestUploadUrl(
    productId: string,
    input: RequestUploadUrlInput,
  ): Promise<{ uploadUrl: string; storageKey: string }> {
    await assertProductExists(productId);

    const storageKey = `products/${productId}/${randomUUID()}.${extensionFor(input.contentType)}`;

    const uploadUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: storageKey,
        ContentType: input.contentType,
      }),
      { expiresIn: UPLOAD_URL_TTL_SECONDS },
    );

    return { uploadUrl, storageKey };
  },

  async list(productId: string): Promise<ProductImageDto[]> {
    await assertProductExists(productId);
    const rows = await productImageRepository.listByProduct(pool, productId);
    return rows.map(mapProductImage);
  },

  async add(productId: string, input: AddProductImageInput): Promise<ProductImageDto> {
    await assertProductExists(productId);

    const image = await withTransaction(async (client) => {
      const existingCount = await productImageRepository.countForProduct(client, productId);
      const shouldBePrimary = input.isPrimary || existingCount === 0;

      if (shouldBePrimary) {
        await productImageRepository.clearPrimary(client, productId);
      }

      return productImageRepository.create(client, {
        productId,
        storageKey: input.storageKey,
        // Derived from the storage key rather than trusting the client-sent
        // imageUrl, so a caller can't point a product at an arbitrary URL.
        imageUrl: `${env.R2_PUBLIC_URL}/${input.storageKey}`,
        altText: input.altText ?? null,
        sortOrder: input.sortOrder,
        isPrimary: shouldBePrimary,
      });
    });

    return mapProductImage(image);
  },

  async update(
    productId: string,
    imageId: string,
    input: UpdateProductImageInput,
  ): Promise<ProductImageDto> {
    const existing = await productImageRepository.findById(pool, imageId);
    if (!existing || existing.product_id !== productId) {
      throw ApiError.notFound('Product image', 'PRODUCT_IMAGE_NOT_FOUND');
    }

    const updated = await withTransaction(async (client) => {
      if (input.isPrimary === true) {
        await productImageRepository.clearPrimary(client, productId);
      }
      return productImageRepository.update(client, imageId, input);
    });

    return mapProductImage(updated!);
  },

  async remove(productId: string, imageId: string): Promise<void> {
    const existing = await productImageRepository.findById(pool, imageId);
    if (!existing || existing.product_id !== productId) {
      throw ApiError.notFound('Product image', 'PRODUCT_IMAGE_NOT_FOUND');
    }

    await withTransaction(async (client) => {
      await productImageRepository.remove(client, imageId);

      if (existing.is_primary) {
        const remaining = await productImageRepository.listByProduct(client, productId);
        const next = remaining[0];
        if (next) {
          await productImageRepository.update(client, next.id, { isPrimary: true });
        }
      }
    });

    try {
      await s3Client.send(
        new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: existing.storage_key }),
      );
    } catch (err) {
      // The DB row is already gone (source of truth for the product); a failed
      // object delete just leaves an orphaned file in the bucket, not a data
      // integrity problem. Log and move on rather than failing the request.
      console.error('Failed to delete image object from storage:', err);
    }
  },
};
