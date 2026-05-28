import { Suspense } from 'react'
import { LoginForm } from './login-form'

export const metadata = {
  title: '로그인 | flori',
}

export default function LoginPage() {
  // 공급자별 활성 여부를 서버에서 env로 계산해 전달(서버 전용 키는 클라이언트에 노출 안 됨).
  const available = {
    kakao: !!process.env.OAUTH_KAKAO_REST_API_KEY,
    google: !!process.env.OAUTH_GOOGLE_CLIENT_ID,
    naver: !!process.env.OAUTH_NAVER_CLIENT_ID,
  }

  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <LoginForm available={available} />
    </Suspense>
  )
}
