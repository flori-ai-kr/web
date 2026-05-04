# Project Interview

_Conducted: 2026-05-04_
_Project type: Existing (Phase 0 → Existing Project)_

## Round 1: Ownership and Purpose

Question: 이 프로젝트의 소유/방향은 현재 어떨가요?
Answer: 적극 개발 중 (활성 제품)

Notes: 꾸준히 새 기능을 추가하는 활성 제품. 최근에도 인사이트 스크랩, 공개 홈페이지 등 지속 확장 중. 문서는 현재 궤적 + 로드맵을 반영해야 한다.

## Round 2: Constraints and Non-Goals

Question: 앞으로 문서에서 주의해야 할 제약 조건은?
Answer: 멀티테넌시 + 프라이버시

Notes: 12개 user-scoped 테이블 + RLS, 결제처럼 개인정보(고객 전화/이름) 보존이 최우선. 모든 SPEC은 RLS / Zod 검증 / requireAuth() 가드를 전제로 한다. 문서에 이 제약을 명시하고 Server Action에서 user_id 삽입 누락 시 보안 결함으로 간주.

## Round 3: Documentation Priority

Question: 문서에서 가장 충실하게 담아야 할 것은?
Answer: 아키텍쳐 + 모듈 경계

Notes: page (Server) → *-client (Client) 패턴, route group 구조 ((admin)/admin, (public), api/cron, api/internal), Server Actions 경계, RLS 적용 레이어, middleware 인증 분기. 구조적 이해가 신규 기능/SPEC을 올바르게 선다.
