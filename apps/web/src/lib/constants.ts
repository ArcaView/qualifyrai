// Application constants

// Admin email addresses - single source of truth
export const ADMIN_EMAILS = [
  'admin@arcaview.com',
  'support@arcaview.com'
];

// Check if an email is an admin email
export const isAdminEmail = (email: string | undefined | null): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

// Application limits
export const LIMITS = {
  MAX_FILE_SIZE_MB: 10,
  MAX_BATCH_FILES: 50,
} as const;
