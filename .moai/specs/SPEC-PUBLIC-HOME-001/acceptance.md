---
id: SPEC-PUBLIC-HOME-001
document: acceptance
version: "0.1.0"
created: "2026-05-04"
updated: "2026-05-04"
---

# SPEC-PUBLIC-HOME-001 인수 기준

모든 시나리오는 Given/When/Then 형식으로 기술하며, Vitest + Playwright 또는 수동 검증으로 객관적 통과 여부를 판정한다. 주관적 판단("멋지다", "깔끔하다") 사용 금지.

## 시나리오 1. 익명 사용자 / 진입 (REQ-PUBLIC-001)

- **Given** 익명 사용자가 Supabase Auth 쿠키를 보유하지 않은 상태에서
- **When** 브라우저에서 `https://hazel.flower/` (또는 로컬 `http://localhost:3000/`)에 GET 요청을 보내면
- **Then** HTTP 200 응답이 반환되고, 응답 HTML에 `<section>` 태그 6개(Hero, About, Collection, Order, Location, Instagram) 각각의 `aria-labelledby` 마커가 SSR 단계에서 포함되어 있다. 클라이언트 자바스크립트가 비활성화되어도 본문 콘텐츠가 노출된다.

## 시나리오 2. 미들웨어 인증 우회 (REQ-PUBLIC-002)

- **Given** Supabase Auth 세션이 없는 익명 사용자가
- **When** `/`, `/?ref=instagram`, `/(public)/anything` 등 공개 라우트 그룹 경로에 접근하면
- **Then** middleware는 `/login`으로 리다이렉트하지 않고 200 응답을 반환한다. `Set-Cookie`로 어드민 세션 토큰이 설정되지 않는다. (SPEC-ROUTE-ADMIN-001 matcher 변경과 정합)

## 시나리오 3. 모바일 반응형 그리드 (REQ-PUBLIC-001)

- **Given** 뷰포트 너비 390px (iPhone 14 mini 기준) 모바일 디바이스에서
- **When** 사용자가 페이지를 위에서 아래로 스크롤하면
- **Then** 모든 비대칭 12 col 그리드(5/7, 4/8 등)가 단일 컬럼으로 stack되어 가로 스크롤 0px이 발생한다. Hero 정물 이미지는 4:5 비율을 유지하며, 텍스트가 이미지 위(또는 아래) 자연 흐름으로 배치된다.

## 시나리오 4. 외부 CTA 클릭 동작 (REQ-PUBLIC-004)

- **Given** Order 섹션의 "카카오톡으로 문의하기" CTA 또는 Location 섹션의 "네이버 지도에서 보기" CTA가 노출된 상태에서
- **When** 사용자가 해당 앵커를 클릭하면
- **Then** 새 탭(`target="_blank"`)이 열리며 `rel="noopener noreferrer"` 속성이 적용된 채 환경변수에 정의된 외부 URL(`NEXT_PUBLIC_KAKAO_CHANNEL_URL`, `NEXT_PUBLIC_NAVER_PLACE_URL`)로 이동한다. 원본 탭은 유지되고 부모 컨텍스트 노출이 차단된다.

## 시나리오 5. 디자인 토큰 격리 (REQ-PUBLIC-003)

- **Given** `/admin/sales`(어드민 Warm Coral 톤) 페이지가 정상 렌더되는 환경에서
- **When** 사용자가 `/`(공개 홈) 페이지로 이동하면
- **Then** 공개 홈에서 사용된 색은 6색 팔레트(`#F3EEE5`, `#1F1A16`, `#5A1A1A`, `#8B857C`, `#EDE3D0`, `#6B6B4F`)로만 한정되며, computed style에서 어드민의 `--brand: #E5614E` 또는 `--sage: #8B9D83`가 0건 등장한다. radius는 0–6px만 사용된다.

## 시나리오 6. Lighthouse 모바일 품질 게이트

- **Given** Vercel preview 또는 production 배포 환경의 `/`에서
- **When** Lighthouse CI 모바일 preset(Slow 4G throttle)으로 측정하면
- **Then** Performance ≥ 80, Accessibility ≥ 90, Best Practices ≥ 90, SEO ≥ 95를 만족한다. axe-core 위반은 0건이다.

## Edge Case 1. Instagram API 실패 → 정적 fallback (REQ-PUBLIC-005)

- **Given** Instagram 외부 API가 5xx 또는 timeout으로 응답하는 상태에서
- **When** 사용자가 `/`에 진입하여 Instagram 섹션까지 스크롤하면
- **Then** 페이지 렌더 자체는 실패하지 않고, 6개의 정적 placeholder(4:5 큐레이션 이미지 또는 botanical plate SVG)가 노출되며 "@hazel.flower.studio 인스타그램으로 이동" 버튼이 외부 링크로 동작한다. 콘솔 에러는 사용자에게 노출되지 않는다.

## Edge Case 2. 로그인 사용자가 / 접근

- **Given** 어드민 Supabase Auth 세션을 보유한 운영자가
- **When** 브라우저에서 `/`(공개 홈)에 진입하면
- **Then** 어드민으로 자동 리다이렉트되지 **않고** 공개 홈이 정상 렌더된다. 운영자는 헤더의 별도 진입점(또는 직접 `/admin` 입력)으로만 어드민에 진입한다. 어드민 세션은 `/(public)/*`에서 읽히지 않는다.

## Performance 1. FCP < 1.8s on Slow 4G

- **Given** Lighthouse CI 모바일 preset, Slow 4G throttle, CPU 4x slowdown 환경에서
- **When** `/`의 First Contentful Paint를 측정하면
- **Then** FCP < 1.8s를 만족한다. 위 폴드 hero 정물 이미지는 `priority` 적용 + AVIF/WebP 포맷으로 제공되며, Fraunces variable 폰트는 `display: swap`으로 FOUT을 허용하되 폰트 로딩 차단은 없다.

## Definition of Done

- [ ] REQ-PUBLIC-001 ~ 005 모두 자동 테스트(Vitest + Playwright)로 검증 가능
- [ ] 시나리오 1 ~ 6 + Edge 1, 2 + Perf 1 통과
- [ ] middleware.ts 변경이 SPEC-ROUTE-ADMIN-001과 정합 (회귀 테스트 통과)
- [ ] axe-core 위반 0건, 대비비 ≥ 7:1
- [ ] Lighthouse 모바일: Performance ≥ 80, Accessibility ≥ 90, Best Practices ≥ 90, SEO ≥ 95
- [ ] (public) 스코프 외 어드민 라우트(`/admin/*`) 시각 회귀 0건
- [ ] PR 본문에 SPEC-PUBLIC-HOME-001 + SPEC-ROUTE-ADMIN-001 cross-reference 명시
