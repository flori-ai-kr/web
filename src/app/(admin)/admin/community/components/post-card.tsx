import Link from 'next/link';
import {Heart, Lock, MessageSquare, Pin} from 'lucide-react';
import {formatDistanceToNow} from 'date-fns';
import {ko} from '@/lib/date-locale';
import type {CommunityPost} from '@/types/database';
import {CommunityCategoryBadge} from '@/components/community/category-badge';
import {AdminBadge} from '@/app/(admin)/admin/community/components/admin-badge';

export function PostCard({ post }: { post: CommunityPost }) {
  const masked = post.is_secret && !post.can_view;

  return (
    <Link
      href={`/admin/community/${post.id}`}
      className="group block rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand/50"
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {post.is_pinned && <Pin className="h-3.5 w-3.5 text-brand" aria-label="고정글" />}
        <CommunityCategoryBadge category={post.category} />
        {post.is_secret && (
          <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label="비밀글" />
        )}
      </div>

      <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-brand transition-colors">
        {masked ? '비밀글입니다' : post.title}
      </h3>
      {!masked && post.content_text && (
        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{post.content_text}</p>
      )}

      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/70">
          {masked ? '비공개' : post.author_nickname}
        </span>
        {!masked && post.author_is_admin && <AdminBadge />}
        <span>
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ko })}
        </span>
        <span className="ml-auto flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" /> {post.like_count}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" /> {post.comment_count}
          </span>
        </span>
      </div>
    </Link>
  );
}
