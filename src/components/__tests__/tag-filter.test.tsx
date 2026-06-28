import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TagFilter } from '@/app/(admin)/admin/gallery/components/tag-filter'
import { PhotoCardGrid } from '@/app/(admin)/admin/gallery/components/photo-card-grid'
import type { PhotoTag, PhotoCard } from '@/types/database'

const tags: PhotoTag[] = [
  { id: '1', name: '봄', created_at: '' },
  { id: '2', name: '여름', created_at: '' },
]

describe('TagFilter', () => {
  it('셀렉트 트리거에 라벨(태그)과 현재 값(전체)을 렌더한다', () => {
    render(<TagFilter tags={tags} selectedTag={null} onSelectTag={() => {}} />)
    expect(screen.getByText('태그')).toBeInTheDocument()
    expect(screen.getByText('전체')).toBeInTheDocument()
  })

  it('드롭다운을 열면 각 태그를 #해시태그로 보여준다', () => {
    render(<TagFilter tags={tags} selectedTag={null} onSelectTag={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '태그' }))
    expect(screen.getByText('#봄')).toBeInTheDocument()
    expect(screen.getByText('#여름')).toBeInTheDocument()
  })

  it('태그 선택 시 이름으로 콜백한다', () => {
    const onSelect = vi.fn()
    render(<TagFilter tags={tags} selectedTag={null} onSelectTag={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: '태그' }))
    fireEvent.click(screen.getByText('#봄'))
    expect(onSelect).toHaveBeenCalledWith('봄')
  })

  it('전체 선택 시 null로 콜백한다', () => {
    const onSelect = vi.fn()
    render(<TagFilter tags={tags} selectedTag="봄" onSelectTag={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: '태그' }))
    // 트리거는 '#봄'을 보여주므로 드롭다운 옵션의 '전체'를 클릭
    const allOptions = screen.getAllByText('전체')
    fireEvent.click(allOptions[allOptions.length - 1])
    expect(onSelect).toHaveBeenCalledWith(null)
  })
})

describe('PhotoCardGrid', () => {
  it('카드가 없으면 빈 상태 안내를 렌더한다', () => {
    render(<PhotoCardGrid cards={[]} onCardClick={() => {}} />)
    expect(screen.getByText('등록된 사진이 없습니다')).toBeInTheDocument()
  })

  it('카드가 있으면 제목을 렌더한다', () => {
    const cards: PhotoCard[] = [
      {
        id: 'pc1', user_id: '', title: '봄 부케', memo: null, tags: ['봄'],
        photos: [{ url: 'https://cdn/a.jpg', originalName: 'a.jpg' }],
        sale_id: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      } as PhotoCard,
    ]
    render(<PhotoCardGrid cards={cards} onCardClick={() => {}} />)
    expect(screen.getByText('봄 부케')).toBeInTheDocument()
    expect(screen.queryByText('등록된 사진이 없습니다')).not.toBeInTheDocument()
  })
})
