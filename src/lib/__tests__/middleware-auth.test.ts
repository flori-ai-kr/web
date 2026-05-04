import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

// Characterization tests for SPEC-ROUTE-ADMIN-001
// Captures the auth-boundary behavior of `updateSession` after the
// (dashboard) → (admin)/admin route migration. Behavior under test:
//   - REQ-ROUTE-002: anonymous /admin/* requests redirect to /login
//   - REQ-ROUTE-002 inverse: authenticated /login requests redirect to /admin
//   - REQ-ROUTE-003: anonymous root `/` and other public paths pass through
//
// Strategy: mock @supabase/ssr `createServerClient` so we can flip the
// authenticated user between tests without touching real Supabase.

const getUserMock = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: getUserMock,
    },
  })),
}))

// Import AFTER mocks are registered.
import { updateSession } from '../supabase/middleware'

/**
 * Build a minimal NextRequest-shaped object that satisfies the surface
 * the production middleware actually touches:
 *   - request.cookies.getAll / set
 *   - request.nextUrl.pathname
 *   - request.nextUrl.clone() returning a mutable URL-like
 */
function buildRequest(pathname: string): NextRequest {
  const cookieStore = new Map<string, string>()
  const origin = 'http://localhost:3100'
  // NextResponse.redirect requires an absolute URL string. We back nextUrl
  // with a real URL object so `clone()` returns something `new URL(...)` can
  // consume after `pathname` mutation.
  const buildUrl = (p: string) => new URL(p, origin)
  const nextUrl = buildUrl(pathname)
  ;(nextUrl as URL & { clone: () => URL }).clone = () => buildUrl(nextUrl.pathname)
  return {
    cookies: {
      getAll: () => Array.from(cookieStore, ([name, value]) => ({ name, value })),
      set: (name: string, value: string) => {
        cookieStore.set(name, value)
      },
    },
    nextUrl,
  } as unknown as NextRequest
}

beforeEach(() => {
  getUserMock.mockReset()
  // Avoid noisy env warnings in createServerClient.
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key'
})

describe('updateSession — admin route auth boundary (SPEC-ROUTE-ADMIN-001)', () => {
  it('REQ-ROUTE-002: anonymous request to /admin redirects to /login', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } })
    const req = buildRequest('/admin')

    const res = await updateSession(req)

    // NextResponse.redirect produces a Response with status 307/308 and a Location header.
    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('REQ-ROUTE-002: anonymous request to /admin/sales redirects to /login', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } })
    const req = buildRequest('/admin/sales')

    const res = await updateSession(req)

    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('inverse: authenticated request to /login redirects to /admin', async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: 'test-user-id' } },
    })
    const req = buildRequest('/login')

    const res = await updateSession(req)

    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    expect(res.headers.get('location')).toContain('/admin')
  })

  it('REQ-ROUTE-003: anonymous request to / passes through (public homepage)', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } })
    const req = buildRequest('/')

    const res = await updateSession(req)

    // Pass-through = NextResponse.next(), which is a 2xx (typically 200)
    // and carries NO Location header.
    expect(res.status).toBeLessThan(300)
    expect(res.headers.get('location')).toBeNull()
  })

  it('REQ-ROUTE-003: anonymous request to public sub-path passes through', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } })
    const req = buildRequest('/about')

    const res = await updateSession(req)

    expect(res.status).toBeLessThan(300)
    expect(res.headers.get('location')).toBeNull()
  })

  it('authenticated user on /admin/customers passes through (no redirect)', async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: 'test-user-id' } },
    })
    const req = buildRequest('/admin/customers')

    const res = await updateSession(req)

    expect(res.status).toBeLessThan(300)
    expect(res.headers.get('location')).toBeNull()
  })
})
