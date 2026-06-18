import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PostCard } from '@/app/(admin)/admin/community/components/post-card'
import type { CommunityPost } from '@/types/database'

const post = (over: Partial<CommunityPost> = {}): CommunityPost =>
  ({
    id: '1', author_nickname: '플로리스트', author_is_admin: false, category: 'daily', title: '제목입니다',
    content: { type: 'doc' }, content_text: '본문 미리보기', image_urls: [],
    is_secret: false, is_pinned: false, like_count: 3, liked: false,
    comment_count: 2, is_mine: false, viewer_is_admin: false, can_view: true,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', ...over,
  } as CommunityPost)

describe('PostCard', () => {
  it('제목·작성자·본문 미리보기를 렌더한다', () => {
    render(<PostCard post={post()} />)
    expect(screen.getByText('제목입니다')).toBeInTheDocument()
    expect(screen.getByText('플로리스트')).toBeInTheDocument()
    expect(screen.getByText('본문 미리보기')).toBeInTheDocument()
  })

  it('좋아요·댓글 수를 렌더한다', () => {
    render(<PostCard post={post({ like_count: 7, comment_count: 4 })} />)
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('상세 페이지로 링크한다', () => {
    render(<PostCard post={post({ id: '42' })} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/admin/community/42')
  })

  it('고정글이면 아이콘을 표시한다', () => {
    render(<PostCard post={post({ is_pinned: true })} />)
    expect(screen.getByLabelText('고정글')).toBeInTheDocument()
  })

  it('비밀글이고 열람 불가면 제목·작성자를 마스킹한다', () => {
    render(<PostCard post={post({ is_secret: true, can_view: false, title: '진짜제목' })} />)
    expect(screen.getByText('비밀글입니다')).toBeInTheDocument()
    expect(screen.getByText('비공개')).toBeInTheDocument()
    expect(screen.queryByText('진짜제목')).not.toBeInTheDocument()
  })

  it('비밀글이지만 열람 가능하면 제목을 보여준다', () => {
    render(<PostCard post={post({ is_secret: true, can_view: true, title: '열람가능제목' })} />)
    expect(screen.getByText('열람가능제목')).toBeInTheDocument()
    expect(screen.getByLabelText('비밀글')).toBeInTheDocument()
  })

  it('운영자 글이면 관리자 칩을 보여준다', () => {
    render(<PostCard post={post({ author_is_admin: true })} />)
    expect(screen.getByText('관리자')).toBeInTheDocument()
  })

  it('일반 글이면 관리자 칩이 없다', () => {
    render(<PostCard post={post({ author_is_admin: false })} />)
    expect(screen.queryByText('관리자')).not.toBeInTheDocument()
  })
})
