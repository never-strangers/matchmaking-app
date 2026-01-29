import { createClient, SupabaseClient } from "@supabase/supabase-js";

let serviceClient: SupabaseClient | null = null;

/**
 * Server-side Supabase client using the service role key.
 *
 * IMPORTANT: Never import this file into client components.
 */
export function getServiceSupabaseClient(): SupabaseClient {
  if (serviceClient) return serviceClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase service role environment variables are not configured");
  }

  serviceClient = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
    },
  });

  return serviceClient;
}

