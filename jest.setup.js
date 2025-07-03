import '@testing-library/jest-dom'

// Mock fetch for API tests
global.fetch = jest.fn()

// Mock environment variables
process.env.OPENAI_API_KEY = process.env.TEST_OPENAI_API_KEY
process.env.SUPABASE_URL = process.env.TEST_SUPABASE_URL
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = process.env.TEST_CLERK_PUBLISHABLE_KEY
process.env.CLERK_SECRET_KEY = process.env.TEST_CLERK_SECRET_KEY

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return ''
  },
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})
