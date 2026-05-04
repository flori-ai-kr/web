# 프론트엔드 용어 가이드 (Hazel Admin 기준)

> 이 프로젝트에서 실제로 쓰이는 개념만 정리. AI에게 지시할 때 이 용어를 쓰면 정확히 통함.

---

## 1. 페이지 & 라우팅

| 용어 | 뜻 | 이 프로젝트에서 | AI 지시 예시 |
|------|-----|----------------|-------------|
| **Server Component** | 서버에서 실행되는 컴포넌트. DB 직접 접근 가능 | `page.tsx` 파일들 | "서버 컴포넌트에서 데이터 가져와줘" |
| **Client Component** | 브라우저에서 실행. 클릭/입력 등 상호작용 담당 | `*-client.tsx` 파일들 (`'use client'` 선언) | "클라이언트 컴포넌트에 필터 추가해줘" |
| **라우팅 (Routing)** | URL 경로 → 페이지 연결 | `src/app/(admin)/admin/sales/` → `/admin/sales` | "sales 라우트에 새 탭 추가해줘" |
| **Route Group** | URL에 안 나오는 폴더 그룹 | `(admin)/admin` — 어드민 레이아웃, `(public)` — 공개 홈 레이아웃 | "어드민 그룹에 새 페이지 만들어줘" |
| **Layout** | 여러 페이지가 공유하는 껍데기 | `layout.tsx` — 사이드바, 헤더 포함 | "레이아웃에 푸터 추가해줘" |
| **미들웨어 (Middleware)** | 모든 요청 전에 실행되는 코드 | `middleware.ts` — 로그인 안 했으면 리다이렉트 | "미들웨어에서 특정 경로 제외해줘" |
| **Search Params** | URL 뒤의 `?year=2024&month=1` 같은 것 | 매출 페이지 연/월 필터 | "검색 파라미터로 필터 상태 유지해줘" |

### 이 프로젝트의 페이지 흐름
```
사용자가 /admin/sales 접속
  → middleware.ts: 로그인 확인 (/admin/* 만 인증 강제, / 는 공개)
  → admin/sales/page.tsx (Server): DB에서 매출 데이터 가져옴
  → sales-client.tsx (Client): 필터, 정렬, 모달 등 UI 처리
```

---

## 2. 데이터 처리

| 용어 | 뜻 | 이 프로젝트에서 | AI 지시 예시 |
|------|-----|----------------|-------------|
| **Server Action** | 서버에서 실행되는 함수 (DB 저장/수정/삭제) | `src/lib/actions/*.ts` | "매출 삭제 서버 액션 만들어줘" |
| **CRUD** | Create(생성), Read(읽기), Update(수정), Delete(삭제) | 모든 데이터의 기본 조작 | "고객 CRUD 완성해줘" |
| **Fetch** | 서버에서 데이터를 가져오는 것 | `page.tsx`에서 Supabase 쿼리 | "대시보드에서 이번 달 매출 fetch해줘" |
| **Mutation** | 데이터를 변경하는 것 (생성/수정/삭제) | Server Action 호출 | "저장 버튼 누르면 mutation 실행해줘" |
| **router.refresh()** | 서버 데이터 다시 가져오기 | 저장/삭제 후 화면 갱신 | "저장 후 refresh 호출해줘" |
| **Supabase 쿼리** | DB 조회 문법 | `.from('sales').select('*').eq('id', id)` | "매출을 날짜로 필터링하는 쿼리 추가해줘" |

### 데이터 흐름 (저장 예시)
```
사용자가 "저장" 클릭
  → Server Action 호출 (createSale)
  → Supabase에 INSERT
  → 성공하면 { success: true, data: ... } 반환
  → toast.success("저장 완료")
  → router.refresh() — 목록 갱신
```

---

## 3. 상태 관리 (State)

| 용어 | 뜻 | 이 프로젝트에서 | AI 지시 예시 |
|------|-----|----------------|-------------|
| **State (상태)** | 화면에 영향을 주는 변수 | `const [isOpen, setIsOpen] = useState(false)` | "모달 열림 상태 추가해줘" |
| **useState** | 상태를 만드는 React 함수 | 모든 client 컴포넌트에서 사용 | "로딩 상태 useState로 만들어줘" |
| **useMemo** | 계산 결과를 캐싱 (성능 최적화) | 필터링된 목록 계산 | "필터 결과를 useMemo로 감싸줘" |
| **useEffect** | 컴포넌트 렌더링 후 실행되는 코드 | 초기 데이터 로딩, 이벤트 구독 | "페이지 로드 시 카테고리 불러오는 useEffect 추가해줘" |
| **useCallback** | 함수를 캐싱 (불필요한 재생성 방지) | 이벤트 핸들러 | "핸들러를 useCallback으로 감싸줘" |
| **Props** | 부모 → 자식 컴포넌트로 전달하는 데이터 | `page.tsx` → `client.tsx`로 데이터 전달 | "sales 데이터를 props로 내려줘" |
| **Controlled Input** | React 상태로 값을 제어하는 입력 필드 | 금액 입력, 전화번호 입력 | "금액 필드를 controlled로 바꿔줘" |

### 자주 쓰는 상태 패턴
```typescript
// 모달 열기/닫기
const [isFormOpen, setIsFormOpen] = useState(false)

// 로딩 표시
const [isLoading, setIsLoading] = useState(false)

// 필터 선택값
const [categoryFilter, setCategoryFilter] = useState('all')

// 수정할 항목
const [editingItem, setEditingItem] = useState<Sale | null>(null)
```

---

## 4. UI 컴포넌트

| 용어 | 뜻 | 이 프로젝트에서 | AI 지시 예시 |
|------|-----|----------------|-------------|
| **shadcn/ui** | 프로젝트에서 쓰는 UI 컴포넌트 라이브러리 | `src/components/ui/` 폴더 전체 | "shadcn의 Select 컴포넌트 써줘" |
| **Dialog (모달)** | 화면 위에 뜨는 팝업 창 | 매출 등록/수정, 설정, 삭제 확인 | "삭제 확인 다이얼로그 추가해줘" |
| **Card** | 둥근 테두리의 컨텐츠 박스 | 대시보드 통계 카드 | "매출 요약을 카드로 보여줘" |
| **Badge** | 작은 라벨/태그 | 결제방식, 고객등급 표시 | "카테고리를 뱃지로 보여줘" |
| **Select** | 드롭다운 선택 | 카테고리 필터, 결제방식 선택 | "월 선택을 Select로 바꿔줘" |
| **Table** | 데이터 표 | 매출/지출/입금 목록 | "테이블에 정렬 기능 추가해줘" |
| **Tabs** | 탭 전환 | 입금대조 (대기/완료 탭) | "통계를 탭으로 나눠줘" |
| **Toast** | 하단에 잠깐 뜨는 알림 | 저장/삭제 성공/실패 알림 | "성공하면 토스트 띄워줘" |
| **Skeleton** | 로딩 중 회색 placeholder | 데이터 불러오는 동안 표시 | "로딩 중에 스켈레톤 보여줘" |
| **Sheet** | 옆에서 밀려나오는 패널 | 모바일 사이드바 | "설정을 시트로 열어줘" |
| **Tooltip** | 마우스 올리면 나오는 설명 | 버튼 위에 힌트 | "아이콘에 툴팁 추가해줘" |
| **DropdownMenu** | 클릭하면 나오는 메뉴 | 더보기(⋯) 메뉴 | "행마다 드롭다운 메뉴 추가해줘" |
| **Popover** | 클릭하면 나오는 작은 팝업 | 날짜 선택기 등 | "필터를 팝오버로 만들어줘" |

### 컴포넌트 import 방법
```typescript
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
```

---

## 5. 스타일링

| 용어 | 뜻 | 이 프로젝트에서 | AI 지시 예시 |
|------|-----|----------------|-------------|
| **Tailwind CSS** | HTML에 직접 쓰는 유틸리티 클래스 | `className="text-sm font-bold p-4"` | "여백 좀 늘려줘" / "글자 크기 키워줘" |
| **CSS 변수** | 테마 색상 등을 변수로 관리 | `globals.css`의 `--brand`, `--background` 등 | "브랜드 색상 바꿔줘" |
| **다크모드** | 어두운 배경 테마 | `.dark` 클래스 + CSS 변수 전환 | "다크모드에서 이 카드 색상 수정해줘" |
| **cn()** | 클래스를 안전하게 합치는 유틸 | `cn("text-sm", isActive && "font-bold")` | "조건부 스타일 cn으로 추가해줘" |
| **반응형 (Responsive)** | 화면 크기별 다른 레이아웃 | `hidden md:block` = 모바일 숨김, PC 표시 | "모바일에서 이 컬럼 숨겨줘" |

### 자주 쓰는 Tailwind 클래스

```
크기:     text-xs  text-sm  text-base  text-lg  text-xl
굵기:     font-medium  font-semibold  font-bold
여백:     p-4(패딩)  m-4(마진)  px-6(좌우패딩)  py-3(상하패딩)
간격:     gap-4(자식간격)  space-y-4(세로간격)
색상:     text-gray-500  bg-rose-50  border-gray-200
반응형:   md:block(768px↑)  lg:grid-cols-4(1024px↑)  hidden md:flex
레이아웃: flex  grid  grid-cols-2  items-center  justify-between
```

---

## 6. 폼 (Form)

| 용어 | 뜻 | 이 프로젝트에서 | AI 지시 예시 |
|------|-----|----------------|-------------|
| **FormData** | 폼 데이터를 서버로 보내는 객체 | Server Action의 매개변수 | "FormData에서 값 꺼내줘" |
| **onSubmit** | 폼 제출 시 실행되는 함수 | `e.preventDefault()` 필수 | "제출 핸들러 만들어줘" |
| **Validation** | 입력값 검증 | 필수 필드 체크, 숫자 범위 등 | "금액이 0이면 에러 표시해줘" |
| **Loading State** | 제출 중 로딩 표시 | 버튼 비활성화 + 스피너 | "저장 중에 버튼 비활성화해줘" |
| **AmountInput** | 금액 전용 입력 | 자동 콤마 (1000 → "1,000") | "AmountInput 컴포넌트 써줘" |

### 폼 규칙 (이 프로젝트)
- 엔터키로 폼 제출 방지: `onSubmit={(e) => e.preventDefault()}`
- 삭제는 `confirm()` 금지 → Dialog 사용
- 저장 중 버튼 비활성화 + Loader2 스피너

---

## 7. 필터링 & 정렬

| 용어 | 뜻 | 이 프로젝트에서 | AI 지시 예시 |
|------|-----|----------------|-------------|
| **필터 (Filter)** | 조건에 맞는 데이터만 보여줌 | 카테고리, 결제방식, 날짜 필터 | "결제방식 필터 추가해줘" |
| **정렬 (Sort)** | 특정 기준으로 순서 변경 | 날짜순, 금액순 | "금액 기준 정렬 추가해줘" |
| **검색 (Search)** | 텍스트로 항목 찾기 | 상품명, 고객명 검색 | "검색창 추가해줘" |
| **클라이언트 사이드 필터링** | 이미 받아온 데이터에서 걸러냄 | `useMemo`로 필터링된 목록 계산 | "필터를 클라이언트에서 처리해줘" |

---

## 8. 날짜 & 숫자

| 용어 | 뜻 | 이 프로젝트에서 | AI 지시 예시 |
|------|-----|----------------|-------------|
| **date-fns** | 날짜 처리 라이브러리 | `format()`, `addDays()` 등 | "날짜를 'YYYY년 M월 D일' 형식으로 보여줘" |
| **locale (ko)** | 한국어 날짜 포맷 | `{ locale: ko }` → "2월 10일 (월)" | "한국어 날짜 포맷 적용해줘" |
| **Intl.NumberFormat** | 숫자/통화 포맷 | `₩1,234,567` | "금액을 원화 형식으로 표시해줘" |
| **tabular-nums** | 숫자 정렬용 고정폭 글꼴 | 테이블의 금액 컬럼 | "금액 열을 tabular-nums로 해줘" |

---

## 9. 이미지 & 갤러리

| 용어 | 뜻 | 이 프로젝트에서 | AI 지시 예시 |
|------|-----|----------------|-------------|
| **Supabase Storage** | 파일(이미지) 저장소 | `sale-photos` 버킷 | "이미지를 Supabase Storage에 업로드해줘" |
| **Image Compression** | 이미지 용량 줄이기 | 3MB 초과 시 자동 압축 | "업로드 전에 이미지 압축해줘" |
| **object-cover** | 이미지를 영역에 맞춰 자르기 | 정사각형 썸네일 | "이미지를 object-cover로 표시해줘" |

---

## 10. 인증 & 보안

| 용어 | 뜻 | 이 프로젝트에서 | AI 지시 예시 |
|------|-----|----------------|-------------|
| **Auth (인증)** | 로그인/로그아웃 | Supabase Auth + 쿠키 | "로그인 페이지 만들어줘" |
| **JWT** | 로그인 토큰 | Supabase가 자동 관리 | (직접 다룰 일 거의 없음) |
| **RLS** | Row Level Security — DB 행 단위 접근 제어 | 로그인한 사용자만 데이터 접근 | "RLS 정책 추가해줘" |
| **requireAuth()** | 서버에서 로그인 확인하는 함수 | Server Action 시작 부분에서 호출 | "이 액션에 requireAuth 추가해줘" |
| **보안 헤더** | 브라우저 보안 설정 | X-Frame-Options 등 4종 | "보안 헤더 확인해줘" |

---

## 11. 에러 처리

| 용어 | 뜻 | 이 프로젝트에서 | AI 지시 예시 |
|------|-----|----------------|-------------|
| **Error Boundary** | 에러 발생 시 대체 화면 표시 | `error-boundary.tsx` | "에러 바운더리 추가해줘" |
| **try-catch** | 에러를 잡아서 처리 | Server Action에서 DB 에러 처리 | "에러 처리 추가해줘" |
| **toast.error()** | 에러를 사용자에게 알림 | "저장 실패" 같은 메시지 | "실패하면 에러 토스트 띄워줘" |
| **Loading/Error State** | 로딩 중/에러 시 화면 상태 | `loading.tsx`, `error.tsx` | "로딩 화면 추가해줘" |

---

## 12. 반응형 디자인

| 용어 | 뜻 | 이 프로젝트에서 | AI 지시 예시 |
|------|-----|----------------|-------------|
| **모바일 퍼스트** | 모바일 기준으로 먼저 만들고 PC 확장 | 기본이 모바일, `md:` 이상이 PC | "모바일에서 잘 보이게 해줘" |
| **Breakpoint** | 화면 크기 분기점 | `md` = 768px, `lg` = 1024px | "태블릿에서 2열로 바꿔줘" |
| **Grid** | 격자 레이아웃 | `grid grid-cols-2 lg:grid-cols-4` | "카드를 4열 그리드로 배치해줘" |
| **Flex** | 유연한 한 줄 배치 | `flex items-center justify-between` | "제목과 버튼을 양쪽 정렬해줘" |
| **ResponsiveTable** | PC=표, 모바일=카드 리스트 | 매출/지출 목록 | "ResponsiveTable 컴포넌트 써줘" |

---

## 13. 프로젝트 특수 용어

| 용어 | 뜻 | AI 지시 예시 |
|------|-----|-------------|
| **Server → Client 패턴** | `page.tsx`에서 fetch → `*-client.tsx`로 전달 | "새 페이지를 서버-클라이언트 패턴으로 만들어줘" |
| **CRUD 패턴** | 목록 + 생성/수정 모달 + 삭제 확인 | "고객에 CRUD 패턴 적용해줘" |
| **필터 + 요약 카드** | 상단 통계 카드 + 필터 + 테이블 | "매출 페이지 스타일로 만들어줘" |
| **설정 모달** | 카테고리/결제방식 동적 관리 | "카테고리 설정 모달 추가해줘" |
| **브랜드 컬러** | `--brand: #E5614E` (코랄) | "브랜드 색으로 강조해줘" |
| **sage 컬러** | `--sage: #8B9D83` (세이지 그린) | "세이지 색으로 보조 표시해줘" |

---

## AI에게 지시할 때 꿀팁

### 좋은 지시 예시
```
"매출 페이지에 고객 이름으로 검색하는 필터 추가해줘"
"지출 테이블에 카테고리 기준 정렬 기능 넣어줘"
"대시보드에 이번 주 매출 카드 추가해줘"
"삭제 버튼 누르면 확인 다이얼로그 띄워줘"
"모바일에서 이 테이블을 카드 형태로 보여줘"
"저장 성공하면 토스트로 알려줘"
"다크모드에서 이 뱃지 색상 안 보여 — 수정해줘"
```

### 나쁜 지시 예시 → 이렇게 바꿔볼 것
```
❌ "이거 이쁘게 해줘"
✅ "카드에 여백 추가하고 글자 크기 키워줘"

❌ "데이터 보여줘"
✅ "대시보드에 이번 달 지출 합계를 카드로 보여줘"

❌ "버그 있어"
✅ "매출 저장하면 목록이 안 갱신돼. router.refresh 확인해줘"

❌ "팝업 만들어"
✅ "수정 버튼 누르면 현재 데이터가 채워진 Dialog 열어줘"
```

---

## 파일 찾기 가이드

| 바꾸고 싶은 것 | 파일 위치 |
|---------------|----------|
| 페이지 레이아웃 (사이드바, 헤더) | `src/components/layout/` |
| 특정 페이지 UI (어드민) | `src/app/(admin)/admin/[페이지명]/` |
| 페이지 데이터 로딩 | `src/app/(admin)/admin/[페이지명]/page.tsx` |
| 페이지 상호작용 | `src/app/(admin)/admin/[페이지명]/*-client.tsx` |
| 공개 홈페이지 컴포넌트 | `src/components/public/` |
| DB 저장/수정/삭제 로직 | `src/lib/actions/[기능명].ts` |
| 공통 UI 컴포넌트 | `src/components/ui/` |
| 기능별 컴포넌트 | `src/components/[기능명]/` |
| 타입/인터페이스 | `src/types/database.ts` |
| 전체 색상/테마 | `src/app/globals.css` |
| DB 스키마 | `supabase/schema.sql` |
| 인증 설정 | `middleware.ts`, `src/lib/auth-guard.ts` |
