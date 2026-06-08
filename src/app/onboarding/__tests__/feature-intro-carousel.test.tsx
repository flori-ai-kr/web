import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FeatureIntroCarousel } from '../feature-intro-carousel'

describe('FeatureIntroCarousel', () => {
  it('첫 화면은 첫 슬라이드와 "다음" 버튼을 보여준다', () => {
    render(<FeatureIntroCarousel onComplete={vi.fn()} isSubmitting={false} />)
    expect(screen.getByText('장부 정리, 이제 flori 하나로 끝')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다음' })).toBeInTheDocument()
  })

  it('마지막 슬라이드에서 버튼이 "시작하기"로 바뀌고 onComplete를 호출한다', () => {
    const onComplete = vi.fn()
    render(<FeatureIntroCarousel onComplete={onComplete} isSubmitting={false} />)
    const next = () => fireEvent.click(screen.getByRole('button', { name: /다음|시작하기/ }))
    next(); next(); next() // 4슬라이드 → 3번 다음
    const start = screen.getByRole('button', { name: '시작하기' })
    expect(start).toBeInTheDocument()
    fireEvent.click(start)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('isSubmitting이면 시작하기 버튼이 비활성화된다', () => {
    render(<FeatureIntroCarousel onComplete={vi.fn()} isSubmitting={true} />)
    const next = () => fireEvent.click(screen.getByRole('button', { name: /다음|시작하기/ }))
    next(); next(); next()
    expect(screen.getByRole('button', { name: /시작하기|저장하는 중/ })).toBeDisabled()
  })
})
