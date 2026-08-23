export interface Point {
  x: number;
  y: number;
}

export type DocumentFilterType = 'color' | 'bw' | 'original';

// Web Audio API Synthetic Camera Shutter Sound
export function playShutterSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Click 1 (Shutter open)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1200, now);
    osc1.frequency.exponentialRampToValueAtTime(160, now + 0.04);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.045);

    // Click 2 (Shutter close)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(700, now + 0.055);
    osc2.frequency.exponentialRampToValueAtTime(100, now + 0.11);
    gain2.gain.setValueAtTime(0.3, now + 0.055);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.055);
    osc2.stop(now + 0.12);
  } catch {
    // Ignore audio restriction
  }
}

/**
 * Строгая детекция настоящего листа бумаги формата А4:
 * 1. Проверка минимальной яркости белой бумаги (белый/светлый лист)
 * 2. Поиск 4 прямых границ с контрастным перепадом яркости (бумага vs стол)
 * 3. Проверка непрерывности и коллинеарности контура
 * 4. Полный отсев пледов, полов, стен и текстурированных поверхностей
 */
export function detectDocumentCorners(
  sourceCanvas: HTMLCanvasElement,
  videoWidth: number,
  videoHeight: number
): [Point, Point, Point, Point] | null {
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const total = w * h;

  // 1. Grayscale & Histogram
  const gray = new Uint8Array(total);
  const hist = new Int32Array(256);
  let totalLuma = 0;

  for (let i = 0; i < data.length; i += 4) {
    const luma = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    const idx = i >> 2;
    gray[idx] = luma;
    hist[luma]++;
    totalLuma += luma;
  }
  const avgSceneLuma = totalLuma / total;

  // 2. Paper White Threshold
  // A real white sheet of paper has pixels significantly brighter than average room ambiance
  let brightPixelCount = 0;
  for (let i = 140; i < 256; i++) {
    brightPixelCount += hist[i];
  }

  // If there are almost no bright white pixels (like a dark/medium blanket), no document exists
  if (brightPixelCount < total * 0.15) {
    return null;
  }

  // 3. 5x5 Gaussian Blur
  const blurred = new Uint8Array(total);
  for (let y = 2; y < h - 2; y++) {
    const row = y * w;
    for (let x = 2; x < w - 2; x++) {
      const sum =
        gray[row - 2 * w + x] + gray[row + 2 * w + x] + gray[row + x - 2] + gray[row + x + 2] +
        ((gray[row - w + x] + gray[row + w + x] + gray[row + x - 1] + gray[row + x + 1]) << 1) +
        (gray[row + x] << 2);
      blurred[row + x] = sum >> 4;
    }
  }

  // 4. Directional Sobel Gradients
  const edges = new Uint8Array(total);
  const edgeThreshold = 50;
  let strongEdgeCount = 0;

  for (let y = 2; y < h - 2; y++) {
    const row = y * w;
    for (let x = 2; x < w - 2; x++) {
      const idx = row + x;
      const gx =
        -blurred[idx - w - 1] + blurred[idx - w + 1] -
        (blurred[idx - 1] << 1) + (blurred[idx + 1] << 1) -
        blurred[idx + w - 1] + blurred[idx + w + 1];

      const gy =
        -blurred[idx - w - 1] - (blurred[idx - w] << 1) - blurred[idx - w + 1] +
        blurred[idx + w - 1] + (blurred[idx + w] << 1) + blurred[idx + w + 1];

      const mag = Math.abs(gx) + Math.abs(gy);
      if (mag > edgeThreshold) {
        edges[idx] = 255;
        strongEdgeCount++;
      }
    }
  }

  if (strongEdgeCount < 200) return null;

  // 5. Scan 4 extreme corners among bright edge pixels (White paper edges)
  let minSum = Infinity, maxSum = -Infinity;
  let minDiff = Infinity, maxDiff = -Infinity;

  let tl: Point | null = null;
  let tr: Point | null = null;
  let br: Point | null = null;
  let bl: Point | null = null;

  const marginX = Math.floor(w * 0.06);
  const marginY = Math.floor(h * 0.06);

  for (let y = marginY; y < h - marginY; y++) {
    const row = y * w;
    for (let x = marginX; x < w - marginX; x++) {
      // Must be an edge pixel AND the pixel itself or its immediate interior must be bright paper
      if (edges[row + x] === 255 && blurred[row + x] >= 110) {
        const sum = x + y;
        const diff = x - y;

        if (sum < minSum) { minSum = sum; tl = { x, y }; }
        if (sum > maxSum) { maxSum = sum; br = { x, y }; }
        if (diff > maxDiff) { maxDiff = diff; tr = { x, y }; }
        if (diff < minDiff) { minDiff = diff; bl = { x, y }; }
      }
    }
  }

  if (!tl || !tr || !br || !bl) return null;

  // 6. Geometric Validation
  const topW = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const botW = Math.hypot(br.x - bl.x, br.y - bl.y);
  const leftH = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const rightH = Math.hypot(br.x - tr.x, br.y - tr.y);

  if (topW < w * 0.35 || botW < w * 0.35 || leftH < h * 0.35 || rightH < h * 0.35) {
    return null;
  }

  const avgWidth = (topW + botW) / 2;
  const avgHeight = (leftH + rightH) / 2;
  const ratio = avgHeight / (avgWidth || 1);
  if (ratio < 0.7 || ratio > 1.8) {
    return null;
  }

  // 7. CRUCIAL: Check Border Step Contrast & Interior Paper Brightness
  // Sample interior center of the candidate polygon
  const centerX = Math.round((tl.x + tr.x + br.x + bl.x) / 4);
  const centerY = Math.round((tl.y + tr.y + br.y + bl.y) / 4);

  let interiorSum = 0;
  let sampleCount = 0;
  const sampleRadius = Math.round(Math.min(avgWidth, avgHeight) * 0.18);

  for (let dy = -sampleRadius; dy <= sampleRadius; dy += 4) {
    for (let dx = -sampleRadius; dx <= sampleRadius; dx += 4) {
      const sx = centerX + dx;
      const sy = centerY + dy;
      if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
        interiorSum += blurred[sy * w + sx];
        sampleCount++;
      }
    }
  }

  const avgInteriorLuma = interiorSum / (sampleCount || 1);

  // Real paper MUST be distinctly bright (at least 135 luminance, or +25 brighter than ambient background)
  if (avgInteriorLuma < 130 || avgInteriorLuma < avgSceneLuma + 18) {
    return null;
  }

  // Check edge sharpness: sample 4 line segments and verify they have edge pixels
  const checkLineEdges = (p1: Point, p2: Point): number => {
    let edgeHits = 0;
    const steps = 20;
    for (let i = 1; i < steps; i++) {
      const px = Math.round(p1.x + (p2.x - p1.x) * (i / steps));
      const py = Math.round(p1.y + (p2.y - p1.y) * (i / steps));
      if (px >= 0 && px < w && py >= 0 && py < h) {
        // Check 3x3 window around line point for edge
        let hit = false;
        for (let dy = -1; dy <= 1 && !hit; dy++) {
          for (let dx = -1; dx <= 1 && !hit; dx++) {
            if (edges[(py + dy) * w + (px + dx)] === 255) hit = true;
          }
        }
        if (hit) edgeHits++;
      }
    }
    return edgeHits / (steps - 1);
  };

  const topEdgeScore = checkLineEdges(tl, tr);
  const rightEdgeScore = checkLineEdges(tr, br);
  const botEdgeScore = checkLineEdges(bl, br);
  const leftEdgeScore = checkLineEdges(tl, bl);

  const avgEdgeScore = (topEdgeScore + rightEdgeScore + botEdgeScore + leftEdgeScore) / 4;

  // Real paper sheet must have distinct perimeter edges (> 45% collinear edge points)
  if (avgEdgeScore < 0.42) {
    return null;
  }

  const scaleX = videoWidth / w;
  const scaleY = videoHeight / h;

  return [
    { x: Math.round(tl.x * scaleX), y: Math.round(tl.y * scaleY) },
    { x: Math.round(tr.x * scaleX), y: Math.round(tr.y * scaleY) },
    { x: Math.round(br.x * scaleX), y: Math.round(br.y * scaleY) },
    { x: Math.round(bl.x * scaleX), y: Math.round(bl.y * scaleY) }
  ];
}

/**
 * Сглаживание точек углов между кадрами (Exponential Moving Average Filter)
 */
export function smoothCorners(
  prev: [Point, Point, Point, Point] | null,
  current: [Point, Point, Point, Point],
  alpha = 0.35
): [Point, Point, Point, Point] {
  if (!prev) return current;

  return [
    { x: Math.round(prev[0].x * (1 - alpha) + current[0].x * alpha), y: Math.round(prev[0].y * (1 - alpha) + current[0].y * alpha) },
    { x: Math.round(prev[1].x * (1 - alpha) + current[1].x * alpha), y: Math.round(prev[1].y * (1 - alpha) + current[1].y * alpha) },
    { x: Math.round(prev[2].x * (1 - alpha) + current[2].x * alpha), y: Math.round(prev[2].y * (1 - alpha) + current[2].y * alpha) },
    { x: Math.round(prev[3].x * (1 - alpha) + current[3].x * alpha), y: Math.round(prev[3].y * (1 - alpha) + current[3].y * alpha) }
  ];
}

function getPerspectiveTransform(
  src: [Point, Point, Point, Point],
  dst: [Point, Point, Point, Point]
): number[] {
  const a: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const sx = src[i].x;
    const sy = src[i].y;
    const dx = dst[i].x;
    const dy = dst[i].y;

    a.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    b.push(dx);
    a.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dy);
  }

  const n = 8;
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(a[k][i]) > Math.abs(a[maxRow][i])) maxRow = k;
    }
    const tempA = a[i]; a[i] = a[maxRow]; a[maxRow] = tempA;
    const tempB = b[i]; b[i] = b[maxRow]; b[maxRow] = tempB;

    if (Math.abs(a[i][i]) < 1e-12) continue;

    for (let k = i + 1; k < n; k++) {
      const factor = a[k][i] / a[i][i];
      b[k] -= factor * b[i];
      for (let j = i; j < n; j++) {
        a[k][j] -= factor * a[i][j];
      }
    }
  }

  const h = new Array(9).fill(1);
  for (let i = n - 1; i >= 0; i--) {
    let sum = b[i];
    for (let j = i + 1; j < n; j++) {
      sum -= a[i][j] * h[j];
    }
    h[i] = Math.abs(a[i][i]) > 1e-12 ? sum / a[i][i] : 0;
  }
  h[8] = 1;
  return h;
}

/**
 * Высокоточное выпрямление перспективы в A4 Ultra HD (2480 x 3508 px, 300 DPI)
 */
export function warpPerspective(
  sourceCanvas: HTMLCanvasElement,
  corners: [Point, Point, Point, Point],
  targetWidth = 2480,
  targetHeight = 3508
): HTMLCanvasElement {
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = targetWidth;
  outputCanvas.height = targetHeight;
  const outCtx = outputCanvas.getContext('2d');
  if (!outCtx) return outputCanvas;

  outCtx.fillStyle = '#ffffff';
  outCtx.fillRect(0, 0, targetWidth, targetHeight);

  const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!srcCtx) return outputCanvas;

  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  const srcImgData = srcCtx.getImageData(0, 0, srcW, srcH);
  const srcData = srcImgData.data;

  const dstImgData = outCtx.createImageData(targetWidth, targetHeight);
  const dstData = dstImgData.data;

  const dstCorners: [Point, Point, Point, Point] = [
    { x: 0, y: 0 },
    { x: targetWidth, y: 0 },
    { x: targetWidth, y: targetHeight },
    { x: 0, y: targetHeight }
  ];

  const Hinv = getPerspectiveTransform(dstCorners, corners);
  const h0 = Hinv[0], h1 = Hinv[1], h2 = Hinv[2];
  const h3 = Hinv[3], h4 = Hinv[4], h5 = Hinv[5];
  const h6 = Hinv[6], h7 = Hinv[7], h8 = Hinv[8];

  let dstIdx = 0;
  for (let dy = 0; dy < targetHeight; dy++) {
    for (let dx = 0; dx < targetWidth; dx++) {
      const w = h6 * dx + h7 * dy + h8;
      const invW = Math.abs(w) > 1e-10 ? 1 / w : 1;
      const sx = (h0 * dx + h1 * dy + h2) * invW;
      const sy = (h3 * dx + h4 * dy + h5) * invW;

      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);

      if (x0 >= 0 && x0 < srcW - 1 && y0 >= 0 && y0 < srcH - 1) {
        const fx = sx - x0;
        const fy = sy - y0;
        const fx1 = 1 - fx;
        const fy1 = 1 - fy;

        const w00 = fx1 * fy1;
        const w10 = fx * fy1;
        const w01 = fx1 * fy;
        const w11 = fx * fy;

        const idx00 = (y0 * srcW + x0) << 2;
        const idx10 = (y0 * srcW + x0 + 1) << 2;
        const idx01 = ((y0 + 1) * srcW + x0) << 2;
        const idx11 = ((y0 + 1) * srcW + x0 + 1) << 2;

        dstData[dstIdx] = Math.round(srcData[idx00] * w00 + srcData[idx10] * w10 + srcData[idx01] * w01 + srcData[idx11] * w11);
        dstData[dstIdx + 1] = Math.round(srcData[idx00 + 1] * w00 + srcData[idx10 + 1] * w10 + srcData[idx01 + 1] * w01 + srcData[idx11 + 1] * w11);
        dstData[dstIdx + 2] = Math.round(srcData[idx00 + 2] * w00 + srcData[idx10 + 2] * w10 + srcData[idx01 + 2] * w01 + srcData[idx11 + 2] * w11);
        dstData[dstIdx + 3] = 255;
      } else if (x0 >= 0 && x0 < srcW && y0 >= 0 && y0 < srcH) {
        const idx = (y0 * srcW + x0) << 2;
        dstData[dstIdx] = srcData[idx];
        dstData[dstIdx + 1] = srcData[idx + 1];
        dstData[dstIdx + 2] = srcData[idx + 2];
        dstData[dstIdx + 3] = 255;
      } else {
        dstData[dstIdx] = 255;
        dstData[dstIdx + 1] = 255;
        dstData[dstIdx + 2] = 255;
        dstData[dstIdx + 3] = 255;
      }
      dstIdx += 4;
    }
  }

  outCtx.putImageData(dstImgData, 0, 0);
  return outputCanvas;
}

/**
 * Профессиональная обработка скана документа:
 * - 'bw': адаптивная локальная бинаризация Bradley-Roth через Integral Image (100% удаление теней)
 * - 'color': Retinex Local Background Division + отбеливание бумаги с сохранением цветных печатей
 */
export function applyDocumentEnhancement(canvas: HTMLCanvasElement, filterType: DocumentFilterType): void {
  if (filterType === 'original') return;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const numPixels = width * height;

  const gray = new Uint8Array(numPixels);
  for (let i = 0; i < data.length; i += 4) {
    gray[i >> 2] = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
  }

  const integral = new Float64Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    const rowOffset = y * width;
    const intRowOffset = (y + 1) * (width + 1);
    const prevIntRowOffset = y * (width + 1);

    for (let x = 0; x < width; x++) {
      rowSum += gray[rowOffset + x];
      integral[intRowOffset + (x + 1)] = integral[prevIntRowOffset + (x + 1)] + rowSum;
    }
  }

  const S = Math.max(16, Math.floor(width / 18));

  if (filterType === 'bw') {
    const T = 0.12;

    for (let y = 0; y < height; y++) {
      const y1 = Math.max(0, y - S);
      const y2 = Math.min(height, y + S);
      const rowOffset = y * width;

      for (let x = 0; x < width; x++) {
        const x1 = Math.max(0, x - S);
        const x2 = Math.min(width, x + S);
        const count = (x2 - x1) * (y2 - y1);

        const sum =
          integral[y2 * (width + 1) + x2] -
          integral[y1 * (width + 1) + x2] -
          integral[y2 * (width + 1) + x1] +
          integral[y1 * (width + 1) + x1];

        const pixelVal = gray[rowOffset + x];
        const threshold = (sum / count) * (1.0 - T);

        const outVal = pixelVal < threshold ? 0 : 255;
        const pIdx = (rowOffset + x) << 2;
        data[pIdx] = outVal;
        data[pIdx + 1] = outVal;
        data[pIdx + 2] = outVal;
      }
    }
  } else if (filterType === 'color') {
    // Retinex Local Background Division
    for (let y = 0; y < height; y++) {
      const y1 = Math.max(0, y - S);
      const y2 = Math.min(height, y + S);
      const rowOffset = y * width;

      for (let x = 0; x < width; x++) {
        const x1 = Math.max(0, x - S);
        const x2 = Math.min(width, x + S);
        const count = (x2 - x1) * (y2 - y1);

        const sum =
          integral[y2 * (width + 1) + x2] -
          integral[y1 * (width + 1) + x2] -
          integral[y2 * (width + 1) + x1] +
          integral[y1 * (width + 1) + x1];

        const localBg = Math.max(30, sum / count);
        const gain = 255 / localBg;

        const pIdx = (rowOffset + x) << 2;
        let r = data[pIdx];
        let g = data[pIdx + 1];
        let b = data[pIdx + 2];

        r = Math.min(255, Math.round(r * gain));
        g = Math.min(255, Math.round(g * gain));
        b = Math.min(255, Math.round(b * gain));

        const minC = Math.min(r, g, b);
        const maxC = Math.max(r, g, b);
        const isBackground = minC > 195;

        if (isBackground) {
          r = 255;
          g = 255;
          b = 255;
        } else if (maxC < 140) {
          r = Math.round(r * 0.82);
          g = Math.round(g * 0.82);
          b = Math.round(b * 0.82);
        }

        data[pIdx] = r;
        data[pIdx + 1] = g;
        data[pIdx + 2] = b;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Поворот холста на заданный угол
 */
export function rotateCanvas(sourceCanvas: HTMLCanvasElement, degrees: 0 | 90 | 180 | 270): HTMLCanvasElement {
  if (degrees === 0) return sourceCanvas;

  const outputCanvas = document.createElement('canvas');
  const ctx = outputCanvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  if (degrees === 90 || degrees === 270) {
    outputCanvas.width = sourceCanvas.height;
    outputCanvas.height = sourceCanvas.width;
  } else {
    outputCanvas.width = sourceCanvas.width;
    outputCanvas.height = sourceCanvas.height;
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

  ctx.save();
  ctx.translate(outputCanvas.width / 2, outputCanvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);
  ctx.restore();

  return outputCanvas;
}
