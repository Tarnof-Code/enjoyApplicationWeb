export interface PhotoCoverLayout {
  width: number;
  height: number;
  minOffsetX: number;
  maxOffsetX: number;
  minOffsetY: number;
  maxOffsetY: number;
}

export interface PhotoOffset {
  x: number;
  y: number;
}

export interface PhotoFocus {
  x: number;
  y: number;
}

export interface PhotoPanMeta {
  layout: PhotoCoverLayout;
  viewportSize: number;
  overflowX: number;
  overflowY: number;
}

export function calculerDispositionPhotoCover(
  imageWidth: number,
  imageHeight: number,
  viewportSize: number
): PhotoCoverLayout {
  const scale = Math.max(viewportSize / imageWidth, viewportSize / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;

  return {
    width,
    height,
    minOffsetX: viewportSize - width,
    maxOffsetX: 0,
    minOffsetY: viewportSize - height,
    maxOffsetY: 0,
  };
}

export function calculerMetaRecadragePhoto(
  imageWidth: number,
  imageHeight: number,
  viewportSize: number
): PhotoPanMeta | null {
  if (!imageWidth || !imageHeight || !viewportSize) {
    return null;
  }

  const layout = calculerDispositionPhotoCover(imageWidth, imageHeight, viewportSize);

  return {
    layout,
    viewportSize,
    overflowX: Math.max(0, layout.width - viewportSize),
    overflowY: Math.max(0, layout.height - viewportSize),
  };
}

export function centrerFocusPhoto(): PhotoFocus {
  return { x: 50, y: 50 };
}

export function focusVersOffset(focus: PhotoFocus, meta: PhotoPanMeta): PhotoOffset {
  return {
    x: meta.overflowX > 0 ? -(focus.x / 100) * meta.overflowX : 0,
    y: meta.overflowY > 0 ? -(focus.y / 100) * meta.overflowY : 0,
  };
}

export function contraindreFocusPhoto(focus: PhotoFocus, meta: PhotoPanMeta): PhotoFocus {
  return {
    x: meta.overflowX > 0 ? Math.min(100, Math.max(0, focus.x)) : 50,
    y: meta.overflowY > 0 ? Math.min(100, Math.max(0, focus.y)) : 50,
  };
}

export function focusPhotoEgaux(a: PhotoFocus, b: PhotoFocus): boolean {
  return Math.abs(a.x - b.x) < 0.25 && Math.abs(a.y - b.y) < 0.25;
}

export function peutDeplacerPhoto(meta: PhotoPanMeta): boolean {
  return meta.overflowX > 0.5 || meta.overflowY > 0.5;
}

function chargerImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Impossible de charger l'image"));
    image.src = src;
  });
}

export async function exporterPhotoProfilRecadree(
  imageSrc: string,
  focus: PhotoFocus,
  meta: PhotoPanMeta,
  outputSize = 512
): Promise<Blob> {
  const image = await chargerImage(imageSrc);
  const offset = focusVersOffset(focus, meta);
  const { layout, viewportSize } = meta;

  const srcX = (-offset.x / layout.width) * image.naturalWidth;
  const srcY = (-offset.y / layout.height) * image.naturalHeight;
  const srcWidth = (viewportSize / layout.width) * image.naturalWidth;
  const srcHeight = (viewportSize / layout.height) * image.naturalHeight;

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Impossible de préparer le recadrage de la photo");
  }

  context.drawImage(image, srcX, srcY, srcWidth, srcHeight, 0, 0, outputSize, outputSize);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Impossible de générer la photo recadrée"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.92
    );
  });
}
