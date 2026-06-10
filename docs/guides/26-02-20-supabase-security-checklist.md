# Supabase 보안 설정 체크리스트

Supabase Dashboard에서 직접 설정해야 하는 보안 항목 목록.
Free Plan 기준으로 작성됨.

---

## 즉시 설정 (Free Plan 가능)

### 1. 회원가입 비활성화
- **경로**: Authentication > Settings > User Signups
- **설정**: "Allow new users to sign up" 체크 해제
- **이유**: 1인 어드민 앱이므로 외부 회원가입 차단 필수. 가장 중요한 설정.

### 2. Leaked Password Protection 활성화
- **경로**: Authentication > Settings > Security
- **설정**: "Enable Leaked Password Protection" 활성화
- **이유**: HaveIBeenPwned.org와 연동하여 유출된 비밀번호 차단. Security Advisor에서 현재 경고 중.

### 3. 비밀번호 최소 길이
- **경로**: Authentication > Settings > Password
- **설정**: 6자(기본) -> 8자 이상
- **이유**: 브루트포스 공격 방어력 향상

### 4. SSL Enforcement 활성화
- **경로**: Database > Settings > SSL Enforcement
- **설정**: "Enforce SSL on incoming connections" 활성화
- **이유**: DB 연결 시 MITM 공격 방지. Postgres 13.3.0 이상 필요.

### 5. Storage MIME Type 제한
- **경로**: Storage > (각 버킷) > Settings > Allowed MIME types
- **photo-cards 버킷**: `image/jpeg, image/png, image/webp, image/heic, image/heif`
- **sale-photos 버킷**: `image/jpeg, image/png, image/webp, image/heic, image/heif`
- **이유**: 비이미지 파일 업로드 방지 (서버 측 코드 검증 + 버킷 설정 이중 방어)

### 6. Supabase 계정 MFA
- **경로**: 우측 상단 프로필 > Account Settings > Security
- **설정**: TOTP MFA 활성화
- **이유**: Supabase 프로젝트 자체의 탈취 방지. 계정 비밀번호 유출 시에도 보호.

### 7. 신규 테이블 RLS 확인
- **경로**: Database > Tables > (각 테이블) > RLS
- **확인 대상**:
  - [ ] `reservations` - RLS 활성화 + `auth.uid() IS NOT NULL` 정책
  - [ ] `expense_categories` - RLS 활성화 + `auth.uid() IS NOT NULL` 정책
  - [ ] `expense_payment_methods` - RLS 활성화 + `auth.uid() IS NOT NULL` 정책
  - [ ] `product_categories` - RLS 활성화 + `auth.uid() IS NOT NULL` 정책
- **이유**: 마이그레이션으로 추가된 테이블이 아닌, Dashboard에서 생성된 테이블은 RLS가 자동 적용되지 않을 수 있음.

### 8. Rate Limits 확인
- **경로**: Authentication > Settings > Rate Limits
- **확인**: 기본값이 적용되어 있는지 확인 (Email: 2/hour, OTP: 30/hour)
- **이유**: 로그인 브루트포스 방지. 1인 어드민이므로 기본값 충분.

---

## 프로덕션 전환 시 권장

### Custom SMTP 설정
- **경로**: Authentication > Email Templates > SMTP Settings
- **이유**: 기본 SMTP는 2통/시간 제한. 비밀번호 재설정 이메일 등에 영향.
- **추천**: Gmail SMTP (무료) 또는 SendGrid Free Tier (100통/일)

### Pro Plan 업그레이드 ($25/월)
- **이유**:
  - Free Plan은 7일 비활성 시 프로젝트 자동 일시정지
  - 매일 자동 백업 (7일 보관)
  - Session Lifetime 설정 가능
- **판단**: 프로덕션으로 실제 운영할 경우 필수

---

## 불필요한 항목 (1인 어드민)

| 항목 | 이유 |
|------|------|
| Network Restrictions (IP Allowlist) | IP 고정 어려움, RLS로 충분 |
| PITR (Point in Time Recovery) | $100~400/월, 과도한 비용 |
| Organization MFA Enforcement | 1인 운영 |
| Multiple Owners | 1인 운영 |
| Advanced MFA | 기본 TOTP로 충분 |
| Custom JWT expiry | 1시간 기본값 적절 |

---

## 정기 점검

| 주기 | 항목 | 경로 |
|------|------|------|
| 주 1회 | Security Advisor 확인 | Database > Security Advisor |
| 월 1회 | Performance Advisor 확인 | Database > Performance Advisor |
| 테이블 추가 시 | RLS 정책 확인 | Database > Tables |
| 비밀번호 변경 시 | Leaked Password 경고 확인 | Authentication > Logs |
