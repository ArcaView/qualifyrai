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
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error("User not authenticated");
    }

    // Get the Supabase project URL for Edge Function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const functionUrl = `${supabaseUrl}/functions/v1/generate-api-key`;

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to generate API key");
    }

    const data: GenerateApiKeyResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error generating API key:", error);
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
