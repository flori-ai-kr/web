---
id: SPEC-PUBLIC-HOME-001
version: "0.1.0"
status: "draft"
created: "2026-05-04"
updated: "2026-05-04"
author: "MoAI Orchestrator"
priority: "high"
issue_number: 55
---

# SPEC-PUBLIC-HOME-001: 공개 홈페이지 (Quiet Editorial)

## HISTORY

- 2026-05-04: 초안 작성. `feature/init-website` 브랜치의 초안 컴포넌트(`src/app/(public)/*`, `src/components/public/*`)를 그라운딩으로 EARS 요구사항 정의.

## 배경

꽃집 hazel은 현재 어드민(`/`)만 운영 중이며, 일반 방문객을 위한 공개 채널은 인스타그램과 구두 안내가 전부다. 브랜드 자산을 통일된 디자인 언어로 노출하고 잠재 고객이 카카오톡/네이버를 통해 문의·예약하도록 유도하기 위해, **루트(`/`)에 공개 홈페이지를 신설**한다. 어드민은 동시 진행 중인 SPEC-ROUTE-ADMIN-001을 통해 `/admin/*`로 이전된다.

디자인 방향은 `docs/plans/2026-04-22-homepage-moodboard.md`에서 합의된 **Quiet Editorial (B) + Old Europe Atelier (A) + Dark Floral (C) 포인트** 무드를 따른다. 어드민의 Warm Coral / Sage Green 톤과는 색·서체·라운딩까지 완전 분리한다.

이미 `feature/init-website` 브랜치에 8개 컴포넌트 초안과 `(public)` 라우트 그룹이 생성되어 있으므로, 본 SPEC은 그라운딩된 초안을 정합화·검증하는 데 초점을 둔다.

## 목표 / 비목표

### 목표

- `/` 접근 시 (public) 라우트 그룹의 6개 섹션(Hero, About, Collection, Order, Location, Instagram)을 SSR로 렌더한다.
- 어드민 톤·라운딩·이펙트와 완전히 분리된 디자인 토큰 시스템을 `site-public` 스코프에 격리한다.
- 카카오톡 채널·네이버 플레이스 외부 링크만으로 주문 동선을 완성한다 (온라인 결제 없음).
- WCAG 2.1 AA(대비비 ≥ 7:1)와 SEO 기본기(Open Graph + LocalBusiness JSON-LD)를 충족한다.
- middleware 인증 우회로 익명 사용자 즉시 접근을 보장한다 (SPEC-ROUTE-ADMIN-001 협조).

### 비목표

- 온라인 결제, 장바구니, 회원가입, 사용자 계정 시스템.
- Journal/블로그 섹션 (v1 스킵, 무드보드 결정).
- 어드민 컬러·서체 재사용 또는 어드민 컴포넌트 공유.
- 다국어(영문) 페이지 (한국어 단일 로케일).

## EARS 요구사항

### REQ-PUBLIC-001 [Ubiquitous]

The system shall render the `(public)` layout with six sections (Hero, About, Collection, Order, Location, Instagram) on the `/` route via Server-Side Rendering (SSR).

> **검증**: `GET /` 응답에 6개 섹션의 시맨틱 마커(`<section>` + `aria-labelledby`)가 포함되며, 첫 페인트 시 클라이언트 자바스크립트 없이 콘텐츠가 노출된다.

### REQ-PUBLIC-002 [State-driven]

While a request path matches `/` or `/(public)/*`, the middleware shall bypass Supabase Auth verification and allow anonymous access.

> **검증**: 비로그인 상태에서 `/` 진입 시 `/login` 리다이렉트가 발생하지 않는다. SPEC-ROUTE-ADMIN-001의 `middleware.ts` matcher에서 공개 경로를 명시적으로 제외한다.

### REQ-PUBLIC-003 [Ubiquitous]

The system shall use only the six-color palette (Ivory Paper `#F3EEE5`, Warm Charcoal `#1F1A16`, Oxblood `#5A1A1A`, Aged Pewter `#8B857C`, Soft Parchment `#EDE3D0`, Dusted Olive `#6B6B4F`), Fraunces Light (Display), and Pretendard (Body) on `(public)` routes, and shall NOT use forbidden tokens: pure white `#FFFFFF`, pure black `#000000`, pink/pastel hues, `rounded-2xl` or larger, neon, gradients, blur, emoji, flat-design illustrations, or `transition-all`.

> **검증**: `(public)` 스코프 내 인라인 색·CSS 변수에 위 6색만 등장. tailwind 클래스 grep 시 금지 토큰 0건. radius는 최대 4–6px(`rounded-sm` / `rounded`).

### REQ-PUBLIC-004 [Event-driven]

When a user clicks an order CTA (카카오톡 채널 / 네이버 플레이스 / 인스타그램 / 전화) in the Order, Location, or Instagram sections, the system shall open the external destination in a new tab with `target="_blank"` and `rel="noopener noreferrer"`.

> **검증**: 모든 외부 링크 앵커가 `target="_blank"` + `rel="noopener noreferrer"` 속성을 가지며, URL은 환경변수(`NEXT_PUBLIC_KAKAO_CHANNEL_URL`, `NEXT_PUBLIC_NAVER_PLACE_URL`, `NEXT_PUBLIC_INSTAGRAM_URL`)에서 주입된다.

### REQ-PUBLIC-005 [Optional]

Where the Instagram feed integration is configured, the Instagram section shall display the latest 6 posts of the registered operator account; if the upstream fetch fails or the integration is disabled, the system shall render a static fallback (6 placeholder thumbnails with deep-link to `@hazel.flower.studio`).

> **검증**: 정적 fallback은 6개의 4:5 자리표시자(SVG botanical plate 또는 큐레이션 이미지)와 인스타그램 프로필 이동 버튼을 노출. 외부 API 실패 시 페이지 렌더 자체는 실패하지 않는다.

## [DELTA] 모듈별 변화

| 변경 유형  | 경로                                                  | 설명                                                                                    |
| ---------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [NEW]      | `src/app/(public)/layout.tsx`                         | Fraunces variable font 로드 + `site-public` 스코프 + PublicHeader/Footer wiring         |
| [NEW]      | `src/app/(public)/page.tsx`                           | 6 섹션 컴포지션 (Hero · About · Collection · Order · Location · Instagram)              |
| [NEW]      | `src/components/public/header.tsx`                    | hazel 워드마크 + 5개 앵커 네비 (About · Collection · Order · Location · Instagram)      |
| [NEW]      | `src/components/public/footer.tsx`                    | 브랜드 디스크립터 + 사업자 정보 + 인스타/카카오 링크                                    |
| [NEW]      | `src/components/public/hero-section.tsx`              | 텍스트-퍼스트 + 4:5 정물 1점 + 한글 한 줄 카피                                          |
| [NEW]      | `src/components/public/about-section.tsx`             | 챕터형 브랜드 서사 + botanical plate 일러스트 1회 등장                                  |
| [NEW]      | `src/components/public/collection-section.tsx`        | 4:5 세로 중심 룩북 그리드 (5/7 비대칭)                                                  |
| [NEW]      | `src/components/public/order-section.tsx`             | 카카오톡 채널 + 네이버 플레이스 CTA + 안내 카피                                         |
| [NEW]      | `src/components/public/location-section.tsx`          | 주소 · 영업시간 · 네이버 지도 임베드 또는 스틸 + 길찾기                                 |
| [NEW]      | `src/components/public/instagram-section.tsx`         | 최신 6장 + fallback + 프로필 이동                                                       |
| [NEW]      | `(public)` 디자인 토큰 (CSS 변수, scoped to `.site-public`) | 6색 팔레트 + Fraunces stack + 한글 Pretendard fallback + 패딩/그리드 토큰          |
| [MODIFY]   | `middleware.ts`                                       | matcher에서 `/`, `/(public)/*` 제외 (SPEC-ROUTE-ADMIN-001 협조)                         |
| [EXISTING] | `tailwind.config.ts` 또는 globals.css                 | Fraunces variable 폰트 추가만, 어드민 토큰은 변경하지 않음                              |

## 영향 받는 파일

```
src/app/(public)/layout.tsx                       [NEW]
src/app/(public)/page.tsx                         [NEW]
src/app/(public)/styles.css 또는 globals.css       [NEW or MODIFY — site-public 스코프]
src/components/public/header.tsx                  [NEW]
src/components/public/footer.tsx                  [NEW]
src/components/public/hero-section.tsx            [NEW]
src/components/public/about-section.tsx           [NEW]
src/components/public/collection-section.tsx      [NEW]
src/components/public/order-section.tsx           [NEW]
src/components/public/location-section.tsx       [NEW]
src/components/public/instagram-section.tsx       [NEW]
middleware.ts                                     [MODIFY — SPEC-ROUTE-ADMIN-001 협조]
src/lib/env.ts                                    [MODIFY — KAKAO_CHANNEL_URL, NAVER_PLACE_URL, INSTAGRAM_URL 추가]
public/ornaments/anthurium-{a,b,c}.svg            [NEW — placeholder]
```

## What NOT to Build

1. **온라인 결제 / 장바구니 / 체크아웃** — 모든 주문은 카카오톡 채널·네이버 플레이스 외부 링크로 이관한다. 결제 모듈, 결제 PG 연동, 주문 DB 스키마는 본 SPEC 범위 밖이다.
2. **회원가입 / 사용자 계정 시스템** — 공개 홈페이지는 100% 익명 페이지이며, 어드민(`/admin/*`)의 Supabase Auth와 어떤 사용자 데이터도 공유하지 않는다.
3. **어드민 디자인 토큰 재사용** — Warm Coral `#E5614E`, Sage Green `#8B9D83`, shadcn/ui 컴포넌트, `globals.css` 어드민 변수는 (public) 스코프에서 사용 금지. 모든 토큰은 `.site-public` 클래스 하위에 격리한다.
4. **금지 디자인 토큰** — `rounded-2xl` 이상 라운딩, 네온, 그라데이션, 블러 과다, 이모지, 플랫 디자인 일러스트, `transition-all`. 한 건이라도 등장하면 PR 차단 사유.
5. **Journal / 블로그 / SEO 콘텐츠 섹션** — 무드보드 v0.2에서 v1 스킵 결정. 추후 별도 SPEC으로 재검토.
6. **다국어(i18n) 라우팅** — 한국어 단일 로케일. `/en` 등 prefix 라우트 없음.
7. **사용자 입력 폼** — 문의 폼·이메일 구독·예약 폼 모두 v1 out. 모든 동선은 외부 채널 링크.

## 디자인 시스템 명세

### 컬러 토큰 (CSS 변수, `.site-public` 스코프)

| 변수명                  | HEX       | 역할              | 용도                            |
| ----------------------- | --------- | ----------------- | ------------------------------- |
| `--public-bg`           | `#F3EEE5` | Ivory Paper       | 페이지 기본 배경                |
| `--public-text`         | `#1F1A16` | Warm Charcoal     | 본문·헤드라인                   |
| `--public-accent`       | `#5A1A1A` | Oxblood           | CTA, 링크 hover, 포인트         |
| `--public-muted`        | `#8B857C` | Aged Pewter       | 보조·캡션·라인·푸터             |
| `--public-surface`      | `#EDE3D0` | Soft Parchment    | 섹션 배경 대비                  |
| `--public-nature`       | `#6B6B4F` | Dusted Olive      | 드물게 쓰는 네이처 톤           |

**금지**: 순백 `#FFFFFF`, 순검 `#000000`, 핑크/파스텔 hue 0–60° 또는 280–360° 저채도 영역.

### 타이포 스케일

| 역할          | 폰트                           | 크기 / 행간                          | 비고                              |
| ------------- | ------------------------------ | ------------------------------------ | --------------------------------- |
| Display XL    | Fraunces Light (300)           | `clamp(48px, 7vw, 96px)` / 1.05      | tracking 0.02, italic 옵션        |
| Display L     | Fraunces Light (300)           | `clamp(36px, 4.5vw, 64px)` / 1.1     | Hero·About 헤드라인               |
| Display M     | Fraunces (400)                 | `clamp(24px, 2.4vw, 36px)` / 1.2     | 섹션 타이틀                       |
| Body L        | Pretendard 400                 | `18px` / 1.7                         | 본문                              |
| Body          | Pretendard 400                 | `16px` / 1.7                         | 일반                              |
| Caption       | Pretendard 400                 | `13px` / 1.5                         | 사진 크레딧, 캡션                 |

- Variable axes: SOFT 40 / WONK 0 (Fraunces 본인 axes 활용 불가 시 weight 300 fallback).
- 한글은 모두 Pretendard. Display에서도 한글이 있으면 Pretendard로 fallback.

### 12 col 비대칭 그리드 규칙

- Hero: 5/7 분할 (텍스트 5, 정물 1점 7).
- About: 4/8 분할 (botanical plate 4, 본문 8).
- Collection: 7/5 또는 5/7 교차 (4:5 세로 + 16:9 한두 장).
- Order / Location: 6/6 또는 단일 컬럼 (모바일 우선).
- Instagram: 6장 grid `grid-cols-2 md:grid-cols-3`.

### 섹션 패딩 / 이미지 비율 / 애니메이션

- 섹션 상하 패딩: `clamp(120px, 15vh, 240px)`.
- 좌우 패딩: `clamp(24px, 6vw, 96px)`.
- 이미지 비율: 4:5 세로 중심 + 16:9 1–2점.
- 인터랙션: 페이드 인 (opacity 0 → 1, 600ms `cubic-bezier(0.22, 1, 0.36, 1)`) + 1–2% 패럴랙스만. `transition-all` 금지, 구체 속성 명시.
- Border radius: 0 또는 4–6px 한정 (`--public-radius: 4px`).

## 접근성 / SEO

- WCAG 2.1 AA: 본문 대비비 ≥ 7:1 (Warm Charcoal on Ivory Paper = 11.8:1, Oxblood on Ivory Paper = 9.2:1 검증 완료).
- 시맨틱 HTML: `<header>`, `<nav>`, `<main>`, `<section aria-labelledby>`, `<footer>`.
- 모든 이미지 `alt`: 의미 있는 한글 설명 (`alt=""` 금지). 장식 SVG는 `aria-hidden="true"` + `role="presentation"`.
- 키보드 포커스: 모든 인터랙티브 요소에 가시적 focus ring (2px Oxblood outline + 2px offset).
- Open Graph: `og:title`, `og:description`, `og:image` (4:5 hero 정물), `og:locale=ko_KR`, `og:type=website`.
- 구조화 데이터: `application/ld+json` LocalBusiness 스키마 (name, address, telephone, openingHours, image, sameAs[Instagram]).
- next/image 최적화: hero·collection·instagram 이미지 모두 `next/image`. 위 폴드 hero는 `priority`.

## 보안 / 프라이버시

- 외부 링크 `rel="noopener noreferrer"` 강제. (REQ-PUBLIC-004)
- 사용자 입력 폼·쿠키·트래킹 픽셀 0건. (CTA는 외부 채널로 위임)
- middleware는 `/(public)/*`에 대해 인증 토큰을 읽지 않는다 — 어드민 세션 누출 0%.
- 환경변수 키(`NEXT_PUBLIC_*`)는 모두 클라이언트 노출 가능한 공개 URL만 담는다.

## MX Tag Plan

- `src/app/(public)/layout.tsx`: `@MX:NOTE` (디자인 토큰 진입점, Fraunces 로드 지점)
- `src/components/public/hero-section.tsx`: `@MX:NOTE` (브랜드 첫 인상, 텍스트-퍼스트 원칙 anchor)
- `middleware.ts`: `@MX:WARN` (인증 우회 경로, SPEC-ROUTE-ADMIN-001과 동기 필요)
- `src/components/public/instagram-section.tsx`: `@MX:TODO` (외부 API 의존, fallback 검증 필수)

## 관련 SPEC

- **SPEC-ROUTE-ADMIN-001** — 어드민 라우트 이전 + middleware matcher 갱신. REQ-PUBLIC-002 충족을 위해 동일 PR 또는 직전 머지 필요.
