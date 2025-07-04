import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Vocab",
  description: "AI-powered vocabulary application",
};

const MaybeClerkProvider: React.FC<{ children: React.ReactNode }> =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    ? ({ children }) => (
        <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
          {children}
        </ClerkProvider>
      )
    : ({ children }) => (
        <ClerkProvider publishableKey="pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk">
          {children}
        </ClerkProvider>
      );

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <MaybeClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </body>
      </html>
    </MaybeClerkProvider>
  );
}
