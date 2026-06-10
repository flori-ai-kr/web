# Console Redesign — Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** Rebuild `/console/*` on flori admin design tokens (light + theme-aware), onetime-style shell, with stat comparison + trend charts, date filter, and a user detail drilldown.

**Architecture:** Replace the bespoke `zinc` dark shell with token-based `components/console/*` (Sidebar + Topbar + Shell). Pages are Server Components calling Server Actions; charts via `recharts`. Stats degrade gracefully when the server boost (separate plan) isn't deployed.

**Tech Stack:** Next 16, React 19, Tailwind v4 (semantic tokens in `globals.css`), shadcn/ui, recharts, lucide-react, Vitest.

**Spec:** `docs/plans/26-06-03-console-redesign-design.md` · **Mockup:** `docs/mockups/console-redesign-mockup.html`
**Worktree:** `.claude/worktrees/console-redesign` (branch `worktree-console-redesign`, off dev).

**Conventions:** tokens only (no `zinc-*`/hardcoded hex); Korean UI; deletes/mutations via Dialog; a11y attrs; no `transition-all`; Server Action `_fn` + `withErrorLogging`. Run: `npm run dev` (:3100), `npm run lint`, `npm test`, `npm run build`.

---

## File Structure
```
src/app/globals.css                         # + console status color tokens (success/warn/danger)
src/components/console/
  ConsoleShell.tsx        # client: sidebar+topbar+content (replaces console-shell.tsx)
  ConsoleSidebar.tsx      # grouped nav + mobile Sheet
  ConsoleTopbar.tsx       # title/sub, timestamp, refresh, theme, avatar, back-link
  StatCard.tsx            # value + change% + icon (rewrite)
  TrendChart.tsx          # recharts line/bar wrapper + empty state
  StatusBadge.tsx         # subscription/verification badge mapper
src/app/(console)/console/
  layout.tsx              # requireAdmin + <ConsoleShell> (edit)
  page.tsx + overview-client.tsx       # date filter, cards, charts, health
  verifications/… users/… subscriptions/… health/…   # retokenize clients
  users/[id]/page.tsx + user-detail-client.tsx        # drilldown
src/lib/actions/admin-stats.ts            # +range, +timeseries
src/lib/actions/admin-users.ts            # +getAdminUserDetail
src/types/admin.ts                        # +comparison/timeseries/detail/range
```

---

## Task 1: Status color tokens + delete old shell
**Files:** Modify `src/app/globals.css`; delete `src/app/(console)/console/console-shell.tsx` (replaced in Task 2).

- [ ] **Step 1: Add console status tokens** to `globals.css` `:root` (after `--sage-muted`), and `.dark` equivalents.
```css
/* :root */
--ok: #3F8F5B;        --ok-bg: #EAF4ED;
--warn: #B5852A;      --warn-bg: #FBF2DF;
--danger: #C0492F;    --danger-bg: #FBEDE9;
/* .dark */
--ok:#6FBF8A; --ok-bg:#22302722; --warn:#D8AE5C; --warn-bg:#3A2F1A33; --danger:#E08368; --danger-bg:#3A211A33;
```
Add to the `@theme inline` map so Tailwind utilities exist:
```css
--color-ok: var(--ok); --color-ok-bg: var(--ok-bg);
--color-warn: var(--warn); --color-warn-bg: var(--warn-bg);
--color-danger: var(--danger); --color-danger-bg: var(--danger-bg);
```
- [ ] **Step 2: Verify** `npm run build` compiles (Tailwind picks up tokens). Expected: success.
- [ ] **Step 3: Commit** `git add src/app/globals.css && git commit -m "feat(console): 상태색 토큰 추가(ok/warn/danger)"`

---

## Task 2: Console shell (Sidebar + Topbar + Shell)
**Files:** Create `ConsoleSidebar.tsx`, `ConsoleTopbar.tsx`, `ConsoleShell.tsx`; delete `console-shell.tsx`; edit `layout.tsx`.

- [ ] **Step 1: `ConsoleSidebar.tsx`** (client) — grouped nav with `usePathname` active state, mobile `Sheet`. Nav model:
```tsx
const GROUPS = [
  { items: [{ href:'/console', label:'개요', icon: LayoutDashboard }] },
  { title:'통계', items:[{href:'/console',label:'대시보드',icon:LineChart}] },
  { title:'운영', items:[
      {href:'/console/verifications',label:'사업자 인증',icon:FileCheck, badgeKey:'pendingVerifications'},
      {href:'/console/users',label:'유저 관리',icon:Users},
      {href:'/console/subscriptions',label:'구독 현황',icon:CreditCard}]},
  { title:'시스템', items:[{href:'/console/health',label:'AI 헬스',icon:Activity}] },
];
```
Active link: `bg-brand-muted text-brand`; hover `bg-muted`. Container `bg-card border-r border-border`. Footer: `<Link href="/admin">← 점주 화면으로</Link>` (`text-muted-foreground`). (Fix the placeholder `улица` line — it's `{`.)
- [ ] **Step 2: `ConsoleTopbar.tsx`** (client) — props `{title, subtitle, userEmail}`. Right side: data timestamp (`new Date().toLocaleTimeString('ko-KR')` on mount), refresh button (`router.refresh()`), theme toggle (`useTheme`), avatar initial. `bg-background/85 backdrop-blur border-b border-border`.
- [ ] **Step 3: `ConsoleShell.tsx`** (client) — composes sidebar + topbar + `<main className="flex-1 p-6 bg-muted min-h-screen">`. Derives title/subtitle from `usePathname` via a route→meta map.
- [ ] **Step 4: edit `layout.tsx`** — keep `requireAdmin()`, render `<ConsoleShell userEmail={user.email||''}>{children}</ConsoleShell>`; delete old `console-shell.tsx`.
- [ ] **Step 5: Manual verify** `/console` shell renders light, nav works, mobile sheet toggles.
- [ ] **Step 6: Commit** `git add src/components/console src/app/(console)/console/layout.tsx && git rm src/app/(console)/console/console-shell.tsx && git commit -m "feat(console): onetime식 라이트 셸(사이드바/토픽바)"`

---

## Task 3: Types + recharts + stat actions (range/timeseries/detail)
**Files:** `package.json` (recharts), `src/types/admin.ts`, `src/lib/actions/admin-stats.ts`, `admin-users.ts`.

- [ ] **Step 1:** `npm install recharts`
- [ ] **Step 2: extend `types/admin.ts`** — add `StatRange = '7d'|'30d'|'90d'|'all'`; extend `AdminOverview` with optional `comparison?: { usersChange:number|null; salesCountChange:number|null }`; add `TimeseriesPoint = { date:string; count:number }`; add `AdminUserDetail` (profile/subscription/verifications[]/salesSummary{count,total,lastDate}/createdAt).
- [ ] **Step 3: extend `admin-stats.ts`** — `getAdminOverview(range?: StatRange)` → `apiFetch(\`/admin/stats/overview?range=${range??'30d'}\`)`; new `getTimeseries(metric:'signups'|'sales', range:StatRange)` → `/admin/stats/timeseries?metric=&range=`. Both `requireAdmin()` + `withErrorLogging`. Catch NOT_FOUND/UNKNOWN → return null/empty so UI degrades pre-deploy.
- [ ] **Step 4: extend `admin-users.ts`** — `getAdminUserDetail(id:number)` → `/admin/users/${id}` (requireAdmin + withErrorLogging).
- [ ] **Step 5: Commit** `git add package.json package-lock.json src/types/admin.ts src/lib/actions && git commit -m "feat(console): recharts + stats(range/timeseries)/user-detail 액션"`

---

## Task 4: StatCard + StatusBadge + TrendChart
**Files:** Create `StatCard.tsx`, `StatusBadge.tsx`, `TrendChart.tsx`.
- [ ] **Step 1: `StatCard.tsx`** — props `{label,value,hint?,changePct?,icon,href?}`. Card `bg-card border border-border rounded-xl p-4 hover:border-brand/40`. Change pill: `changePct>=0 ? 'text-ok bg-ok-bg' : 'text-danger bg-danger-bg'` with ▲/▼. Icon box `bg-brand-muted text-brand`. Wrap in `<Link>` if href.
- [ ] **Step 2: `StatusBadge.tsx`** — maps subscription/verification/active → Badge color. `APPROVED/active→ok`, `PENDING/in_grace→warn`, `REJECTED→danger`, else `muted`. Korean labels.
- [ ] **Step 3: `TrendChart.tsx`** (client) — props `{type:'line'|'bar', data:TimeseriesPoint[], color?}`. recharts `ResponsiveContainer`; empty (`data.length===0`) → centered muted "데이터가 없습니다". Stroke/fill `var(--brand)`/`#E8C4D2`. `XAxis` first/last date only, hide grid clutter.
- [ ] **Step 4: Commit** `git add src/components/console && git commit -m "feat(console): StatCard/StatusBadge/TrendChart"`

---

## Task 5: Overview page (date filter + cards + charts + health)
**Files:** `page.tsx`, `overview-client.tsx`.
- [ ] **Step 1: `page.tsx`** — `searchParams.range`; `Promise.all([getAdminOverview(range), getAiHealth(), getTimeseries('signups',range), getTimeseries('sales',range)])`; pass to client.
- [ ] **Step 2: `overview-client.tsx`** — date filter pills (link `?range=`), pending callout (`verifications.pending>0`), 4 `StatCard` (with `changePct` from comparison when present), two `TrendChart`, AI health card. 만원 단위 매출. Skeleton handled by page `loading.tsx` (optional).
- [ ] **Step 3: Manual verify** range switching refetches; charts render or show empty.
- [ ] **Step 4: Commit** `git add "src/app/(console)/console/page.tsx" "src/app/(console)/console/overview-client.tsx" && git commit -m "feat(console): 개요 리디자인(날짜필터/증감카드/추이차트)"`

---

## Task 6: Retokenize verifications / subscriptions / health
**Files:** the three `*-client.tsx`.
- [ ] **Step 1:** Replace all `zinc-*`/hardcoded classes with tokens (`bg-card`,`border-border`,`text-foreground`,`text-muted-foreground`,`bg-muted`); buttons → shadcn variants (`default`=brand, `outline`); statuses → `StatusBadge`; add empty/loading states. No logic change.
- [ ] **Step 2: Manual verify** buttons visible, light theme correct, dark toggle OK.
- [ ] **Step 3: Commit** per file or grouped: `git commit -m "feat(console): 인증/구독/헬스 토큰화"`

---

## Task 7: Users page retokenize + drilldown
**Files:** `users/users-client.tsx`, create `users/[id]/page.tsx` + `user-detail-client.tsx`.
- [ ] **Step 1: retokenize** `users-client.tsx` (fix invisible 검색/비활성화 buttons, pager) → shadcn variants + `StatusBadge` + active `Switch`. Row click → `router.push(\`/console/users/${id}\`)` (button clicks `stopPropagation`).
- [ ] **Step 2: `users/[id]/page.tsx`** — `getAdminUserDetail(Number(params.id))` → client. 404 handling if null.
- [ ] **Step 3: `user-detail-client.tsx`** — header(닉네임·이메일·운영자 배지), 프로필 카드(가게·지역·가입일), 구독 카드(StatusBadge), 인증 이력 테이블, 매출 요약(건수·총액·최근일), active 토글(self disabled).
- [ ] **Step 4: Manual verify** row → detail; toggle works.
- [ ] **Step 5: Commit** `git add "src/app/(console)/console/users" && git commit -m "feat(console): 유저 테이블 토큰화 + 상세 드릴다운"`

---

## Task 8: Guard test update + lint/test/build
**Files:** `src/lib/__tests__/admin-guard.test.ts` (unchanged unless guard touched).
- [ ] **Step 1:** `npm run lint` → fix any errors (warnings in non-console files OK).
- [ ] **Step 2:** `npm test` → green.
- [ ] **Step 3:** `npm run build` → success (typecheck). Note: this worktree has no stray ai-client files, so build is clean.
- [ ] **Step 4: Commit** any fixes, then `/feature-finalize --merge`.

---

## Self-Review
- **Spec coverage:** tokens(T1), shell(T2), actions/types/recharts(T3), primitives(T4), overview+filter+charts(T5), verif/subs/health(T6), users+drilldown(T7), verify(T8). All §3–§7 covered.
- **Degrade:** T3 actions catch errors → null/empty so charts/comparison hide until server plan deploys. Pre-deploy the overview still shows base counts (existing `/admin/stats/overview` works).
- **Type consistency:** `StatRange`, `TimeseriesPoint`, `AdminUserDetail`, `getTimeseries`, `getAdminUserDetail` used identically across T3/T5/T7.
