# 테스트 커버리지 루프 — 진행 기록

> 브랜치: `auto/test-coverage` · 목표: 전체 라인 커버리지 70%
> 루프 스펙: `PROMPT.md` 참조

## 기준선 (2026-06-04)
- 기존: 5개 테스트 파일 / 128 테스트 (utils·validations·sales·photo-gallery·admin-guard)
- src/lib 전체 라인 커버리지 ≈ 6.6%
- 커버리지 도구 `@vitest/coverage-v8` 신규 설치 + `test:coverage` 스크립트 추가

## 로그
| 날짜 | 파일 | 추가 테스트 | 결과 |
|------|------|-------------|------|
| 2026-06-04 | `src/lib/export.ts` | CSV(BOM·이스케이프·currency·빈값) + Excel + PDF, 16 케이스 | export.ts 라인 0% → 100% (브랜치 89%). 전체 144 테스트 통과, tsc 0 에러 |
| 2026-06-04 | `src/lib/validations.ts` | 이미지검증·FormData헬퍼·recurring/calendar/bottomNav refine·photoCard·httpUrl XSS차단·instagram·scrap, 36 케이스 | validations.ts 57% → 100% (브랜치 93%). 전체 180 테스트 통과, tsc 0 에러 |
| 2026-06-04 | `src/lib/errors.ts` | withErrorLogging(정상·AppError·NEXT내부에러·DYNAMIC·미지에러 Discord전송·digest엣지), logger 모킹, 8 케이스 | errors.ts 46% → 100% (브랜치 100%). 전체 188 테스트 통과, tsc 0 에러 |
| 2026-06-04 | `src/lib/utils.ts` | cn·getTodayKST·getCurrentMonthKST·getMonthDateRange(윤년/12월/기본값)·sortByFrequency, 12 케이스 | utils.ts 72% → 100%. 전체 200 테스트 통과, tsc 0 에러 |
| 2026-06-04 | `src/lib/logger.ts` | reportError 콘솔폴백·Discord전송·문자열/객체/순환참조·URL필드·256자 truncate·스택 새니타이징·dedup·전송실패, env/fetch 모킹, 11 케이스 | logger.ts 9% → 93.75% (잔여=50개초과 캐시정리 루프, 미강제). 전체 211 테스트 통과, tsc 0 에러 |

## Server Actions 전수 커버 (2026-06-04, 2차 세션)
`apiFetch`/`apiFetchInternal`/`requireAuth`/`requireAdmin`/`next/cache` 모킹 패턴으로
**24개 액션 파일 전부** 테스트. 엔드포인트·메서드·본문 매핑(camelCase↔snake_case)·
Zod 검증 분기·기본값·NOT_FOUND→null·fail-open·날짜 계산까지 행동 기반 검증.

| 파일군 | 케이스 |
|--------|--------|
| scraps·customers·expenses·reservations | 69 |
| sale/expense-settings·photo-tags·push | 43 |
| ai·dashboard·calendar-events·statistics | 45 |
| business-verification·admin-stats/users/verifications·auth | 29 |
| insights·community·sales·photo-cards·recurring-expenses | 114 |
| admin-health·admin-subscriptions | 5 |

## 누적 lib 라인 커버리지: 6.6% → **94.4%** (1379/1461)
- actions/ 98.2% · 핵심 순수 로직 5개 파일 100% · branch 81.5% · funcs 92.7%
- 전체 테스트 128 → **492개**. 매 단계 tsc 0 에러.
- 루프 목표(라인 70%) 초과 달성.

## 컴포넌트 렌더 테스트 (RTL, 2차 세션)
로직 있는 프레젠테이션 컴포넌트 우선 커버:
- 배지: community/insights 카테고리 배지, console Verification/Subscription 배지 (라벨·색상·null fallback)
- 카드/헤더: KpiCard/KpiGroup/SectionHeader, console StatCard(증감배지·href분기), community PostCard(비밀글 마스킹·링크)
- 입력/필터: ui/AmountInput(포맷·hidden·onChange), gallery TagFilter(클릭 콜백), PhotoCardGrid(빈/비빈)
→ 11개 컴포넌트, 47 케이스.

## 최종 누적 (2026-06-04)
| 영역 | 라인 커버리지 |
|------|---------------|
| lib (actions 제외) | 핵심 5파일 100% |
| lib/actions | **98.2%** (1123/1144) |
| lib 전체 | **94.4%** (1379/1461) |
| components | 4.3% (프레젠테이션 우선분) |
| **전체 테스트** | 128 → **539개** (tsc 0 에러) |

## 남은 컴포넌트 (미커버, 의도적 보류)
~60개는 상호작용 클라이언트 컴포넌트(다이얼로그·폼·*-client·셸·Tiptap 에디터·comment-tree·
multi-select). 서버액션·라우터·복잡한 상태 모킹 필요 → 브리틀 위험. 문서상 "사람 검수 영역".
별도 세션에서 컴포넌트별 시나리오 테스트로 진행 권장.
