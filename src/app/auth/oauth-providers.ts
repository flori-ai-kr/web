// 소셜 OAuth 공급자 설정 맵. 개시(/auth/login/[provider])·콜백(/auth/callback/[provider])
// 두 동적 라우트가 공유한다. provider는 이 맵의 키로만 허용(화이트리스트 — 임의 값 차단).

export interface OAuthProviderConfig {
  /** authorize 엔드포인트 URL */
  authorize: string
  /** client_id를 읽을 환경변수 키 (서버 전용, NEXT_PUBLIC 금지) */
  envKey: 'OAUTH_KAKAO_REST_API_KEY' | 'OAUTH_GOOGLE_CLIENT_ID' | 'OAUTH_NAVER_CLIENT_ID'
  /** authorize에 붙일 scope (없으면 생략) */
  scope?: string
}

export const OAUTH_PROVIDERS = {
  kakao: {
    authorize: 'https://kauth.kakao.com/oauth/authorize',
    envKey: 'OAUTH_KAKAO_REST_API_KEY',
    scope: undefined,
  },
  google: {
    authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
    envKey: 'OAUTH_GOOGLE_CLIENT_ID',
    scope: 'openid email profile',
  },
  naver: {
    authorize: 'https://nid.naver.com/oauth2.0/authorize',
    envKey: 'OAUTH_NAVER_CLIENT_ID',
    scope: undefined,
  },
} as const satisfies Record<string, OAuthProviderConfig>

export type OAuthProvider = keyof typeof OAUTH_PROVIDERS

/** provider 문자열이 허용된 공급자인지 검증한다(화이트리스트). */
export function isOAuthProvider(value: string): value is OAuthProvider {
  return value in OAUTH_PROVIDERS
}

/**
 * OAuth redirect_uri·로그인 후 리다이렉트의 베이스 origin 을 해석한다.
 * 프록시(ALB/nginx) 뒤 standalone 컨테이너는 Host 헤더가 0.0.0.0:3000 이라
 * request origin 으로 만들면 redirect_uri 가 깨진다. APP_BASE_URL 이 있으면 그 값을,
 * 없으면(로컬 개발) request origin 으로 폴백한다. 후행 슬래시는 제거.
 */
export function resolvePublicOrigin(requestOrigin: string): string {
  const base = process.env.APP_BASE_URL ?? requestOrigin
  return base.replace(/\/+$/, '')
}
