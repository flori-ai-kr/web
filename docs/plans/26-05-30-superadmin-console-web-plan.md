# Superadmin Console — Web (Next.js) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the operator-only console at `/console/*` — admin-gated (server-verified), dense shadcn tables + stat cards — for cross-tenant stats, business-verification approval, user/subscription browse, and AI health.

**Architecture:** New route group `(console)/console/*`, separate from florist `(admin)/admin/*`. `requireAdmin()` (server) calls `GET /admin/me`; non-admins redirect to `/admin`. Pages are Server Components that call Server Actions (`lib/actions/admin-*.ts` → `apiFetch` with JWT) and pass data to `*-client.tsx`. `middleware.ts` matcher gains `/console` for the auth (refresh-cookie) gate; the admin check lives in the layout + server.

**Tech Stack:** Next 16 App Router, React 19, TypeScript, Tailwind v4, shadcn/ui (Table/Tabs/Badge/Dialog/Card/Button/Input), Vitest.

**Spec:** `docs/plans/26-05-30-superadmin-console-design.md`  ·  **Depends on server plan:** `flori-ai/server/docs/plans/26-05-30-superadmin-console-server-plan.md` (endpoints must exist).

**Conventions to follow:**
- Server Action: `'use server'`, private `_fn` wrapped via `export const fn = withErrorLogging('fn', _fn)`, `await requireAuth()` (or `requireAdmin()`), `apiFetch<T>(path)`. Direct import (no barrel).
- UI: Korean copy, deletes/mutations via Dialog (no `confirm()`), accessibility attrs, no `transition-all`.
- camelCase server DTO → web types (mirror, normalize `id: number` → `string` where displayed).
- Run: `npm run dev` (:3100), `npm run lint`, `npm test`.

---

## File Structure

```
middleware.ts                                  # add '/console' to the auth gate
src/lib/admin-guard.ts                          # requireAdmin()
src/types/admin.ts                              # console DTO mirrors
src/lib/actions/admin-stats.ts                  # getAdminOverview
src/lib/actions/admin-verifications.ts          # list / approve / reject
src/lib/actions/admin-users.ts                  # list / setActive
src/lib/actions/admin-subscriptions.ts          # list
src/lib/actions/admin-health.ts                 # getAiHealth
src/app/(console)/console/layout.tsx            # requireAdmin() + console shell
src/app/(console)/console/console-shell.tsx     # dense nav shell (client)
src/app/(console)/console/page.tsx              # overview (server)
src/app/(console)/console/overview-client.tsx
src/app/(console)/console/verifications/page.tsx + verifications-client.tsx
src/app/(console)/console/users/page.tsx + users-client.tsx
src/app/(console)/console/subscriptions/page.tsx + subscriptions-client.tsx
src/app/(console)/console/health/page.tsx + health-client.tsx
src/components/console/StatCard.tsx             # shared stat card
```

---

## Task 1: Types + admin guard + middleware gate

**Files:**
- Create: `src/types/admin.ts`
- Create: `src/lib/admin-guard.ts`
- Modify: `middleware.ts`
- Test: `src/lib/__tests__/admin-guard.test.ts`

- [ ] **Step 1: Types (mirror server DTOs)**

```ts
// src/types/admin.ts
export interface AdminOverview {
  users: { total: number; active: number; onboarded: number };
  sales: { entryCount: number; totalAmount: number; last30dCount: number };
  subscriptions: { active: number; inGrace: number; expired: number; none: number };
  verifications: { pending: number; approved: number; rejected: number };
}

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AdminVerification {
  id: number;
  userId: number;
  businessNumber: string;
  businessName: string;
  representativeName: string;
  businessLicenseUrl: string;
  status: VerificationStatus;
  rejectReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
}

export interface AdminUserRow {
  id: number;
  email: string | null;
  nickname: string | null;
  storeName: string | null;
  isActive: boolean;
  isAdmin: boolean;
  subscriptionStatus: string | null;
  verificationStatus: string | null;
  createdAt: string | null;
}
export interface AdminUserPage { rows: AdminUserRow[]; page: number; size: number; total: number }

export interface AdminSubscriptionRow {
  userId: number; status: string; store: string; productId: string; entitlement: string; currentPeriodEnd: string | null;
}

export interface AiHealthTarget { name: string; status: 'UP' | 'DOWN'; latencyMs: number | null; detail: string | null }
export interface AiHealthResponse { targets: AiHealthTarget[] }
```

- [ ] **Step 2: Guard**

```ts
// src/lib/admin-guard.ts
'use server';

import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';
import { requireAuth, type AuthUser } from '@/lib/auth-guard';
import { AppError, ErrorCode } from '@/lib/errors';

/**
 * 운영자 가드. requireAuth()로 로그인 보장 후, 서버 /admin/me 로 is_admin 을 재검증한다.
 * admin 이 아니면(403/UNAUTHORIZED) 점주 대시보드(/admin)로 redirect.
 * 진짜 권한 검증은 서버가 수행하며, 이 가드는 콘솔 진입 차단용이다.
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth();
  try {
    await apiFetch<{ isAdmin: boolean }>('/admin/me');
  } catch (error) {
    if (error instanceof AppError && error.code === ErrorCode.UNAUTHORIZED) {
      redirect('/admin');
    }
    throw error;
  }
  return user;
}
```
> Note: `apiFetch` maps both 401 and 403 to `ErrorCode.UNAUTHORIZED` (see `lib/api/client.ts` `toAppError`), so a non-admin's 403 triggers the redirect.

- [ ] **Step 3: middleware** — extend the existing gate to also cover `/console`:

In `middleware.ts`, change the guard condition:
```ts
  if (pathname.startsWith('/admin') || pathname.startsWith('/console')) {
    const hasRefresh = request.cookies.has(REFRESH_COOKIE)
    if (!hasRefresh) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }
```

- [ ] **Step 4: Guard test (redirect on 403)**

```ts
// src/lib/__tests__/admin-guard.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const redirectMock = vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); });
const apiFetchMock = vi.fn();
const requireAuthMock = vi.fn(async () => ({ id: '1', name: 'n', email: 'e' }));

vi.mock('next/navigation', () => ({ redirect: (u: string) => redirectMock(u) }));
vi.mock('@/lib/api/client', () => ({ apiFetch: (...a: unknown[]) => apiFetchMock(...a) }));
vi.mock('@/lib/auth-guard', () => ({ requireAuth: () => requireAuthMock() }));

import { requireAdmin } from '@/lib/admin-guard';
import { AppError, ErrorCode } from '@/lib/errors';

describe('requireAdmin', () => {
  beforeEach(() => { redirectMock.mockClear(); apiFetchMock.mockReset(); });

  it('admin이면 통과', async () => {
    apiFetchMock.mockResolvedValue({ isAdmin: true });
    await expect(requireAdmin()).resolves.toMatchObject({ id: '1' });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('비admin(403)이면 /admin으로 redirect', async () => {
    apiFetchMock.mockRejectedValue(new AppError(ErrorCode.UNAUTHORIZED, 'no'));
    await expect(requireAdmin()).rejects.toThrow('REDIRECT:/admin');
  });
});
```

- [ ] **Step 5: Run** — `npm test -- admin-guard` → PASS
- [ ] **Step 6: Commit**
```bash
git add src/types/admin.ts src/lib/admin-guard.ts middleware.ts src/lib/__tests__/admin-guard.test.ts
git commit -m "feat(console): admin 가드 + 타입 + middleware /console 게이트"
```

---

## Task 2: Server actions (stats / verifications / users / subscriptions / health)

**Files:**
- Create: `src/lib/actions/admin-stats.ts`, `admin-verifications.ts`, `admin-users.ts`, `admin-subscriptions.ts`, `admin-health.ts`

- [ ] **Step 1: admin-stats.ts**

```ts
'use server';
import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { withErrorLogging } from '@/lib/errors';
import type { AdminOverview } from '@/types/admin';

async function _getAdminOverview(): Promise<AdminOverview> {
  await requireAdmin();
  return apiFetch<AdminOverview>('/admin/stats/overview');
}
export const getAdminOverview = withErrorLogging('getAdminOverview', _getAdminOverview);
```

- [ ] **Step 2: admin-verifications.ts**

```ts
'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { withErrorLogging } from '@/lib/errors';
import type { AdminVerification, VerificationStatus } from '@/types/admin';

async function _listVerifications(status: VerificationStatus): Promise<AdminVerification[]> {
  await requireAdmin();
  return apiFetch<AdminVerification[]>(`/admin/verifications?status=${status}`);
}
export const listVerifications = withErrorLogging('listVerifications', _listVerifications);

async function _approveVerification(id: number): Promise<AdminVerification> {
  await requireAdmin();
  const res = await apiFetch<AdminVerification>(`/admin/verifications/${id}/approve`, { method: 'POST' });
  revalidatePath('/console/verifications');
  return res;
}
export const approveVerification = withErrorLogging('approveVerification', _approveVerification);

async function _rejectVerification(id: number, reason: string): Promise<AdminVerification> {
  await requireAdmin();
  const res = await apiFetch<AdminVerification>(`/admin/verifications/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  revalidatePath('/console/verifications');
  return res;
}
export const rejectVerification = withErrorLogging('rejectVerification', _rejectVerification);
```

- [ ] **Step 3: admin-users.ts**

```ts
'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { withErrorLogging } from '@/lib/errors';
import type { AdminUserPage, AdminUserRow } from '@/types/admin';

async function _listAdminUsers(query: string, page: number): Promise<AdminUserPage> {
  await requireAdmin();
  const qs = new URLSearchParams({ page: String(page), size: '50' });
  if (query.trim()) qs.set('query', query.trim());
  return apiFetch<AdminUserPage>(`/admin/users?${qs.toString()}`);
}
export const listAdminUsers = withErrorLogging('listAdminUsers', _listAdminUsers);

async function _setUserActive(id: number, active: boolean): Promise<AdminUserRow> {
  await requireAdmin();
  const res = await apiFetch<AdminUserRow>(`/admin/users/${id}/active`, {
    method: 'POST',
    body: JSON.stringify({ active }),
  });
  revalidatePath('/console/users');
  return res;
}
export const setUserActive = withErrorLogging('setUserActive', _setUserActive);
```

- [ ] **Step 4: admin-subscriptions.ts**

```ts
'use server';
import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { withErrorLogging } from '@/lib/errors';
import type { AdminSubscriptionRow } from '@/types/admin';

async function _listSubscriptions(status?: string): Promise<AdminSubscriptionRow[]> {
  await requireAdmin();
  const qs = status ? `?status=${status}` : '';
  return apiFetch<AdminSubscriptionRow[]>(`/admin/subscriptions${qs}`);
}
export const listSubscriptions = withErrorLogging('listSubscriptions', _listSubscriptions);
```

- [ ] **Step 5: admin-health.ts**

```ts
'use server';
import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { withErrorLogging } from '@/lib/errors';
import type { AiHealthResponse } from '@/types/admin';

async function _getAiHealth(): Promise<AiHealthResponse> {
  await requireAdmin();
  return apiFetch<AiHealthResponse>('/admin/health/ai');
}
export const getAiHealth = withErrorLogging('getAiHealth', _getAiHealth);
```

- [ ] **Step 6: Commit**
```bash
git add src/lib/actions/admin-stats.ts src/lib/actions/admin-verifications.ts src/lib/actions/admin-users.ts src/lib/actions/admin-subscriptions.ts src/lib/actions/admin-health.ts
git commit -m "feat(console): admin Server Actions (stats/verifications/users/subs/health)"
```

---

## Task 3: Console shell + layout + StatCard

**Files:**
- Create: `src/app/(console)/console/layout.tsx`, `console-shell.tsx`, `src/components/console/StatCard.tsx`

- [ ] **Step 1: layout.tsx (server, admin-gated)**

```tsx
import type { ReactNode } from 'react';
import { requireAdmin } from '@/lib/admin-guard';
import { ConsoleShell } from './console-shell';

export const metadata = { title: 'flori 운영 콘솔' };

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();
  return <ConsoleShell userEmail={user.email || ''}>{children}</ConsoleShell>;
}
```

- [ ] **Step 2: console-shell.tsx (client, dense neutral nav — distinct from florist Rose)**

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const NAV = [
  { href: '/console', label: '개요' },
  { href: '/console/verifications', label: '사업자 인증' },
  { href: '/console/users', label: '유저' },
  { href: '/console/subscriptions', label: '구독' },
  { href: '/console/health', label: 'AI 헬스' },
];

export function ConsoleShell({ userEmail, children }: { userEmail: string; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-semibold tracking-wide">OPS</span>
          <span className="text-sm font-medium">flori 운영 콘솔</span>
        </div>
        <span className="text-xs text-zinc-400">{userEmail}</span>
      </header>
      <div className="flex">
        <nav aria-label="콘솔 내비게이션" className="w-48 shrink-0 border-r border-zinc-800 p-3">
          <ul className="space-y-1">
            {NAV.map((item) => {
              const active = item.href === '/console' ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`block rounded px-3 py-2 text-sm ${active ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: StatCard.tsx**

```tsx
export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs text-zinc-500">{hint}</div> : null}
    </div>
  );
}
```

- [ ] **Step 4: Manual verify** — `npm run dev`, visit `/console` as a non-admin → redirect to `/admin`. (Page added next task.)
- [ ] **Step 5: Commit**
```bash
git add "src/app/(console)" src/components/console/StatCard.tsx
git commit -m "feat(console): admin-gated 콘솔 셸 + 레이아웃 + StatCard"
```

---

## Task 4: Overview page

**Files:** Create `src/app/(console)/console/page.tsx`, `overview-client.tsx`

- [ ] **Step 1: page.tsx (server — fetch overview + AI health)**

```tsx
import { getAdminOverview } from '@/lib/actions/admin-stats';
import { getAiHealth } from '@/lib/actions/admin-health';
import { OverviewClient } from './overview-client';

export default async function ConsoleOverviewPage() {
  const [overview, health] = await Promise.all([getAdminOverview(), getAiHealth()]);
  return <OverviewClient overview={overview} health={health} />;
}
```

- [ ] **Step 2: overview-client.tsx**

```tsx
'use client';
import { StatCard } from '@/components/console/StatCard';
import type { AdminOverview, AiHealthResponse } from '@/types/admin';

const won = (n: number) => `${Math.round(n / 10000).toLocaleString()}만원`;

export function OverviewClient({ overview, health }: { overview: AdminOverview; health: AiHealthResponse }) {
  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">개요</h1>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="전체 가입자" value={overview.users.total} hint={`활성 ${overview.users.active} · 온보딩 ${overview.users.onboarded}`} />
        <StatCard label="매출 입력" value={overview.sales.entryCount} hint={`최근 30일 ${overview.sales.last30dCount}건 · ${won(overview.sales.totalAmount)}`} />
        <StatCard label="구독 활성" value={overview.subscriptions.active} hint={`유예 ${overview.subscriptions.inGrace} · 만료 ${overview.subscriptions.expired}`} />
        <StatCard label="인증 대기" value={overview.verifications.pending} hint={`승인 ${overview.verifications.approved} · 거절 ${overview.verifications.rejected}`} />
      </section>
      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-300">AI 헬스</h2>
        <div className="flex flex-wrap gap-2">
          {health.targets.length === 0 ? (
            <span className="text-sm text-zinc-500">설정된 헬스 타깃이 없습니다.</span>
          ) : (
            health.targets.map((t) => (
              <span key={t.name} className={`rounded px-2 py-1 text-xs ${t.status === 'UP' ? 'bg-emerald-900 text-emerald-200' : 'bg-red-900 text-red-200'}`}>
                {t.name}: {t.status}{t.latencyMs != null ? ` (${t.latencyMs}ms)` : ''}
              </span>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
```
> 금액 표시는 만원 단위(프로젝트 표준).

- [ ] **Step 3: Manual verify** as admin → cards render. **Commit**
```bash
git add "src/app/(console)/console/page.tsx" "src/app/(console)/console/overview-client.tsx"
git commit -m "feat(console): 개요 통계 카드 + AI 헬스 배너"
```

---

## Task 5: Verifications page (tabs + detail dialog + approve/reject)

**Files:** Create `verifications/page.tsx`, `verifications/verifications-client.tsx`

- [ ] **Step 1: page.tsx (default PENDING)**

```tsx
import { listVerifications } from '@/lib/actions/admin-verifications';
import { VerificationsClient } from './verifications-client';

export default async function VerificationsPage() {
  const pending = await listVerifications('PENDING');
  return <VerificationsClient initial={pending} />;
}
```

- [ ] **Step 2: verifications-client.tsx** (Tabs by status; row → Dialog with license preview; approve / reject-with-reason; toast via `sonner`)

```tsx
'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  listVerifications, approveVerification, rejectVerification,
} from '@/lib/actions/admin-verifications';
import type { AdminVerification, VerificationStatus } from '@/types/admin';

export function VerificationsClient({ initial }: { initial: AdminVerification[] }) {
  const [status, setStatus] = useState<VerificationStatus>('PENDING');
  const [rows, setRows] = useState<AdminVerification[]>(initial);
  const [selected, setSelected] = useState<AdminVerification | null>(null);
  const [reason, setReason] = useState('');
  const [pending, startTransition] = useTransition();

  const load = (next: VerificationStatus) => {
    setStatus(next);
    startTransition(async () => setRows(await listVerifications(next)));
  };
  const refresh = () => startTransition(async () => setRows(await listVerifications(status)));

  const onApprove = (v: AdminVerification) =>
    startTransition(async () => {
      try { await approveVerification(v.id); toast.success('승인되었습니다'); setSelected(null); refresh(); }
      catch (e) { toast.error(e instanceof Error ? e.message : '처리 실패'); }
    });
  const onReject = (v: AdminVerification) => {
    if (!reason.trim()) { toast.error('거절 사유를 입력하세요'); return; }
    startTransition(async () => {
      try { await rejectVerification(v.id, reason.trim()); toast.success('거절되었습니다'); setSelected(null); setReason(''); refresh(); }
      catch (e) { toast.error(e instanceof Error ? e.message : '처리 실패'); }
    });
  };

  const isImage = (url: string) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">사업자 인증</h1>
      <Tabs value={status} onValueChange={(v) => load(v as VerificationStatus)}>
        <TabsList>
          <TabsTrigger value="PENDING">대기</TabsTrigger>
          <TabsTrigger value="APPROVED">승인</TabsTrigger>
          <TabsTrigger value="REJECTED">거절</TabsTrigger>
        </TabsList>
      </Tabs>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>상호</TableHead><TableHead>사업자번호</TableHead><TableHead>대표자</TableHead>
            <TableHead>userId</TableHead><TableHead>신청일</TableHead><TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center text-zinc-500">데이터 없음</TableCell></TableRow>
          ) : rows.map((v) => (
            <TableRow key={v.id}>
              <TableCell>{v.businessName}</TableCell>
              <TableCell className="tabular-nums">{v.businessNumber}</TableCell>
              <TableCell>{v.representativeName}</TableCell>
              <TableCell className="tabular-nums">{v.userId}</TableCell>
              <TableCell>{v.submittedAt?.slice(0, 10) ?? '-'}</TableCell>
              <TableCell><Button variant="outline" size="sm" onClick={() => { setSelected(v); setReason(''); }}>상세</Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader><DialogTitle>{selected.businessName}</DialogTitle></DialogHeader>
              <dl className="space-y-1 text-sm">
                <div>사업자번호: <span className="tabular-nums">{selected.businessNumber}</span></div>
                <div>대표자: {selected.representativeName}</div>
                <div>상태: {selected.status}{selected.rejectReason ? ` (${selected.rejectReason})` : ''}</div>
              </dl>
              <div className="my-2">
                {isImage(selected.businessLicenseUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.businessLicenseUrl} alt="사업자등록증" className="max-h-80 rounded border border-zinc-700" />
                ) : (
                  <a href={selected.businessLicenseUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 underline">등록증 파일 열기 (PDF)</a>
                )}
              </div>
              {selected.status === 'PENDING' && (
                <>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="거절 사유 (거절 시 필수)" />
                  <DialogFooter className="gap-2">
                    <Button variant="outline" disabled={pending} onClick={() => onReject(selected)}>거절</Button>
                    <Button disabled={pending} onClick={() => onApprove(selected)}>승인</Button>
                  </DialogFooter>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```
> The license host must be allowed for `next/image`; we use a plain `<img>` (CloudFront URL) to avoid remote-pattern config. CSP `img-src` already permits `STORAGE_PUBLIC_URL` (verify in `next.config.ts`).

- [ ] **Step 3: Manual verify** — PENDING list → 상세 → approve moves it out of PENDING; reject requires reason. **Commit**
```bash
git add "src/app/(console)/console/verifications"
git commit -m "feat(console): 사업자 인증 심사 화면(탭/상세/승인·거절)"
```

---

## Task 6: Users page (search + paginate + active toggle dialog)

**Files:** Create `users/page.tsx`, `users/users-client.tsx`

- [ ] **Step 1: page.tsx**

```tsx
import { listAdminUsers } from '@/lib/actions/admin-users';
import { UsersClient } from './users-client';

export default async function UsersPage() {
  const first = await listAdminUsers('', 0);
  return <UsersClient initial={first} />;
}
```

- [ ] **Step 2: users-client.tsx** (Input search, Table, status Badges, active toggle confirm Dialog, prev/next)

```tsx
'use client';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { listAdminUsers, setUserActive } from '@/lib/actions/admin-users';
import type { AdminUserPage, AdminUserRow } from '@/types/admin';

export function UsersClient({ initial }: { initial: AdminUserPage }) {
  const [data, setData] = useState<AdminUserPage>(initial);
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState<AdminUserRow | null>(null);
  const [pending, startTransition] = useTransition();

  const fetchPage = (q: string, page: number) =>
    startTransition(async () => setData(await listAdminUsers(q, page)));

  const onSearch = (e: React.FormEvent) => { e.preventDefault(); fetchPage(query, 0); };

  const confirmToggle = () => {
    if (!target) return;
    startTransition(async () => {
      try {
        await setUserActive(target.id, !target.isActive);
        toast.success(target.isActive ? '비활성화했습니다' : '활성화했습니다');
        setTarget(null);
        fetchPage(query, data.page);
      } catch (e) { toast.error(e instanceof Error ? e.message : '처리 실패'); }
    });
  };

  const maxPage = Math.max(0, Math.ceil(data.total / data.size) - 1);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">유저 ({data.total})</h1>
      <form onSubmit={onSearch} className="flex gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이메일·닉네임 검색" className="max-w-xs" />
        <Button type="submit" variant="outline" disabled={pending}>검색</Button>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>id</TableHead><TableHead>이메일</TableHead><TableHead>닉네임</TableHead><TableHead>가게</TableHead>
            <TableHead>구독</TableHead><TableHead>인증</TableHead><TableHead>활성</TableHead><TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="tabular-nums">{u.id}</TableCell>
              <TableCell>{u.email ?? '-'}</TableCell>
              <TableCell>{u.nickname ?? '-'}</TableCell>
              <TableCell>{u.storeName ?? '-'}</TableCell>
              <TableCell>{u.subscriptionStatus ?? '-'}</TableCell>
              <TableCell>{u.verificationStatus ?? '-'}</TableCell>
              <TableCell>{u.isActive ? '✅' : '⛔'}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" disabled={u.isAdmin} onClick={() => setTarget(u)}>
                  {u.isActive ? '비활성화' : '활성화'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center gap-2 text-sm">
        <Button variant="outline" size="sm" disabled={data.page <= 0 || pending} onClick={() => fetchPage(query, data.page - 1)}>이전</Button>
        <span className="text-zinc-400">{data.page + 1} / {maxPage + 1}</span>
        <Button variant="outline" size="sm" disabled={data.page >= maxPage || pending} onClick={() => fetchPage(query, data.page + 1)}>다음</Button>
      </div>

      <Dialog open={!!target} onOpenChange={(o) => { if (!o) setTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{target?.isActive ? '계정 비활성화' : '계정 활성화'}</DialogTitle>
            <DialogDescription>{target?.email} ({target?.id}) 계정을 {target?.isActive ? '비활성화' : '활성화'}합니다.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTarget(null)}>취소</Button>
            <Button disabled={pending} onClick={confirmToggle}>확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 3: Manual verify** — search, paginate, toggle (admin rows disabled). **Commit**
```bash
git add "src/app/(console)/console/users"
git commit -m "feat(console): 유저 dense 테이블(검색/페이지네이션/active 토글)"
```

---

## Task 7: Subscriptions page + Health page

**Files:** Create `subscriptions/page.tsx` + `subscriptions-client.tsx`, `health/page.tsx` + `health-client.tsx`

- [ ] **Step 1: subscriptions/page.tsx**

```tsx
import { listSubscriptions } from '@/lib/actions/admin-subscriptions';
import { SubscriptionsClient } from './subscriptions-client';

export default async function SubscriptionsPage() {
  const rows = await listSubscriptions();
  return <SubscriptionsClient rows={rows} />;
}
```

- [ ] **Step 2: subscriptions-client.tsx**

```tsx
'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AdminSubscriptionRow } from '@/types/admin';

export function SubscriptionsClient({ rows }: { rows: AdminSubscriptionRow[] }) {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">구독 ({rows.length})</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>userId</TableHead><TableHead>상태</TableHead><TableHead>스토어</TableHead>
            <TableHead>상품</TableHead><TableHead>권한</TableHead><TableHead>만료</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((s) => (
            <TableRow key={s.userId}>
              <TableCell className="tabular-nums">{s.userId}</TableCell>
              <TableCell>{s.status}</TableCell>
              <TableCell>{s.store}</TableCell>
              <TableCell>{s.productId}</TableCell>
              <TableCell>{s.entitlement}</TableCell>
              <TableCell>{s.currentPeriodEnd?.slice(0, 10) ?? '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 3: health/page.tsx + health-client.tsx (manual refresh)**

```tsx
// health/page.tsx
import { getAiHealth } from '@/lib/actions/admin-health';
import { HealthClient } from './health-client';

export default async function HealthPage() {
  const health = await getAiHealth();
  return <HealthClient initial={health} />;
}
```
```tsx
// health/health-client.tsx
'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { getAiHealth } from '@/lib/actions/admin-health';
import type { AiHealthResponse } from '@/types/admin';

export function HealthClient({ initial }: { initial: AiHealthResponse }) {
  const [health, setHealth] = useState(initial);
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">AI 헬스</h1>
        <Button variant="outline" size="sm" disabled={pending}
          onClick={() => startTransition(async () => setHealth(await getAiHealth()))}>새로고침</Button>
      </div>
      {health.targets.length === 0 ? (
        <p className="text-sm text-zinc-500">설정된 헬스 타깃이 없습니다 (AI_HEALTH_* 환경변수 미설정).</p>
      ) : (
        <ul className="space-y-2">
          {health.targets.map((t) => (
            <li key={t.name} className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900 px-4 py-3">
              <span className="font-medium">{t.name}</span>
              <span className={t.status === 'UP' ? 'text-emerald-400' : 'text-red-400'}>
                {t.status}{t.latencyMs != null ? ` · ${t.latencyMs}ms` : ''}{t.detail ? ` · ${t.detail}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Manual verify** both pages. **Commit**
```bash
git add "src/app/(console)/console/subscriptions" "src/app/(console)/console/health"
git commit -m "feat(console): 구독 목록 + AI 헬스 패널"
```

---

## Task 8: Lint + test + E2E verification

- [ ] **Step 1:** `npm run lint` → fix.
- [ ] **Step 2:** `npm test` → green.
- [ ] **Step 3: E2E (manual, with server running + admin bootstrap applied):**
  - Non-admin account → visit `/console` → redirected to `/admin`. (evidence: screenshot/redirect)
  - Admin account → `/console` shows stat cards; `/console/verifications` PENDING approve reflects (count drops, Discord notice); `/console/users` active toggle flips.
- [ ] **Step 4: Commit any fixes**, then run `/feature-finalize` (or `--merge`).

---

## Self-Review Notes (author)

- **Spec coverage:** guard+middleware(T1), actions(T2), shell(T3), overview+AI banner(T4), verification approve/reject(T5), users+active(T6), subscriptions+health(T7), lint/test/E2E(T8). All spec §5 items covered.
- **Type consistency:** action names (`getAdminOverview`, `listVerifications`, `approveVerification`, `rejectVerification`, `listAdminUsers`, `setUserActive`, `listSubscriptions`, `getAiHealth`) used identically in pages. DTO field names match `src/types/admin.ts` and the server DTOs in the server plan.
- **Pre-impl checks:** (1) confirm `STORAGE_PUBLIC_URL` host is in CSP `img-src` in `next.config.ts` for the license `<img>`; (2) confirm `sonner` Toaster is mounted globally (it is for admin — verify it also covers `(console)` or add `<Toaster/>` to console layout); (3) server endpoints from the server plan must be deployed before E2E.
- **Cross-cutting:** `apiFetch` maps 403→UNAUTHORIZED, so the guard redirect works; the server `@RequiresAdmin` is the authoritative gate.
```
