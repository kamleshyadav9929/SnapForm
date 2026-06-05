/**
 * Core Canvas Iterative Compressor Engine
 * Implements client-side binary quality step search and adaptive canvas dimension downscaling.
 */

/**
 * Loads a file into an HTML5 Image element
 * @param {File} file 
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image. The file may be corrupt."));
    };
    img.src = objectUrl;
  });
}

/**
 * Compresses an image file iteratively until the size is under the target KB ceiling.
 * @param {File} nativeFile - The source file object.
 * @param {number} targetMaxKB - Max file size target in kilobytes.
 * @param {string} outputType - Export mime type ('image/jpeg' or 'image/png').
 * @returns {Promise<{blob: Blob, finalQuality: number, finalBytes: number, width: number, height: number, scaleFactor: number}>}
 */
export async function processClientImage(nativeFile, targetMaxKB, outputType = 'image/jpeg') {
  const targetBytes = targetMaxKB * 1024;
  const imgElement = await loadImage(nativeFile);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error("Could not initialize 2D canvas context.");
  }

  let scaleFactor = 1.0;
  let thresholdQuality = 0.95;
  let computedBlob = null;
  let byteFootprint = Infinity;
  let iterations = 0;
  const maxIterations = 50; // Safety cap to prevent browser freezes

  // For PNG, canvas quality parameter is ignored. We must rely purely on scale reduction.
  const isFormatCompressible = outputType === 'image/jpeg' || outputType === 'image/webp';

  while (byteFootprint > targetBytes && iterations < maxIterations) {
    iterations++;
    
    // Calculate new dimensions
    const width = Math.max(16, Math.floor(imgElement.width * scaleFactor));
    const height = Math.max(16, Math.floor(imgElement.height * scaleFactor));
    
    canvas.width = width;
    canvas.height = height;
    
    // Clear and draw image onto canvas
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(imgElement, 0, 0, width, height);

    if (isFormatCompressible) {
      // Step quality down first
      computedBlob = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), outputType, thresholdQuality);
      });

      if (!computedBlob) {
        throw new Error("Canvas toBlob serialization failed.");
      }

      byteFootprint = computedBlob.size;

      if (byteFootprint > targetBytes) {
        if (thresholdQuality > 0.1) {
          // Reduce JPEG quality by 0.05 step
          thresholdQuality = parseFloat((thresholdQuality - 0.05).toFixed(2));
        } else {
          // If quality is already at minimum (0.05), reduce dimension scale factor by 10%
          scaleFactor = parseFloat((scaleFactor - 0.1).toFixed(2));
          thresholdQuality = 0.90; // Reset quality to try at smaller scale
        }
      }
    } else {
      // PNG path - reduce scale factor directly by 10% steps
      computedBlob = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), outputType);
      });

      if (!computedBlob) {
        throw new Error("Canvas toBlob serialization failed.");
      }

      byteFootprint = computedBlob.size;

      if (byteFootprint > targetBytes) {
        scaleFactor = parseFloat((scaleFactor - 0.1).toFixed(2));
      }
    }

    // Safeguard: Stop scaling down if scale factor is too small
    if (scaleFactor <= 0.05) {
      break;
    }
  }

  // If we couldn't meet target bytes after loop, return the last generated blob
  return {
    blob: computedBlob,
    finalQuality: isFormatCompressible ? thresholdQuality : 1.0,
    finalBytes: byteFootprint,
    width: canvas.width,
    height: canvas.height,
    scaleFactor
  };
}
