import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { renderWithProviders } from '@/test/testUtils';
import { ProductImageManager } from './ProductImageManager';

const requestUploadUrl = vi.fn();
const addImage = vi.fn();

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock('@/api/products', () => ({
  useRequestUploadUrl: () => ({ mutateAsync: requestUploadUrl }),
  useAddProductImage: () => ({ mutateAsync: addImage }),
  useUpdateProductImage: () => ({ mutateAsync: vi.fn() }),
  useDeleteProductImage: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/api/uploadToStorage', () => ({ uploadToStorage: vi.fn() }));

function selectFile(input: HTMLElement, file: File) {
  fireEvent.change(input, { target: { files: [file] } });
}

describe('ProductImageManager', () => {
  it('rejects an unsupported file type before uploading', async () => {
    renderWithProviders(<ProductImageManager productId="prod-1" images={[]} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    const badFile = new File(['data'], 'notes.pdf', { type: 'application/pdf' });
    selectFile(fileInput, badFile);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('unsupported file type')));
    expect(requestUploadUrl).not.toHaveBeenCalled();
  });

  it('rejects a file larger than 10MB', async () => {
    renderWithProviders(<ProductImageManager productId="prod-1" images={[]} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    const bigFile = new File([new Uint8Array(11 * 1024 * 1024)], 'huge.jpg', { type: 'image/jpeg' });
    selectFile(fileInput, bigFile);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('larger than 10MB')));
    expect(requestUploadUrl).not.toHaveBeenCalled();
  });

  it('renders existing images with the primary badge', () => {
    renderWithProviders(
      <ProductImageManager
        productId="prod-1"
        images={[
          {
            id: 'img-1',
            productId: 'prod-1',
            storageKey: 'k',
            imageUrl: 'https://example.com/a.jpg',
            altText: null,
            sortOrder: 0,
            isPrimary: true,
          },
        ]}
      />,
    );
    expect(screen.getByText('Primary')).toBeInTheDocument();
  });
});
