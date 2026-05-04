# hazel — Homepage Moodboard (v0.2)

_2026-04-22_

꽃집 hazel의 공식 홈페이지 디자인 언어 정리. 기존 어드민은 추후 `/admin` 하위로 이동.

## 방향 확정

- **무드 베이스**: Quiet Editorial (B) + Old Europe Atelier (A) 질감 + Dark Floral (C) 포인트
- **팔레트**: 어드민의 Warm Coral·Sage와 완전 분리
- **섹션 (v1)**: Hero / About / Collection(Lookbook) / 주문 가이드 / 위치 / Instagram 피드
  - Journal 섹션: v1 스킵 (네이버 SEO 커버, 차후 재검토)
- **주문**: 온라인 결제 없음 — 카카오톡 채널 + 네이버 연결만
- **로고**: `hazel` 소문자 워드마크 (심볼 없음)
- **워드마크 서체**: **Fraunces Light** (tracking 0.02, variable axes SOFT 40 / WONK 0) — 최종 유료 폰트로 교체 가능 (Canela · Editorial New 등)
- **브랜드 디스크립터**: `hazel flower studio · seoul` (atelier ❌ studio ✅)
- **오너먼트 소재**: **Anthurium** 확정 — 빈티지 식물도감(18~19C botanical plate) 필치의 라인 에칭 + 주변 식물 섞는 컴포지션
- **오너먼트 3종 시스템**:
  - **A. Solid silhouette** — 파비콘 · 로딩 · 소형 아이콘 (McQueens 모델)
  - **B. Line etched** — 섹션 디바이더 · 명함 · 패키지 스티커 (기본 사용처)
  - **C. Botanical plate (mixed foliage)** — About · Hero · 패키지 라벨 (한 번 등장 자리)

## 컬러 팔레트

| 역할 | 이름 | HEX | 용도 |
|------|------|-----|------|
| Primary BG | Ivory Paper | `#F3EEE5` | 페이지 배경 |
| Primary Text | Warm Charcoal | `#1F1A16` | 본문·헤드라인 |
| Accent 1 | Oxblood | `#5A1A1A` | CTA, 링크 hover, 포인트 |
| Accent 2 | Aged Pewter | `#8B857C` | 보조·캡션·라인·푸터 |
| Surface | Soft Parchment | `#EDE3D0` | 섹션 배경 대비 |
| Muted | Dusted Olive | `#6B6B4F` | 드물게 쓰는 네이처 톤 |

**금지**: 순백 `#FFFFFF`, 순검 `#000000`, 핑크·파스텔 계열

## 타이포그래피 방향

| 역할 | 영문 후보 | 한글 후보 |
|------|-----------|-----------|
| Display | Canela / Editorial New / GT Sectra / Fraunces | 산돌 제비 · Ridibatang · Pretendard Serif |
| Body | Söhne / Neue Haas Grotesk | Pretendard |
| Mono | Söhne Mono · JetBrains Mono | — |

> 실제 렌더 시안: `2026-04-22-wordmark-trial-v0.1.html` (브라우저로 열기)

## 레이아웃 원칙

- Magazine 비대칭 그리드 (12 col, 5/7·4/8 분할)
- 섹션 상하 패딩: `clamp(120px, 15vh, 240px)`
- Hero는 **텍스트-퍼스트** (이미지 조연)
- 이미지 비율: 4:5 세로 중심 + 16:9 한두 개로 리듬
- 스크롤 인터랙션: 페이드 인 + 1~2% 패럴랙스만

## 이미지 스타일

- 필름 그레인 3~5%
- 웜 톤 보정 (하이라이트에 옐로 lift, 그린 저채도, 미드에 옥스블러드 푸시)
- 깊은 그림자 (플랫라이트 금지)
- 배경: 석재·나무·린넨·벽지 (스튜디오 흰 배경 금지)

## 리서치 확정 패턴 (2026-04-22)

1. **단일 오너먼트 글리프** — McQueens × Made Thought 아네모네 인시그니아 모델
2. **에디토리얼 IA** — Saipua, AESME, Emily Thompson 모두 공통 (v2 이후 적용)
3. **사진이 색을 전담** — UI는 ivory/charcoal/oxblood만 고정
4. **챕터형 브레드크럼** — About, Studio 롱 페이지를 책 챕터처럼
5. **한글 브랜드 한 문장** — Vergel "담백하게, 그러나 깊이 있게" 모델
6. **커머스 그리드를 히어로 위로 올리지 않기** — 첫 뷰포트는 4:5 정물 한 점 + 세리프 한 줄
7. **사진 크레딧 명기** — "잡지처럼 이미지를 의뢰한다" 시그널

## 금지 리스트

- 핑크·파스텔 계열
- 순백·순검
- `rounded-2xl` 이상 둥근 모서리 (border-radius는 최대 4~6px)
- 네온·그라데이션·블러 과다
- 이모지·한국식 일러스트
- 플랫 디자인
- `transition-all` (구체 속성 명시 필수)

## 레퍼런스 벤치마크

| 사이트 | 가져올 것 |
|--------|-----------|
| [AESME](https://aesme.co.uk) | 세리프+산세리프 페어링, 4:5 정물 70% 히어로 |
| [Emily Thompson](https://www.emilythompsonflowers.com) | 브랜드 한 줄 철학, 사진 크레딧, 포트폴리오 문법 네비 |
| [Saipua](https://www.saipua.com) | 미니멀 네비, 챕터 브레드크럼, 언더빌드 미학 |
| [McQueens](https://www.mcqueensflowers.com) | 단일 보태니컬 글리프 반복 (오너먼트 모델) |
| [Vergel](https://www.vergelflower.com) | 한글 브랜드 문장, 인스타 피드를 홈 1급 블록 |
| [FLCHA](https://flcha.kr) | 카테고리 네이밍 자체가 브랜딩 |

**인스타 확정 레퍼런스**: @hamishpowell / @madridflowerschool / @sohee_elletravaille

## 오픈 질문 / 다음 단계

- [x] 오너먼트 species 확정 — **Anthurium** (vintage etching + mixed foliage)
- [x] 워드마크 — **Fraunces Light** 확정
- [ ] 오너먼트 SVG 시안 3종 리뷰 (`wordmark-trial-v0.1.html` §ORN 확인)
- [ ] 한글 브랜드 한 줄 카피 초안
- [ ] Instagram 레퍼런스 10개 직접 검증 + 캡처 (사용자 수동)
- [ ] 와이어프레임 트랙 — Hero / About / Collection / 주문 가이드 / 위치 / Instagram 피드
- [ ] 라우팅 재설계: 현재 `(dashboard)` → `(admin)` 이동, 루트에 공개 홈페이지
