'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft} from 'lucide-react';
import {COMMUNITY_ADMIN_ONLY_CATEGORIES, COMMUNITY_CATEGORIES, type CommunityCategory, type CommunityPost,} from '@/types/database';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from '@/components/ui/select';
import dynamic from 'next/dynamic';
import {toast} from 'sonner';
import {createCommunityPost, updateCommunityPost} from '@/lib/actions/community';

// Tiptap+ProseMirror는 무거우므로 글쓰기 진입 시점에 지연 로드(초기 번들에서 제외).
const TiptapEditor = dynamic(
  () => import('@/app/(admin)/admin/community/components/tiptap-editor').then((m) => m.TiptapEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[240px] rounded-md border border-input bg-muted/30 animate-pulse" />
    ),
  },
);

function extractImageUrls(json: unknown): string[] {
  const urls: string[] = [];
  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;
    if (n.type === 'image' && typeof (n.attrs as Record<string, unknown>)?.src === 'string') {
      const src = (n.attrs as Record<string, unknown>).src as string;
      if (!src.startsWith('blob:')) urls.push(src);
    }
    if (Array.isArray(n.content)) (n.content as unknown[]).forEach(walk);
  }
  walk(json);
  return urls;
}

// Tiptap(ProseMirror) 의 node.attrs 는 null-prototype 객체(Object.create(null))다.
// React Server Action(RSC Flight) 직렬화가 null-prototype 객체를 보존하지 못해
// attrs 가 통째로 누락된다(heading level·image src 소실 → 저장 시 H1/H2/H3 구분·이미지 사라짐).
// JSON 라운드트립으로 모든 객체를 표준 prototype 의 plain object 로 정규화한 뒤 액션에 전달한다.
function toPlainJson(json: unknown): unknown {
  return json == null ? json : JSON.parse(JSON.stringify(json));
}

interface WriteClientProps {
  post?: CommunityPost | null; // 있으면 수정 모드
  isAdmin?: boolean; // 운영자만 '공지' 카테고리 선택 가능 (서버가 최종 강제)
}

export function CommunityWriteClient({ post, isAdmin = false }: WriteClientProps) {
  const router = useRouter();
  const isEdit = !!post;

  // 비관리자에게는 관리자 전용 카테고리('공지')를 숨긴다. 서버도 NOTICE_ADMIN_ONLY 로 차단하지만,
  // 폼을 다 작성하고 등록을 눌러야 403 을 받는 나쁜 경험을 막기 위해 옵션 단계에서 제거한다.
  const categories = isAdmin
    ? COMMUNITY_CATEGORIES
    : COMMUNITY_CATEGORIES.filter((c) => !COMMUNITY_ADMIN_ONLY_CATEGORIES.includes(c.value));

  const [category, setCategory] = useState<CommunityCategory | ''>(post?.category ?? '');
  const [title, setTitle] = useState(post?.title ?? '');
  const [content, setContent] = useState<unknown>(post?.content ?? null);
  const [contentText, setContentText] = useState(post?.content_text ?? '');
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    if (!category) {
      toast.error('카테고리를 선택해주세요');
      return;
    }
    if (!title.trim()) {
      toast.error('제목을 입력해주세요');
      return;
    }
    if (!contentText.trim()) {
      toast.error('내용을 입력해주세요');
      return;
    }
    setPending(true);
    try {
      const safeContent = toPlainJson(content);
      const imageUrls = extractImageUrls(safeContent);
      const payload = { category, title, content: safeContent, contentText, imageUrls };
      if (isEdit) {
        await updateCommunityPost(post.id, payload);
        toast.success('게시글을 수정했어요');
        router.push(`/admin/community/${post.id}`);
      } else {
        const created = await createCommunityPost(payload);
        toast.success('게시글을 등록했어요');
        router.push(`/admin/community/${created.id}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장에 실패했어요');
      setPending(false);
    }
  };

  const cancelHref = isEdit ? `/admin/community/${post.id}` : '/admin/community';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-1 sm:py-2 space-y-5">
      {/* Header */}
      <header className="flex items-center gap-2">
        <Link
          href={cancelHref}
          aria-label="뒤로"
          className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          {isEdit ? '글 수정하기' : '글 작성하기'}
        </h1>
      </header>

      {/* Card */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-5"
      >
        {/* 카테고리 */}
        <div className="space-y-1.5">
          <Label htmlFor="category">
            카테고리 <span className="text-destructive">*</span>
          </Label>
          <Select value={category} onValueChange={(v) => setCategory(v as CommunityCategory)}>
            <SelectTrigger id="category" className="w-full sm:w-64">
              <SelectValue placeholder="카테고리 선택" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 제목 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="title">
              제목 <span className="text-destructive">*</span>
            </Label>
            <span className="text-xs text-muted-foreground">{title.length}/200</span>
          </div>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력해주세요"
            maxLength={200}
          />
        </div>

        {/* 내용 */}
        <div className="space-y-1.5">
          <Label>
            내용 <span className="text-destructive">*</span>
          </Label>
          <TiptapEditor
            content={content ?? undefined}
            onChange={(json, text) => {
              setContent(json);
              setContentText(text);
            }}
          />
        </div>

        {/* 액션 */}
        <div className="flex items-center justify-end gap-2 border-t border-border -mx-5 sm:-mx-6 px-5 sm:px-6 pt-4">
          <Button asChild type="button" variant="ghost">
            <Link href={cancelHref}>취소</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? '저장 중…' : isEdit ? '수정 완료' : '등록'}
          </Button>
        </div>
      </form>
    </div>
  );
}
