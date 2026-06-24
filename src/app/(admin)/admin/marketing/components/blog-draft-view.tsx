'use client';

import {useEffect, useState} from 'react';
import {Check, Copy, FileText, Pencil} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import type {BlogDraft} from '@/types/marketing';

interface BlogDraftViewProps {
  draft: BlogDraft;
  /** 인라인 편집 결과를 부모에 반영(목록 캐시·재복사 일관성). */
  onChange?: (draft: BlogDraft) => void;
}

/** draft → 네이버에 붙여넣기 좋은 평문(제목·본문·FAQ·해시태그). */
function draftToPlainText(draft: BlogDraft): string {
  const parts: string[] = [draft.title, ''];
  for (const s of draft.sections) {
    parts.push(s.heading, s.body, '');
  }
  if (draft.faq.length > 0) {
    parts.push('자주 묻는 질문');
    for (const f of draft.faq) {
      parts.push(`Q. ${f.q}`, `A. ${f.a}`, '');
    }
  }
  if (draft.hashtags.length > 0) {
    parts.push(draft.hashtags.join(' '));
  }
  return parts.join('\n').trim();
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label}을(를) 복사했어요.`);
  } catch {
    toast.error('복사에 실패했어요. 직접 선택해 복사해 주세요.');
  }
}

function CopyButton({text, label, full}: {text: string; label: string; full?: boolean}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <Button
      type="button"
      variant={full ? 'brand' : 'ghost'}
      size="sm"
      className="gap-1.5"
      onClick={async () => {
        await copyText(text, label);
        setCopied(true);
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {full ? '전체 복사' : '복사'}
    </Button>
  );
}

export function BlogDraftView({draft, onChange}: BlogDraftViewProps) {
  const [editing, setEditing] = useState(false);
  // 편집 중 임시 상태 — 저장 시에만 부모로 commit.
  const [local, setLocal] = useState<BlogDraft>(draft);
  // draft prop이 바뀌면(재생성·목록에서 열기) 편집 임시상태를 새 draft로 리셋한다.
  // effect 대신 렌더 중 비교(React 권장 "조정 중 state 변경") — 추가 리렌더 없음.
  const [syncedFrom, setSyncedFrom] = useState(draft);
  if (syncedFrom !== draft) {
    setSyncedFrom(draft);
    setLocal(draft);
    setEditing(false);
  }

  const view = editing ? local : draft;

  function commit() {
    onChange?.(local);
    setEditing(false);
    toast.success('수정 내용을 반영했어요.');
  }

  function cancel() {
    setLocal(draft);
    setEditing(false);
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-5 sm:p-7">
      {/* 액션 (편집/복사) — 우측 상단. 결과 카드 상단을 작성 폼과 정렬 */}
      <div className="mb-4 flex flex-wrap items-center justify-end gap-1.5">
        {onChange &&
          (editing ? (
            <>
              <Button type="button" variant="ghost" size="sm" onClick={cancel}>
                취소
              </Button>
              <Button type="button" variant="brand" size="sm" className="gap-1.5" onClick={commit}>
                <Check className="h-4 w-4" />
                수정 완료
              </Button>
            </>
          ) : (
            <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
              편집
            </Button>
          ))}
        {!editing && <CopyButton text={draftToPlainText(draft)} label="전체 글" full />}
      </div>

      {/* 제목 */}
      <header className="group/title mb-6 border-b border-border pb-5">
          {editing ? (
            <Textarea
              value={local.title}
              onChange={(e) => setLocal((d) => ({...d, title: e.target.value}))}
              className="min-h-0 resize-none text-xl font-bold leading-snug"
              rows={2}
              aria-label="제목"
            />
          ) : (
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-xl font-bold leading-snug tracking-tight text-foreground sm:text-2xl">
                {view.title}
              </h1>
              <div className="opacity-0 transition-opacity group-hover/title:opacity-100 focus-within:opacity-100">
                <CopyButton text={view.title} label="제목" />
              </div>
            </div>
          )}
        </header>

        {/* 섹션 */}
        <div className="space-y-7">
          {view.sections.map((section, i) => (
            <section key={i} className="group/section">
              <div className="mb-2 flex items-start justify-between gap-3">
                {editing ? (
                  <input
                    value={local.sections[i]?.heading ?? ''}
                    onChange={(e) =>
                      setLocal((d) => ({
                        ...d,
                        sections: d.sections.map((s, idx) => (idx === i ? {...s, heading: e.target.value} : s)),
                      }))
                    }
                    className="w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-base font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    aria-label={`소제목 ${i + 1}`}
                  />
                ) : (
                  <>
                    <h2 className="text-base font-bold text-foreground sm:text-lg">{section.heading}</h2>
                    <div className="opacity-0 transition-opacity group-hover/section:opacity-100 focus-within:opacity-100">
                      <CopyButton text={`${section.heading}\n${section.body}`} label={`${i + 1}번째 단락`} />
                    </div>
                  </>
                )}
              </div>
              {editing ? (
                <Textarea
                  value={local.sections[i]?.body ?? ''}
                  onChange={(e) =>
                    setLocal((d) => ({
                      ...d,
                      sections: d.sections.map((s, idx) => (idx === i ? {...s, body: e.target.value} : s)),
                    }))
                  }
                  className="min-h-[120px] resize-y text-[15px] leading-[1.75]"
                  aria-label={`본문 ${i + 1}`}
                />
              ) : (
                <p className="whitespace-pre-wrap text-[15px] leading-[1.75] text-foreground/90">{section.body}</p>
              )}
            </section>
          ))}
        </div>

        {/* FAQ */}
        {view.faq.length > 0 && (
          <div className="mt-8 border-t border-border pt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground sm:text-lg">자주 묻는 질문</h2>
              {!editing && (
                <CopyButton
                  text={view.faq.map((f) => `Q. ${f.q}\nA. ${f.a}`).join('\n\n')}
                  label="자주 묻는 질문"
                />
              )}
            </div>
            <dl className="space-y-3">
              {view.faq.map((f, i) => (
                <div key={i} className="rounded-xl bg-muted/40 p-3.5">
                  {editing ? (
                    <div className="space-y-2">
                      <input
                        value={local.faq[i]?.q ?? ''}
                        onChange={(e) =>
                          setLocal((d) => ({
                            ...d,
                            faq: d.faq.map((x, idx) => (idx === i ? {...x, q: e.target.value} : x)),
                          }))
                        }
                        className="w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        aria-label={`질문 ${i + 1}`}
                      />
                      <Textarea
                        value={local.faq[i]?.a ?? ''}
                        onChange={(e) =>
                          setLocal((d) => ({
                            ...d,
                            faq: d.faq.map((x, idx) => (idx === i ? {...x, a: e.target.value} : x)),
                          }))
                        }
                        className="min-h-[64px] resize-y text-sm"
                        aria-label={`답변 ${i + 1}`}
                      />
                    </div>
                  ) : (
                    <>
                      <dt className="text-sm font-semibold text-foreground">Q. {f.q}</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                        A. {f.a}
                      </dd>
                    </>
                  )}
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* 해시태그 */}
        {view.hashtags.length > 0 && (
          <div className="mt-8 border-t border-border pt-6">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground">해시태그</h2>
              {!editing && <CopyButton text={view.hashtags.join(' ')} label="해시태그" />}
            </div>
            {editing ? (
              <Textarea
                value={local.hashtags.join(' ')}
                onChange={(e) =>
                  setLocal((d) => ({
                    ...d,
                    hashtags: e.target.value.split(/\s+/).filter(Boolean),
                  }))
                }
                className="min-h-0 resize-none text-sm"
                rows={2}
                aria-label="해시태그"
                placeholder="#어버이날꽃 #카네이션 #꽃다발"
              />
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {view.hashtags.map((tag, i) => (
                  <li
                    key={i}
                    className="rounded-full bg-brand-muted px-2.5 py-1 text-xs font-medium text-brand"
                  >
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* 안내 — 하단 */}
        <p className="mt-6 flex items-center gap-1.5 border-t border-border pt-4 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          필요한 부분을 복사해서 사용하세요.
        </p>
      </article>
  );
}
