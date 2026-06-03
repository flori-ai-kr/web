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

## 다음 후보 (커버리지 낮은 순수 로직 우선)
- `src/lib/utils.ts` (72% → 미커버 분기 보강)
- `src/lib/logger.ts` (9% → Discord 로거, fetch 모킹 필요)
- ※ `src/lib/actions/*` 는 BFF I/O 래퍼라 후순위(apiFetch 모킹 필요, ROI 낮음)

## 누적 lib 라인 커버리지: 6.6% → 14.8% (216/1461)
