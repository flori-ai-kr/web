'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {Lock, MessageSquare, MessagesSquare, PenSquare, Pin, Search} from 'lucide-react';
import {COMMUNITY_CATEGORIES, type CommunityCategory, type CommunityPost} from '@/types/database';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {PageHeader} from '@/components/layout/PageHeader';
import {cn} from '@/lib/utils';
import {PostCard} from '@/components/community/post-card';
import {CommunityCategoryBadge} from '@/components/community/category-badge';

interface CommunityClientProps {
  initialPosts: CommunityPost[];
  activeCategory: CommunityCategory | null;
}

export function CommunityClient({ initialPosts, activeCategory }: CommunityClientProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialPosts;
    return initialPosts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) || p.content_text.toLowerCase().includes(q),
    );
  }, [initialPosts, search]);

  const pinned = filtered.filter((p) => p.is_pinned);
  const normal = filtered.filter((p) => !p.is_pinned);

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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="제목·내용 검색"
          className="pl-9"
          aria-label="게시글 검색"
        />
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
      {normal.length === 0 && pinned.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-xl border border-dashed border-border bg-card/50">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <MessagesSquare className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground mb-1">아직 게시글이 없어요</h3>
          <p className="text-sm text-muted-foreground">첫 글을 작성해보세요.</p>
        </div>
      ) : (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-3" aria-label="게시글 목록">
          {normal.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </section>
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
