# PWA 푸시 알림 수정 (2026-02-18)

## 문제

Safari(iOS/macOS) PWA에서 푸시 알림이 동작하지 않음.

### 증상

- Chrome(FCM): 정상 (201)
- Safari(Apple Push): 실패 - `403 BadJwtToken`

### 근본 원인

**VAPID subject가 `.local` 도메인 사용**: `mailto:admin@hazel.local`

Apple Push Service(`web.push.apple.com`)는 VAPID JWT의 `sub` 클레임을 **엄격하게 검증**합니다.
Google FCM은 관대하여 `.local` 도메인도 허용하지만, Apple은 실제 도메인만 허용합니다.

| 조건 | Google FCM | Apple Push |
|------|-----------|------------|
| `mailto:admin@hazel.local` | 허용 | **거부 (403)** |
| `https://localhost` | 허용 | **거부 (403)** |
| `mailto:user@real-domain.com` | 허용 | 허용 |

### 부차적 문제

PWA 아이콘이 전부 SVG였는데, 푸시 알림의 `icon`/`badge`에 SVG는 지원되지 않음 (PNG 필수).

## 수정 내역

### 1. VAPID subject 환경변수 분리

`src/lib/actions/push.ts`:
```typescript
// before
webpush.setVapidDetails('mailto:admin@hazel.local', publicKey, privateKey);

// after
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@hazel.local';
webpush.setVapidDetails(vapidSubject, publicKey, privateKey);
```

`.env.local`에 `VAPID_SUBJECT=mailto:실제이메일@실제도메인.com` 추가.

### 2. PNG 아이콘 생성

`public/icons/` 에 PNG 아이콘 4개 추가:
- `icon-192x192.png`, `icon-512x512.png`
- `icon-maskable-192x192.png`, `icon-maskable-512x512.png`

### 3. manifest.ts PNG 참조

모든 아이콘 참조를 `.svg` → `.png`로 변경.

### 4. sw.js 알림 아이콘 PNG

`icon`/`badge` 경로를 `.svg` → `.png`로 변경.

## Safari PWA 푸시 알림 요구사항 (참고)

### iOS/iPadOS (16.4+)

- **홈 화면 설치 필수**: Safari 브라우저 내에서는 불가, PWA로 설치해야 함
- **manifest**: `display: "standalone"` 또는 `"fullscreen"` 필수
- **HTTPS** 필수
- **사용자 제스처**: 알림 권한 요청은 버튼 클릭 등 직접 액션 내에서만 가능
- **VAPID**: 실제 도메인의 이메일 또는 HTTPS URL 필수

### macOS Safari (16.1+)

- 홈 화면 설치 **불필요** (브라우저에서 직접 동작)
- 나머지는 iOS와 동일

### Apple vs Google 차이점

| 항목 | Google FCM | Apple Push |
|------|-----------|------------|
| VAPID subject 검증 | 느슨 | **엄격** |
| 페이로드 최대 크기 | 4KB | 4KB |
| Silent push | 지원 | **미지원** (반드시 showNotification 호출) |
| 알림 아이콘 | 커스텀 가능 | 앱 아이콘 사용 (커스텀 제한적) |
| notification image | 지원 | **미지원** |
| notification actions | 지원 | **제한적** |
| Focus 모드 연동 | - | iOS 집중 모드와 연동 |

### 페이로드 표시 제한

| 플랫폼 | 제목 | 본문 |
|--------|------|------|
| Safari/macOS | ~30자 | ~104자 |
| Chrome/macOS | ~36자 | ~39자 |
| Chrome/Android | ~39자 | ~45자 |
| iOS PWA | ~30자 | ~100자 |

## 로컬 테스트 방법

```bash
node scripts/test-push.js
```

`.env.local`에서 VAPID 키와 Supabase 정보를 읽어 활성 구독에 테스트 푸시를 전송합니다.

## 참고 자료

- [Apple Developer - Sending web push notifications](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers)
- [WebKit Blog - Web Push for Web Apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [web-push-libs/web-push Issue #679](https://github.com/web-push-libs/web-push/issues/679)
- [web-push-libs/web-push-php Issue #406](https://github.com/web-push-libs/web-push-php/issues/406)
