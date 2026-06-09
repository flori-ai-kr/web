# 대시보드 UX 개편 + 통계 페이지 분리 설계 (세션1)

> 작성 2026-06-09 · 브랜치 `feature/session1-dashboard-stats` (web + api 워크트리 동일 브랜치명)
> 시안: `docs/_tmp/dashboard-stats-mockup.html`

## 1. 목표

대시보드를 **오늘·운영 중심 홈**으로 슬림화하고, 기존 대시보드에 섞여 있던 월간 집계·분포 데이터를 **별도 통계 페이지**(`/admin/statistics`)로 분리한다. 통계 페이지는 매출·지출·예약·고객 4개 탭 + 글로벌 기간 셀렉터 + 일별 시계열 그래프를 갖는다. BFF에 통계 전용 엔드포인트(`/statistics/*`)를 신설한다.

비목표(YAGNI): 코호트/퍼널/리텐션 같은 심층 분석, CSV/엑셀 내보내기, 마케팅 타겟 세그먼트(원타임 기능)는 이번 범위 아님.

## 2. 대시보드 `/admin` — 오늘·운영 홈

기존 `dashboard-client.tsx`를 개편한다.

### 유지/추가
- **인사 + 오늘 날짜** + **빠른 등록 드롭다운**: `매출/지출/예약` 선택 시 각 도메인의 등록 다이얼로그를 **오늘 일자로 프리필**해 즉시 오픈.
- **오늘 매출 히어로 KPI**: 금액(만원 단위 표기 규칙 준수) + 건수 + 어제 대비 증감. (이모지 없이 브랜드 컬러 액센트 바)
- **다가오는 예약**: 오늘/임박 리스트 + "캘린더 보기" 링크 (기존 유지).
- **이번 달 미니 요약**: 매출·지출·순이익 3줄 + "통계 보기" 링크. 데이터는 기존 `/dashboard/month`의 `summary.totalAmount` + `expenseTotal`로 충분.
- **커뮤니티 최신글**(신규): 카테고리 배지 + 제목 + 작성시각 4건, "커뮤니티 가기" 링크. 제목만 노출. 커뮤니티 진입 시 사업자 인증 게이트는 기존 로직이 처리하므로 대시보드 카드는 단순 링크.

### 제거 (→ 통계로 이관)
- 월 선택 드롭다운
- "최근 매출" 위젯 (오늘 매출 KPI로 대체, 상세는 매출 페이지)
- 고객통계 3카드, 카테고리/결제/채널/지출 BarList → 전부 통계 페이지

### 데이터
- `getDashboardTodayData()` 유지(오늘 매출 KPI + 다가오는 예약). 응답에서 미사용 필드(`recentSales`, `saleCategories`)는 대시보드에서 사용 안 함(BFF 변경 불필요, 클라이언트가 무시).
- 이번 달 미니 요약: 경량 호출. 기존 `getDashboardMonthData()`의 summary/expenseTotal만 사용하거나, 더 가벼운 `getMonthSummary()`(기존 레거시 액션) 재활용.
- 커뮤니티 최신글: 기존 `actions/community.ts`의 목록 조회로 최신 N건 title만 가져오는 경량 액션 추가.

## 3. 통계 페이지 `/admin/statistics`

구조: `page.tsx`(server) → `statistics-client.tsx`(client) + `components/`(탭별 패널 + 공용 차트/BarList/도넛).

### 글로벌 기간 셀렉터 (탭 전환해도 유지)
- 카드 컨테이너 + `빠른 선택` 라벨 + 프리셋: **이번 달 / 지난달 / 최근 3개월 / 올해 / 직접 선택**.
- 선택 상태는 URL 쿼리로 유지: `?range=this-month|last-month|last-3m|this-year|custom&from=YYYY-MM-DD&to=YYYY-MM-DD&tab=sales|exp|res|cust`. 새로고침·탭 이동에도 보존.
- 기본값: `range=this-month`. 프리셋 선택 시 web이 `from/to`를 계산해 BFF로 전달(서버는 절대 날짜만 받음).
- 시계열 단위: 일별 고정(월 기준 사용 흐름). (긴 기간 자동 월별 전환은 이번 범위 밖 — 추후.)

### 탭별 내용

| 탭 | KPI 카드(4, 전기간 대비 ±) | 시계열(일별) | 분포/테이블 |
|----|---------------------------|------------|-----------|
| **매출** | 총매출 · 건수 · 평균객단가 · 미수잔액(미정산 건수) | 일별 매출 Area | 카테고리 BarList · 결제방식 도넛 · 채널 BarList |
| **지출** | 총지출 · 건수 · 매출대비비율 · 순이익 | 일별 지출 + 순이익 라인 | 지출 카테고리 도넛 *(컨텐츠 추후 보강)* |
| **예약** | 총예약 · 일평균 · 가장 바쁜 요일 · 피크 시간대 | 일자별 예약 건수 Area | 요일×시간대 히트맵 · 요일별 BarList · 시간대별 BarList |
| **고객** | 총고객 · 신규 · 재방문 · 재방문율 | 신규 고객 추이 | 등급별 BarList · 성별 BarList · TOP 고객 테이블(구매액) |

> 예약 탭은 "취소율/예약→매출 전환/상태별 분포"를 다루지 않는다(모든 예약이 픽업 완료로 귀결되는 운영 특성). 대신 **언제·얼마나 찾는지**(요일·시간대·일자별 수요)에 집중.

### 차트 구현
- 시계열 Area/라인·Bar: 기존 `components/console/TrendChart.tsx`(recharts) 패턴 확장. brand 컬러(`--brand #A85475`) 사용.
- 도넛: recharts `PieChart`(innerRadius) 신규 공용 컴포넌트.
- 분포 막대: 기존 대시보드 `BarList` 패턴을 공용 컴포넌트로 추출해 재사용.
- 히트맵: HTML grid + brand 알파 셀(원타임 참고). 7요일 × 시간대 버킷(09–11/11–13/13–15/15–17/17–19/19~).

### 서버 액션
- 기존 `lib/actions/statistics.ts`(현재 `/dashboard/month` 분포를 읽음)는 **신규 `/statistics/*` 엔드포인트 호출로 교체**.
- 신규 액션: `getSalesStatistics(from,to)`, `getExpensesStatistics(from,to)`, `getReservationStatistics(from,to)`, `getCustomerStatistics(from,to)`. 각각 KPI+시계열+분포를 한 번에 반환.

## 4. BFF 신규 엔드포인트 (api 워크트리)

신규 패키지 `kr.ai.flori.statistics` (controller/service/dto). `DashboardService` 컨벤션 그대로: `JdbcTemplate` 네이티브 SQL + `TenantContext.currentUserId()` + PostgreSQL `FILTER`/`GROUP BY DATE`. 응답은 래퍼 없이 DTO 직접 반환. 날짜 컬럼은 전 엔티티 `date`(LocalDate). 금액은 엔티티상 `Int`지만 합계는 `Long`으로 반환.

공통 규칙:
- 쿼리 파라미터 `from`, `to`(둘 다 `YYYY-MM-DD`, 필수). 서버가 직접 절대 기간으로 집계.
- 각 KPI는 **직전 동일 길이 기간**(`from-(to-from+1) ~ from-1`)을 함께 집계해 증감(`*Delta` / `*DeltaPct`)을 서버가 계산.
- 매출 집계는 대시보드와 동일하게 `payment_method_id IS NOT NULL`로 미수 제외(미수는 별도 KPI).

### `GET /statistics/sales?from=&to=`
```
SalesStatisticsResponse(
  kpi: {
    totalAmount: Long, totalAmountDeltaPct: Int,
    count: Long, countDelta: Long,
    avgOrderValue: Long, avgOrderValueDeltaPct: Int,
    unpaidBalance: Long, unpaidCount: Long,   // is_unpaid && payment_method_id IS NULL
  },
  timeseries: [ { date: LocalDate, amount: Long, count: Long } ],  // GROUP BY date
  categoryDistribution: [ { id: Long?, label, amount: Long, count: Long, percentage: Int } ],
  paymentDistribution:  [ { id, label, amount, count, percentage } ],
  channelDistribution:  [ { id, label, amount, count, percentage } ],
)
```
- 분포/객단가/합계 쿼리는 기존 `DashboardService.categoryStats/paymentStats/channelStats/summary`를 기간 파라미터화해 재사용.

### `GET /statistics/expenses?from=&to=`
```
ExpensesStatisticsResponse(
  kpi: {
    totalAmount: Long, totalAmountDeltaPct: Int,
    count: Long, countDelta: Long,
    expenseRatioPct: Int,        // 총지출/총매출
    netProfit: Long, netProfitDeltaPct: Int,  // 매출(미수제외) - 지출
  },
  timeseries: [ { date: LocalDate, expense: Long, netProfit: Long } ], // 일별 지출 + (일별매출-일별지출)
  categoryDistribution: [ { id, label, amount: Long, percentage: Int } ],
)
```

### `GET /statistics/reservations?from=&to=`
```
ReservationStatisticsResponse(
  kpi: {
    total: Long, totalDeltaPct: Int,
    dailyAvg: Double,
    busiestDow: Int,        // 0=일 .. 6=토 (최다 요일), busiestDowPct: Int
    peakHourBucket: String, // "15-17", peakHourPct: Int
  },
  timeseries: [ { date: LocalDate, count: Long } ],
  heatmap: [ { dow: Int, hourBucket: String, count: Long } ],  // 7 x 6 버킷
  dowDistribution:  [ { dow: Int, count: Long } ],
  hourDistribution: [ { hourBucket: String, count: Long } ],
)
```
- 모든 예약 포함(status 필터 없음). 시간대 버킷은 `time`(LocalTime) 기준, NULL time은 미분류로 집계 제외하거나 별도 버킷.
- `EXTRACT(DOW FROM date)`, 시간 버킷은 CASE 식으로 그룹핑.

### `GET /statistics/customers?from=&to=`
```
CustomerStatisticsResponse(
  kpi: {
    total: Long,            // 기간 내 구매한 고객 수(distinct phone)
    newCustomers: Long, newDelta: Long,
    returningCustomers: Long, returningDelta: Long,
    returningRatePct: Int,
  },
  timeseries: [ { date: LocalDate, newCustomers: Long } ],  // 일별 신규(해당일 첫 구매)
  gradeDistribution:  [ { grade: String, count: Long } ],   // customers 테이블 기준
  genderDistribution: [ { gender: String?, count: Long } ],
  topCustomers: [ { customerId: Long?, name: String, phone: String, grade: String, purchaseCount: Long, totalAmount: Long } ], // 기간 내 매출 합산 상위 N
)
```
- 신규/재방문 판정은 기존 `DashboardService.customerStats`의 `customer_phone` + 과거구매 EXISTS 로직 재사용.
- TOP 고객: 기간 내 `sales`를 customer 기준 그룹핑(SUM/COUNT) → `customers` 조인으로 등급, 상위 N(예: 10).

### 대시보드 엔드포인트 영향
- `/dashboard/today`·`/dashboard/month`는 변경하지 않는다(미니 요약에서 일부 필드만 계속 사용). 분포 데이터는 통계로 옮겼지만 month 응답은 호환을 위해 그대로 둔다. (추후 정리는 별도.)

## 5. 컴포넌트/파일 경계 (web)

```
app/(admin)/admin/
  dashboard-client.tsx        # 개편: 히어로/예약/미니요약/빠른등록/커뮤니티
  statistics/
    page.tsx                  # server: range 파싱 → 액션 호출 → client
    statistics-client.tsx     # 글로벌 셀렉터 + 탭 + URL 동기화
    components/
      DateRangeSelector.tsx
      SalesStatPanel.tsx
      ExpenseStatPanel.tsx
      ReservationStatPanel.tsx
      CustomerStatPanel.tsx
      StatKpiCard.tsx         # 공용 KPI 카드(값+증감)
      StatAreaChart.tsx       # recharts area/line (TrendChart 확장)
      StatDonut.tsx           # recharts pie/donut
      StatBarList.tsx         # 분포 막대(대시보드 BarList 추출)
      ReservationHeatmap.tsx
lib/actions/statistics.ts     # 신규 4개 액션으로 교체
```

각 패널은 "기간(from,to)을 받아 해당 도메인 통계를 렌더"하는 단일 책임. 차트/카드/막대는 도메인 비의존 프리미티브로 재사용.

## 6. 검증
- BFF: 통계 서비스 집계 쿼리 단위 테스트(기간 경계, 미수 제외, 증감 계산, 빈 기간).
- web: 액션 매퍼(camelCase↔response) 테스트, DateRangeSelector 프리셋→from/to 계산 테스트, 패널 렌더 스냅샷.
- 멀티테넌시: 모든 신규 쿼리 `user_id` 바인딩 확인.

## 7. 작업 순서(권장)
1. api: `/statistics/sales` + 시계열/분포 (가장 활용도 높음) → 나머지 3개.
2. web: 공용 프리미티브(KpiCard/AreaChart/Donut/BarList) → DateRangeSelector → 매출 패널 → 나머지 탭.
3. web: 대시보드 개편(빠른등록·미니요약·커뮤니티) — 통계 페이지 링크 연결.
