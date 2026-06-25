import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getRegisterToken } from '@/lib/api/auth-cookies'
import { OnboardingForm } from './onboarding-form'

export const metadata = {
  title: '시작하기 | flori',
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; name?: string }>
}) {
  // 공개 라우트 — 인증이 아니라 registerToken(가입 자격증명) 보유 여부로 가드한다.
  // 토큰이 없으면 소셜 로그인부터 다시 시작.
  const registerToken = await getRegisterToken()
  if (!registerToken) {
    redirect('/login')
  }

  const { email, name } = await searchParams

  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <OnboardingForm defaultEmail={email ?? ''} defaultOwnerName={name ?? ''} />
    </Suspense>
  )
}
