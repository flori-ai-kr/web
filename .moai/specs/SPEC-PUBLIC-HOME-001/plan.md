---
id: SPEC-PUBLIC-HOME-001
document: plan
version: "0.1.0"
created: "2026-05-04"
updated: "2026-05-04"
---

# SPEC-PUBLIC-HOME-001 구현 계획

## 구현 전략

**TDD greenfield + 무드보드 정합성 점검**. (public) 라우트 그룹은 `feature/init-website` 브랜치에 초안 컴포넌트가 이미 존재하므로, 본 계획은 다음 4축에서 진행한다.

1. **시각 토큰 격리**: `.site-public` 스코프 CSS 변수로 어드민 globals.css와 충돌 차단.
2. **컴포넌트별 시각/접근성 테스트**: Vitest + Testing Library로 시맨틱 마커·alt·aria 속성 검증, Playwright로 실제 렌더링·키보드·외부 링크 동작 검증.
3. **라우트 통합 테스트**: middleware 우회 + SSR 6 섹션 렌더 확인.
4. **품질 게이트**: Lighthouse 모바일 Performance ≥ 80, Accessibility ≥ 90, axe-core 위반 0건.

각 task는 (a) 실패하는 테스트 → (b) 최소 구현 → (c) 리팩터 순서를 따른다. 초안 컴포넌트는 "기존 동작 보존(PRESERVE)" 관점에서 characterization 테스트를 먼저 추가한 뒤 무드보드 기준으로 IMPROVE한다.

## 작업 분해

### Task 1. 디자인 토큰 정의 (Priority: High)

- 영향 파일: `src/app/(public)/styles.css` 또는 `src/app/globals.css` 하단에 `.site-public { --public-bg: ... }` 블록 추가.
- 6색 + Fraunces stack + Pretendard fallback + 패딩 토큰(`--public-padding-section: clamp(120px, 15vh, 240px)`) + radius 토큰.
- 테스트: 어드민 globals.css 변수가 `.site-public` 내에서 override되지 않음을 단위 테스트로 확인.

### Task 2. (public)/layout.tsx wiring 검증 (Priority: Medium)

- 영향 파일: `src/app/(public)/layout.tsx`, `src/components/public/header.tsx`, `src/components/public/footer.tsx`.
- Fraunces variable font 로드 확인, `site-public` 클래스 격리, Header/Footer 시맨틱 마커 (`<header>`, `<footer>`) 점검.
- 테스트: layout 렌더 시 root div에 `site-public` 클래스 존재 + Fraunces variable 적용.

### Task 3. 8 섹션 무드보드 정합성 점검 (Priority: High)

- 영향 파일: `src/components/public/{hero,about,collection,order,location,instagram}-section.tsx` + `header.tsx` + `footer.tsx`.
- 점검 항목 (각 섹션):
  - 6색 팔레트만 사용 (인라인 색·tailwind 색 클래스 grep).
  - `rounded-2xl|rounded-3xl|rounded-full`(아이콘 제외) · `transition-all` · 그라데이션·이모지 0건.
  - 시맨틱 마커: `<section aria-labelledby="...">` + 헤딩.
  - 4:5 비율 이미지 wrapper.
  - 외부 링크 `target="_blank"` + `rel="noopener noreferrer"`.
- 테스트: 컴포넌트별 RTL 테스트 + lint 룰 추가 (eslint-plugin-tailwindcss로 금지 클래스 차단).

### Task 4. middleware.ts matcher 갱신 (Priority: High, SPEC-ROUTE-ADMIN-001 협조)

- 영향 파일: `middleware.ts`.
- matcher에서 `/`, `/(public)/*` 제외. SPEC-ROUTE-ADMIN-001이 정의하는 admin matcher와 합쳐 단일 정규식으로 정리.
- 테스트: 익명으로 `/` 진입 시 200 + `<HeroSection>` 마커 포함, `/admin` 진입 시 `/login` 리다이렉트.

### Task 5. 외부 링크 환경변수화 (Priority: High)

- 영향 파일: `src/lib/env.ts`, `.env.example`.
- 추가 키: `NEXT_PUBLIC_KAKAO_CHANNEL_URL`, `NEXT_PUBLIC_NAVER_PLACE_URL`, `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_BUSINESS_PHONE`.
- Zod 스키마로 URL 형식 검증. order/location/instagram 섹션이 모두 env 참조.

### Task 6. Instagram 섹션 fallback + 옵션 운영자 계정 fetch (Priority: Low)

- 영향 파일: `src/components/public/instagram-section.tsx`, `src/lib/instagram-public.ts` (옵션).
- 우선순위 1: 정적 fallback 6장 (큐레이션 이미지) + 프로필 이동 버튼.
- 우선순위 2 (옵션): `app/api/internal/instagram-accounts/`의 운영자 등록 계정 최신 6장을 ISR(revalidate 1h)로 가져오고 실패 시 fallback.
- 테스트: 정상 응답·404·5xx·timeout 4가지 시나리오에서 페이지 렌더 실패 0건.

### Task 7. Open Graph + LocalBusiness JSON-LD (Priority: Medium)

- 영향 파일: `src/app/(public)/layout.tsx` (metadata) + `src/app/(public)/page.tsx` (JSON-LD `<script type="application/ld+json">`).
- LocalBusiness: `@type=Florist`, name, address, telephone, openingHours, image, sameAs[Instagram URL].
- 테스트: 빌드 산출물에서 `<meta property="og:*">` 7종 + JSON-LD 파싱 성공 확인.

### Task 8. 접근성 검증 (Priority: High)

- 영향 파일: 전 (public) 컴포넌트.
- 키보드 탭 순서 검증 (Header nav → Hero CTA → 각 섹션 CTA → Footer).
- focus-visible 스타일 (2px Oxblood outline + 2px offset).
- axe-core Playwright 통합 — `(public)` 페이지에서 위반 0건.
- 대비비 자동 측정 스크립트 (모든 텍스트/배경 페어 ≥ 7:1).

### Task 9. Lighthouse 모바일 측정 (Priority: Medium)

- 영향 파일: 빌드 산출물.
- 측정 환경: Lighthouse CI mobile preset, Slow 4G throttle.
- 목표: Performance ≥ 80, Accessibility ≥ 90, Best Practices ≥ 90, SEO ≥ 95.
- 미달 시 next/image priority·preload·subset 폰트 점검.

### Task 10. 정적 자산 (Anthurium SVG 3종) placeholder (Priority: Low)

- 영향 파일: `public/ornaments/anthurium-a-solid.svg`, `anthurium-b-line.svg`, `anthurium-c-plate.svg`.
- v1: placeholder SVG (간단한 라인 에칭). 실제 시안은 무드보드 §ORN 리뷰 후 교체.
- About·Hero·Footer에서 1회 등장.

## 기술 제약

- **Tailwind 4 + CSS 변수**: tailwind 4의 `@theme` 또는 CSS 변수로 토큰 정의. 어드민과 충돌 방지를 위해 `.site-public` 셀렉터 하위에서만 적용.
- **Fraunces variable font**: `next/font/google`의 `Fraunces`로 weight 300/400 + italic 로드. variable 폰트로 SOFT/WONK axes는 CSS `font-variation-settings`로 제어.
- **Pretendard**: 한글은 Pretendard. `<link>` preload 또는 next/font/local로 subset 처리.
- **Next 16 App Router SSR**: 모든 섹션은 Server Component 기본. 인터랙션이 필요한 갤러리 라이트박스 등만 `'use client'`.
- **어드민 토큰 격리**: `globals.css`의 `:root` 변수는 `.site-public` 컨테이너 안에서 `@layer`로 override. 어드민 라우트(`/admin/*`)는 영향 받지 않아야 한다.
- **next/image**: 외부 이미지(인스타그램 CDN)는 `next.config.ts`의 `images.remotePatterns`에 등록 필요.

## 위험 분석

| 위험                                              | 가능성 | 영향   | 완화 전략                                                                                  |
| ------------------------------------------------- | ------ | ------ | ------------------------------------------------------------------------------------------ |
| 어드민 globals.css와 토큰 충돌                    | 중     | 중     | `.site-public` 스코프 셀렉터 + 시각 회귀 테스트(어드민 라우트 스크린샷 diff) 도입          |
| Instagram 외부 API 의존 (rate limit·CORS·인증)    | 높     | 중     | 정적 fallback 우선, 동적 fetch는 옵션. ISR + 정상 응답 캐싱(1h)                            |
| 한글 폰트 무게 (Pretendard 풀 패밀리 ≈ 800KB)     | 높     | 중     | weight 400/500/700만 subset, preload + display swap                                        |
| 디자인 시안(Anthurium SVG 3종) 부재               | 중     | 낮     | placeholder SVG로 시작, 무드보드 §ORN 리뷰 후 교체. 본 SPEC scope 외로 명시                |
| middleware 변경이 어드민 세션 가드 회귀          | 낮     | 높     | SPEC-ROUTE-ADMIN-001과 동일 PR 또는 직전 머지. matcher 통합 테스트 작성                    |
| Lighthouse Performance < 80 (이미지 무게)         | 중     | 중     | next/image + AVIF/WebP, hero 정물 1점만 priority, lazy load 나머지                         |

## 참조 구현

| 사이트                           | 가져올 패턴                                                  |
| -------------------------------- | ------------------------------------------------------------ |
| AESME (`aesme.co.uk`)            | 세리프+산세리프 페어링, 4:5 정물 70% 히어로                  |
| Saipua (`saipua.com`)            | 미니멀 네비, 챕터 브레드크럼, 언더빌드 미학                  |
| Emily Thompson Flowers           | 브랜드 한 줄 철학, 사진 크레딧, 포트폴리오 문법 네비         |
| McQueens Flowers                 | 단일 보태니컬 글리프 반복 (오너먼트 모델)                    |
| Vergel Flower (`vergelflower.com`) | 한글 브랜드 한 문장, 인스타 피드를 홈 1급 블록             |
| 현 초안 (`feature/init-website`) | 8 컴포넌트 그라운딩 — wiring·시맨틱 마커는 보존, 토큰만 정합 |

## 진행 순서

Task 1 → 4 → 5 → 2 → 3 → 7 → 8 → 9 → 6 → 10.

- High 우선: Task 1 (토큰), Task 4 (middleware), Task 3 (정합성), Task 5 (env), Task 8 (접근성)
- Medium: Task 2 (layout), Task 7 (SEO), Task 9 (Lighthouse)
- Low: Task 6 (Instagram dynamic fetch), Task 10 (Anthurium SVG)
