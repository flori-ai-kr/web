# 대시보드 개편 + 통계 페이지 구현 계획 (세션1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대시보드를 오늘·운영 홈으로 슬림화하고, 매출·지출·예약·고객 통계를 글로벌 기간 셀렉터 + 일별 시계열 그래프를 갖춘 `/admin/statistics` 단일 페이지로 분리한다. BFF에 `/statistics/*` 4개 엔드포인트를 신설한다.

**Architecture:** api(Kotlin BFF)에 `kr.ai.flori.statistics` 신규 패키지 — `DashboardService` 컨벤션(JdbcTemplate 네이티브 SQL + `TenantContext.currentUserId()` + PostgreSQL `FILTER`/`GROUP BY`)을 그대로 따라 KPI(직전 동일기간 대비 증감 서버 계산) + 일별 시계열 + 분포를 DTO로 직접 반환. web은 4개 server action으로 받아 recharts 기반 차트 + 공용 BarList/도넛/히트맵으로 렌더. 기간 상태는 URL 쿼리(`?range&from&to&tab`)로 유지.

**Tech Stack:** Kotlin/Spring Boot + JdbcTemplate + PostgreSQL · Next.js 16 App Router/React 19 + recharts + Tailwind v4 · Vitest(web) · JUnit/Spring test(api)

**작업 워크트리:**
- api: `/Users/hansangho/Desktop/flori-ai/flori-api-session1` (branch `feature/session1-dashboard-stats`)
- web: `/Users/hansangho/Desktop/flori-ai/flori-web-session1` (branch `feature/session1-dashboard-stats`)

**설계 출처:** `docs/plans/26-06-09-dashboard-statistics-redesign.md` · 시안 `docs/_tmp/dashboard-stats-mockup.html`

**커밋 규칙:** `git add` 는 변경 파일만 명시 추가(`-A` 금지). 커밋 메시지 `Co-Authored-By: Claude <noreply@anthropic.com>` 포함. api 커밋 prefix `feat(api)`, web `feat(web)`.

---

## File Structure

### api (`flori-api-session1`)
```
src/main/kotlin/kr/ai/flori/statistics/
  controller/StatisticsController.kt   # GET /statistics/{sales,expenses,reservations,customers}
  service/StatisticsService.kt         # JdbcTemplate 집계 (도메인별 메서드)
  dto/StatisticsDtos.kt                # 응답 DTO 4종 + 공용 row 타입
src/test/kotlin/kr/ai/flori/statistics/
  StatisticsServiceSalesTest.kt
  StatisticsServiceExpensesTest.kt
  StatisticsServiceReservationsTest.kt
  StatisticsServiceCustomersTest.kt
```
참고(읽기): `dashboard/service/DashboardService.kt`(집계·증감 패턴), `dashboard/dto/DashboardDtos.kt`(stat DTO 형태), `common/util/DateRanges.kt`, 기존 service 테스트 1개(테스트 셋업 컨벤션 확인).

### web (`flori-web-session1`)
```
src/lib/actions/statistics.ts                       # 신규 4개 액션으로 교체
src/app/(admin)/admin/statistics/
  page.tsx                                           # server: searchParams → 액션 → client
  statistics-client.tsx                              # 셀렉터 + 탭 + URL 동기화
  components/
    DateRangeSelector.tsx
    StatKpiCard.tsx
    StatAreaChart.tsx
    StatDonut.tsx
    StatBarList.tsx
    ReservationHeatmap.tsx
    SalesStatPanel.tsx
    ExpenseStatPanel.tsx
    ReservationStatPanel.tsx
    CustomerStatPanel.tsx
  lib/range.ts                                       # 프리셋 → {from,to} 계산 (순수함수)
src/app/(admin)/admin/dashboard-client.tsx           # 개편
src/lib/actions/community.ts                         # 최신글 경량 조회 추가(또는 기존 재사용)
src/app/(admin)/admin/__tests__/range.test.ts        # 프리셋 계산 테스트
src/lib/actions/__tests__/statistics-mappers.test.ts # 응답 매퍼 테스트
```
참고(읽기): `components/console/TrendChart.tsx`(recharts area/bar), `dashboard-client.tsx`(BarList 구현 추출 원본), `lib/actions/dashboard.ts`(액션/매퍼 컨벤션), `lib/api/client.ts`(apiFetch), 기존 sales/expense FormDialog(빠른등록 프리필 props 확인).

---

# Phase A — BFF 통계 엔드포인트 (api 워크트리)

> 모든 api 태스크 작업 디렉터리: `/Users/hansangho/Desktop/flori-ai/flori-api-session1`
> 시작 전 읽기: `dashboard/service/DashboardService.kt`, `dashboard/dto/DashboardDtos.kt`, `common/util/DateRanges.kt`, `common/tenant/TenantContext.kt`. 테스트 실행 방법은 기존 테스트 1개를 열어 셋업(`@SpringBootTest`/슬라이스, 테스트 DB) 컨벤션을 그대로 따른다.

## Task A1: 통계 DTO + 공용 집계 헬퍼 + 매출 엔드포인트

**Files:**
- Create: `src/main/kotlin/kr/ai/flori/statistics/dto/StatisticsDtos.kt`
- Create: `src/main/kotlin/kr/ai/flori/statistics/service/StatisticsService.kt`
- Create: `src/main/kotlin/kr/ai/flori/statistics/controller/StatisticsController.kt`
- Test: `src/test/kotlin/kr/ai/flori/statistics/StatisticsServiceSalesTest.kt`

- [ ] **Step 1: DTO 작성**

`StatisticsDtos.kt`:
```kotlin
package kr.ai.flori.statistics.dto

import java.time.LocalDate

// ---- 공용 ----
data class DistributionItem(
    val id: Long?,
    val label: String,
    val amount: Long,
    val count: Long,
    val percentage: Int,
)

// ---- 매출 ----
data class SalesKpi(
    val totalAmount: Long,
    val totalAmountDeltaPct: Int,
    val count: Long,
    val countDelta: Long,
    val avgOrderValue: Long,
    val avgOrderValueDeltaPct: Int,
    val unpaidBalance: Long,
    val unpaidCount: Long,
)

data class SalesTimePoint(val date: LocalDate, val amount: Long, val count: Long)

data class SalesStatisticsResponse(
    val kpi: SalesKpi,
    val timeseries: List<SalesTimePoint>,
    val categoryDistribution: List<DistributionItem>,
    val paymentDistribution: List<DistributionItem>,
    val channelDistribution: List<DistributionItem>,
)
```

- [ ] **Step 2: 실패하는 테스트 작성**

`StatisticsServiceSalesTest.kt` — 한 user에 대해 기간 내 매출 2건(카드/현금), 미수 1건을 삽입하고 `salesStatistics(from,to)`를 검증. (테스트 데이터 삽입은 기존 service 테스트의 repository/JdbcTemplate 셋업 방식을 그대로 사용.)
```kotlin
@Test
fun `매출 통계 - 합계는 미수 제외, 일별 시계열과 분포를 반환`() {
    // given: userId=U, 2026-06-01 카드 30000, 2026-06-02 현금 20000, 2026-06-02 미수 50000(payment_method_id=null,is_unpaid=true)
    val res = service.salesStatistics(LocalDate.parse("2026-06-01"), LocalDate.parse("2026-06-02"))
    assertEquals(50000L, res.kpi.totalAmount)        // 미수 제외
    assertEquals(2L, res.kpi.count)
    assertEquals(25000L, res.kpi.avgOrderValue)
    assertEquals(50000L, res.kpi.unpaidBalance)
    assertEquals(1L, res.kpi.unpaidCount)
    assertEquals(2, res.timeseries.size)             // 6/1, 6/2
    assertEquals(30000L, res.timeseries.first { it.date == LocalDate.parse("2026-06-01") }.amount)
}
```
TenantContext는 테스트에서 `TenantContext.set(U)`로 주입(기존 테스트 패턴 확인 후 동일하게).

- [ ] **Step 3: 테스트 실행 → 실패 확인**

Run: `./gradlew test --tests "*StatisticsServiceSalesTest*"`
Expected: 컴파일 에러(`salesStatistics` 미정의) 또는 FAIL.

- [ ] **Step 4: Service 구현 (매출)**

`StatisticsService.kt` — `DashboardService`의 summary/categoryStats/paymentStats/channelStats 쿼리를 기간 파라미터화해 이식. 핵심:
```kotlin
@Service
class StatisticsService(
    private val jdbcTemplate: JdbcTemplate,
    private val labelReader: LabelSettingReader, // DashboardService가 쓰는 것과 동일 주입
) {
    @Transactional(readOnly = true)
    fun salesStatistics(from: LocalDate, to: LocalDate): SalesStatisticsResponse {
        val uid = TenantContext.currentUserId()
        val (pFrom, pTo) = previousPeriod(from, to)

        val cur = salesAgg(uid, from, to)          // total, count, unpaidBalance, unpaidCount
        val prev = salesAgg(uid, pFrom, pTo)
        val avg = if (cur.count > 0) cur.total / cur.count else 0
        val prevAvg = if (prev.count > 0) prev.total / prev.count else 0

        return SalesStatisticsResponse(
            kpi = SalesKpi(
                totalAmount = cur.total,
                totalAmountDeltaPct = pct(cur.total, prev.total),
                count = cur.count,
                countDelta = cur.count - prev.count,
                avgOrderValue = avg,
                avgOrderValueDeltaPct = pct(avg, prevAvg),
                unpaidBalance = cur.unpaidBalance,
                unpaidCount = cur.unpaidCount,
            ),
            timeseries = salesTimeseries(uid, from, to),
            categoryDistribution = distribution(uid, from, to, "category_id", LabelDomains.SALE, LabelKinds.CATEGORY),
            paymentDistribution = distribution(uid, from, to, "payment_method_id", LabelDomains.SALE, LabelKinds.PAYMENT),
            channelDistribution = distribution(uid, from, to, "channel_id", LabelDomains.SALE, LabelKinds.CHANNEL),
        )
    }
}
```
보조 함수(같은 파일 private):
```kotlin
private data class SalesAgg(val total: Long, val count: Long, val unpaidBalance: Long, val unpaidCount: Long)

private fun salesAgg(uid: Long, from: LocalDate, to: LocalDate): SalesAgg =
    jdbcTemplate.queryForObject(
        """
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE payment_method_id IS NOT NULL),0) AS total,
          COUNT(*)            FILTER (WHERE payment_method_id IS NOT NULL)      AS cnt,
          COALESCE(SUM(amount) FILTER (WHERE is_unpaid AND payment_method_id IS NULL),0) AS unpaid_amt,
          COUNT(*)            FILTER (WHERE is_unpaid AND payment_method_id IS NULL)      AS unpaid_cnt
        FROM sales WHERE user_id = ?::bigint AND date BETWEEN ? AND ?
        """.trimIndent(),
        { rs, _ -> SalesAgg(rs.getLong("total"), rs.getLong("cnt"), rs.getLong("unpaid_amt"), rs.getLong("unpaid_cnt")) },
        uid, Date.valueOf(from), Date.valueOf(to),
    ) ?: SalesAgg(0,0,0,0)

private fun salesTimeseries(uid: Long, from: LocalDate, to: LocalDate): List<SalesTimePoint> =
    jdbcTemplate.query(
        """
        SELECT date AS d, COALESCE(SUM(amount),0) AS amt, COUNT(*) AS cnt
        FROM sales WHERE user_id = ?::bigint AND date BETWEEN ? AND ? AND payment_method_id IS NOT NULL
        GROUP BY date ORDER BY date
        """.trimIndent(),
        { rs, _ -> SalesTimePoint(rs.getDate("d").toLocalDate(), rs.getLong("amt"), rs.getLong("cnt")) },
        uid, Date.valueOf(from), Date.valueOf(to),
    )

// distribution(): DashboardService.categoryStats의 GROUP BY category_id + labelReader 매핑 + percentage 계산을
// 컬럼/도메인/카인드를 파라미터로 받는 형태로 일반화. null id → "기타".
```
공용 헬퍼:
```kotlin
private fun pct(cur: Long, prev: Long): Int =
    if (prev == 0L) (if (cur > 0L) 100 else 0) else Math.round((cur - prev) * 100.0 / prev).toInt()

private fun previousPeriod(from: LocalDate, to: LocalDate): Pair<LocalDate, LocalDate> {
    val days = ChronoUnit.DAYS.between(from, to) + 1
    return from.minusDays(days) to from.minusDays(1)
}
```
> `LabelDomains`/`LabelKinds`/`LabelSettingReader`의 정확한 이름·시그니처는 `DashboardService.categoryStats` 구현을 그대로 복사해 맞춘다.

- [ ] **Step 5: Controller 추가**
```kotlin
@RestController
@RequestMapping("/statistics")
class StatisticsController(private val service: StatisticsService) {
    @GetMapping("/sales")
    fun sales(
        @RequestParam from: LocalDate,
        @RequestParam to: LocalDate,
    ): SalesStatisticsResponse = service.salesStatistics(from, to)
}
```
(`LocalDate` 바인딩은 `@DateTimeFormat(iso = DATE)` 필요 시 추가 — 기존 컨트롤러에서 LocalDate RequestParam 사용례 확인 후 동일하게.)

- [ ] **Step 6: 테스트 통과 확인**

Run: `./gradlew test --tests "*StatisticsServiceSalesTest*"`
Expected: PASS.

- [ ] **Step 7: 커밋**
```bash
git add src/main/kotlin/kr/ai/flori/statistics/ src/test/kotlin/kr/ai/flori/statistics/StatisticsServiceSalesTest.kt
git commit -m "feat(api): 매출 통계 엔드포인트 GET /statistics/sales (KPI·일별 시계열·분포)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Task A2: 지출 엔드포인트

**Files:**
- Modify: `statistics/dto/StatisticsDtos.kt`, `statistics/service/StatisticsService.kt`, `statistics/controller/StatisticsController.kt`
- Test: `src/test/kotlin/kr/ai/flori/statistics/StatisticsServiceExpensesTest.kt`

- [ ] **Step 1: DTO 추가**
```kotlin
data class ExpensesKpi(
    val totalAmount: Long, val totalAmountDeltaPct: Int,
    val count: Long, val countDelta: Long,
    val expenseRatioPct: Int,   // 총지출 / 총매출(미수제외)
    val netProfit: Long, val netProfitDeltaPct: Int,
)
data class ExpensesTimePoint(val date: LocalDate, val expense: Long, val netProfit: Long)
data class ExpensesStatisticsResponse(
    val kpi: ExpensesKpi,
    val timeseries: List<ExpensesTimePoint>,
    val categoryDistribution: List<DistributionItem>,
)
```

- [ ] **Step 2: 실패 테스트**

6/1 지출 10000, 6/2 지출 5000(total_amount 기준), 매출 6/1 30000(카드) 가정.
```kotlin
@Test
fun `지출 통계 - 일별 지출과 순이익(매출-지출), 매출대비비율`() {
    val res = service.expensesStatistics(LocalDate.parse("2026-06-01"), LocalDate.parse("2026-06-02"))
    assertEquals(15000L, res.kpi.totalAmount)
    assertEquals(50, res.kpi.expenseRatioPct)        // 15000/30000
    assertEquals(15000L, res.kpi.netProfit)          // 30000-15000
    assertEquals(20000L, res.timeseries.first { it.date == LocalDate.parse("2026-06-01") }.netProfit) // 30000-10000
}
```

- [ ] **Step 3: 실행 → 실패** Run: `./gradlew test --tests "*StatisticsServiceExpensesTest*"`

- [ ] **Step 4: 구현**

`expensesAgg`(SUM(total_amount), COUNT), `expensesTimeseries`(일별 지출), 매출 일별은 `salesTimeseries` 재사용해 날짜별 LEFT JOIN 병합(코틀린에서 Map merge). 카테고리 분포는 `distribution()`을 expenses 테이블 + `total_amount` 합산용으로 일반화(테이블/금액컬럼도 파라미터화하거나 expenses 전용 보조 추가). `expenseRatioPct = pct형 아님` → `if(sales>0) round(expense*100/sales) else 0`.
```kotlin
fun expensesStatistics(from: LocalDate, to: LocalDate): ExpensesStatisticsResponse {
    val uid = TenantContext.currentUserId()
    val (pFrom, pTo) = previousPeriod(from, to)
    val expTotal = expenseTotal(uid, from, to); val expCount = expenseCount(uid, from, to)
    val salesTotal = salesAgg(uid, from, to).total
    val prevExp = expenseTotal(uid, pFrom, pTo)
    val prevNet = salesAgg(uid, pFrom, pTo).total - prevExp
    val net = salesTotal - expTotal
    // timeseries: 날짜→지출 맵 + 날짜→매출 맵 합쳐 ExpensesTimePoint 생성(0 채움)
    ...
}
```

- [ ] **Step 5: Controller** `@GetMapping("/expenses")` 동일 패턴.

- [ ] **Step 6: 통과 확인** Run: `./gradlew test --tests "*StatisticsServiceExpensesTest*"` Expected: PASS.

- [ ] **Step 7: 커밋** `feat(api): 지출 통계 엔드포인트 GET /statistics/expenses (지출·순이익 추이)`

## Task A3: 예약 엔드포인트 (요일·시간대·히트맵)

**Files:** DTO/Service/Controller modify + Test `StatisticsServiceReservationsTest.kt`

- [ ] **Step 1: DTO**
```kotlin
data class ReservationKpi(
    val total: Long, val totalDeltaPct: Int,
    val dailyAvg: Double,
    val busiestDow: Int, val busiestDowPct: Int,     // 0=일..6=토
    val peakHourBucket: String, val peakHourPct: Int, // "15-17" 등, 없으면 ""
)
data class ReservationTimePoint(val date: LocalDate, val count: Long)
data class HeatCell(val dow: Int, val hourBucket: String, val count: Long)
data class DowCount(val dow: Int, val count: Long)
data class HourCount(val hourBucket: String, val count: Long)
data class ReservationStatisticsResponse(
    val kpi: ReservationKpi,
    val timeseries: List<ReservationTimePoint>,
    val heatmap: List<HeatCell>,
    val dowDistribution: List<DowCount>,
    val hourDistribution: List<HourCount>,
)
```
시간 버킷 규칙(전 쿼리 공유): `09-11,11-13,13-15,15-17,17-19,19+`. NULL time은 집계 제외.

- [ ] **Step 2: 실패 테스트** — 토요일 15:30, 토요일 16:00, 월요일 10:00 예약 삽입 → `busiestDow=6`, `peakHourBucket="15-17"`, `total=3`, dow/hour 분포 검증.

- [ ] **Step 3: 실행 → 실패**

- [ ] **Step 4: 구현** — PostgreSQL `EXTRACT(DOW FROM date)::int`, 시간 버킷 CASE:
```sql
CASE
  WHEN time >= '09:00' AND time < '11:00' THEN '09-11'
  WHEN time >= '11:00' AND time < '13:00' THEN '11-13'
  WHEN time >= '13:00' AND time < '15:00' THEN '13-15'
  WHEN time >= '15:00' AND time < '17:00' THEN '15-17'
  WHEN time >= '17:00' AND time < '19:00' THEN '17-19'
  WHEN time >= '19:00' THEN '19+'
END AS bucket
```
- `total`/timeseries: status 필터 없이 전체 예약. `dailyAvg = total / (to-from+1)`.
- heatmap: `GROUP BY dow, bucket`(time NOT NULL). busiestDow/peakHour는 분포에서 max 추출(서버 계산), pct는 total 대비.

- [ ] **Step 5: Controller** `@GetMapping("/reservations")`.

- [ ] **Step 6: 통과 확인** Run: `./gradlew test --tests "*StatisticsServiceReservationsTest*"` Expected: PASS.

- [ ] **Step 7: 커밋** `feat(api): 예약 통계 엔드포인트 GET /statistics/reservations (요일·시간대·히트맵)`

## Task A4: 고객 엔드포인트

**Files:** DTO/Service/Controller modify + Test `StatisticsServiceCustomersTest.kt`

- [ ] **Step 1: DTO**
```kotlin
data class CustomerKpi(
    val total: Long,
    val newCustomers: Long, val newDelta: Long,
    val returningCustomers: Long, val returningDelta: Long,
    val returningRatePct: Int,
)
data class CustomerNewPoint(val date: LocalDate, val newCustomers: Long)
data class GradeCount(val grade: String, val count: Long)
data class GenderCount(val gender: String?, val count: Long)
data class TopCustomer(val customerId: Long?, val name: String, val phone: String, val grade: String, val purchaseCount: Long, val totalAmount: Long)
data class CustomerStatisticsResponse(
    val kpi: CustomerKpi,
    val timeseries: List<CustomerNewPoint>,
    val gradeDistribution: List<GradeCount>,
    val genderDistribution: List<GenderCount>,
    val topCustomers: List<TopCustomer>,
)
```

- [ ] **Step 2: 실패 테스트** — 기간 내 신규 1명·재방문 1명(과거 구매 존재), TOP 고객 정렬 검증. 신규/재방문은 `DashboardService.customerStats`의 `customer_phone` + 과거구매 EXISTS 로직 재사용.

- [ ] **Step 3: 실행 → 실패**

- [ ] **Step 4: 구현**
- `customerStats` 로직 이식(total/new/returning), 증감은 previousPeriod로 동일 계산, `returningRatePct = if(total>0) round(returning*100/total) else 0`.
- timeseries: 일자별 "그날 첫 구매(과거 구매 없음) distinct phone" 카운트.
- gradeDistribution/genderDistribution: `customers` 테이블 `GROUP BY grade`/`gender` (user_id 바인딩).
- topCustomers: 기간 내 `sales`(payment_method_id IS NOT NULL) `GROUP BY customer_id, customer_name, customer_phone` SUM(amount)/COUNT → `customers` LEFT JOIN으로 grade, `ORDER BY total DESC LIMIT 10`. customer_id null이면 phone 기준.

- [ ] **Step 5: Controller** `@GetMapping("/customers")`.

- [ ] **Step 6: 통과 확인** Run: `./gradlew test --tests "*StatisticsServiceCustomersTest*"` Expected: PASS.

- [ ] **Step 7: 전체 테스트 + 커밋**
```bash
./gradlew test
git add src/main/kotlin/kr/ai/flori/statistics/ src/test/kotlin/kr/ai/flori/statistics/
git commit -m "feat(api): 고객 통계 엔드포인트 GET /statistics/customers (신규·재방문·TOP)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

# Phase B — web 통계 페이지 + 대시보드 개편 (web 워크트리)

> 모든 web 태스크 작업 디렉터리: `/Users/hansangho/Desktop/flori-ai/flori-web-session1`
> 시작 전 읽기: `lib/actions/dashboard.ts`(액션·DTO 매퍼 컨벤션), `components/console/TrendChart.tsx`(recharts), `dashboard-client.tsx`(BarList 원본·구조), `lib/api/client.ts`. 만원 단위 금액 표기 규칙 준수.

## Task B1: 기간 프리셋 계산 유틸 (순수함수, TDD)

**Files:**
- Create: `src/app/(admin)/admin/statistics/lib/range.ts`
- Test: `src/app/(admin)/admin/statistics/lib/__tests__/range.test.ts`

- [ ] **Step 1: 실패 테스트**
```ts
import { describe, it, expect } from 'vitest';
import { resolveRange, type RangePreset } from '../range';

describe('resolveRange', () => {
  const today = new Date('2026-06-09T00:00:00+09:00');
  it('this-month → 그 달 1일~말일', () => {
    expect(resolveRange('this-month', today)).toEqual({ from: '2026-06-01', to: '2026-06-30' });
  });
  it('last-month', () => {
    expect(resolveRange('last-month', today)).toEqual({ from: '2026-05-01', to: '2026-05-31' });
  });
  it('last-3m → 최근 3개월(이번달 포함 직전 2개월 1일 ~ 오늘)', () => {
    expect(resolveRange('last-3m', today)).toEqual({ from: '2026-04-01', to: '2026-06-09' });
  });
  it('this-year', () => {
    expect(resolveRange('this-year', today)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });
});
```

- [ ] **Step 2: 실행 → 실패** Run: `npm test -- range` Expected: FAIL (module not found).

- [ ] **Step 3: 구현**
```ts
export type RangePreset = 'this-month' | 'last-month' | 'last-3m' | 'this-year' | 'custom';
const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function resolveRange(preset: RangePreset, base = new Date()): { from: string; to: string } {
  const y = base.getFullYear(), m = base.getMonth();
  switch (preset) {
    case 'this-month':  return { from: fmt(new Date(y,m,1)),   to: fmt(new Date(y,m+1,0)) };
    case 'last-month':  return { from: fmt(new Date(y,m-1,1)), to: fmt(new Date(y,m,0)) };
    case 'last-3m':     return { from: fmt(new Date(y,m-2,1)), to: fmt(base) };
    case 'this-year':   return { from: fmt(new Date(y,0,1)),   to: fmt(new Date(y,11,31)) };
    default:            return { from: fmt(new Date(y,m,1)),   to: fmt(new Date(y,m+1,0)) };
  }
}
```
> KST 고정: 입력 base는 서버/클라 모두 로컬 Date 사용. (테스트는 위 고정값 기준.)

- [ ] **Step 4: 통과 확인** Run: `npm test -- range` Expected: PASS.

- [ ] **Step 5: 커밋** `feat(web): 통계 기간 프리셋 계산 유틸 resolveRange`

## Task B2: 통계 server actions + 타입/매퍼 (TDD)

**Files:**
- Modify(교체): `src/lib/actions/statistics.ts`
- Test: `src/lib/actions/__tests__/statistics-mappers.test.ts`

기존 `statistics.ts`(`/dashboard/month` 분포 읽던 함수들)는 통계 페이지 전용 신규 4액션으로 교체한다. 다른 곳에서 import하는지 먼저 grep — 사용처 있으면 그 컴포넌트도 신규 액션으로 갱신(대부분 B4~B7에서 대체됨).

- [ ] **Step 1: 타입 정의 + 매퍼 + 실패 테스트**

camelCase 응답을 그대로 쓰되 web 타입 명시. 매퍼는 응답 통과(BFF가 camelCase 반환). 테스트는 액션이 `apiFetch`를 올바른 쿼리스트링으로 호출하는지(mock) + 빈 응답 방어를 검증.
```ts
// statistics-mappers.test.ts — apiFetch 모킹 후 getSalesStatistics가 /statistics/sales?from=&to= 호출 확인
```

- [ ] **Step 2: 실행 → 실패** Run: `npm test -- statistics-mappers`

- [ ] **Step 3: 구현**
```ts
'use server';
import { apiFetch } from '@/lib/api/client';
import { withErrorLogging } from '@/lib/errors';

export interface DistributionItem { id: number|null; label: string; amount: number; count: number; percentage: number; }
export interface SalesStatistics { kpi: {...}; timeseries: {date:string;amount:number;count:number}[]; categoryDistribution: DistributionItem[]; paymentDistribution: DistributionItem[]; channelDistribution: DistributionItem[]; }
// ... Expenses/Reservation/Customer 타입은 Phase A DTO와 1:1

export async function getSalesStatistics(from: string, to: string) {
  return withErrorLogging('getSalesStatistics', async () =>
    apiFetch<SalesStatistics>(`/statistics/sales?from=${from}&to=${to}`));
}
export async function getExpensesStatistics(from: string, to: string) { /* /statistics/expenses */ }
export async function getReservationStatistics(from: string, to: string) { /* /statistics/reservations */ }
export async function getCustomerStatistics(from: string, to: string) { /* /statistics/customers */ }
```
> 정확한 `apiFetch` 시그니처·`withErrorLogging` 사용형은 `lib/actions/dashboard.ts`를 그대로 모방.

- [ ] **Step 4: 통과 확인** Run: `npm test -- statistics-mappers` Expected: PASS.

- [ ] **Step 5: 커밋** `feat(web): 통계 server actions 4종 + 타입`

## Task B3: 공용 차트/카드 프리미티브

**Files (Create):** `statistics/components/{StatKpiCard,StatBarList,StatAreaChart,StatDonut,ReservationHeatmap}.tsx`

- [ ] **Step 1: StatBarList 추출** — `dashboard-client.tsx`의 BarList 구현을 `StatBarList.tsx`로 추출(props: `items:{label,amount?,count?,value,color?}[]`, 비율 막대 + 우측 금액/건수). 시안 `.barlist` 스타일 참고.

- [ ] **Step 2: StatKpiCard** — props `{label, value, delta?, deltaTone?:'up'|'down'|'neutral', sub?}`. 시안 `.kpi` 마크업.

- [ ] **Step 3: StatAreaChart** — `TrendChart.tsx`를 복사·일반화: props `{data:{date:string;value:number}[], color?, type?:'area'|'bar', valueFormatter?}`. recharts AreaChart/BarChart, brand 컬러 그라데이션.

- [ ] **Step 4: StatDonut** — recharts `PieChart`+`Pie(innerRadius)`, props `{items:{label,value,color}[]}`, 중앙 합계 텍스트 + 범례.

- [ ] **Step 5: ReservationHeatmap** — props `{cells:{dow:number;hourBucket:string;count:number}[]}`. CSS grid 7요일 × 6버킷, 최대값 대비 brand 알파. 시안 `.heat` 참고.

- [ ] **Step 6: 빌드/타입 확인** Run: `npm run lint` Expected: 통과(미사용 경고 외 에러 없음).

- [ ] **Step 7: 커밋** `feat(web): 통계 공용 프리미티브(KpiCard·BarList·AreaChart·Donut·Heatmap)`

## Task B4: DateRangeSelector + 통계 페이지 셸 + 탭 + URL 동기화

**Files:**
- Create: `statistics/components/DateRangeSelector.tsx`, `statistics/page.tsx`, `statistics/statistics-client.tsx`

- [ ] **Step 1: DateRangeSelector** — 카드 + `빠른 선택` 라벨 + 프리셋 버튼(이번달/지난달/최근3개월/올해/직접선택) + 우측 기간 표시. 선택 시 `onChange(preset, {from,to})`. '직접 선택'은 기존 공용 `date-picker.tsx` 2개로 from/to.

- [ ] **Step 2: page.tsx (server)** — `searchParams`에서 `range,from,to,tab` 파싱(기본 `this-month`/계산값/`sales`). 서버에서 해당 탭 액션 1개를 호출해 초기 데이터 전달(나머지 탭은 클라 진입 시 lazy fetch). client에 전달.

- [ ] **Step 3: statistics-client.tsx** — 상단 PageHeader("통계") + `DateRangeSelector` + 탭바(매출/지출/예약/고객). 상태: `range/from/to/tab`. 변경 시 `router.replace`로 URL 쿼리 갱신(셀렉터 글로벌·탭 이동에도 유지). 탭별 데이터는 from/to 바뀌면 해당 탭 액션 재호출(캐시 맵 보관). 패널은 B5~B8에서 채우되 여기선 빈 컨테이너 + 로딩 스켈레톤 자리.

- [ ] **Step 4: 동작 확인** Run: `npm run dev` 후 `/admin/statistics?range=last-month` 진입 → 프리셋 활성·URL 유지·탭 전환 확인. (수동)

- [ ] **Step 5: 커밋** `feat(web): 통계 페이지 셸 + 글로벌 기간 셀렉터 + 탭 URL 동기화`

## Task B5: 매출 패널

**Files:** Create `statistics/components/SalesStatPanel.tsx`; wire in `statistics-client.tsx`

- [ ] **Step 1: 구현** — props `{data: SalesStatistics}`. KPI 4(StatKpiCard: 총매출/건수/평균객단가/미수잔액) + StatAreaChart(일별 매출, valueFormatter 만원) + StatBarList(카테고리) + StatDonut(결제) + StatBarList(채널). 시안 매출 탭 레이아웃(statgrid) 대응.
- [ ] **Step 2: 클라이언트 연결** — `tab==='sales'`일 때 `getSalesStatistics(from,to)` 호출·렌더, 로딩/빈상태 처리.
- [ ] **Step 3: 확인** Run: `npm run lint` + 수동 `/admin/statistics` 매출 탭.
- [ ] **Step 4: 커밋** `feat(web): 통계 매출 탭 패널`

## Task B6: 지출 패널

**Files:** Create `ExpenseStatPanel.tsx`; wire

- [ ] **Step 1: 구현** — KPI 4(총지출/건수/매출대비/순이익) + StatAreaChart(지출, 순이익 비교는 라인 2개 또는 area+line) + StatDonut(지출 카테고리). 시안 지출 탭 대응.
- [ ] **Step 2: 연결** `tab==='exp'` → `getExpensesStatistics`.
- [ ] **Step 3: 확인** lint + 수동.
- [ ] **Step 4: 커밋** `feat(web): 통계 지출 탭 패널`

## Task B7: 예약 패널

**Files:** Create `ReservationStatPanel.tsx`; wire

- [ ] **Step 1: 구현** — KPI 4(총예약/일평균/가장바쁜요일/피크시간대) + StatAreaChart(일자별 예약 count) + ReservationHeatmap + StatBarList(요일별) + StatBarList(시간대별). 요일 인덱스→한글(일~토) 매핑.
- [ ] **Step 2: 연결** `tab==='res'` → `getReservationStatistics`.
- [ ] **Step 3: 확인** lint + 수동(히트맵 PWA 모바일 폭 확인).
- [ ] **Step 4: 커밋** `feat(web): 통계 예약 탭 패널(요일·시간대·히트맵)`

## Task B8: 고객 패널

**Files:** Create `CustomerStatPanel.tsx`; wire

- [ ] **Step 1: 구현** — KPI 4(총고객/신규/재방문/재방문율) + StatAreaChart(신규고객 추이) + StatBarList(등급) + StatBarList(성별) + TOP 고객 테이블(시안 `.tbl` + 등급 pill). 금액 만원 표기.
- [ ] **Step 2: 연결** `tab==='cust'` → `getCustomerStatistics`.
- [ ] **Step 3: 확인** lint + 수동.
- [ ] **Step 4: 커밋** `feat(web): 통계 고객 탭 패널(등급·성별·TOP)`

## Task B9: 커뮤니티 최신글 경량 조회

**Files:** Modify `src/lib/actions/community.ts`

- [ ] **Step 1: 액션 추가** — 기존 목록 조회 액션 확인 후, 최신 N(=4)건 `{id, category, title, createdAt}`만 반환하는 `getLatestCommunityPosts(limit=4)` 추가(기존 목록 액션을 limit으로 재사용 가능하면 래퍼).
- [ ] **Step 2: 확인** lint.
- [ ] **Step 3: 커밋** `feat(web): 커뮤니티 최신글 경량 조회 액션`

## Task B10: 대시보드 개편

**Files:** Modify `src/app/(admin)/admin/dashboard-client.tsx` (+ `page.tsx` 데이터 호출 조정)

- [ ] **Step 1: 제거** — 월 선택 드롭다운, "최근 매출" 위젯, 월간 분석(고객 3카드·카테고리/결제/채널/지출 BarList) 섹션 제거. (BarList는 B3에서 추출했으므로 dashboard 내 정의는 삭제.)
- [ ] **Step 2: 빠른 등록 드롭다운** — 헤더 우측 `＋ 빠른 등록` 메뉴(매출/지출/예약). 각 항목 클릭 시 해당 도메인 등록 다이얼로그를 **오늘 날짜 프리필**로 오픈. (각 FormDialog가 기본일자 prop을 받는지 확인 — 없으면 `defaultDate`/`initialDate` prop 추가하거나 기존 라우팅 패턴 사용. 다이얼로그를 대시보드에서 직접 마운트하거나 쿼리파라미터로 해당 페이지 이동+오픈.)
- [ ] **Step 3: 이번 달 미니 요약** — 매출/지출/순이익 3줄(StatBarList 아님, 시안 `.mini-row`) + "통계 보기" → `/admin/statistics`. 데이터는 기존 month summary/expenseTotal.
- [ ] **Step 4: 커뮤니티 최신글 카드** — `getLatestCommunityPosts()` 결과로 카테고리 배지+제목+작성시각 + "커뮤니티 가기" → `/admin/community`.
- [ ] **Step 5: 오늘 매출 히어로 유지** — 이모지 제거, 브랜드 액센트 바. "캘린더 보기" 링크 유지.
- [ ] **Step 6: 확인** Run: `npm run lint` + 수동 `/admin` (빠른등록 프리필·미니요약·커뮤니티·예약 동작).
- [ ] **Step 7: 커밋** `feat(web): 대시보드 오늘·운영 홈 개편(빠른등록·미니요약·커뮤니티 최신글)`

## Task B11: 마무리 검증

- [ ] **Step 1: 전체 테스트** Run: `npm test` Expected: PASS.
- [ ] **Step 2: 빌드** Run: `npm run build` Expected: 성공.
- [ ] **Step 3: lint** Run: `npm run lint` Expected: 통과.
- [ ] **Step 4: 임시 시안 정리 여부 사용자 확인** — `docs/_tmp/dashboard-stats-mockup.html` 유지/삭제 결정.

---

## 통합/배포 주의
- web 통계 액션은 BFF `/statistics/*` 배포 후에만 동작. api(Phase A)를 먼저 머지·배포하거나, 동시 배포. 미배포 시 통계 페이지는 에러 — `page.tsx`에서 액션 실패 시 빈 상태 처리 권장.
- 멀티테넌시: 신규 SQL 전부 `user_id` 바인딩 확인(코드리뷰 체크).
- 두 워크트리는 동일 브랜치명(`feature/session1-dashboard-stats`)이지만 별개 레포 → 각각 PR.
