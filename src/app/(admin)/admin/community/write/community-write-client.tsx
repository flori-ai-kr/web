'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft, Lock} from 'lucide-react';
import {COMMUNITY_CATEGORIES, type CommunityCategory, type CommunityPost,} from '@/types/database';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from '@/components/ui/select';
import dynamic from 'next/dynamic';
import {toast} from 'sonner';

// Tiptap+ProseMirror는 무거우므로 글쓰기 진입 시점에 지연 로드(초기 번들에서 제외).
const TiptapEditor = dynamic(
  () => import('@/components/community/tiptap-editor').then((m) => m.TiptapEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[240px] rounded-md border border-input bg-muted/30 animate-pulse" />
    ),
  },
);
import {createCommunityPost, updateCommunityPost} from '@/lib/actions/community';

interface WriteClientProps {
  post?: CommunityPost | null; // 있으면 수정 모드
}

export function CommunityWriteClient({ post }: WriteClientProps) {
  const router = useRouter();
  const isEdit = !!post;

  const [category, setCategory] = useState<CommunityCategory | ''>(post?.category ?? '');
  const [title, setTitle] = useState(post?.title ?? '');
  const [content, setContent] = useState<unknown>(post?.content ?? null);
  const [contentText, setContentText] = useState(post?.content_text ?? '');
  const [isSecret, setIsSecret] = useState(post?.is_secret ?? false);
  const [pending, setPending] = useState(false);

  // 공지 카테고리는 비밀글과 무관 — 그대로 허용
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
      const payload = { category, title, content, contentText, isSecret, imageUrls: post?.image_urls ?? [] };
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5">
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
              {COMMUNITY_CATEGORIES.map((c) => (
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

        {/* 비밀글 */}
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <Checkbox checked={isSecret} onCheckedChange={(v) => setIsSecret(v === true)} />
          <Lock className="h-3.5 w-3.5" /> 비밀글로 작성 (작성자와 관리자만 볼 수 있어요)
        </label>

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
