import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CommunityCategoryBadge } from '../community/category-badge'
import { CategoryBadge } from '../insights/category-badge'
import { StatusBadge, VerificationBadge, SubscriptionBadge } from '../console/StatusBadge'

describe('CommunityCategoryBadge', () => {
  it('카테고리 라벨을 렌더한다', () => {
    render(<CommunityCategoryBadge category="notice" />)
    expect(screen.getByText('공지')).toBeInTheDocument()
  })

  it('색상을 인라인 스타일로 적용한다', () => {
    render(<CommunityCategoryBadge category="daily" />)
    const el = screen.getByText('자유')
    expect(el).toHaveStyle({ color: '#8b9d83' })
  })

  it('알 수 없는 카테고리는 렌더하지 않는다', () => {
    const { container } = render(<CommunityCategoryBadge category={'unknown' as never} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('CategoryBadge (insights)', () => {
  it('트렌드 카테고리 라벨을 렌더한다', () => {
    render(<CategoryBadge category="flower" />)
    expect(screen.getByText('꽃 트렌드')).toBeInTheDocument()
  })

  it('알 수 없는 카테고리는 null', () => {
    const { container } = render(<CategoryBadge category={'nope' as never} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('StatusBadge', () => {
  it('children을 렌더한다', () => {
    render(<StatusBadge tone="success">활성</StatusBadge>)
    expect(screen.getByText('활성')).toBeInTheDocument()
  })
})

describe('VerificationBadge', () => {
  it.each([
    ['APPROVED', '승인'],
    ['PENDING', '대기'],
    ['REJECTED', '거절'],
  ])('%s → %s', (status, label) => {
    render(<VerificationBadge status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('null/미지의 상태는 미신청', () => {
    render(<VerificationBadge status={null} />)
    expect(screen.getByText('미신청')).toBeInTheDocument()
  })
})

describe('SubscriptionBadge', () => {
  it.each([
    ['active', '활성'],
    ['in_grace', '결제유예'],
    ['expired', '만료'],
    ['none', '없음'],
  ])('%s → %s', (status, label) => {
    render(<SubscriptionBadge status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('null은 없음', () => {
    render(<SubscriptionBadge status={null} />)
    expect(screen.getByText('없음')).toBeInTheDocument()
  })
})
