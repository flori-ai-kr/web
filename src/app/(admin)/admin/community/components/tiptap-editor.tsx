'use client';

import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useRef, useState } from 'react';
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  ImagePlus,
  Link2,
  Undo2,
  Redo2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createCommunityUploadTargets } from '@/lib/actions/community';

interface TiptapEditorProps {
  content?: unknown;
  onChange: (json: unknown, text: string) => void;
  placeholder?: string;
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn('h-8 w-8', active && 'bg-muted text-foreground')}
    >
      {children}
    </Button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-border shrink-0" aria-hidden />;
}

export function TiptapEditor({ content, onChange, placeholder }: TiptapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // StarterKit 에 link 가 번들되어 있으므로 끄고, 보안 설정(openOnClick:false·javascript: 차단)
      // 이 적용된 커스텀 Link 로 교체한다. (중복 등록 시 경고 + 커스텀 설정 미적용)
      StarterKit.configure({ link: false }),
      Image.configure({ HTMLAttributes: { class: 'rounded-lg my-2 max-w-full' } }),
      Link.configure({
        openOnClick: false,
        protocols: ['http', 'https', 'mailto'],
        validate: (href) => /^(https?:\/\/|mailto:)/i.test(href),
        HTMLAttributes: { class: 'text-brand underline', rel: 'noopener noreferrer nofollow' },
      }),
      Placeholder.configure({ placeholder: placeholder ?? '내용을 입력해주세요...' }),
    ],
    content: (content as object) ?? '',
    onUpdate: ({ editor }) => onChange(editor.getJSON(), editor.getText()),
  });

  if (!editor) return null;

  const onPickImage = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArr = Array.from(files);

    setUploading(true);
    try {
      const targets = await createCommunityUploadTargets(
        fileArr.map((f) => ({ name: f.name, type: f.type, size: f.size })),
      );

      await Promise.all(
        targets.map((t, i) =>
          fetch(t.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': fileArr[i].type || 'image/jpeg' },
            body: fileArr[i],
          }).then((res) => {
            if (!res.ok) throw new Error('업로드 실패');
          }),
        ),
      );

      for (const t of targets) {
        editor.chain().focus().setImage({ src: t.fileUrl, alt: t.originalName }).run();
      }
    } catch {
      toast.error('이미지 업로드에 실패했어요');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onAddLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('링크 URL', prev ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    // javascript: 등 위험 스킴 차단 (http/https/mailto만 허용)
    if (!/^(https?:\/\/|mailto:)/i.test(url)) {
      window.alert('http(s):// 또는 mailto: 링크만 사용할 수 있어요');
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="rounded-lg border border-input">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-input p-1">
        {/* 문단/제목 */}
        <ToolbarButton label="문단" active={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()}>
          <Type className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="제목1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="제목2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="제목3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        {/* 인라인 서식 */}
        <ToolbarButton label="굵게" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="기울임" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="취소선" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        {/* 블록 */}
        <ToolbarButton label="글머리 목록" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="번호 목록" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="인용" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="코드 블록" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="구분선" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        {/* 미디어 */}
        <ToolbarButton label="이미지 첨부" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        </ToolbarButton>
        <ToolbarButton label="링크" active={editor.isActive('link')} onClick={onAddLink}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onPickImage(e.target.files)}
        />

        {/* 실행취소/재실행 (우측 정렬) */}
        <div className="ml-auto flex items-center gap-0.5">
          <ToolbarButton label="실행 취소" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
            <Undo2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="다시 실행" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
            <Redo2 className="h-4 w-4" />
          </ToolbarButton>
        </div>
      </div>
      <EditorContent
        editor={editor}
        className="tiptap-content min-h-[320px] px-3 py-2 [&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:outline-none"
      />
    </div>
  );
}

export type { Editor };
