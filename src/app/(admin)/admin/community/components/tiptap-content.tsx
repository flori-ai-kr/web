'use client';

import {EditorContent, useEditor} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import {useEffect} from 'react';

/** 게시글 본문(Tiptap JSON) 읽기 전용 렌더러. */
export function TiptapContent({ content }: { content: unknown }) {
  const editor = useEditor({
    editable: false,
    immediatelyRender: false,
    extensions: [
      // StarterKit 번들 link 를 끄고 커스텀 Link 로 교체(중복 등록 경고 방지 + 보안 설정 적용).
      StarterKit.configure({ link: false }),
      Image.configure({ HTMLAttributes: { class: 'rounded-lg my-2 max-w-full' } }),
      Link.configure({
        openOnClick: true,
        protocols: ['http', 'https', 'mailto'],
        validate: (href) => /^(https?:\/\/|mailto:)/i.test(href),
        HTMLAttributes: { class: 'text-brand underline', rel: 'noopener noreferrer nofollow' },
      }),
    ],
    content: (content as object) ?? '',
  });

  // content가 바뀌면 갱신 (상세 → 다른 글 이동 등)
  useEffect(() => {
    if (editor && content != null) editor.commands.setContent(content as object);
  }, [editor, content]);

  if (!editor) return null;
  return <EditorContent editor={editor} className="tiptap-content" />;
}
