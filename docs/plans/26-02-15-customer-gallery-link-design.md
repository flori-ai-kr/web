# 고객 카드 UI 수정 + 고객-사진첩 연결 설계

## 날짜: 2026-02-15

## 1. 고객 카드 텍스트 깨짐 수정

**문제**: `grid grid-cols-3`이 모바일에서도 3열을 강제하여 텍스트 줄바꿈 발생
**해결**: 카드 내부 레이아웃을 모바일에서 세로 스택으로 변경 + `whitespace-nowrap`

## 2. 사진첩 고객 필터

- 기존 태그 필터 옆에 고객 검색 콤보박스 추가
- 고객 이름 자동완성, 선택 시 해당 고객 매출의 photo_cards만 표시
- 선택된 고객은 필터 배지로 표시, X로 해제

**데이터 흐름**:
```
gallery-client → getPhotoCards(tag, customerId)
  → photo_cards JOIN sales ON sale_id WHERE sales.customer_id = ?
```

**Server Action**: `getPhotoCards`에 `customerId` 파라미터 추가

## 3. 고객 상세 → 사진첩 연결

- 고객 상세 다이얼로그에 "사진 보기" 버튼 추가
- 클릭 시 `router.push('/gallery?customer={id}')`
- 사진첩에서 URL 파라미터로 자동 필터 적용

## 접근 방식

- DB 스키마 변경 없음 (기존 customer → sales → photo_cards 관계 활용)
- 기존 사진첩 무한스크롤/태그 필터와 공존
- UX: 사진첩 내 고객 필터 + 고객 상세에서 원클릭 이동

## 변경 대상 파일

- `customers-client.tsx` — stats 카드 레이아웃 수정
- `gallery-client.tsx` — 고객 필터 UI 추가
- `gallery/page.tsx` — 고객 목록 데이터 전달
- `lib/actions/photo-cards.ts` — getPhotoCards에 customerId 파라미터 추가
- `customers/components/CustomerDetailDialog.tsx` — 사진 보기 버튼 추가
