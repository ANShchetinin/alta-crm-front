/**
 * Advanced image preprocessing and zoning for Passport OCR.
 */

export interface PreprocessingOptions {
  enhanceContrast?: boolean;
  targetWidth?: number;
  grayscale?: boolean;
}

/**
 * Preprocesses a canvas with adaptive contrast enhancement.
 */
export function preprocessImageForOcr(
  sourceCanvas: HTMLCanvasElement,
  options: PreprocessingOptions = {}
): HTMLCanvasElement {
  const { enhanceContrast = true, targetWidth = 2000, grayscale = true } = options;

  let width = sourceCanvas.width;
  let height = sourceCanvas.height;

  if (width < targetWidth) {
    const scale = targetWidth / width;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  ctx.drawImage(sourceCanvas, 0, 0, width, height);

  if (grayscale) {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let minLum = 255;
    let maxLum = 0;
    const lums = new Uint8Array(width * height);

    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const lum = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      lums[j] = lum;
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
    }

    if (enhanceContrast && maxLum > minLum + 20) {
      const range = maxLum - minLum;
      for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        const norm = (lums[j] - minLum) / range;
        // High contrast curve: boost dark text ink vs background
        const enhanced = Math.pow(norm, 1.25);
        const stretched = Math.min(255, Math.max(0, Math.round(enhanced * 255)));
        data[i] = stretched;
        data[i + 1] = stretched;
        data[i + 2] = stretched;
      }
    } else {
      for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        const val = lums[j];
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  return canvas;
}

/**
 * Top Half (Page 2: Issuer, Date of Issue, Department Code).
 */
export function cropTopPageZone(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const w = canvas.width;
  const h = canvas.height;
  const cropW = Math.round(w * 0.82); // Exclude right vertical series
  const cropH = Math.round(h * 0.48);

  const out = document.createElement('canvas');
  out.width = cropW;
  out.height = cropH;
  const ctx = out.getContext('2d');
  if (ctx) {
    ctx.drawImage(canvas, 0, 0, cropW, cropH, 0, 0, cropW, cropH);
  }
  return out;
}

/**
 * Bottom Half (Page 3: Full Name, Birth Date, Gender, Place of Birth).
 */
export function cropBottomPageZone(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const w = canvas.width;
  const h = canvas.height;
  const cropW = Math.round(w * 0.82); // Exclude right vertical series
  const cropY = Math.round(h * 0.46);
  const cropH = h - cropY;

  const out = document.createElement('canvas');
  out.width = cropW;
  out.height = cropH;
  const ctx = out.getContext('2d');
  if (ctx) {
    ctx.drawImage(canvas, 0, cropY, cropW, cropH, 0, 0, cropW, cropH);
  }
  return out;
}

/**
 * Bottom 35% zone containing MRZ.
 */
export function cropMrzZone(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const w = canvas.width;
  const h = canvas.height;
  const mrzH = Math.round(h * 0.35);
  const mrzY = h - mrzH;

  const mrzCanvas = document.createElement('canvas');
  mrzCanvas.width = w;
  mrzCanvas.height = mrzH;
  const ctx = mrzCanvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(canvas, 0, mrzY, w, mrzH, 0, 0, w, mrzH);
  }
  return mrzCanvas;
}

/**
 * Right vertical strip with series & number, rotated 90 degrees.
 */
export function cropVerticalSeriesZone(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const w = canvas.width;
  const h = canvas.height;
  const cropW = Math.round(w * 0.22);
  const cropX = w - cropW;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = cropW;
  tempCanvas.height = h;
  const tempCtx = tempCanvas.getContext('2d');
  if (tempCtx) {
    tempCtx.drawImage(canvas, cropX, 0, cropW, h, 0, 0, cropW, h);
  }

  // Rotate 90 degrees counter-clockwise
  const rotatedCanvas = document.createElement('canvas');
  rotatedCanvas.width = h;
  rotatedCanvas.height = cropW;
  const rCtx = rotatedCanvas.getContext('2d');
  if (rCtx) {
    rCtx.translate(0, cropW);
    rCtx.rotate(-Math.PI / 2);
    rCtx.drawImage(tempCanvas, 0, 0);
  }

  return rotatedCanvas;
}
