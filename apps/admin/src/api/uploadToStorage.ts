/** PUTs a file directly to a presigned R2/S3 URL — bypasses our API entirely. */
export async function uploadToStorage(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) {
    throw new Error('Upload to storage failed. Please try again.');
  }
}
