const MAX_EDGE = 1600;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not read that image.'));
    image.src = src;
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.readAsDataURL(file);
  });
}

export async function readImageFile(file: File): Promise<{ src: string; name: string }> {
  const original = await readAsDataUrl(file);
  const image = await loadImage(original);
  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return { src: original, name: file.name };
  context.drawImage(image, 0, 0, width, height);
  const keepPng = file.type === 'image/png' && file.size < 900_000;
  const src = keepPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.86);
  const base = file.name.replace(/\.[^.]+$/, '') || 'image';
  return { src, name: `${base}${keepPng ? '.png' : '.jpg'}` };
}
