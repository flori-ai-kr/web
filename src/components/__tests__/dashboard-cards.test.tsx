import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KpiCard, KpiGroup } from '../dashboard/kpi-card'
import { SectionHeader } from '../dashboard/section-header'

describe('KpiCard', () => {
  it('라벨과 값을 렌더한다', () => {
    render(<KpiCard label="총매출" value="1,000" />)
    expect(screen.getByText('총매출')).toBeInTheDocument()
    expect(screen.getByText('1,000')).toBeInTheDocument()
  })

  it('unit이 있으면 함께 렌더한다', () => {
    render(<KpiCard label="건수" value={5} unit="건" />)
    expect(screen.getByText('건')).toBeInTheDocument()
  })

  it('sub가 없으면 보조 라인을 렌더하지 않는다', () => {
    render(<KpiCard label="L" value="V" />)
    expect(screen.queryByText('증감')).not.toBeInTheDocument()
  })

  it('sub가 있으면 렌더한다', () => {
    render(<KpiCard label="L" value="V" sub={<span>전월대비 +10%</span>} />)
    expect(screen.getByText('전월대비 +10%')).toBeInTheDocument()
  })
})

describe('KpiGroup', () => {
  it('자식들을 렌더한다', () => {
    render(
      <KpiGroup>
        <KpiCard label="A" value="1" />
        <KpiCard label="B" value="2" />
      </KpiGroup>
    )
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
  })
})

describe('SectionHeader', () => {
  it('제목을 렌더한다', () => {
    render(<SectionHeader title="오늘 매출" />)
    expect(screen.getByRole('heading', { name: '오늘 매출' })).toBeInTheDocument()
  })

  it('meta와 action을 렌더한다', () => {
    render(<SectionHeader title="제목" meta="3건" action={<button>더보기</button>} />)
    expect(screen.getByText('3건')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '더보기' })).toBeInTheDocument()
  })

  it('meta가 없으면 렌더하지 않는다', () => {
    render(<SectionHeader title="제목" />)
    expect(screen.queryByText('3건')).not.toBeInTheDocument()
  })
})
