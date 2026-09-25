/*
  Resizes an image in the browser before upload so post images are never
  larger than needed. Output is WebP at a sensible quality; GIFs are passed
  through untouched to keep animation.
*/
export async function resizeImage(file: File, maxEdge = 1600, quality = 0.85): Promise<Blob> {
  if (file.type === "image/gif") return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), "image/webp", quality);
  });
}
