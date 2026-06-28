# 스크롤되는 다이얼로그 본문 컨벤션

> 한 줄: **모달 본문을 `flex-1`로 "채우게" 하지 말 것.** 높이는 본문에 직접 `max-h-[..] overflow-y-auto`(또는 고정 `h-[..]`)로 준다.

## 왜 (실제로 터진 버그)

2026-06-25, 매출·지출 라벨 설정(`LabelSettingsManager`)과 고객 등급 관리(`CustomerGradesModal`) 모달이 **헤더·탭만 보이고 본문이 통째로 잘리는** 증상이 발생했다. JS 에러는 없었다.

원인은 CSS flex 높이 붕괴다:

1. shadcn `DialogContent` 기본 클래스는 세로 중앙정렬을 위해 `inset-y-0 my-auto h-fit`을 쓴다 → **모달 높이 = 내용에 맞춤(`height: fit-content`)**. 고정 높이가 없다.
2. 그 안에서 본문을 `flex-1 min-h-0`로 두면:
   - `flex-1` = `flex: 1 1 0%` → 기준 크기(flex-basis)가 **0**. flex-grow는 "**남는 공간**"만 분배한다.
   - 부모가 `h-fit`이라 남는 공간이 없음 → 본문은 기준값 0에 머문다.
   - `min-h-0`가 "내용 최소 높이" 바닥마저 제거 → 본문이 **0으로 붕괴**.
   - (순환 모순: 부모 높이는 자식을 따라가려 하고[h-fit], 자식 높이는 부모의 남는 공간을 따라가려 함[flex-basis 0] → 0으로 수렴)
3. 모달에 걸린 `overflow-hidden`이 0짜리 상자를 삐져나온 실제 내용을 **잘라낸다** → 빈 모달.

사진첩 모달(`tag-manage-modal`)이 멀쩡했던 이유: `flex-1` 채움 없이 리스트에 `max-h-80 overflow-y-auto`만 줘서 내용이 스스로 높이를 가졌고, `h-fit`이 그 높이에 정상적으로 맞춰졌다.

## 하지 말 것 ❌

```tsx
<DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
  <DialogHeader>…</DialogHeader>
  {/* 부모에 확정 높이가 없는데 flex-1로 "채우라"고 시킴 → 0으로 붕괴 → overflow-hidden이 클리핑 */}
  <div className="flex-1 min-h-0 overflow-y-auto">…긴 내용…</div>
</DialogContent>
```

## 할 것 ✅

본문 스크롤 영역에 **직접 높이 상한 + 스크롤**을 준다. `DialogContent`는 기본값(`h-fit`)대로 내용에 맞춰 늘어나게 둔다.

```tsx
<DialogContent className="sm:max-w-md">
  <DialogHeader>…</DialogHeader>
  {/* 긴 본문: 최대높이 + 스크롤 (모달 전체 높이는 내용에 맞춰짐) */}
  <div className="max-h-[70vh] overflow-y-auto">…긴 내용…</div>
</DialogContent>
```

목록처럼 "항목 수와 무관하게 크기 고정"이 필요하면 상한 대신 고정 높이를 쓴다:

```tsx
<div className="h-[320px] overflow-y-auto">…</div>
```

## 규칙

- `DialogContent`에 `overflow-hidden flex flex-col` + 자식 `flex-1 min-h-0` 조합 **금지**. (`h-fit` 기본값과 충돌해 본문이 0으로 붕괴한다.)
- 스크롤이 필요한 본문은 **그 본문 요소에** `max-h-[..]`(가변) 또는 `h-[..]`(고정) + `overflow-y-auto`를 직접 준다.
- `DialogContent`의 높이/오버플로 기본값은 건드리지 않는다 — 내용에 맞춰 늘어나게 둔다.

## 참고

- 기본 컴포넌트: `src/components/ui/dialog.tsx` (`DialogContent`에 동일 경고 주석)
- 정상 레퍼런스: `src/app/(admin)/admin/gallery/components/tag-manage-modal.tsx`
- 수정 커밋: `LabelSettingsManager`, `CustomerGradesModal` (2026-06-25)
