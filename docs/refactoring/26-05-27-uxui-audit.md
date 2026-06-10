# Flori Admin — UX/UI + 접근성 감사

> 2026-05-27 · 읽기전용 감사 (코드 미수정) · 범위: admin clients, layout, shared UI, public homepage, token system

## 종합: B+ / 탄탄함

기본기가 좋다. 가장 자주 어기는 HARD 규칙 두 개(`transition-all`, `confirm()`)가 **전부 클린(0건)**, 트랜지션은 구체적, reduced-motion 전역 처리, 대시보드/매출에 Skeleton·empty·loading 상태 존재. 새 3단계 토큰 시스템(globals.css)도 잘 설계됨.

### 반복되는 3가지 테마
1. **아이콘 전용 버튼 `aria-label` 누락** — 구형 설정/태그/사진 모달에 몰림 (신규 컴포넌트는 이미 잘 함 → 레거시 드리프트).
2. **상태색이 토큰 시스템 이전 방식** — green/blue/amber/emerald/red Tailwind 리터럴 + 수동 `dark:` → 이제 `--success/--info/--warning/--danger`(+`-soft`)로 통합 가능. 다크모드 버그도 공짜로 해결됨. **가장 레버리지 큰 정리.**
3. **임의 `text-[Npx]` vs 타입 램프** — 광범위하지만 저위험. 만질 때 기회 있을 때 교체.

보안/XSS/파괴 패턴 이슈는 UI 레이어에서 없음.

---

## HIGH — 접근성 블로커 & HARD 규칙 위반

- **H1. CustomerCard 클릭 카드에 키보드/a11y 속성 전무** — `src/app/(admin)/admin/customers/components/CustomerCard.tsx:42-45`. `role="button"`+`tabIndex={0}`+`onKeyDown`+`aria-label` 추가. (SalesList.tsx:134 / PhotoCard.tsx:124 패턴 복사). **S**
- **H2. 아이콘 버튼 aria-label 누락 (TagManageModal)** — `src/components/gallery/TagManageModal.tsx:121,154,163,200,208` (5개). **S**
- **H3. 아이콘 버튼 aria-label 누락 (Expense/Sales SettingsModal)** — `src/components/expenses/ExpenseSettingsModal.tsx:112,144,153,190,202` + `src/components/sales/SalesSettingsModal.tsx:114,145,154,191,203` (10개). recurring-expenses-section.tsx:275 패턴 미러. **S**
- **H4. 썸네일 네비 버튼: `alt=""` + 버튼 라벨 없음** — `src/components/gallery/PhotoCardDialog.tsx:157-171` (코드베이스 유일한 alt=""). 버튼에 `aria-label`. **S**
- **H5. 기타 아이콘 버튼 라벨 누락** — `PhotoUploadModal.tsx:366`, `SalePhotoModal.tsx:380`, `insights/follows/account-manager-dialog.tsx:236`. **S**

## MEDIUM — 토큰 불일치 & 경미한 a11y

- **M1. 상태 인디케이터가 Tailwind 팔레트 하드코딩** (최대 반복 테마): `Header.tsx:202-205`(green/blue/amber→success/info/warning), `recurring-expenses-section.tsx:266`(emerald→success), `SaleDetailDialog.tsx:184`(blue→info), `PhotoUploadModal.tsx:447`/`SalePhotoModal.tsx:460`(blue→info), `TagManageModal.tsx:161`(green→success). **M**
- **M2. CustomerCard 등급색 다크모드 비안전** — `CustomerCard.tsx:12-14` (`bg-purple-50`/`text-purple-600`, `*-50` 글레어). `-soft` 토큰 또는 배지 패턴. **S**
- **M3. `bg-red-50`/`bg-red-500` 파괴 컨트롤** — `CustomerDetailDialog.tsx:231`, `bottom-nav-customizer.tsx:319` → `danger`/`danger-soft`. **S**
- **M4. 주말 요일색 `text-red-400`/`text-blue-400`** — `calendar-client.tsx:977,1009-1010,1102,1134-1135`. AA 경계 → `-500`/`-600` 또는 토큰화. **S**
- **M5. "오늘만" 버튼 `bg-emerald-950` 하드코딩 + 다크 수동 포크 중복** — `sales-client.tsx:468`, `expenses-client.tsx:516`. 공유 variant 추출/토큰화. **M**
- **M6. Header 상태 배지 `text-[10px]` + white-on-amber-500 대비 AA 실패(~2.1:1)** — `Header.tsx:202`. `bg-warning` 토큰 + `--text-caption`. **S**

## LOW — 폴리시

- **L1. 임의 `text-[Npx]` → 타입 램프** — calendar(22곳)·dashboard·Sidebar·BottomNav 등. 만질 때 교체(일괄 재작성 X). **M**
- **L2. 커스텀 Link 네비에 focus-visible ring 없음** — `Sidebar.tsx:82-90`, `BottomNav.tsx:164-171`. `focus-visible:ring-2 ring-ring`. **S**
- **L3. Sidebar/BottomNav 터치 타깃 <44px 확인 필요** — `min-h-[44px]`. **S**
- **L4. CustomerCard 이모지 등급 아이콘(👑⚠️🌟)** — lucide(Crown/Star/AlertTriangle)로 통일(customers-client는 이미 사용). **S**
- **L5. `account-manager-dialog.tsx:211` `bg-emerald-500/10`** → `bg-success-soft text-success`. **S**

---

## Top 5 Quick Wins (가치↑ 노력↓)

1. **H1** CustomerCard 키보드 a11y — 속성 한 블록으로 주요 화면 키보드 블로커 해결. **S**
2. **H2+H3** 설정/태그 모달 아이콘 버튼 15개 `aria-label` — 순수 추가, 회귀 위험 0, a11y 부채 대부분 해소. **S**
3. **M6** Header amber 배지 → `bg-warning` — 실제 **대비 실패 수정** + 다크 포크 제거. **S**
4. **H4** PhotoCardDialog 썸네일 라벨 — 유일한 alt="" + 라벨없는 사진 네비. **S**
5. **M2/M3** 다크 비안전 `bg-*-50`/`bg-red-50` → `-soft` 토큰. **S**

## 권장 진행

- Top-5는 **추가형/저위험**이라 기능픽스 세션과 충돌 적음.
- M1/M5/L1(토큰 마이그레이션)은 기능 수정이 안정된 뒤 일괄 — 머지 충돌 방지.
