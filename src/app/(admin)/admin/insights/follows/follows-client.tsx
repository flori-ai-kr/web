'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {ArrowLeft, Bookmark, ExternalLink, Heart, Images, Settings2} from 'lucide-react';
import {formatDistanceToNow} from 'date-fns';
import {ko} from '@/lib/date-locale';
import {cn} from '@/lib/utils';
import {
    INSTAGRAM_REGION_LABELS,
    type InstagramAccount,
    type InstagramPostWithAccount,
    type InstagramRegion,
    type ScrapMap,
} from '@/types/database';
import {normalizeInstagramImageUrl} from '@/lib/instagram-url';
import {ScrapButton} from '@/components/insights/scrap-button';
import {AccountManagerDialog} from './account-manager-dialog';
import {PostDetailDialog} from './post-detail-dialog';

interface FollowsClientProps {
  initialAccounts: InstagramAccount[];
  initialPosts: InstagramPostWithAccount[];
  initialRegion: InstagramRegion | null;
  initialSort: 'latest' | 'likes';
  initialAccountId: string | null;
  initialScrapMap: ScrapMap;
  initialScrapedOnly: boolean;
}

export function FollowsClient({
  initialAccounts,
  initialPosts,
  initialRegion,
  initialSort,
  initialAccountId,
  initialScrapMap,
  initialScrapedOnly,
}: FollowsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [accountManagerOpen, setAccountManagerOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<InstagramPostWithAccount | null>(null);
  const [scrapedOnly, setScrapedOnly] = useState(initialScrapedOnly);

  const scrappedCount = useMemo(
    () => initialPosts.filter((p) => initialScrapMap[p.id]).length,
    [initialPosts, initialScrapMap],
  );

  const filteredPosts = useMemo(() => {
    if (!scrapedOnly) return initialPosts;
    return initialPosts.filter((p) => initialScrapMap[p.id]);
  }, [initialPosts, scrapedOnly, initialScrapMap]);

  const counts = useMemo(() => {
    const domestic = initialAccounts.filter(
      (a) => a.active && a.region === 'domestic',
    ).length;
    const international = initialAccounts.filter(
      (a) => a.active && a.region === 'international',
    ).length;
    return {
      total: domestic + international,
      domestic,
      international,
    };
  }, [initialAccounts]);

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const postsByAccount = useMemo(() => {
    const map = new Map<string, InstagramPostWithAccount[]>();
    for (const post of filteredPosts) {
      const key = post.account_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(post);
    }
    return map;
  }, [filteredPosts]);

  const toggleScrapedOnly = () => {
    const next = !scrapedOnly;
    setScrapedOnly(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set('scraped', '1');
    else params.delete('scraped');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  // 포스트가 있는 계정만 (sort_order 유지)
  const accountsWithPosts = useMemo(() => {
    return initialAccounts.filter((a) => {
      if (!a.active) return false;
      if (initialRegion && a.region !== initialRegion) return false;
      if (initialAccountId && a.id !== initialAccountId) return false;
      return postsByAccount.has(a.id);
    });
  }, [initialAccounts, initialRegion, initialAccountId, postsByAccount]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-1 sm:py-2 space-y-6">
      <header>
        <Link
          href="/admin/insights"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          인사이트
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground mt-1">
              {counts.total}개 계정 · 최근 2주 신규 포스트 {initialPosts.length}건
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/insights/scraps"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-brand hover:bg-brand/10 transition-colors"
            >
              <Bookmark className="w-4 h-4" />
              내 스크랩
            </Link>
            <button
              type="button"
              onClick={() => setAccountManagerOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm text-foreground hover:border-brand/50 transition-colors w-fit"
            >
              <Settings2 className="w-4 h-4" />
              계정 관리
            </button>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <FilterChip
          active={!initialRegion && !initialAccountId}
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete('region');
            params.delete('accountId');
            const qs = params.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname);
          }}
          label="전체"
          count={counts.total}
        />
        <FilterChip
          active={initialRegion === 'international'}
          onClick={() => {
            updateFilter('accountId', null);
            updateFilter('region', 'international');
          }}
          label="해외"
          count={counts.international}
        />
        <FilterChip
          active={initialRegion === 'domestic'}
          onClick={() => {
            updateFilter('accountId', null);
            updateFilter('region', 'domestic');
          }}
          label="국내"
          count={counts.domestic}
        />
        <button
          type="button"
          onClick={toggleScrapedOnly}
          aria-pressed={scrapedOnly}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
            scrapedOnly
              ? 'bg-brand text-white border-brand'
              : 'bg-card border-border text-foreground hover:border-brand/50',
          )}
        >
          <Bookmark className={cn('w-3.5 h-3.5', scrapedOnly && 'fill-current')} />
          스크랩만
          <span className={cn('text-xs', scrapedOnly ? 'opacity-80' : 'text-muted-foreground')}>
            {scrappedCount}
          </span>
        </button>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">정렬</span>
          <select
            value={initialSort}
            onChange={(e) => updateFilter('sort', e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card text-foreground"
          >
            <option value="latest">최신순</option>
            <option value="likes">좋아요순</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {accountsWithPosts.length === 0 ? (
        scrapedOnly ? (
          <EmptyScrapedState />
        ) : (
          <EmptyState onOpenManager={() => setAccountManagerOpen(true)} />
        )
      ) : (
        <div className="space-y-8">
          {accountsWithPosts.map((account) => {
            const posts = postsByAccount.get(account.id) ?? [];
            return (
              <AccountGroup
                key={account.id}
                account={account}
                posts={posts}
                scrapMap={initialScrapMap}
                onSelectPost={setSelectedPost}
              />
            );
          })}
        </div>
      )}

      <AccountManagerDialog
        open={accountManagerOpen}
        onOpenChange={setAccountManagerOpen}
        initialAccounts={initialAccounts}
      />

      <PostDetailDialog
        post={selectedPost}
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        scrapMap={initialScrapMap}
      />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
        active
          ? 'bg-brand text-white border-brand'
          : 'bg-card border-border text-foreground hover:border-brand/50',
      )}
    >
      <span>{label}</span>
      <span className={cn('text-xs', active ? 'opacity-80' : 'text-muted-foreground')}>
        {count}
      </span>
    </button>
  );
}

function AccountGroup({
  account,
  posts,
  scrapMap,
  onSelectPost,
}: {
  account: InstagramAccount;
  posts: InstagramPostWithAccount[];
  scrapMap: ScrapMap;
  onSelectPost: (post: InstagramPostWithAccount) => void;
}) {
  const initial = (account.display_name || account.username)[0]?.toUpperCase() ?? '?';

  return (
    <section aria-label={`${account.username} 최근 포스트`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-sage flex items-center justify-center text-white font-bold shrink-0">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-foreground truncate">
              @{account.username}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {account.display_name && (
                <span className="mr-1">{account.display_name} ·</span>
              )}
              {INSTAGRAM_REGION_LABELS[account.region]} · 최근 {posts.length}건
            </div>
          </div>
        </div>
        <a
          href={account.profile_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand hover:underline inline-flex items-center gap-1 shrink-0"
          aria-label={`${account.username} Instagram 프로필 열기`}
        >
          Instagram
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            scraped={!!scrapMap[post.id]}
            onSelect={() => onSelectPost(post)}
          />
        ))}
      </div>
    </section>
  );
}

function PostCard({
  post,
  scraped,
  onSelect,
}: {
  post: InstagramPostWithAccount;
  scraped: boolean;
  onSelect: () => void;
}) {
  const captionSnippet = post.caption?.slice(0, 120) ?? '';
  const postedLabel = (() => {
    try {
      return formatDistanceToNow(new Date(post.posted_at), { addSuffix: true, locale: ko });
    } catch {
      return '';
    }
  })();
  const coverUrl = post.image_urls[0] ? normalizeInstagramImageUrl(post.image_urls[0]) : '';
  const imageCount = post.image_urls.length;

  return (
    <div className="group relative rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow">
      <button
        type="button"
        onClick={onSelect}
        className="block text-left w-full"
        aria-label={`${post.account.username} 포스트 상세 보기`}
      >
        <div className="aspect-square relative bg-muted overflow-hidden">
          {coverUrl && (
            <Image
              src={coverUrl}
              alt={captionSnippet || `@${post.account.username} 포스트`}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="object-cover scale-[1.12] transition-transform duration-300 group-hover:scale-[1.16]"
            />
          )}
          {imageCount > 1 && (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-white text-[11px] font-medium backdrop-blur-sm">
              <Images className="w-3 h-3" aria-hidden="true" />
              <span>{imageCount}</span>
            </div>
          )}
        </div>
        {(captionSnippet || post.like_count > 0) && (
          <div className="p-3">
            {captionSnippet && (
              <p className="text-xs text-foreground/80 line-clamp-2 mb-1.5">
                {captionSnippet}
              </p>
            )}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              {post.like_count > 0 ? (
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  {post.like_count.toLocaleString()}
                </span>
              ) : (
                <span />
              )}
              <span>{postedLabel}</span>
            </div>
          </div>
        )}
      </button>
      <div className="absolute top-2 left-2">
        <ScrapButton
          targetType="post"
          targetId={post.id}
          scraped={scraped}
          variant="overlay"
          size="sm"
        />
      </div>
    </div>
  );
}

function EmptyScrapedState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 rounded-xl border border-dashed border-border bg-card/50">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Bookmark className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-foreground mb-1">스크랩한 포스트가 없어요</h3>
      <p className="text-sm text-muted-foreground">마음에 드는 포스트를 스크랩해보세요</p>
    </div>
  );
}

function EmptyState({ onOpenManager }: { onOpenManager: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 rounded-xl border border-dashed border-border bg-card/50">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Heart className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-foreground mb-1">수집된 포스트가 없어요</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        계정을 추가하거나 다음 수집 시각(월·금 08:00)을 기다려주세요
      </p>
      <button
        onClick={onOpenManager}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white text-sm hover:bg-brand/90"
      >
        <Settings2 className="w-4 h-4" />
        계정 관리
      </button>
    </div>
  );
}
