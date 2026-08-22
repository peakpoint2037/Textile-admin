import * as React from 'react';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';
import { GripVertical, ImagePlus, Star, Trash2, UploadCloud } from 'lucide-react';
import type { ProductImageDto } from '@textile-admin/shared';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useAddProductImage,
  useDeleteProductImage,
  useRequestUploadUrl,
  useUpdateProductImage,
} from '@/api/products';
import { uploadToStorage } from '@/api/uploadToStorage';

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Compresses toward ~600KB and 1920px on the longest edge, re-encoding to
// WebP regardless of the source format — plenty for product photography,
// a fraction of the size of a typical camera/phone original.
const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.6,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/webp',
  initialQuality: 0.8,
} as const;

async function compressImage(file: File): Promise<File> {
  try {
    return await imageCompression(file, COMPRESSION_OPTIONS);
  } catch (err) {
    // Compression is a nice-to-have, not a requirement — fall back to the
    // original file rather than blocking the upload over it.
    console.error('Image compression failed, uploading the original file instead:', err);
    return file;
  }
}

interface UploadingFile {
  id: string;
  fileName: string;
  progress: 'compressing' | 'uploading' | 'saving' | 'error';
}

export function ProductImageManager({ productId, images }: { productId: string; images: ProductImageDto[] }) {
  const [uploading, setUploading] = React.useState<UploadingFile[]>([]);
  const [dragOver, setDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const requestUploadUrl = useRequestUploadUrl(productId);
  const addImage = useAddProductImage(productId);
  const updateImage = useUpdateProductImage(productId);
  const deleteImage = useDeleteProductImage(productId);

  async function handleFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
        toast.error(`${file.name}: unsupported file type. Use JPG, PNG, or WebP.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: file is larger than 10MB.`);
        continue;
      }

      const uploadId = crypto.randomUUID();
      setUploading((prev) => [...prev, { id: uploadId, fileName: file.name, progress: 'compressing' }]);

      try {
        const compressed = await compressImage(file);
        const contentType = (compressed.type || file.type) as (typeof ACCEPTED_TYPES)[number];

        setUploading((prev) => prev.map((u) => (u.id === uploadId ? { ...u, progress: 'uploading' } : u)));

        const { uploadUrl, storageKey } = await requestUploadUrl.mutateAsync({
          fileName: file.name,
          contentType,
          fileSize: compressed.size,
        });
        await uploadToStorage(uploadUrl, compressed);

        setUploading((prev) => prev.map((u) => (u.id === uploadId ? { ...u, progress: 'saving' } : u)));

        await addImage.mutateAsync({
          storageKey,
          imageUrl: uploadUrl.split('?')[0]!,
          isPrimary: images.length === 0,
          sortOrder: images.length,
        });

        setUploading((prev) => prev.filter((u) => u.id !== uploadId));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Could not upload ${file.name}`);
        setUploading((prev) => prev.map((u) => (u.id === uploadId ? { ...u, progress: 'error' } : u)));
      }
    }
  }

  async function handleSetPrimary(imageId: string) {
    try {
      await updateImage.mutateAsync({ imageId, input: { isPrimary: true } });
    } catch {
      toast.error('Could not set primary image');
    }
  }

  async function handleRemove(imageId: string) {
    try {
      await deleteImage.mutateAsync(imageId);
    } catch {
      toast.error('Could not remove image');
    }
  }

  async function handleReorder(imageId: string, direction: -1 | 1) {
    const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = sorted.findIndex((img) => img.id === imageId);
    const swapWith = sorted[index + direction];
    const current = sorted[index];
    if (!swapWith || !current) return;

    try {
      await Promise.all([
        updateImage.mutateAsync({ imageId: current.id, input: { sortOrder: swapWith.sortOrder } }),
        updateImage.mutateAsync({ imageId: swapWith.id, input: { sortOrder: current.sortOrder } }),
      ]);
    } catch {
      toast.error('Could not reorder images');
    }
  }

  const sortedImages = [...images].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          dragOver ? 'border-primary bg-accent' : 'border-border',
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
      >
        <UploadCloud className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Drag and drop images here, or</p>
        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <ImagePlus className="h-4 w-4" /> Browse files
        </Button>
        <p className="text-xs text-muted-foreground">JPG, PNG, or WebP — up to 10MB each</p>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {uploading.length > 0 && (
        <ul className="space-y-1">
          {uploading.map((u) => (
            <li key={u.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span className="truncate">{u.fileName}</span>
              <span className="text-xs text-muted-foreground">
                {u.progress === 'compressing' && 'Compressing…'}
                {u.progress === 'uploading' && 'Uploading…'}
                {u.progress === 'saving' && 'Saving…'}
                {u.progress === 'error' && 'Failed'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {sortedImages.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {sortedImages.map((image, index) => (
            <div key={image.id} className="group relative overflow-hidden rounded-lg border">
              <img src={image.imageUrl} alt={image.altText ?? ''} className="aspect-square w-full object-cover" />
              {image.isPrimary && (
                <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                  <Star className="h-3 w-3 fill-current" /> Primary
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/60 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-40"
                    disabled={index === 0}
                    onClick={() => handleReorder(image.id, -1)}
                    title="Move earlier"
                  >
                    <GripVertical className="h-3.5 w-3.5" />
                  </button>
                  {!image.isPrimary && (
                    <button
                      type="button"
                      className="rounded p-1 text-white hover:bg-white/20"
                      onClick={() => handleSetPrimary(image.id)}
                      title="Set as primary"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="rounded p-1 text-white hover:bg-white/20"
                  onClick={() => handleRemove(image.id)}
                  title="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
