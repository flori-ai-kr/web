# 이미지 스토리지 쿼터 (web UI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 점주에게 갤러리 스토리지 사용량·90% 경고·증설 요청 UI를 제공하고, 운영자 콘솔에 증설 요청 목록·quota 상향 화면을 추가한다 (api 백엔드는 완성됨).

**Architecture:** Next.js 16 App Router + Server Actions(`apiFetch`로 Kotlin BFF 호출). 점주 UI는 `(admin)/admin/gallery`에, 운영자 UI는 `(console)/console/storage`에. 기존 패턴(inquiries 콘솔 화면 · 갤러리 업로드 모달 · shadcn/ui)을 그대로 미러한다.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind + shadcn/ui, sonner(toast), Server Actions, vitest(단위), eslint.

## Global Constraints

- **실제 api 계약(절대 준수 — 지어내지 말 것):**
  - 점주: `GET /storage/usage` → `{ usedBytes:number, quotaBytes:number, percent:number, status:'OK'|'WARN'|'FULL' }`
  - 점주: `POST /storage/increase-request` body `{ reason?:string }` → `{ id:number, status:'PENDING'|'RESOLVED', reason:string|null, resolvedBytes:number|null, createdAt:string }` (201)
  - 운영자: `GET /admin/storage/requests?status=&page=&size=` → `AdminStorageRequest[]` = `{ id, userId, nickname:string|null, storeName:string|null, reason:string|null, status:'PENDING'|'RESOLVED', usedBytes, quotaBytes, createdAt }`
  - 운영자: `PATCH /admin/storage/users/{userId}/quota` body `{ quotaBytes:number }`(양수, **절대 바이트값**) → `StorageUsage`(`{usedBytes,quotaBytes,percent,status}`). **이 호출이 해당 유저 PENDING 요청을 자동 RESOLVED 처리한다.**
  - ❌ **존재하지 않는 것**: approve/reject 엔드포인트, "요청 용량(requestedQuota)", rejectReason, approvedBy. 상태는 **PENDING|RESOLVED 둘뿐**. 운영자는 "거절"이 아니라 "quota를 올려줌(=RESOLVED)" 또는 그냥 둠.
- **데이터 접근**: 모든 BFF 호출은 `src/lib/api/client.ts`의 `apiFetch<T>(path, init)`. Server Action은 `'use server'` + 점주용은 `requireAuth()`, 운영자용은 `requireAdmin()`(`src/lib/admin-guard.ts`) 가드 + `withErrorLogging()` 래핑 + 변경 시 `revalidatePath()`.
- **에러**: 4xx는 서버 메시지가 `AppError.message`로 전달됨(`toAppError`). UI는 `toast.error(e instanceof Error ? e.message : '...')`. 쿼터 초과(E-STG-001=409)도 이 경로로 서버 메시지("저장 용량이 부족합니다...")가 토스트로 노출됨.
- **UI 컴포넌트**: shadcn/ui 재사용 — `Progress`, `Dialog`, `Button`, `Input`, `Textarea`, `Label`, `Table`, `Tabs`, `sonner` toast. 운영자 배지는 `src/components/console/status-badge.tsx`의 `StatusBadge`(tone: success|warning|danger|info|muted). 색상은 globals.css 토큰(`--warning`,`--danger`,`--brand` 등) 사용.
- **미러 대상(반드시 먼저 읽고 구조를 따른다):**
  - 운영자 화면: `src/app/(console)/console/inquiries/{page.tsx,inquiries-client.tsx,inquiry-detail-dialog.tsx,inquiry-meta.tsx}` + 액션 `src/lib/actions/admin-inquiries.ts`
  - 점주 갤러리/업로드: `src/app/(admin)/admin/gallery/gallery-client.tsx`, `src/app/(admin)/admin/gallery/components/photo-upload-modal.tsx`, `src/lib/photo-upload.ts`
  - 타입: `src/types/admin.ts`(운영자 DTO 추가 위치)
- **검증**: 각 태스크 후 `npm run lint` + `npm run build`(타입체크 포함) 통과. 단위 로직은 `npm run test`(vitest). UI는 빌드 통과 + 수동 스모크 노트.
- **작업 디렉토리**: `/Users/hansangho/Desktop/flori-ai/web-session2-storage-quota` (branch `session2-storage-quota`). node_modules 설치됨.
- **커밋**: `git add -A` 금지(변경 파일만). 한국어 conventional commit. `Co-Authored-By: Claude <noreply@anthropic.com>`.

---

## File Structure

**신규**
- `src/lib/format-bytes.ts` — 바이트 → 사람이 읽는 문자열(GB/MB) + GB↔bytes 변환
- `src/lib/__tests__/format-bytes.test.ts` — vitest
- `src/lib/actions/storage.ts` — 점주: getStorageUsage, requestStorageIncrease
- `src/lib/actions/admin-storage.ts` — 운영자: listStorageRequests, updateUserQuota
- `src/app/(admin)/admin/gallery/components/storage-usage-panel.tsx` — 점주 사용량 바 + 경고 + 증설요청 트리거
- `src/app/(admin)/admin/gallery/components/storage-increase-dialog.tsx` — 점주 증설요청 모달(사유)
- `src/app/(console)/console/storage/page.tsx` — 운영자 페이지(서버)
- `src/app/(console)/console/storage/storage-client.tsx` — 운영자 목록 + 탭
- `src/app/(console)/console/storage/storage-detail-dialog.tsx` — 운영자 상세 + quota 상향
- `src/app/(console)/console/storage/storage-meta.tsx` — 상태 배지(PENDING/RESOLVED)

**수정**
- `src/types/admin.ts` — `StorageRequestStatus`, `AdminStorageRequest` 추가
- `src/app/(admin)/admin/gallery/gallery-client.tsx` 또는 `photo-upload-modal.tsx` — StorageUsagePanel 삽입
- `src/components/console/console-sidebar.tsx` — `/console/storage` 네비 추가(운영 그룹)
- `src/components/console/console-shell.tsx` — META에 `/console/storage` 제목/부제

---

## Task 1: 바이트 포맷 유틸 + 타입 + 서버 액션 (데이터 레이어)

**Files:**
- Create: `src/lib/format-bytes.ts`, `src/lib/__tests__/format-bytes.test.ts`
- Create: `src/lib/actions/storage.ts`, `src/lib/actions/admin-storage.ts`
- Modify: `src/types/admin.ts`

**Interfaces (Produces):**
- `formatBytes(bytes:number): string`, `gbToBytes(gb:number): number`, `bytesToGb(bytes:number): number`
- 타입 `StorageUsage`, `StorageRequestSummary`(점주), `StorageRequestStatus`, `AdminStorageRequest`
- 액션 `getStorageUsage()`, `requestStorageIncrease(reason?)`, `listStorageRequests(status?)`, `updateUserQuota(userId, quotaBytes)`

- [ ] **Step 1: 실패 테스트(포맷 유틸)**

Create `src/lib/__tests__/format-bytes.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { formatBytes, gbToBytes, bytesToGb } from '@/lib/format-bytes';

describe('format-bytes', () => {
  it('GiB 단위로 사람이 읽게 표시', () => {
    expect(formatBytes(3 * 1024 ** 3)).toBe('3.0GB');
    expect(formatBytes(1.5 * 1024 ** 3)).toBe('1.5GB');
  });
  it('1GB 미만은 MB', () => {
    expect(formatBytes(500 * 1024 ** 2)).toBe('500MB');
    expect(formatBytes(0)).toBe('0MB');
  });
  it('GB↔bytes 변환', () => {
    expect(gbToBytes(3)).toBe(3 * 1024 ** 3);
    expect(bytesToGb(3 * 1024 ** 3)).toBe(3);
  });
});
```

- [ ] **Step 2: 실패 확인** — `npm run test -- format-bytes` → FAIL(모듈 없음).

- [ ] **Step 3: 유틸 구현**

Create `src/lib/format-bytes.ts`:
```typescript
const GIB = 1024 ** 3;
const MIB = 1024 ** 2;

/** 바이트 → 사람이 읽는 문자열. 1GiB 이상은 "x.xGB", 미만은 "xMB"(정수). */
export function formatBytes(bytes: number): string {
  if (bytes >= GIB) return `${(bytes / GIB).toFixed(1)}GB`;
  return `${Math.round(bytes / MIB)}MB`;
}

export function gbToBytes(gb: number): number {
  return Math.round(gb * GIB);
}

export function bytesToGb(bytes: number): number {
  return bytes / GIB;
}
```

- [ ] **Step 4: 테스트 통과** — `npm run test -- format-bytes` → PASS.

- [ ] **Step 5: 타입 추가**

`src/types/admin.ts` 하단에 추가(기존 SupportInquiry 등과 같은 스타일):
```typescript
// ── 스토리지 쿼터 ──────────────────────────────────────────
export type StorageRequestStatus = 'PENDING' | 'RESOLVED';

export interface AdminStorageRequest {
  id: number;
  userId: number;
  nickname: string | null;
  storeName: string | null;
  reason: string | null;
  status: StorageRequestStatus;
  usedBytes: number;
  quotaBytes: number;
  createdAt: string;
}
```

점주용 타입은 액션 파일 상단에 두거나 `src/types/`에 둔다(프로젝트 관례 따름):
```typescript
export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
  percent: number;
  status: 'OK' | 'WARN' | 'FULL';
}
export interface StorageRequestSummary {
  id: number;
  status: 'PENDING' | 'RESOLVED';
  reason: string | null;
  resolvedBytes: number | null;
  createdAt: string;
}
```

- [ ] **Step 6: 점주 서버 액션**

Create `src/lib/actions/storage.ts` (미러: `src/lib/actions/admin-inquiries.ts`의 구조, 단 가드는 `requireAuth`):
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-guard';
import { apiFetch } from '@/lib/api/client';
import { withErrorLogging } from '@/lib/errors';
import type { StorageUsage, StorageRequestSummary } from '@/types/storage';

async function _getStorageUsage(): Promise<StorageUsage> {
  await requireAuth();
  return apiFetch<StorageUsage>('/storage/usage');
}
export const getStorageUsage = withErrorLogging('getStorageUsage', _getStorageUsage);

async function _requestStorageIncrease(reason?: string): Promise<StorageRequestSummary> {
  await requireAuth();
  const res = await apiFetch<StorageRequestSummary>('/storage/increase-request', {
    method: 'POST',
    body: JSON.stringify({ reason: reason ?? null }),
  });
  revalidatePath('/admin/gallery');
  return res;
}
export const requestStorageIncrease = withErrorLogging('requestStorageIncrease', _requestStorageIncrease);
```
(타입 위치는 프로젝트 관례에 맞춰 `@/types/storage` 신설 또는 `@/types/admin`에 함께 둘 수 있음 — 실제 구조 확인 후 import 경로 맞출 것.)

- [ ] **Step 7: 운영자 서버 액션**

Create `src/lib/actions/admin-storage.ts` (미러: `admin-inquiries.ts`, 가드 `requireAdmin`):
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import { AppError, ErrorCode, withErrorLogging } from '@/lib/errors';
import type { AdminStorageRequest, StorageRequestStatus } from '@/types/admin';
import type { StorageUsage } from '@/types/storage';

async function _listStorageRequests(status?: StorageRequestStatus): Promise<AdminStorageRequest[]> {
  await requireAdmin();
  const qs = new URLSearchParams({ page: '0', size: '50' });
  if (status) qs.set('status', status);
  return apiFetch<AdminStorageRequest[]>(`/admin/storage/requests?${qs.toString()}`);
}
export const listStorageRequests = withErrorLogging('listStorageRequests', _listStorageRequests);

/** 유저 quota를 절대 바이트값으로 상향. 서버가 해당 유저 PENDING 요청을 자동 RESOLVED 처리한다. */
async function _updateUserQuota(userId: number, quotaBytes: number): Promise<StorageUsage> {
  await requireAdmin();
  if (!Number.isInteger(userId) || userId <= 0) throw new AppError(ErrorCode.VALIDATION, '유효하지 않은 사용자입니다');
  if (!Number.isFinite(quotaBytes) || quotaBytes <= 0) throw new AppError(ErrorCode.VALIDATION, '유효하지 않은 용량입니다');
  const res = await apiFetch<StorageUsage>(`/admin/storage/users/${userId}/quota`, {
    method: 'PATCH',
    body: JSON.stringify({ quotaBytes }),
  });
  revalidatePath('/console/storage');
  return res;
}
export const updateUserQuota = withErrorLogging('updateUserQuota', _updateUserQuota);
```

- [ ] **Step 8: lint+build+commit**

Run: `npm run lint && npm run build`
Expected: 통과(타입 OK).
```bash
git add src/lib/format-bytes.ts src/lib/__tests__/format-bytes.test.ts \
        src/lib/actions/storage.ts src/lib/actions/admin-storage.ts \
        src/types/admin.ts src/types/storage.ts
git commit -m "feat(storage-web): 바이트 유틸 + 점주/운영자 스토리지 서버 액션 + 타입"
```

---

## Task 2: 점주 갤러리 사용량 패널 + 증설요청 모달

**Files:**
- Create: `src/app/(admin)/admin/gallery/components/storage-usage-panel.tsx`
- Create: `src/app/(admin)/admin/gallery/components/storage-increase-dialog.tsx`
- Modify: `src/app/(admin)/admin/gallery/components/photo-upload-modal.tsx` (또는 `gallery-client.tsx`) — 패널 삽입

**Interfaces:** Consumes Task1 액션/유틸. Produces `<StorageUsagePanel />`.

- [ ] **Step 1: 사용량 패널 컴포넌트**

Create `storage-usage-panel.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { getStorageUsage } from '@/lib/actions/storage';
import { formatBytes } from '@/lib/format-bytes';
import type { StorageUsage } from '@/types/storage';
import { StorageIncreaseDialog } from './storage-increase-dialog';

export function StorageUsagePanel() {
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const refresh = () => { getStorageUsage().then(setUsage).catch(() => {}); };
  useEffect(() => { refresh(); }, []);

  if (!usage) return null;
  const warn = usage.status === 'WARN' || usage.status === 'FULL';

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">저장 용량</span>
        <span className="text-muted-foreground tabular-nums">
          {formatBytes(usage.usedBytes)} / {formatBytes(usage.quotaBytes)} ({usage.percent}%)
        </span>
      </div>
      <Progress value={Math.min(usage.percent, 100)} className={usage.status === 'FULL' ? '[&>div]:bg-danger' : warn ? '[&>div]:bg-warning' : ''} />
      {warn && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-warning/30 bg-warning-soft p-2">
          <p className="text-xs text-warning">
            {usage.status === 'FULL' ? '저장 용량이 가득 찼어요. 증설을 요청해 주세요.' : '저장 용량이 거의 찼어요(90%+).'}
          </p>
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>증설 요청</Button>
        </div>
      )}
      <StorageIncreaseDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onDone={refresh} />
    </div>
  );
}
```
(Progress 인디케이터 색 오버라이드 셀렉터는 실제 `components/ui/progress.tsx` 구조(`data-slot="progress-indicator"`)에 맞춰 조정 — 안 되면 래퍼 div 색으로 대체.)

- [ ] **Step 2: 증설요청 모달**

Create `storage-increase-dialog.tsx` (미러: 기존 Dialog 사용 모달):
```tsx
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { requestStorageIncrease } from '@/lib/actions/storage';

export function StorageIncreaseDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await requestStorageIncrease(reason.trim() || undefined);
      toast.success('증설 요청을 접수했어요. 운영팀이 확인 후 처리합니다.');
      setReason('');
      onClose();
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '요청에 실패했어요');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>저장 용량 증설 요청</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>요청 사유 (선택)</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} rows={4}
            placeholder="예: 사진이 많아 용량이 부족합니다" />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>취소</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? '요청 중...' : '요청 보내기'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: 갤러리에 패널 삽입**

`gallery-client.tsx`(또는 업로드 모달 상단)에 `<StorageUsagePanel />`를 적절한 위치(갤러리 헤더 영역 또는 업로드 모달 최상단)에 렌더. 기존 레이아웃을 깨지 않게 import + 1줄 삽입. 업로드 차단(쿼터 초과) 시엔 기존 업로드 에러 핸들링이 서버 메시지를 토스트로 띄우므로 추가 처리 불필요(패널의 증설요청 버튼이 경로 제공).

- [ ] **Step 4: lint+build+commit**

Run: `npm run lint && npm run build`
```bash
git add src/app/(admin)/admin/gallery/components/storage-usage-panel.tsx \
        src/app/(admin)/admin/gallery/components/storage-increase-dialog.tsx \
        src/app/(admin)/admin/gallery/components/photo-upload-modal.tsx
# (gallery-client.tsx를 수정했으면 그것도 add)
git commit -m "feat(storage-web): 점주 갤러리 사용량 패널 + 증설요청 모달"
```

---

## Task 3: 운영자 콘솔 스토리지 페이지

**Files:**
- Create: `src/app/(console)/console/storage/page.tsx`, `storage-client.tsx`, `storage-detail-dialog.tsx`, `storage-meta.tsx`
- Modify: `src/components/console/console-sidebar.tsx`, `src/components/console/console-shell.tsx`

**Interfaces:** Consumes Task1 운영자 액션/타입/유틸. **inquiries 콘솔 화면을 그대로 미러**한다(읽고 구조 동일하게).

- [ ] **Step 1: 상태 배지(meta)**

Create `storage-meta.tsx`:
```tsx
import { StatusBadge } from '@/components/console/status-badge';
import type { StorageRequestStatus } from '@/types/admin';

const META: Record<StorageRequestStatus, { tone: 'warning' | 'success'; label: string }> = {
  PENDING: { tone: 'warning', label: '대기' },
  RESOLVED: { tone: 'success', label: '처리됨' },
};

export function StorageStatusBadge({ status }: { status: StorageRequestStatus }) {
  const m = META[status];
  return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
}
```

- [ ] **Step 2: page.tsx (서버)**

```tsx
import { listStorageRequests } from '@/lib/actions/admin-storage';
import { StorageClient } from './storage-client';

export default async function StoragePage() {
  const initial = await listStorageRequests();
  return <StorageClient initial={initial} />;
}
```

- [ ] **Step 3: storage-client.tsx (목록 + 탭)** — `inquiries-client.tsx` 미러. 탭: 전체/대기(PENDING)/처리됨(RESOLVED). 테이블 컬럼: 가게명, 작성자(nickname), 사유(truncate), 사용량(`formatBytes(usedBytes)/formatBytes(quotaBytes)`), 상태(StorageStatusBadge), 요청일(createdAt.slice(0,10)). 행 클릭 → `setSelected`. `useTransition`으로 탭 전환 시 `listStorageRequests(status)` 재조회.

```tsx
'use client';
import { useState, useTransition } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { listStorageRequests } from '@/lib/actions/admin-storage';
import { formatBytes } from '@/lib/format-bytes';
import type { AdminStorageRequest, StorageRequestStatus } from '@/types/admin';
import { StorageStatusBadge } from './storage-meta';
import { StorageDetailDialog } from './storage-detail-dialog';

type Filter = StorageRequestStatus | 'all';
const TABS: { value: Filter; label: string }[] = [
  { value: 'all', label: '전체' }, { value: 'PENDING', label: '대기' }, { value: 'RESOLVED', label: '처리됨' },
];

export function StorageClient({ initial }: { initial: AdminStorageRequest[] }) {
  const [status, setStatus] = useState<Filter>('all');
  const [rows, setRows] = useState<AdminStorageRequest[]>(initial);
  const [selected, setSelected] = useState<AdminStorageRequest | null>(null);
  const [pending, startTransition] = useTransition();

  const load = (next: Filter) => {
    setStatus(next);
    startTransition(async () => setRows(await listStorageRequests(next === 'all' ? undefined : next)));
  };
  const refresh = () => startTransition(async () => setRows(await listStorageRequests(status === 'all' ? undefined : status)));

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">스토리지 증설요청</h1>
      <Tabs value={status} onValueChange={(v) => load(v as Filter)}>
        <TabsList>{TABS.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}</TabsList>
      </Tabs>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>가게명</TableHead><TableHead>작성자</TableHead><TableHead>사유</TableHead>
            <TableHead>사용량</TableHead><TableHead>상태</TableHead><TableHead>요청일</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">요청이 없습니다</TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.id} onClick={() => setSelected(r)} className="cursor-pointer hover:bg-muted/40">
                <TableCell>{r.storeName ?? '-'}</TableCell>
                <TableCell>{r.nickname ?? `user_${r.userId}`}</TableCell>
                <TableCell className="max-w-xs truncate">{r.reason ?? '-'}</TableCell>
                <TableCell className="tabular-nums">{formatBytes(r.usedBytes)} / {formatBytes(r.quotaBytes)}</TableCell>
                <TableCell><StorageStatusBadge status={r.status} /></TableCell>
                <TableCell className="tabular-nums">{r.createdAt.slice(0, 10)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <StorageDetailDialog request={selected} pending={pending} onClose={() => setSelected(null)} onDone={() => { setSelected(null); refresh(); }} />
    </div>
  );
}
```

- [ ] **Step 4: storage-detail-dialog.tsx (상세 + quota 상향)**

상세: 가게명/작성자/사유/현재 사용량·한도 표시. PENDING이면 "새 한도(GB)" 입력 → `updateUserQuota(userId, gbToBytes(gb))` → 성공 토스트 + onDone. **거절 없음.** (RESOLVED면 입력 숨기고 읽기만.)
```tsx
'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateUserQuota } from '@/lib/actions/admin-storage';
import { formatBytes, gbToBytes, bytesToGb } from '@/lib/format-bytes';
import type { AdminStorageRequest } from '@/types/admin';
import { StorageStatusBadge } from './storage-meta';

export function StorageDetailDialog({ request, pending, onClose, onDone }:
  { request: AdminStorageRequest | null; pending: boolean; onClose: () => void; onDone: () => void }) {
  const [gb, setGb] = useState('');
  useEffect(() => { if (request) setGb(String(Math.max(Math.ceil(bytesToGb(request.quotaBytes)) + 1, 1))); }, [request]);
  if (!request) return null;

  const apply = async () => {
    const n = Number(gb);
    if (!Number.isFinite(n) || n <= 0) { toast.error('새 한도(GB)를 입력하세요'); return; }
    try {
      await updateUserQuota(request.userId, gbToBytes(n));
      toast.success('용량을 상향했어요. 대기 요청이 처리됨으로 바뀝니다.');
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : '처리 실패'); }
  };

  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><StorageStatusBadge status={request.status} />증설요청 #{request.id}</DialogTitle></DialogHeader>
        <dl className="space-y-2 text-sm">
          <div><dt className="text-xs text-muted-foreground">가게 / 작성자</dt><dd>{request.storeName ?? '-'} · {request.nickname ?? `user_${request.userId}`}</dd></div>
          <div><dt className="text-xs text-muted-foreground">현재 사용량</dt><dd className="tabular-nums">{formatBytes(request.usedBytes)} / {formatBytes(request.quotaBytes)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">사유</dt><dd className="whitespace-pre-wrap rounded bg-muted/40 p-2">{request.reason ?? '(없음)'}</dd></div>
        </dl>
        {request.status === 'PENDING' && (
          <div className="space-y-2 border-t pt-3">
            <Label>새 한도 (GB)</Label>
            <Input type="number" min="1" value={gb} onChange={(e) => setGb(e.target.value)} />
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={pending}>닫기</Button>
          {request.status === 'PENDING' && <Button onClick={apply} disabled={pending}>용량 상향</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: 사이드바 + shell 네비 추가**

`console-sidebar.tsx`의 '운영' 그룹 items에 `{ href: '/console/storage', label: '스토리지 증설', icon: HardDrive }` 추가(+ `HardDrive` lucide import). `console-shell.tsx`의 META에 `'/console/storage': { title: '스토리지 증설', subtitle: '증설 요청 · 용량 상향' }` 추가.

- [ ] **Step 6: lint+build+commit**

Run: `npm run lint && npm run build`
```bash
git add src/app/(console)/console/storage/page.tsx \
        src/app/(console)/console/storage/storage-client.tsx \
        src/app/(console)/console/storage/storage-detail-dialog.tsx \
        src/app/(console)/console/storage/storage-meta.tsx \
        src/components/console/console-sidebar.tsx \
        src/components/console/console-shell.tsx
git commit -m "feat(storage-web): 운영자 콘솔 증설요청 목록 + quota 상향 화면"
```

---

## Task 4: 전체 검증

- [ ] **Step 1:** `npm run lint` → 0 errors.
- [ ] **Step 2:** `npm run build` → 성공(타입체크 통과, 신규 라우트 `/console/storage` 빌드됨).
- [ ] **Step 3:** `npm run test` → 기존 + format-bytes 통과.
- [ ] **Step 4: 수동 스모크 노트**(report에 기록): 점주 갤러리에서 사용량 패널 노출/90%+ 경고+증설요청, 운영자 `/console/storage` 목록·탭·상세·quota 상향 동작은 dev 환경 연동 후 사용자 확인 항목으로 명시(자동 검증 범위 밖).

---

## Self-Review (작성자 점검)
- **api 계약 정합:** 점주 GET/POST·운영자 GET/PATCH(quotaBytes 절대값)만 사용. approve/reject·requestedQuota 등 가공의 엔드포인트/필드 **불포함**. 상태 PENDING|RESOLVED 한정.
- **플레이스홀더:** 데이터레이어(유틸·액션·타입)는 완전 코드. UI 컴포넌트는 완전 코드 골격 + "inquiries/gallery 미러" 지시 — 구현자는 해당 실제 파일을 읽어 import 경로·컴포넌트 props를 맞춘다.
- **불확실(구현 시 확인):** 점주 타입 위치(`@/types/storage` 신설 vs admin 합치기), Progress 색 오버라이드 셀렉터, 갤러리 패널 삽입 정확 위치, `requireAuth`/`requireAdmin`/`apiFetch`/`withErrorLogging` 정확 export 시그니처(기존 액션 파일로 확인).

## 후속/범위 밖
- E-STG-001 업로드 차단 시 전용 인라인 UI(현재는 서버 메시지 토스트 + 패널 증설요청으로 충분).
- 사용량 패널 실시간 폴링/낙관적 갱신(현재 모달 열 때·요청 후 refresh).
