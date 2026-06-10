import type { ReactNode } from 'react'

/**
 * 로그인·회원가입 화면 공용 헤더 (flori 투톤 꽃 마크 + 워드마크 + 멘트).
 */
export function AuthHeader({ subtitle }: { subtitle: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 100 100" width={60} height={60} aria-hidden="true">
        <defs>
          <path
            id="auth-petal"
            d="M50 50 C 42 44 39 27 49 15 C 53 11 60 14 60 22 C 60 35 55 44 50 50 Z"
          />
        </defs>
        <g transform="translate(0 3.5)">
          <use href="#auth-petal" fill="#A85475" />
          <use href="#auth-petal" transform="rotate(72 50 50)" fill="#E0739A" />
          <use href="#auth-petal" transform="rotate(144 50 50)" fill="#A85475" />
          <use href="#auth-petal" transform="rotate(216 50 50)" fill="#E0739A" />
          <use href="#auth-petal" transform="rotate(288 50 50)" fill="#8E3F5F" />
          <circle cx="50" cy="50" r="6" fill="#ffffff" />
          <circle cx="50" cy="50" r="3.2" fill="#A85475" />
        </g>
      </svg>
      <div className="text-center">
        <h1
          className="font-display text-3xl font-semibold leading-none text-foreground"
          style={{ fontVariantLigatures: 'none', letterSpacing: '0.2rem' }}
        >
          flori<span className="text-brand">.</span>
        </h1>
        <p className="text-[15px] font-medium text-foreground mt-2 leading-relaxed">{subtitle}</p>
      </div>
    </div>
  )
}
