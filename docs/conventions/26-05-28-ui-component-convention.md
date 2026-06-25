# UI 컴포넌트 컨벤션

모든 UI 텍스트(라벨·메시지·플레이스홀더)는 **한국어**로 작성한다.

## 1. 컴포넌트 & 아이콘

- UI 컴포넌트: `@/components/ui/*` (shadcn/ui)
- 아이콘: `lucide-react`
- 토스트: `sonner` — `toast.success()` / `toast.error()`
- 금액 입력: `AmountInput` 컴포넌트
- 전화번호: 자동 포맷팅 + `inputMode="tel"`

## 2. 폼

- **엔터키 폼 제출 방지 필수**:

```tsx
<form onSubmit={(e) => { e.preventDefault(); /* ... */ }}>
```

- 삭제 확인은 **Dialog** 사용 — 브라우저 `confirm()` 금지
- 스크롤되는 다이얼로그 본문은 `flex-1`로 채우지 말 것 → 본문에 직접 `max-h-[..] overflow-y-auto`. 상세: `26-06-25-dialog-scrollable-body.md`

## 3. 접근성 (a11y)

| 대상 | 규칙 |
|------|------|
| 아이콘 버튼 | `aria-label` 필수 |
| 클릭 가능한 Card | `role="button"` + `tabIndex={0}` + `onKeyDown`(Enter/Space) + `aria-label` |
| 이미지 | 의미 있는 `alt` 설명 (`alt=""` 금지) |

## 4. 스타일 & 테마

- 다크모드: next-themes + CSS 변수(`:root` / `.dark`) — **하드코딩 색상 금지**
- 애니메이션: `transition-all` 금지 → 구체적 속성 명시(`transition-colors` 등)
- 컬러 토큰 상세는 `globals.css` 와 CLAUDE.md '컬러 시스템' 참조

## 5. 날짜

- date-fns locale 은 `@/lib/date-locale` 에서 import — `date-fns/locale` 직접 import 금지
