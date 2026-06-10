# 단일 도메인 통합 + 루트 인증 분기 + 랜딩 + 사전등록 — 설계

> 작성일 2026-06-09 · 브랜치 `feature/session2-unified-domain` (web·api 동일 브랜치명, 별도 워크트리)
> 상태: 합의 완료, 구현 대기

---

## 1. 배경 / 목표

flori web 레포를 `flori.ai.kr` **단일 도메인**으로 서빙한다. 기존 `admin.flori.ai.kr` 서브도메인과 별도 `/homepage` 정적 프로젝트를 폐지하고, 하나의 Next.js 앱이 **비로그인=랜딩 / 로그인=어드민**을 모두 담당한다.

추가로, 정식 출시 전 **사전등록(waitlist) 캠페인**을 랜딩에 싣는다. 선착순 100명에게 첫 달 무료 혜택을 주고, 등록자를 카카오톡 오픈채팅으로 유도한다. 사전등록 데이터는 BFF(Kotlin, `flori-ai/server`)가 소유한 DB에 저장한다 → **web + api 양쪽 작업**.

### 목표
1. 루트 `/` 인증 분기: 쿠키 있으면 `/admin` redirect, 없으면 랜딩.
2. 기존 hazel 스토어프론트를 **flori 제품 랜딩**으로 전면 교체.
3. 사전등록 폼(가게명+전화번호) → DB 저장 → 100명 카운트 → 카카오톡 오픈채팅 유도.

### 비목표 (이번 범위 밖)
- 결제/구독 연동(₩9,900) — 랜딩 카피로만 노출, 실제 빌링 없음.
- 어드민 루트 이전(`/admin/*` 경로 그대로 유지, 루트로 옮기지 않음).
- 어드민 폰트 개편(제목 Cormorant 적극 적용) — 별개 후속 과제.
- 카카오톡 오픈채팅 실제 링크 — 추후 사용자 제공, 플레이스홀더(env)로 진행.
- hazel 고객용 스토어프론트의 별도 보존/이전 — 제거하며, 필요 시 별개 과제로 분리.

---

## 2. 라우팅 / 인증 분기 (web)

### 현재
- `src/middleware.ts`는 `/admin`·`/console`로 시작하는 경로만 가드. 그 외(`/` 포함)는 `NextResponse.next()`로 통과.
- `(public)/` 그룹이 `/` 를 렌더(현재 hazel 스토어프론트).

### 변경
`middleware.ts`에 `/` 분기 추가:
- `pathname === '/'` 이고 인증 쿠키(`flori_access` **또는** `flori_refresh`)가 **존재**하면 → `NextResponse.redirect('/admin')`. (쿠키 존재만 확인 — 유효성 검증은 `/admin` 진입 시 기존 가드/refresh가 수행)
- 쿠키 없으면 → `NextResponse.next()` (랜딩 렌더).
- 기존 `/admin`·`/console` 인증 강제, GET 선제 refresh 로직은 그대로 유지.
- `/login`·`/onboarding`·`/policy/*`·`/auth/*`·랜딩 정적 자원은 공개 유지(현재도 가드 대상 아님).

엣지 케이스:
- 만료된 access만 있고 refresh 없는 상태로 `/` 접근 → 쿠키가 "존재"하므로 `/admin`으로 보냄 → `/admin` 가드가 refresh 실패 시 `/login`으로. (이중 처리지만 안전, 무한 루프 없음: `/login`은 공개)
- 로그아웃 시 쿠키 삭제 → `/` 랜딩 정상 노출.

---

## 3. 랜딩 페이지 (web)

기존 `src/app/(public)/page.tsx` + `layout.tsx` 구조를 **유지하되 내용을 전면 교체**한다. 별도 프로젝트 포팅 없음.

### 3.1 팔레트 / 타이포 (`.site-public` 스코프 재정의)
- 베이스: **웜 오프화이트 `#FAFAF9`**, 카드/엘리베이션 `#FFFFFF`, 라인 `#ECEAE6`.
- 잉크 `#1C2024`, muted `#5A6472`, faint `#9A9690`.
- **포인트 = 어드민 브랜드 dusty rose `#A85475`** (hover `#8E3F5F`, soft `#F7E9EF`). 보조 slate `#8A929E`.
- 헤더: 화이트 반투명(`rgba(255,255,255,.80)`) + blur.
- 폰트: 본문/헤드라인 **Pretendard**(한국어 가독성), `flori.` 워드마크·일부 라틴 디스플레이만 **Cormorant Garamond**.
- 참고: 기존 `(public)` v2 "Sage & Wood" 팔레트는 폐기하고 위 cool-rose 톤으로 대체(어드민 일관성). `globals.css`의 `.site-public` CSS 변수 갱신.

### 3.2 섹션 구성 (위→아래)
1. **헤더** (sticky) — `flori.` 워드마크 + 앵커(기능·FAQ) + **로그인 버튼**(→`/login`, rose).
2. **Hero** — eyebrow 칩("🌷 꽃집 사장님을 위한 운영 서비스") + H1("꽃에만 집중하세요. / 살림은 flori가 챙길게요." rose 강조) + 서브카피("…모든 기록을 flori 하나로.") + 듀얼 CTA(사전등록→`#waitlist` / 기능 둘러보기→`#features`) + 소셜 안내("카카오·네이버·구글 30초") + **큰 제품 미리보기**(브라우저 크롬 + 에셋 슬롯: 대시보드 스크린샷 또는 데모영상).
3. **사전등록(waitlist) 밴드** (`#waitlist`) — §4 참조. rose 그라데이션 배경.
4. **기능 교차 4행** (`#features`) — 매출·지출 / 고객·사진첩 / 예약·알림 / 커뮤니티. 각 행 = 아이콘+헤드라인+요약+체크리스트(3) + 화면 캡처 에셋 슬롯(좌우 교차).
5. **보조 기능 그리드** — 인사이트·트렌드 / 엑셀·PDF 내보내기 / 폰·PC 어디서나 / 푸시 알림.
6. **FAQ** (`#faq`) — 흰색 둥근 토글 카드(아코디언, 열면 rose 테두리+그림자). 항목은 §5.
7. **CTA 밴드** — 다크(`#1C2024`) 풀폭 + 사전등록 CTA("선착순 100명 · 소셜 30초").
8. **푸터** — `flori.` + **개인정보처리방침(`/policy/privacy`)·이용약관(`/policy/terms`)** 링크 + © 2026 flori.
   - ⚠️ 어드민 전용 "사용 가이드(`/admin/guide`)"는 공개 푸터에 **넣지 않는다**.

### 3.3 에셋 슬롯 (사용자 추후 제공)
- Hero 메인 1개: 대시보드 캡처 또는 데모영상. 자동재생 무음 루프는 15~30초(MP4 ~5MB), 1분 이상 풀데모는 포스터+클릭재생.
- 기능 캡처 4개: 매출·지출 / 고객·사진첩 / 예약 캘린더 / 커뮤니티 (4:3).
- 구현 시 슬롯은 플레이스홀더 컴포넌트로 두고, 이미지/영상 들어오면 교체. 빈 슬롯도 레이아웃 깨지지 않게.

### 3.4 컴포넌트 정리
- **제거**: `components/public/{hero-section,statement-section,instagram-section,floating-cta,footer,header}.tsx` 내 hazel 전용 내용, `lib/public-config.ts`(HAZEL_*), hazel 전용 이미지 자산 참조, `(public)/layout.tsx`의 hazel SEO/JSON-LD.
- **신규/재작성**: flori 랜딩용 섹션 컴포넌트. 파일이 커지지 않게 섹션 단위 분리(hero / waitlist / features / faq / footer 등).
- `layout.tsx` 메타데이터·OG·JSON-LD를 flori 제품(SoftwareApplication 또는 일반 website)으로 교체. `NEXT_PUBLIC_SITE_URL` 기본값을 `https://flori.ai.kr`로.

---

## 4. 사전등록 (waitlist) — web + api

### 4.1 사용자 플로우
1. 랜딩 사전등록 CTA 클릭 → `#waitlist` 밴드로 스크롤(폼은 밴드 내 **인라인** STEP 1/2, 시안 확정본 기준).
2. **STEP 1 · 정보 입력**: 가게명 + 휴대폰 번호. (이메일 수집 안 함) 개인정보 동의 고지 + 정책 링크.
3. 제출 → BFF `POST /waitlist` 저장 → 성공 시 현재 카운트 갱신.
4. **STEP 2 · 카카오톡 오픈채팅 참여(필수)**: "오픈채팅까지 들어와야 최종 완료" 안내 + 오픈채팅 버튼.
5. 게이지에 `N / 100명` 실집계 표시(마감기한 없음).
6. **마감(100명 도달)**: 폼 숨김 → "🎉 선착순 100명 모집 완료 / 마감" + 오픈채팅으로 출시 소식 받기 CTA만.

### 4.2 web 구현
- Server Action `submitWaitlist`(`lib/actions/waitlist.ts`): Zod 검증(가게명 1~50자, 전화번호 KR 형식) → `apiFetch`(JWT 불필요, 공개 POST) → BFF 호출. `withErrorLogging` 패턴.
- 카운트 조회: page.tsx(Server)에서 `getWaitlistCount()` → BFF `GET /waitlist/count` → 랜딩에 전달(서버 렌더). 100 이상이면 마감 상태 렌더.
- 전화번호 정규화/중복 처리는 BFF가 수행. 중복 등록 시 친절 메시지(이미 등록됨).
- 카카오톡 오픈채팅 URL: `NEXT_PUBLIC_KAKAO_OPENCHAT_URL` env(추후 실제 값). 미설정 시 버튼 비활성+안내.
- `apiFetch`가 공개 POST(쿠키 없이)도 호출 가능한지 확인 — 불가 시 공개용 경량 fetch 분기 추가.

### 4.3 api 구현 (Kotlin BFF)
신규 feature 패키지 `kr/ai/flori/waitlist/{entity,repository,service,controller,dto}`.

- **엔티티/테이블** `waitlist_registrations`:
  | 컬럼 | 타입 | 비고 |
  |------|------|------|
  | id | UUID PK | |
  | shop_name | varchar(50) NOT NULL | 가게명 |
  | phone | varchar(20) NOT NULL UNIQUE | 정규화 저장(숫자만 등) |
  | created_at | timestamptz NOT NULL default now() | |
  - 마이그레이션 SQL: `docs/sql/migration/26-06-09-waitlist.sql` 생성. **`ddl-auto: validate`라 자동 생성 안 됨 → SQL을 사용자 허락 후 DB에 적용.** `all-tables-ddl.sql`에도 반영.
- **엔드포인트** (공개, JWT 불필요):
  - `POST /waitlist` — body `{ shopName, phone }` → 저장. 중복 phone → 409 또는 멱등 200(메시지). 100명 초과면 마감 응답(`closed: true`).
  - `GET /waitlist/count` — `{ count, capacity: 100, closed }`.
  - `SecurityConfig`에 `authorize("/waitlist", permitAll)`, `authorize("/waitlist/**", permitAll)` 추가.
- 동시성: 100명 경계 race는 UNIQUE(phone) + 카운트 기반 단순 검사로 충분(엄격한 100 상한 트랜잭션 락은 과설계 — count ≥ 100이면 거절, 약간 초과 허용 가능. 정확 상한 필요 시 `SELECT … FOR UPDATE`/시퀀스 검토).
- 입력 검증: 전화번호 형식, 가게명 길이. 트림/정규화.

---

## 5. FAQ / 콘텐츠 (공개용 재작성)

`lib/guide-content.ts`의 `GUIDE_FAQS`는 어드민 가이드용이므로 **랜딩 전용 공개 FAQ를 별도 상수**로 둔다(공개 문구로 다듬음). 항목(초안, 사용자 최종 검수):
1. flori는 어떤 서비스인가요?
2. 어떻게 시작하나요?
3. 비용이 드나요? — *[가격 정책 문구 확정 필요 — 플레이스홀더]*
4. 외상(미수)은 어떻게 관리하나요?
5. 예약 알림은 언제 오나요?
6. 커뮤니티는 왜 사업자 인증이 필요한가요?

> 기능 섹션 카피·체크리스트도 flori 실기능 기준으로 작성(시안 확정본 사용).

---

## 6. 인프라 (코드 아님 — 사용자 액션)

도메인 전환의 핵심 함정. 별도 안내 문서/체크리스트로 전달:
- OAuth redirect URI(kakao·google·naver)를 `admin.flori.ai.kr` → `flori.ai.kr`로 갱신.
- 쿠키 도메인 / `NEXT_PUBLIC_*` 베이스 URL / CORS / CSP에 도메인 변경 반영. `lib/env.ts`·`public-config` 하드코딩 점검.
- DNS / Vercel 도메인 전환.
- 신규 env: `NEXT_PUBLIC_KAKAO_OPENCHAT_URL`, (BFF) waitlist 관련 설정 없음.

---

## 7. 검증 / 테스트

- 비로그인 `/` → 랜딩 렌더.
- 로그인(쿠키 보유) `/` → `/admin` redirect.
- 비로그인 `/admin` → `/login`.
- `/policy/privacy`·`/policy/terms`·FAQ 토글·정책 링크 동작.
- 사전등록: 제출 → 저장 → 카운트 증가, 중복 phone 처리, 100명 마감 상태 전환.
- `npm test` / `npm run lint` / `npm run build` green (web).
- api: waitlist 서비스/컨트롤러 테스트 + 빌드 green.
- 미들웨어 분기 단위 테스트(쿠키 유/무 × 경로).

---

## 8. 오픈 이슈 / 플레이스홀더

- [ ] 가격(₩9,900) 카피 최종 확정 — FAQ "비용" 항목.
- [ ] 카카오톡 오픈채팅 실제 URL.
- [ ] Hero/기능 스크린샷·데모영상 에셋.
- [ ] 사전등록 카운트(24/100 등) 초기 표기 — 실집계 0부터 시작.
- [ ] 100명 상한 정확성 정책(약간 초과 허용 vs 엄격 락).
