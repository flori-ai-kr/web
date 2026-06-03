import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DomainBadge } from '../ui/domain-badge'

describe('DomainBadge', () => {
  it('color가 있으면 --badge 변수를 주입하고 domain-badge 클래스를 단다', () => {
    render(<DomainBadge color="#ec4899">장미</DomainBadge>)
    const el = screen.getByText('장미')
    expect(el).toHaveClass('domain-badge')
    expect(el.style.getPropertyValue('--badge')).toBe('#ec4899')
  })

  it('color가 없으면 muted 토큰 폴백(domain-badge 클래스 없음)', () => {
    render(<DomainBadge color={null}>미지정</DomainBadge>)
    const el = screen.getByText('미지정')
    expect(el).not.toHaveClass('domain-badge')
    expect(el).toHaveClass('bg-muted')
  })

  it('className 오버라이드를 병합한다', () => {
    render(<DomainBadge color="#000" className="px-1.5">X</DomainBadge>)
    expect(screen.getByText('X')).toHaveClass('px-1.5')
  })
})
