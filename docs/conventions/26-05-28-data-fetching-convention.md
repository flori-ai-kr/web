# 데이터 페칭 · 필터 · 상태 컨벤션

## 1. Server / Client 분리 패턴

```
page.tsx (Server) → 데이터 fetch → *-client.tsx (Client) → UI 렌더링
```

- `page.tsx` 는 서버 컴포넌트로 Server Action을 호출해 데이터를 fetch (BFF 클라이언트를 직접 import하지 않음)
- `*-client.tsx` 는 `'use client'` 로 상태 관리 + 렌더링

## 2. 상태 관리

- `useState` / `useMemo` 만 사용 — **글로벌 상태 스토어 없음**
- 변경 후 `router.refresh()` 로 서버 데이터 재요청

## 3. 검색

- 서버사이드 검색 (`SalesFilters.search` 등)
- 클라이언트 디바운스 300ms
- 검색 실행 시 페이지네이션 리셋

## 4. 다중선택 필터

- 매출/지출 카테고리·결제방식·채널 등
- URL 파라미터 쉼표 구분: `?category=a,b`
- 공용 컴포넌트: `category-multi-select.tsx` (Popover + 체크박스)
- 타입: `SalesFilters.category`/`payment`/`channel` 은 `string[]`

## 5. 통계

- DB 하드코딩 금지 — **항상 실시간 집계**

## 6. 내부 API (외부 루틴 호출용)

- `src/app/api/internal/` — `Authorization: Bearer INTERNAL_API_KEY` (timing-safe 검증, `src/lib/internal-auth.ts`)
- Service Role 클라이언트로 RLS 우회, 외부 수집 루틴(RemoteTrigger 등)에서 호출
