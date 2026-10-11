// ============================================================
// EAGLEVISION CLOUDBOARD — UPLOAD SERVICE
// ============================================================
// Single entry point for image uploads.
//
// Uses the shared api() client so:
//   • Bearer token is read from the correct storage key
//   • 401 handling is centralized (session expiry event)
//   • Timeouts + error normalization are consistent
//
// Returns: { url: 'https://…/image.jpg' }
//
// Usage:
//   import { uploadImage } from '../services/uploadService.js';
//   const { url } = await uploadImage(fileInput.files[0]);
// ============================================================

import { api } from './api.js';


// ============================================================
// CONSTANTS
// ============================================================
const MAX_FILE_SIZE_MB  = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
];

const UPLOAD_TIMEOUT_MS = 60 * 1000;   // 60s — uploads take longer than JSON


// ============================================================
// VALIDATION
// ============================================================
function validateFile(file) {
  if (!file) {
    throw new Error('No file provided.');
  }

  if (!(file instanceof File) && !(file instanceof Blob)) {
    throw new Error('Invalid file — expected a File or Blob.');
  }

  if (file.size === 0) {
    throw new Error('File is empty.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / 1024 / 1024).toFixed(1);
    throw new Error(`File is too large (${sizeMb} MB). Maximum is ${MAX_FILE_SIZE_MB} MB.`);
  }

  // Some browsers don't set `type` — only block if we're sure it's wrong.
  if (file.type && !ALLOWED_TYPES.includes(file.type.toLowerCase())) {
    throw new Error(`Unsupported image type: ${file.type}`);
  }
}


// ============================================================
// PUBLIC API
// ============================================================

/**
 * Upload an image file.
 * @param {File|Blob} file
 * @param {object}   [options]
 * @param {string}   [options.fieldName='file']  FormData field name
 * @returns {Promise<{url: string, [key: string]: any}>}
 */
export async function uploadImage(file, { fieldName = 'file' } = {}) {
  validateFile(file);

  const formData = new FormData();
  formData.append(fieldName, file);

  // NOTE: We deliberately do NOT set Content-Type — the browser sets
  // it (with the correct multipart boundary) when we pass a FormData body.
  return api('/api/upload', {
    method: 'POST',
    body: formData,
    timeout: UPLOAD_TIMEOUT_MS,
    // api() detects FormData bodies and skips the default JSON content-type.
  });
}


// ============================================================
// OPTIONAL: Multiple files
// ============================================================

/**
 * Upload multiple files in parallel.
 * Returns { urls: [...], errors: [...] }
 */
export async function uploadImages(files, { fieldName = 'file' } = {}) {
  const list = Array.from(files || []);
  if (list.length === 0) return { urls: [], errors: [] };

  const results = await Promise.allSettled(
    list.map((f) => uploadImage(f, { fieldName }))
  );

  const urls   = [];
  const errors = [];

  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value?.url) {
      urls.push(r.value.url);
    } else {
      errors.push({
        file: list[i]?.name || `#${i + 1}`,
        message: r.reason?.message || 'Upload failed',
      });
    }
  });

  return { urls, errors };
}
