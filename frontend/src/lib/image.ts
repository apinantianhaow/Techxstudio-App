/** The browser couldn't decode the chosen file as an image (e.g. HEIC in Chrome). */
export class UnsupportedImageError extends Error {}

/**
 * Center-crops a photo to a square and scales it down to at most size×size as
 * JPEG. Keeps uploads small, and re-encoding drops EXIF data such as the GPS
 * location a phone camera stores in the file.
 */
export async function squarePhoto(file: File, size = 512): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new UnsupportedImageError();
  }

  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = Math.min(size, side);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new UnsupportedImageError();
  ctx.fillStyle = '#ffffff'; // transparent PNGs become white, not black
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new UnsupportedImageError())), 'image/jpeg', 0.88));
}
