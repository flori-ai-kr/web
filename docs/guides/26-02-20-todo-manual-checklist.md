# 수동 작업 체크리스트

코드 외 직접 해야 하는 작업 목록. 완료 시 `[ ]` -> `[x]`로 변경.

---

## Phase 1: Supabase 보안 설정 (즉시, 무료)

> Supabase Dashboard에서 진행

- [ ] **회원가입 비활성화** — Authentication > Settings > User Signups > "Allow new users to sign up" 해제
- [ ] **Leaked Password Protection** — Authentication > Settings > Security > 활성화
- [ ] **비밀번호 최소 길이 8자** — Authentication > Settings > Password > 6 -> 8
- [ ] **SSL Enforcement** — Database > Settings > SSL Enforcement > 활성화
- [ ] **Storage MIME 제한 (photo-cards)** — Storage > photo-cards > Settings > `image/jpeg, image/png, image/webp, image/heic, image/heif`
- [ ] **Storage MIME 제한 (sale-photos)** — Storage > sale-photos > Settings > 동일
- [ ] **계정 MFA 활성화** — 프로필 > Account Settings > Security > TOTP 설정
- [ ] **RLS 확인: reservations** — Database > Tables > reservations > RLS on + `auth.uid() IS NOT NULL`
- [ ] **RLS 확인: expense_categories** — 동일
- [ ] **RLS 확인: expense_payment_methods** — 동일
- [ ] **RLS 확인: product_categories** — 동일
- [ ] **Rate Limits 확인** — Authentication > Rate Limits > 기본값 유지 확인

---

## Phase 2: Vercel 배포

> 상세 절차: `docs/guides/26-02-20-vercel-deploy-guide.md` 참고

- [ ] **Vercel 가입** — [vercel.com](https://vercel.com) GitHub 계정으로 가입
- [ ] **프로젝트 Import** — Add New Project > `bbbang105/flowershop-admin` 선택
- [ ] **환경변수 설정** — Settings > Environment Variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] **배포 실행** — Deploy 클릭 + 빌드 성공 확인
- [ ] **Supabase Site URL 업데이트** — Authentication > URL Configuration > Site URL에 Vercel 도메인 입력
- [ ] **Supabase Redirect URLs 추가** — `https://your-app.vercel.app/**`

---

## Phase 3: 배포 후 검증

- [ ] 로그인/로그아웃 동작 확인
- [ ] 매출 CRUD 동작 확인
- [ ] 지출 CRUD 동작 확인
- [ ] 고객 CRUD + 자동완성 확인
- [ ] 이미지 업로드 + Storage 표시 확인
- [ ] 다크모드 토글 확인
- [ ] 모바일 반응형 확인

---

## Phase 4: 프로덕션 전환 시 (선택)

- [ ] **커스텀 도메인 연결** — Vercel Settings > Domains > DNS 설정
- [ ] **Supabase URLs를 커스텀 도메인으로 변경** — Site URL + Redirect URLs
- [ ] **Custom SMTP 설정** — Authentication > SMTP Settings (Gmail 또는 SendGrid)
- [ ] **Supabase Pro Plan 검토** — 7일 비활성 일시정지 회피 필요 시 $25/월

---

## 진행 상태

| Phase | 상태 | 비고 |
|-------|------|------|
| 1. Supabase 보안 | 미시작 | |
| 2. Vercel 배포 | 미시작 | |
| 3. 배포 후 검증 | 미시작 | Phase 2 완료 후 |
| 4. 프로덕션 전환 | 미시작 | 선택사항 |
