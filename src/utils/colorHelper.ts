export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Converts a hex color string to an RGB object.
 * Supports both #fff and #ffffff formats.
 */
export function hexToRgb(hex: string): RGB {
  const cleanHex = hex.replace(/^#/, '');
  const expandedHex = cleanHex.length === 3
    ? cleanHex.split('').map(char => char + char).join('')
    : cleanHex;

  const num = parseInt(expandedHex, 16);
  if (isNaN(num)) {
    return { r: 255, g: 255, b: 255 }; // Default to white
  }

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Calculates Euclidean distance between two RGB colors.
 * Max distance is sqrt(255^2 * 3) ≈ 441.67
 */
export function getDistance(c1: RGB, c2: RGB): number {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
}

/**
 * Calculates the average RGB color of an HTML canvas by sampling pixels.
 * Uses a step value for performance.
 */
export function getCanvasAverageColor(canvas: HTMLCanvasElement): RGB {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { r: 255, g: 255, b: 255 };

  const width = canvas.width;
  const height = canvas.height;
  
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let count = 0;
    
    // Sample every 16th pixel to save CPU cycles
    const step = 16;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const index = (y * width + x) * 4;
        rSum += data[index];
        gSum += data[index + 1];
        bSum += data[index + 2];
        count++;
      }
    }
    
    return {
      r: Math.round(rSum / count),
      g: Math.round(gSum / count),
      b: Math.round(bSum / count),
    };
  } catch (e) {
    console.error('Error reading canvas pixel data:', e);
    return { r: 255, g: 255, b: 255 };
  }
}
