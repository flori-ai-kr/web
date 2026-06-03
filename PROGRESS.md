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

## 다음 후보
- 순수 lib 파일은 거의 소진. 남은 건 작은 config(public-config·legal-config·onboarding-options·constants) 또는 I/O 래퍼.
- `src/lib/actions/*` (24개) 는 BFF apiFetch I/O 래퍼 → apiFetch 모킹 시 테스트 가능하나 ROI 중간. 별도 세션에서 한 묶음씩.
- `src/components/*` UI 컴포넌트 → @testing-library/react 렌더 테스트. 사람 검수 영역과 겹침.

## 누적 lib 라인 커버리지: 6.6% → 17.4% (255/1461)
> 핵심 순수 로직 5개 파일(export·validations·errors·utils·logger) 커버 완료.
> 추가 진행은 actions/components 로 넘어가며 모킹 비용↑ — 사람 리뷰 후 방향 결정 권장.
