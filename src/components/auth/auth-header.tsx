import type { ReactNode } from 'react'
import Image from 'next/image'

/**
 * 로그인·회원가입 화면 공용 헤더 (로고 + 「flori」 워드마크 + 부제).
 * 마크업/클래스는 기존 login·signup 폼과 동일 — 시각적 변화 없음.
 */
export function AuthHeader({ subtitle }: { subtitle: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-12 h-12 bg-brand-muted rounded-xl flex items-center justify-center">
        <Image src="/flori-logo.png" alt="flori" width={38} height={38} priority className="object-contain" />
      </div>
      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">flori</h1>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>
    </div>
  )
}
