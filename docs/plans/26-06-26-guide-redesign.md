# 가이드 리디자인 — 설계 문서 (spec)

작성일: 2026-06-26 · 브랜치: `session1-guide` · 범위: **web 단독**

## 1. 배경 / 목표

현재 `/admin/guide` 는 텍스트 7섹션 + FAQ 8개의 **단일 스크롤 페이지**(이미지 없음, `lib/guide-content.ts` 데이터). 기능이 13개로 늘어난 지금, "이 가이드만 보면 추가 설명이 필요 없는" 수준의 **기능별 상세 문서**로 전환한다.

핵심 원칙 — 타겟(꽃집 사장님, 이런 서비스에 익숙치 않음):
- **텍스트는 짧게, 스크린샷/GIF가 설명을 떠받친다.**
- 단계는 번호로, 각 글 맨 위 "한눈에 보기" 3줄 요약.
- 앱 프레임 밖으로 튕겨나가지 않게(길 잃음 방지) — **admin 셸 안**에 docs를 둔다.
- flori 팔레트(Dusty Rose) 그대로 → 앱과 이질감 0. 접근성·가독성 최우선.

레퍼런스: OneTime `/ko/guide` (3단 docs), Linear/Stripe Docs.

## 2. 아키텍처

### 2.1 라우팅 (admin 셸 안)
- `app/(admin)/admin/guide/page.tsx` — **인덱스(홈)**: 히어로 + 검색 + 섹션/기능 카드.
- `app/(admin)/admin/guide/[slug]/page.tsx` — **기사(상세)**: 반응형 3단.
- 기존 `(admin)/admin/layout.tsx`(requireAuth + 사업자 인증 게이트 + AppLayout)를 그대로 상속 → 별도 라우트그룹·미들웨어 변경 없음.
- 콘텐츠 영역(`max-w-7xl`, 앱 사이드바 바깥) 안에서 3단 구성. 폭 충분.

### 2.2 콘텐츠 형식 — 타입드 콘텐츠 블록 (MDX 미사용)
MDX 빌드 파이프라인을 새로 깔지 않는다(Next16 + Turbopack + Docker standalone self-host 리스크). 대신 레포의 `guide-content.ts` 관례를 확장한 **타입드 블록 배열**. 렌더 결과는 MDX와 동일, 작성은 블록 조립, TOC 자동 추출, 타입세이프, 무의존성.

```ts
// lib/guide/types.ts
export type GuideBlock =
  | { type: 'heading'; text: string }                 // h2 → TOC 자동 등록
  | { type: 'paragraph'; text: string }               // 인라인 **굵게** / [링크](href) 지원
  | { type: 'steps'; items: string[] }                // 번호 단계
  | { type: 'bullets'; items: string[] }              // 점 목록
  | { type: 'shot'; src: string; alt: string; caption?: string; kind?: 'image' | 'gif' }
  | { type: 'callout'; variant: 'tip' | 'warn' | 'note'; title?: string; text: string }
  | { type: 'faq'; items: { q: string; a: string }[] };

export interface GuideArticle {
  slug: string; sectionId: string; order: number;
  title: string; description: string; icon: string;   // lucide 키
  tldr?: string[];
  blocks: GuideBlock[];
}
export interface GuideSectionMeta { id: string; title: string; order: number }
```

- **TOC**: `blocks.filter(type==='heading')` → `{ id: 's-<index>', text }`. Heading 컴포넌트가 동일 id 부여.
- **인라인 포맷터**(`lib/guide/inline.tsx`): 순수 함수, `**bold**` 와 `[text](href)` 만 파싱 → 단위 테스트 대상.
- **스크린샷**: `public/guide/<기능>/<파일>` 에 대표님이 캡처 드롭. `src='sales/01-list'` → `/guide/sales/01-list.png|gif`. 파일 미존재 시 플레이스홀더 슬롯 렌더(`ImageWithSkeleton` 에러 폴백).

### 2.3 컴포넌트 (`features/guide/` colocate, kebab-case)
- `guide-index.tsx` — 히어로 + 검색(클라 필터) + 섹션별 카드 그리드.
- `guide-article.tsx` — 3단 셸(좌 nav / 중 본문 / 우 TOC), 브레드크럼, 돌아가기, prev/next.
- `guide-nav.tsx` — 좌측 섹션·기사 트리(xl+ 표시). 모바일은 `guide-nav-sheet.tsx`(바텀시트, 라디오 패턴 재사용).
- `guide-toc.tsx` — 우측 스크롤스파이(IntersectionObserver, viewport root + rootMargin 헤더 보정). lg 미만은 본문 위 접이식.
- `guide-block.tsx` — 블록 렌더러(heading/paragraph/steps/bullets/shot/callout/faq).
- `guide-prev-next.tsx`, `guide-breadcrumb.tsx`, `guide-search.tsx`.
- `guide-back-button.tsx` — `?from=` 읽어 "← <기능>로 돌아가기".

### 2.4 진입점 — `ⓘ 사용법` 버튼 (A → B)
- **A(이번 구현)**: `components/guide/guide-button.tsx` — ghost 버튼(lucide `CircleHelp`/`BookOpen`, label "사용법", `aria-label="<기능> 사용법 가이드 보기"`). 각 기능 페이지 `PageHeader` 의 `actions` 슬롯에 배치. `Link → /admin/guide/<slug>?from=<slug>`. 기사 페이지가 `?from=` 으로 돌아가기 버튼 노출.
- **B(후속)**: Next.js intercepting route(`(.)guide/[slug]`)로 앱 내부 진입 시 풀스크린 오버레이 시트(뒤 화면 유지, Esc/X 복귀), 직접/공유 진입 시 독립 페이지. 콘텐츠 한 벌. 본 spec에서는 A의 라우팅/링크 계약만 확정하고 B는 분리.

### 2.5 미세 도움말(보완)
필드 단위 초미세 설명은 그 자리 작은 툴팁/팝오버(기존 radix-popover)로 두고, "사용법" 버튼은 가이드로 보낸다. (이번 범위 밖, 필요 시 추가)

## 3. 정보구조(IA)

| 섹션 | 기사(slug) | 1차 ★ |
|---|---|---|
| 시작하기 | flori 시작하기(`getting-started`) · 홈 화면 둘러보기(`dashboard`) | ★ |
| 매장 운영 | 매출(`sales`) · 지출(`expenses`) · 예약 캘린더(`calendar`) · 고객(`customers`) · 사진첩(`gallery`) | ★ |
| 성장·인사이트 | 통계(`statistics`) · 인사이트(`insights`) · 마케팅 AI(`marketing`) | |
| 커뮤니티·지원 | 커뮤니티(`community`) · 1:1 문의(`support`) | |
| 설정 | 설정·알림·하단탭(`settings`) · 내 프로필(`profile`) · FAQ(`faq`) | ★(settings) |

## 4. 접근성
- 네비/TOC/돌아가기/사용법 버튼 모두 키보드 포커스 + `aria-label`. 장식 아이콘 `aria-hidden`.
- 모바일 바텀시트: 포커스 트랩 + Esc + 트리거로 포커스 복귀.
- 본문 16px·줄간격 넉넉, `break-keep`(한국어 줄바꿈), 색 대비 AA. `transition-all` 금지(레포 규칙).
- 링크/네비 기반(스크린리더·뒤로가기 친화) — 모달로 본문을 가두지 않음.

## 5. 테스트 / 검증
- 순수 로직 **test-first**: 인라인 포맷터(`inline`), TOC 추출, `?from=` → 기능 매핑, 인접 기사(prev/next).
- 컴포넌트: 핵심 RTL 스모크(블록 렌더러, 검색 필터, TOC 활성).
- `npm run lint` · `npm run build` · `npm test` 그린.

## 6. 롤아웃
1. 골격 — 데이터 모델·유틸(+테스트)·블록 렌더러·라우트(index/[slug])·3단 셸·TOC·검색.
2. 1차 콘텐츠 ★ 7편 본문(스샷 슬롯 비움).
3. `ⓘ 사용법` 버튼 핵심 기능 페이지 연결.
4. 스크린샷/GIF 채우기(대표님 제공) → `public/guide/`.
5. 나머지 기능 6편 + 인터셉팅 오버레이(B) + welcome 모달 연결 점검.

## 7. 비범위
- 모바일 네이티브 앱(별 레포) 가이드 화면 — 웹 반응형으로 모바일 브라우저는 커버, 네이티브는 후속.
- api/ai 변경 없음(콘텐츠는 레포 내 정적 데이터).
