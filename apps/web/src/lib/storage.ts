import { supabase } from './supabase';
import { sanitizeFilename } from './file-validation';

export interface UploadResult {
  success: boolean;
  path?: string;
  error?: string;
}

export interface DownloadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Uploads a CV file to Supabase Storage with proper security
 * - User-isolated storage (cvs/{user_id}/)
 * - Filename sanitization
 * - Unique filename generation
 */
export async function uploadCVFile(file: File): Promise<UploadResult> {
  try {
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(file.name);
    
    // Create unique filename with timestamp
    const timestamp = Date.now();
    const uniqueFilename = `${timestamp}_${sanitizedFilename}`;
    
    // Upload to user-specific folder: cvs/{user_id}/{timestamp}_{filename}
    const filePath = `${user.id}/${uniqueFilename}`;

    const { data, error } = await supabase.storage
      .from('cvs')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return {
        success: false,
        error: `Upload failed: ${error.message}`,
      };
    }

    return {
      success: true,
      path: data.path,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Upload failed',
    };
  }
}

/**
 * Gets a signed URL for downloading a CV file
 * - Validates user access via RLS policies
 * - Generates temporary signed URL (expires in 1 hour)
 */
export async function getCVFileUrl(filePath: string): Promise<DownloadResult> {
  try {
    const { data, error } = await supabase.storage
      .from('cvs')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      return {
        success: false,
        error: `Failed to get download URL: ${error.message}`,
      };
    }

    return {
      success: true,
      url: data.signedUrl,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get download URL',
    };
  }
}

/**
 * Deletes a CV file from storage
 * - Only owner can delete (enforced by RLS)
 */
export async function deleteCVFile(filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from('cvs')
      .remove([filePath]);

    if (error) {
      return {
        success: false,
        error: `Delete failed: ${error.message}`,
      };
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Delete failed',
    };
  }
}