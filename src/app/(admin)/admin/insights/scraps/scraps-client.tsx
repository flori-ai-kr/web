'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {ArrowLeft, Bookmark, ExternalLink, Images, NotebookPen, Sparkles} from 'lucide-react';
import {format} from 'date-fns';
import {ko} from '@/lib/date-locale';
import {cn} from '@/lib/utils';
import type {InstagramPostWithAccount, PostScrap, ScrapMap, TrendArticle, TrendScrap,} from '@/types/database';
import {CategoryBadge} from '@/components/insights/category-badge';
import {ScrapMemoEditor} from '@/components/insights/scrap-memo-editor';
import {normalizeInstagramImageUrl} from '@/lib/instagram-url';
import {Dialog, DialogContent, DialogHeader, DialogTitle,} from '@/components/ui/dialog';
import {PostDetailDialog} from '../follows/post-detail-dialog';

interface ScrapsClientProps {
  initialTrendScraps: TrendScrap[];
  initialPostScraps: PostScrap[];
  initialTab: 'trend' | 'post';
}

export function ScrapsClient({
  initialTrendScraps,
  initialPostScraps,
  initialTab,
}: ScrapsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<'trend' | 'post'>(initialTab);
  const [selectedArticle, setSelectedArticle] = useState<TrendArticle | null>(null);
  const [selectedPost, setSelectedPost] = useState<InstagramPostWithAccount | null>(null);

  const trendScrapMap = useMemo<ScrapMap>(() => {
    const m: ScrapMap = {};
    for (const { scrap, article } of initialTrendScraps) {
      m[article.id] = { id: scrap.id, memo: scrap.memo };
    }
    return m;
  }, [initialTrendScraps]);

  const postScrapMap = useMemo<ScrapMap>(() => {
    const m: ScrapMap = {};
    for (const { scrap, post } of initialPostScraps) {
      m[post.id] = { id: scrap.id, memo: scrap.memo };
    }
    return m;
  }, [initialPostScraps]);

  const changeTab = (next: 'trend' | 'post') => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'post') params.set('tab', 'post');
    else params.delete('tab');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-1 sm:py-2 space-y-6">
      <header>
        <Link
          href="/admin/insights"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          인사이트
        </Link>
        <p className="text-sm text-muted-foreground mt-1">
          트렌드 {initialTrendScraps.length}건 · 팔로우 포스트 {initialPostScraps.length}건
        </p>
      </header>

      <div className="flex gap-2">
        <TabButton
          active={tab === 'trend'}
          onClick={() => changeTab('trend')}
          label="트렌드"
          count={initialTrendScraps.length}
        />
        <TabButton
          active={tab === 'post'}
          onClick={() => changeTab('post')}
          label="팔로우"
          count={initialPostScraps.length}
        />
      </div>

      {tab === 'trend' ? (
        initialTrendScraps.length === 0 ? (
          <EmptyState type="trend" />
        ) : (
          <div className="space-y-3">
            {initialTrendScraps.map(({ scrap, article }) => (
              <TrendScrapCard
                key={scrap.id}
                article={article}
                memo={scrap.memo}
                onOpen={() => setSelectedArticle(article)}
              />
            ))}
          </div>
        )
      ) : initialPostScraps.length === 0 ? (
        <EmptyState type="post" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {initialPostScraps.map(({ scrap, post }) => (
            <PostScrapCard
              key={scrap.id}
              post={post}
              memo={scrap.memo}
              onOpen={() => setSelectedPost(post)}
            />
          ))}
        </div>
      )}

      <TrendDetailDialog
        article={selectedArticle}
        open={!!selectedArticle}
        onClose={() => setSelectedArticle(null)}
        scrapMap={trendScrapMap}
      />
      <PostDetailDialog
        post={selectedPost}
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        scrapMap={postScrapMap}
      />
    </div>
  );
}

function TabButton({
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
        'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors border',
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

function TrendScrapCard({
  article,
  memo,
  onOpen,
}: {
  article: TrendArticle;
  memo: string | null;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${article.title} 상세 보기`}
      className="w-full text-left rounded-xl border border-border bg-card p-5 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <CategoryBadge category={article.category} />
        {article.source_name && (
          <span className="text-xs text-muted-foreground">{article.source_name}</span>
        )}
      </div>
      <h3 className="font-semibold text-foreground mb-1.5 line-clamp-2">{article.title}</h3>
      <p className="text-sm text-muted-foreground line-clamp-2">{article.summary}</p>
      {memo && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-start gap-2 text-xs">
            <NotebookPen className="w-3.5 h-3.5 text-brand mt-0.5 shrink-0" aria-hidden />
            <p className="text-foreground whitespace-pre-wrap line-clamp-3">{memo}</p>
          </div>
        </div>
      )}
    </button>
  );
}

function PostScrapCard({
  post,
  memo,
  onOpen,
}: {
  post: InstagramPostWithAccount;
  memo: string | null;
  onOpen: () => void;
}) {
  const coverUrl = post.image_urls[0] ? normalizeInstagramImageUrl(post.image_urls[0]) : '';
  const imageCount = post.image_urls.length;
  const postedLabel = (() => {
    try {
      return format(new Date(post.posted_at), 'yyyy년 M월 d일', { locale: ko });
    } catch {
      return '';
    }
  })();

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`@${post.account.username} 포스트 상세 보기`}
      className="text-left rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-square relative bg-muted">
        {coverUrl && (
          <Image
            src={coverUrl}
            alt={post.caption?.slice(0, 60) || `@${post.account.username} 포스트`}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        )}
        {imageCount > 1 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-white text-[11px] font-medium backdrop-blur-sm">
            <Images className="w-3 h-3" aria-hidden="true" />
            <span>{imageCount}</span>
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground truncate">@{post.account.username}</span>
          <span className="shrink-0">{postedLabel}</span>
        </div>
        {memo && (
          <div className="flex items-start gap-2 text-xs pt-2 border-t border-border">
            <NotebookPen className="w-3.5 h-3.5 text-brand mt-0.5 shrink-0" aria-hidden />
            <p className="text-foreground whitespace-pre-wrap line-clamp-3">{memo}</p>
          </div>
        )}
      </div>
    </button>
  );
}

function EmptyState({ type }: { type: 'trend' | 'post' }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 rounded-xl border border-dashed border-border bg-card/50">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        {type === 'trend' ? (
          <Sparkles className="w-6 h-6 text-muted-foreground" />
        ) : (
          <Bookmark className="w-6 h-6 text-muted-foreground" />
        )}
      </div>
      <h3 className="font-medium text-foreground mb-1">
        스크랩한 {type === 'trend' ? '트렌드' : '포스트'}가 없어요
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {type === 'trend'
          ? '관심 있는 트렌드를 스크랩해보세요'
          : '마음에 드는 포스트를 스크랩해보세요'}
      </p>
      <Link
        href={type === 'trend' ? '/insights/trends' : '/insights/follows'}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-white text-sm hover:bg-brand/90"
      >
        {type === 'trend' ? '트렌드 보러가기' : '팔로우 보러가기'}
      </Link>
    </div>
  );
}

function TrendDetailDialog({
  article,
  open,
  onClose,
  scrapMap,
}: {
  article: TrendArticle | null;
  open: boolean;
  onClose: () => void;
  scrapMap: ScrapMap;
}) {
  if (!article) return null;
  const scrap = scrapMap[article.id];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-2 mb-2">
            <CategoryBadge category={article.category} />
            {article.source_name && (
              <span className="text-xs text-muted-foreground">{article.source_name}</span>
            )}
          </div>
          <DialogTitle className="text-xl leading-snug pr-8">{article.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <p className="text-sm leading-relaxed text-foreground">{article.summary}</p>

          {article.key_points.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                핵심 포인트
              </h4>
              <ul className="space-y-1.5">
                {article.key_points.map((point, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground">
                    <span className="text-brand">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ScrapMemoEditor
            targetType="trend"
            targetId={article.id}
            initialScraped={!!scrap}
            initialMemo={scrap?.memo ?? null}
          />

          <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
            <span>
              {article.published_at
                ? format(new Date(article.published_at), 'yyyy년 M월 d일', { locale: ko })
                : format(new Date(article.collected_at), 'yyyy년 M월 d일 수집', { locale: ko })}
            </span>
            <a
              href={article.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-brand hover:underline font-medium"
            >
              원문 보기
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
