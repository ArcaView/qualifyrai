const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
}

export interface BatchFileValidationResult {
  valid: boolean;
  validFiles: File[];
  invalidFiles: File[];
  errors: string[];
}

/**
 * Validates a single file for CV upload
 * Checks: file size, extension, MIME type, and sanitizes filename
 */
export function validateFile(file: File): FileValidationResult {
  // Check file size (max 10MB)
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 10MB limit. Current size: ${formatFileSize(file.size)}`,
    };
  }

  // Check file extension
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file type "${extension}". Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  // Check MIME type (prevents MIME type spoofing)
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type detected. Expected: ${extension}, Got: ${file.type}`,
    };
  }

  // Sanitize filename to prevent XSS and path traversal attacks
  const sanitizedName = sanitizeFilename(file.name);

  return {
    valid: true,
    sanitizedName,
  };
}

/**
 * Validates multiple files for bulk upload
 * Returns both valid and invalid files with their errors
 */
export function validateFiles(files: File[]): BatchFileValidationResult {
  const validFiles: File[] = [];
  const invalidFiles: File[] = [];
  const errors: string[] = [];

  files.forEach((file) => {
    const result = validateFile(file);
    if (result.valid) {
      validFiles.push(file);
    } else {
      invalidFiles.push(file);
      errors.push(`${file.name}: ${result.error}`);
    }
  });

  return {
    valid: validFiles.length > 0,
    validFiles,
    invalidFiles,
    errors,
  };
}

/**
 * Sanitizes a filename to prevent XSS and path traversal attacks
 * - Removes path separators (/ and \)
 * - Replaces special characters with underscores
 * - Limits filename length to 255 characters
 */
export function sanitizeFilename(filename: string): string {
  // Remove any path components (../../etc)
  const baseName = filename.replace(/^.*[\\\/]/, '');

  // Replace special characters with underscores (keep alphanumeric, dots, dashes, underscores)
  const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Limit length to 255 characters
  return sanitized.substring(0, 255);
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}