---
id: SPEC-PUBLIC-HOME-001
document: spec-compact
version: "0.1.0"
created: "2026-05-04"
---

# SPEC-PUBLIC-HOME-001 (Compact)

꽃집 hazel 공개 홈페이지(`/`). Quiet Editorial + Old Europe Atelier + Dark Floral 포인트. 어드민과 컬러·서체·라운딩 완전 분리. SPEC-ROUTE-ADMIN-001 협조.

## EARS 요구사항

- **REQ-PUBLIC-001 [Ubiquitous]**: `/`는 (public) 레이아웃 + 6 섹션(Hero · About · Collection · Order · Location · Instagram)을 SSR로 렌더한다.
- **REQ-PUBLIC-002 [State-driven]**: While path matches `/` or `/(public)/*`, middleware는 Supabase Auth 검증을 우회한다.
- **REQ-PUBLIC-003 [Ubiquitous]**: 6색 팔레트(Ivory `#F3EEE5` / Charcoal `#1F1A16` / Oxblood `#5A1A1A` / Pewter `#8B857C` / Parchment `#EDE3D0` / Olive `#6B6B4F`) + Fraunces Light(Display) + Pretendard(Body)만 사용. 금지: 순백·순검·핑크·파스텔·`rounded-2xl`+·네온·그라데이션·이모지·플랫·`transition-all`.
- **REQ-PUBLIC-004 [Event-driven]**: When CTA 클릭 (카카오톡·네이버·인스타·전화), 새 탭(`target="_blank"` + `rel="noopener noreferrer"`) + env URL(`NEXT_PUBLIC_KAKAO_CHANNEL_URL`, `NEXT_PUBLIC_NAVER_PLACE_URL`, `NEXT_PUBLIC_INSTAGRAM_URL`)로 이동.
- **REQ-PUBLIC-005 [Optional]**: Where Instagram 통합 활성, 운영자 등록 계정 최신 6장 표시. fetch 실패/비활성 시 정적 fallback(4:5 placeholder 6장 + 프로필 딥링크).

## 인수 기준

1. **익명 GET /** → 200 + 6 `<section aria-labelledby>` 마커 SSR 포함.
2. **/, /(public)/* 익명 진입** → `/login` 리다이렉트 없음. 어드민 세션 토큰 미설정.
3. **모바일 390px 스크롤** → 12 col 비대칭이 단일 컬럼 stack, 가로 스크롤 0px.
4. **CTA 클릭** → 새 탭 + `rel="noopener noreferrer"` + env URL 이동.
5. **토큰 격리** → computed style에서 어드민 `--brand`/`--sage` 0건. radius 0–6px만.
6. **Lighthouse 모바일** → Performance ≥ 80, Accessibility ≥ 90, Best Practices ≥ 90, SEO ≥ 95. axe-core 0건.
7. **Edge: Instagram API 실패** → 페이지 렌더 성공 + 정적 placeholder 6장 + 인스타 딥링크.
8. **Edge: 어드민 세션 보유자가 / 진입** → 자동 리다이렉트 없음. 공개 홈 정상 렌더.
9. **Perf: FCP < 1.8s on Slow 4G** → hero `priority` + AVIF/WebP, Fraunces `display: swap`.

## 영향 받는 파일

```
[NEW]    src/app/(public)/layout.tsx
[NEW]    src/app/(public)/page.tsx
[NEW]    src/app/(public)/styles.css (또는 globals.css scoped)
[NEW]    src/components/public/{header,footer,hero-section,about-section,
          collection-section,order-section,location-section,instagram-section}.tsx
[NEW]    public/ornaments/anthurium-{a-solid,b-line,c-plate}.svg
[MODIFY] middleware.ts                — SPEC-ROUTE-ADMIN-001 협조 matcher
[MODIFY] src/lib/env.ts               — KAKAO_CHANNEL_URL, NAVER_PLACE_URL, INSTAGRAM_URL, BUSINESS_PHONE
```

## What NOT to Build

1. 온라인 결제 / 장바구니 / 체크아웃.
2. 회원가입 / 사용자 계정 / 어드민 세션 공유.
3. 어드민 토큰(Warm Coral / Sage Green / shadcn) 재사용.
4. `rounded-2xl`+, 네온, 그라데이션, 이모지, 플랫 디자인, `transition-all`.
5. Journal / 블로그 / SEO 콘텐츠 섹션 (v1 스킵).
6. 다국어(i18n) 라우팅.
7. 사용자 입력 폼 / 이메일 구독 / 예약 폼.

## 디자인 토큰 (`.site-public` 스코프)

- 패딩: `clamp(120px, 15vh, 240px)` 상하, `clamp(24px, 6vw, 96px)` 좌우.
- 그리드: 12 col 비대칭 (Hero 5/7, About 4/8, Collection 7/5 교차).
- 이미지: 4:5 세로 중심 + 16:9 1–2점.
- 인터랙션: 페이드 인(opacity, 600ms cubic-bezier(0.22, 1, 0.36, 1)) + 1–2% 패럴랙스. 구체 속성 명시.
- Radius: 0 또는 4–6px.

## 접근성 / SEO / 보안

- WCAG 2.1 AA, 대비비 ≥ 7:1, axe-core 0건.
- 시맨틱 HTML + 의미 있는 한글 alt + focus ring 2px Oxblood.
- Open Graph 7종 + LocalBusiness JSON-LD (`@type=Florist`).
- 모든 외부 링크 `rel="noopener noreferrer"` 강제. 폼·쿠키·트래킹 0건.

## 관련 SPEC

- **SPEC-ROUTE-ADMIN-001** — middleware matcher 협조 + 어드민 라우트 이전.
