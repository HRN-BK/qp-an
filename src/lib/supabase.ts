import { createBrowserClient as createClient, createServerClient as createServer } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
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
  const cookieStore = cookies();

  return createServer(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
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
  const cookieStore = cookies();

  return createServer(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
