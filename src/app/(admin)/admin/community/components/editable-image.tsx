'use client';

import {NodeViewWrapper, type NodeViewProps} from '@tiptap/react';
import {X} from 'lucide-react';

/**
 * 에디터 전용 이미지 NodeView — 이미지 위에 삭제(X) 버튼을 띄운다.
 * 읽기 전용 렌더러(TiptapContent)는 이 NodeView 를 쓰지 않으므로 영향 없음.
 */
export function EditableImage({ node, deleteNode, editor }: NodeViewProps) {
  const src = node.attrs.src as string;
  const alt = (node.attrs.alt as string) ?? '';

  return (
    <NodeViewWrapper className="relative my-2 w-fit">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="block rounded-lg max-w-full" />
      {editor.isEditable && (
        <button
          type="button"
          contentEditable={false}
          onClick={() => deleteNode()}
          aria-label="이미지 삭제"
          className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </NodeViewWrapper>
  );
}
