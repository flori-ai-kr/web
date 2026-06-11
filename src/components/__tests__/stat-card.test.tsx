import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Users } from 'lucide-react'
import { StatCard } from '../console/stat-card'

describe('StatCard', () => {
  it('라벨과 값을 렌더한다', () => {
    render(<StatCard label="총 유저" value={120} icon={Users} />)
    expect(screen.getByText('총 유저')).toBeInTheDocument()
    expect(screen.getByText('120')).toBeInTheDocument()
  })

  it('양수 증감은 + 부호와 함께 표시', () => {
    const { container } = render(<StatCard label="L" value={1} changePct={12.34} icon={Users} />)
    expect(container.textContent).toContain('+12.3%')
  })

  it('음수 증감은 부호 없이 소수 1자리', () => {
    const { container } = render(<StatCard label="L" value={1} changePct={-5.67} icon={Users} />)
    expect(container.textContent).toContain('5.7%')
    expect(container.textContent).not.toContain('+5.7%')
  })

  it('changePct가 없으면 증감 배지를 렌더하지 않는다', () => {
    render(<StatCard label="L" value={1} icon={Users} />)
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it('hint를 렌더한다', () => {
    render(<StatCard label="L" value={1} hint="지난 7일" icon={Users} />)
    expect(screen.getByText('지난 7일')).toBeInTheDocument()
  })

  it('href가 있으면 링크로 렌더한다', () => {
    render(<StatCard label="L" value={1} href="/console/users" icon={Users} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/console/users')
  })

  it('href가 없으면 링크가 아니다', () => {
    render(<StatCard label="L" value={1} icon={Users} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
