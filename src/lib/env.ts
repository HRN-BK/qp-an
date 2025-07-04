import invariant from "tiny-invariant";

// Check if we're running on the server
const isServer = typeof window === "undefined";

// Validate required environment variables at runtime
function validateEnv() {
  // These are always required (public env vars)
  invariant(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required"
  );
  invariant(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL is required"
  );
  invariant(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"
  );

  // These are only required on the server
  if (isServer) {
    invariant(process.env.CLERK_SECRET_KEY, "CLERK_SECRET_KEY is required");
    invariant(
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      "SUPABASE_SERVICE_ROLE_KEY is required"
    );
    invariant(process.env.OPENAI_API_KEY, "OPENAI_API_KEY is required");
  }
}

// Optionally validate environment variables at runtime when needed
// (Avoid validating at build time to prevent CI failures)

// Export typed environment object
export const ENV = {
  CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || "",
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
} as const;

export { validateEnv };
