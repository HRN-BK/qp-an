import { createClient } from '@supabase/supabase-js';
import { ENV } from './env';

/**
 * Create a Supabase client for browser usage
 * Uses the public anon key for authentication
 */
export function createBrowserClient() {
  return createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Create a Supabase client for server usage
 * Uses Next.js cookies and can inject Clerk JWT for RLS
 */
export function createServerClient() {
  return createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a Supabase client with Clerk JWT for RLS
 * Injects the Clerk JWT token into the Authorization header
 */
export function createServerClientWithAuth(clerkToken: string) {
  return createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a Supabase service client with full database access
 * Uses the service role key, bypassing RLS
 */
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceKey) {
    console.warn('No service role key found, falling back to anon key');
    return createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  
  return createClient(ENV.SUPABASE_URL, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
