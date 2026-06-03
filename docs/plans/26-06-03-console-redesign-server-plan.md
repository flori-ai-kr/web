# Console Stats Boost — Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or executing-plans. Steps use checkbox (`- [ ]`).
> **Repo:** `flori-ai/server` (NOT the web worktree). New branch off dev, e.g. `feature/admin-stats-boost`.

**Goal:** Add period-comparison + daily timeseries to `/admin/stats`, and a user-detail drilldown to `/admin/users/{id}`, for the console redesign.

**Architecture:** Extend `kr.ai.flori.admin` (already `@RequiresAdmin`, cross-tenant native SQL). All queries parameter-bound; from/to derived from a `range` enum. Mirrors existing `AdminStatsService`/`AdminUserService`.

**Tech Stack:** Kotlin, Spring Boot, JdbcTemplate, JUnit5 + MockMvc + Zonky. Build: `./gradlew build` (detekt+test+ktlint+coverage). Make admin in tests by flipping `User.isAdmin` via `UserRepository`.

**Spec:** web worktree `docs/plans/26-06-03-console-redesign-design.md` §6.

---

## Task 1: Range support + overview comparison
**Files:** `admin/dto/AdminStatsDtos.kt`, `service/AdminStatsService.kt`, `controller/AdminStatsController.kt`, test `AdminStatsIntegrationTest.kt`.

- [ ] **Step 1:** Add `enum class StatRange(val days: Long?) { D7(7), D30(30), D90(90), ALL(null) }` (DTO file). Map `?range=` (`@RequestParam(defaultValue="D30")`); resolve `from = today - days` (ALL → epoch 2020-01-01), `prevFrom = from - days`, `prevTo = from - 1`.
- [ ] **Step 2:** Extend `AdminOverviewResponse` with `comparison: OverviewComparison?` where `OverviewComparison(usersChangePct: Double?, salesCountChangePct: Double?)`. Compute current-vs-previous-period counts in `AdminStatsService.overview(range)` via native SQL (`users.created_at`, `sales.date` between bounds, parameter-bound). `null` change when prev period count is 0.
- [ ] **Step 3:** Controller `overview(@RequestParam(defaultValue="D30") range: StatRange)`.
- [ ] **Step 4: Test** — admin gets overview with `comparison` present; non-admin 403; range=D7 vs ALL differ sanely.
- [ ] **Step 5:** `./gradlew test --tests "*AdminStatsIntegrationTest"` → PASS. Commit.

---

## Task 2: Timeseries endpoint
**Files:** `admin/dto/AdminStatsDtos.kt`, `service/AdminStatsService.kt`, `controller/AdminStatsController.kt`, test.
- [ ] **Step 1:** DTO `TimeseriesPoint(date: LocalDate, count: Long)`.
- [ ] **Step 2:** Service `timeseries(metric: String, range: StatRange): List<TimeseriesPoint>` — `generate_series(from, today, '1 day')` LEFT JOIN daily counts. `signups` → `users.created_at::date`; `sales` → `sales.date` (payment_method <> 'unpaid'). Reject unknown metric → `AppException(VALIDATION)`.
```sql
SELECT d::date AS day, COUNT(s.*) AS cnt
FROM generate_series(?::date, CURRENT_DATE, '1 day') d
LEFT JOIN sales s ON s.date = d::date AND s.payment_method <> 'unpaid'
GROUP BY d ORDER BY d
```
- [ ] **Step 3:** Controller `GET /admin/stats/timeseries?metric=&range=` (`@RequiresAdmin`).
- [ ] **Step 4: Test** — signups & sales return one point per day, length matches range; bad metric 400; non-admin 403.
- [ ] **Step 5:** Run tests → PASS. Commit.

---

## Task 3: User detail drilldown
**Files:** `admin/dto/AdminUserDtos.kt`, `service/AdminUserService.kt`, `controller/AdminUserController.kt`, test.
- [ ] **Step 1:** DTO `AdminUserDetail(id, email, nickname, isActive, isAdmin, createdAt, storeName, regionSido, regionSigungu, subscriptionStatus, verifications: List<AdminVerificationBrief>, salesCount: Long, salesTotal: Long, lastSaleDate: LocalDate?)`; `AdminVerificationBrief(status, submittedAt, reviewedAt, rejectReason)`.
- [ ] **Step 2:** Service `detail(id): AdminUserDetail` — user (404 if absent) + profile join + subscription + verification list (ordered desc) + sales aggregate (count/sum excl unpaid/max date). All native SQL parameter-bound by `id`.
- [ ] **Step 3:** Controller `GET /admin/users/{id}` → detail. Keep existing `POST /{id}/active`.
- [ ] **Step 4: Test** — admin gets detail for a seeded user (with a verification + sales rows); unknown id 404; non-admin 403.
- [ ] **Step 5:** Run tests → PASS. Commit.

---

## Task 4: Full build + finalize
- [ ] **Step 1:** `./gradlew build` (detekt MagicNumber 주의 — 매직넘버는 상수화) → SUCCESS.
- [ ] **Step 2:** `/feature-finalize --merge` (server). Then redeploy server image so web sees new stats.

---

## Self-Review
- **Spec §6 coverage:** overview comparison(T1), timeseries(T2), user detail(T3). All covered.
- **Guards reused:** `@RequiresAdmin`, page/size clamp & self-deactivate (unchanged). New cross-tenant repo/SQL stays under admin gate; if any new `*Repository` finder is added, register it in `TenantIsolationGuardTest` whitelist with reason.
- **detekt:** any literal (interval days, 2020) → named const to pass the build gate.
