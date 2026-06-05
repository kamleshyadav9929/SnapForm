/**
 * File System Interceptor Module
 * Sanitizes Mime-Types, validates uploads, and converts HEIC files client-side.
 */

// Supported standard Mime-Types
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Format bytes into user-friendly strings (e.g. "45.23 KB")
 * @param {number} bytes 
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = 2;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Validates and converts (if HEIC) an incoming file.
 * Returns a standard File object (JPEG/PNG) or throws an error.
 * @param {File} file - Incoming file from drop zone or file input.
 * @param {Function} onProgress - Callback for updating conversion status UI.
 * @returns {Promise<File>}
 */
export async function processIncomingFile(file, onProgress = () => {}) {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  const isHeic = fileType === 'image/heic' || fileType === 'image/heif' || fileName.endsWith('.heic') || fileName.endsWith('.heif');

  onProgress("Validating file format...");

  // If it's a HEIC file, lazy-load heic2any and convert it to JPEG
  if (isHeic) {
    onProgress("HEIC image detected. Loading local converter...");
    try {
      // Lazy load heic2any package to optimize main bundle performance
      const heic2anyModule = await import('heic2any');
      const heic2any = heic2anyModule.default;
      
      onProgress("Converting HEIC to standard JPEG locally...");
      const conversionResult = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.90
      });

      // Handle cases where conversionResult is an array of Blobs
      const jpegBlob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
      
      const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
      return new File([jpegBlob], newName, { type: 'image/jpeg' });
    } catch (error) {
      console.error("HEIC conversion failed:", error);
      throw new Error("Local HEIC conversion failed. Please try a standard JPEG, PNG or WebP file.");
    }
  }

  // Check if standard type is supported
  const isSupported = SUPPORTED_TYPES.includes(fileType) || 
                      fileName.endsWith('.jpg') || 
                      fileName.endsWith('.jpeg') || 
                      fileName.endsWith('.png') || 
                      fileName.endsWith('.webp');

  if (!isSupported) {
    throw new Error("Unsupported file type. Please upload JPEG, PNG, WebP, or HEIC files.");
  }

  return file;
}
