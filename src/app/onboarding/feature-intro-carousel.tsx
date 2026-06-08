'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Slide {
  eyebrow: string
  headline: string
  body: string
  emoji: string
}

const SLIDES: Slide[] = [
  {
    eyebrow: '매출 · 지출',
    headline: '장부 정리, 이제 flori 하나로 끝',
    body: '현금·카드 매출과 지출을 톡톡 기록하면 카테고리별·월별 통계로 한눈에 정리돼요.',
    emoji: '📒',
  },
  {
    eyebrow: '예약 캘린더',
    headline: '예약도 리마인더도 놓치지 않게',
    body: '예약을 캘린더에 등록하면 픽업·배송 전에 푸시 알림으로 챙겨드려요.',
    emoji: '🗓️',
  },
  {
    eyebrow: '고객 · 사진첩',
    headline: '단골 손님과 내 작품을 한 곳에',
    body: '고객별 구매 이력을 기록하고, 완성한 꽃 작품은 사진첩에 모아 관리하세요.',
    emoji: '🌷',
  },
  {
    eyebrow: '사장님 커뮤니티',
    headline: '꽃집 사장님들과 혼자가 아니에요',
    body: '전국 꽃집 사장님들과 운영 노하우를 나누는 커뮤니티. 사업자 인증 후 참여할 수 있어요.',
    emoji: '💬',
  },
]

export function FeatureIntroCarousel({
  onComplete,
  isSubmitting,
}: {
  onComplete: () => void
  isSubmitting: boolean
}) {
  const [index, setIndex] = useState(0)
  const last = index === SLIDES.length - 1
  const slide = SLIDES[index]

  const next = () => {
    if (last) {
      onComplete()
      return
    }
    setIndex((i) => Math.min(SLIDES.length - 1, i + 1))
  }

  return (
    <div className="space-y-6" aria-roledescription="carousel" aria-label="기능 소개">
      <div
        className="rounded-2xl border border-border bg-card p-8 text-center"
        aria-label={`${index + 1} / ${SLIDES.length}: ${slide.eyebrow}`}
      >
        <div className="mb-5 flex h-28 items-center justify-center text-6xl" aria-hidden="true">
          {slide.emoji}
        </div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand">{slide.eyebrow}</p>
        <h2 className="mb-3 text-xl font-bold text-foreground break-keep">{slide.headline}</h2>
        <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground break-keep">
          {slide.body}
        </p>
      </div>

      <div className="flex items-center justify-center gap-2" role="group" aria-label="슬라이드 인디케이터">
        {SLIDES.map((s, i) => (
          <button
            key={s.eyebrow}
            type="button"
            aria-label={`${i + 1}번 슬라이드로 이동`}
            aria-current={i === index ? 'true' : undefined}
            onClick={() => setIndex(i)}
            className={cn(
              'h-1.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              i === index ? 'w-6 bg-brand' : 'w-2 bg-border',
            )}
          />
        ))}
      </div>

      <Button
        type="button"
        className="h-11 w-full"
        onClick={next}
        disabled={last && isSubmitting}
      >
        {last && isSubmitting && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        {last ? (isSubmitting ? '저장하는 중...' : '시작하기') : '다음'}
      </Button>
    </div>
  )
}
