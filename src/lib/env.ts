import invariant from "tiny-invariant";

// Validate required environment variables at runtime
function validateEnv() {
  invariant(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required"
  );
  invariant(process.env.CLERK_SECRET_KEY, "CLERK_SECRET_KEY is required");
  invariant(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL is required"
  );
  invariant(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"
  );
  invariant(process.env.OPENAI_API_KEY, "OPENAI_API_KEY is required");
}

// Validate environment variables once at runtime
validateEnv();

// Export typed environment object
export const ENV = {
  CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY!,
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
} as const;
