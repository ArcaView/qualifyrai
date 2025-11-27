// API Keys Management Client
// Handles API key generation, fetching, and deletion

import { supabase } from "@/lib/supabase";

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  is_active: boolean;
  last_used_at?: string;
  expires_at?: string;
}

export interface GenerateApiKeyResponse {
  success: boolean;
  apiKey?: string; // Only returned once during generation
  keyData?: ApiKey;
  message?: string;
  error?: string;
}

/**
 * Generate a new API key for the authenticated user
 * Returns the plain API key ONCE - it will never be shown again
 */
export async function generateApiKey(name: string): Promise<GenerateApiKeyResponse> {
  try {
    console.log("[API Keys] Starting API key generation...");

    // Get current session first (faster than refresh)
    console.log("[API Keys] Getting current session...");
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error("[API Keys] No session found, attempting refresh...");
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError || !refreshedSession) {
        console.error("[API Keys] Session refresh error:", refreshError);
        throw new Error("Session expired. Please sign in again.");
      }
    }

    console.log("[API Keys] Session validated, calling Edge Function...");

    // Get the Supabase project URL for Edge Function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const functionUrl = `${supabaseUrl}/functions/v1/generate-api-key`;

    console.log("[API Keys] Calling:", functionUrl);

    // Add timeout to prevent hanging indefinitely
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("[API Keys] Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        console.error("[API Keys] Error response:", errorData);
        throw new Error(errorData.error || `Failed to generate API key (${response.status})`);
      }

      const data: GenerateApiKeyResponse = await response.json();
      console.log("[API Keys] API key generated successfully");
      return data;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        console.error("[API Keys] Request timed out after 30 seconds");
        throw new Error("Request timed out. Please try again.");
      }
      throw fetchError;
    }
  } catch (error) {
    console.error("[API Keys] Error generating API key:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate API key",
    };
  }
}

/**
 * Fetch all API keys for the authenticated user
 */
export async function fetchApiKeys(): Promise<ApiKey[]> {
  try {
    const { data, error } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, created_at, is_active, last_used_at, expires_at")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return [];
  }
}

/**
 * Delete (revoke) an API key
 */
export async function deleteApiKey(keyId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("api_keys").delete().eq("id", keyId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Error deleting API key:", error);
    return false;
  }
}

/**
 * Update an API key's name
 */
export async function updateApiKeyName(keyId: string, newName: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("api_keys").update({ name: newName }).eq("id", keyId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Error updating API key:", error);
    return false;
  }
}

/**
 * Deactivate (soft delete) an API key
 */
export async function deactivateApiKey(keyId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("api_keys").update({ is_active: false }).eq("id", keyId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Error deactivating API key:", error);
    return false;
  }
}
