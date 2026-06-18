'use client';

import {useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {toast} from 'sonner';
import {Loader2, Lock, MessageSquare, MessagesSquare, PenSquare, Pin, Search} from 'lucide-react';
import {COMMUNITY_CATEGORIES, type CommunityCategory, type CommunityPost} from '@/types/database';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';
import {loadMoreCommunityPosts} from '@/lib/actions/community';
import {useInfiniteList} from '@/hooks/use-infinite-list';
import {PostCard} from '@/app/(admin)/admin/community/components/post-card';
import {CommunityCategoryBadge} from '@/components/community/category-badge';
import {AdminBadge} from '@/app/(admin)/admin/community/components/admin-badge';

interface CommunityClientProps {
  initialPosts: CommunityPost[];
  initialHasMore: boolean;
  activeCategory: CommunityCategory | null;
}

export function CommunityClient({ initialPosts, initialHasMore, activeCategory }: CommunityClientProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // 무한스크롤 + 디바운스 서버사이드 검색 (매출/지출과 동일 공용 훅).
  // 카테고리 변경은 Link 내비게이션 → 서버 재요청 → initialPosts 참조 변경 시 훅이 자동 리셋.
  const {
    items: posts,
    hasMore,
    isLoadingMore,
    isSearching,
    loadMore,
  } = useInfiniteList<CommunityPost>({
    initialItems: initialPosts,
    initialHasMore,
    loadPage: async (offset, search) => {
      const result = await loadMoreCommunityPosts(activeCategory, offset, search || undefined);
      return { items: result.posts, hasMore: result.hasMore };
    },
    searchQuery,
    onSearchError: () => toast.error('검색에 실패했습니다'),
    onLoadMoreError: () => toast.error('게시글을 더 불러오지 못했습니다'),
  });

  const sentinelRef = useRef<HTMLDivElement>(null);

  // 스크롤 끝(sentinel)에 닿으면 자동 추가 로드 — 매출/지출과 동일 패턴.
  useEffect(() => {
    if (!hasMore || isLoadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  const pinned = posts.filter((p) => p.is_pinned);
  const normal = posts.filter((p) => !p.is_pinned);
  const isEmpty = pinned.length === 0 && normal.length === 0;

  const tabHref = (cat: CommunityCategory | null) =>
    cat ? `/admin/community?category=${cat}` : '/admin/community';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-1 sm:py-2 space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-end">
        <Button asChild className="w-full sm:w-auto sm:h-10 sm:px-6 sm:text-base">
          <Link href="/admin/community/write">
            <PenSquare className="w-4 h-4" /> 글쓰기
          </Link>
        </Button>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <CategoryTab href={tabHref(null)} active={activeCategory === null} label="전체" />
        {COMMUNITY_CATEGORIES.map((cat) => (
          <CategoryTab
            key={cat.value}
            href={tabHref(cat.value)}
            active={activeCategory === cat.value}
            label={cat.label}
          />
        ))}
      </div>

      {/* Search (서버사이드 — 전체 게시글 대상) */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="제목·내용 검색"
          className="pl-9 pr-9"
          aria-label="게시글 검색"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Pinned (공지) — 별도 박스 + 1줄 행 */}
      {pinned.length > 0 && (
        <section
          className="rounded-xl border border-amber-500/30 bg-amber-500/5 overflow-hidden"
          aria-label="고정"
        >
          <div className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-amber-600 dark:text-amber-400 border-b border-amber-500/20">
            <Pin className="w-4 h-4" /> 고정
          </div>
          <ul className="divide-y divide-amber-500/15">
            {pinned.map((post) => (
              <NoticeRow key={post.id} post={post} />
            ))}
          </ul>
        </section>
      )}

      {/* List */}
      {isEmpty ? (
        isSearching ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-xl border border-dashed border-border bg-card/50">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <MessagesSquare className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-1">
              {searchQuery.trim() ? '검색 결과가 없어요' : '아직 게시글이 없어요'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery.trim() ? '다른 검색어로 시도해보세요.' : '첫 글을 작성해보세요.'}
            </p>
          </div>
        )
      ) : (
        <>
          {normal.length > 0 && (
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-3" aria-label="게시글 목록">
              {normal.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </section>
          )}
          {/* 무한스크롤 sentinel */}
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              {isLoadingMore && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CategoryTab({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-brand text-white'
          : 'bg-muted text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </Link>
  );
}

function NoticeRow({ post }: { post: CommunityPost }) {
  const masked = post.is_secret && !post.can_view;
  return (
    <li>
      <Link
        href={`/admin/community/${post.id}`}
        className="flex items-center gap-2 px-4 py-2.5 hover:bg-amber-500/10 transition-colors"
      >
        <CommunityCategoryBadge category={post.category} className="shrink-0" />
        {post.is_secret && <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-label="비밀글" />}
        <span className="font-medium text-foreground truncate flex-1 min-w-0">
          {masked ? '비밀글입니다' : post.title}
        </span>
        <span className="hidden sm:flex items-center gap-2.5 text-xs text-muted-foreground shrink-0">
          <span>{masked ? '비공개' : post.author_nickname}</span>
          {!masked && post.author_is_admin && <AdminBadge />}
          {post.comment_count > 0 && (
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> {post.comment_count}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
