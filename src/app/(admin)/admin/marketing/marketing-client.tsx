'use client';

import {useRef, useState} from 'react';
import {Info, Loader2, Sparkles, Wand2} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Skeleton} from '@/components/ui/skeleton';
import {Dialog, DialogContent, DialogTitle} from '@/components/ui/dialog';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {generateBlogDraft} from '@/lib/actions/marketing';
import {AppError} from '@/lib/errors';
import type {BlogContentDetail, BlogDraft, GenerateBlogInput} from '@/types/marketing';
import {PhotoPicker} from './components/photo-picker';
import {BlogDraftView} from './components/blog-draft-view';
import {BlogHistory} from './components/blog-history';
import {ToneProfileCard} from './components/tone-profile-card';

const KEYWORD_MAX = 200;
const SITUATION_MAX = 100;
const MEMO_MAX = 500;

/**
 * 마케팅 — 네이버 블로그 초안 AI(SPEC-AI-007 web).
 * 2-pane: 작성 폼(사진/키워드/상황/메모) → 결과 미리보기. 모바일은 세로 스택.
 * 결과: 섹션별·전체 복사, 인라인 편집. 하단에 생성된 초안 목록. 말투 설정은 헤더 버튼 → 모달.
 */
export function MarketingClient() {
  const [keyword, setKeyword] = useState('');
  const [situation, setSituation] = useState('');
  const [memo, setMemo] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<BlogDraft | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  // 블로그 말투 설정(모달)
  const [toneOpen, setToneOpen] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);

  async function run(input: GenerateBlogInput) {
    setGenerating(true);
    setDraft(null);
    // 모바일 세로 스택에서 결과로 스크롤
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'}));
    try {
      const res = await generateBlogDraft(input);
      setDraft(res.draft);
      setHistoryKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof AppError ? err.message : '초안 생성에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setGenerating(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = keyword.trim();
    if (!trimmed) {
      toast.error('검색 키워드를 입력해 주세요.');
      return;
    }
    run({
      keyword: trimmed,
      situation: situation.trim() || undefined,
      memo: memo.trim() || undefined,
      photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
    });
  }

  function openHistory(detail: BlogContentDetail) {
    setDraft(detail.draft);
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'}));
  }

  return (
    <div className="space-y-8 px-4 py-1 sm:px-6 sm:py-2">
      {/* 헤더 — 모바일: 세로 스택(버튼 아래로) / 데스크톱: 제목 좌·버튼 우 */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              <span className="text-brand">AI</span> 블로그 글쓰기
            </h1>
            <span
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white shadow-sm"
              style={{background: 'linear-gradient(135deg,var(--ai-grad-from),var(--ai-grad-to))'}}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Premium
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            사진과 키워드만 주면, 사장님 말투로 쓴{' '}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-0.5 font-medium text-brand underline decoration-dotted underline-offset-2 hover:opacity-80"
              >
                네이버 검색 최적화
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only">네이버 검색 최적화 설명 보기</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-md text-white"
                    style={{background: 'linear-gradient(135deg,var(--ai-grad-from),var(--ai-grad-to))'}}
                    aria-hidden="true"
                  >
                    <Sparkles className="h-3 w-3" />
                  </span>
                  <span className="text-sm font-semibold text-foreground">검색에 잘 노출되게, 이렇게 써드려요</span>
                </div>
                <ul className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                  <li>· 손님이 자주 검색하는 질문(가격·추천·관리법 등)을 소제목으로 만들어요</li>
                  <li>· 문단마다 궁금증을 바로 풀어줘서 끝까지 읽기 좋아요</li>
                  <li>· 여러 검색어에 걸리도록 다양한 질문을 골고루 담아요</li>
                  <li>· 꽃 이름·동네·가게 이름을 자연스럽게 넣어요 (억지 반복은 하지 않아요)</li>
                  <li>· 자주 묻는 질문(FAQ)과 해시태그까지 자동으로 붙여요</li>
                </ul>
                <p className="border-t border-border pt-2 text-[11px] text-muted-foreground">
                  네이버에 잘 뜨는 글의 패턴을 분석해 자동으로 적용해요.
                </p>
              </div>
            </PopoverContent>
          </Popover>{' '}
            블로그 초안을 만들어 드려요.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setToneOpen(true)}
          className="shrink-0 gap-1.5 self-start border-brand/40 bg-brand-muted text-brand hover:border-brand hover:bg-brand-muted hover:text-brand"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          블로그 말투 설정
        </Button>
      </header>

      {/* 2-pane: 작성 폼 ↔ 결과 미리보기 (모바일은 세로 스택) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* 작성 폼 */}
        <form onSubmit={onSubmit} className="space-y-5 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="space-y-5">
              {/* 작성 가이드 */}
              <p className="rounded-lg bg-brand-muted px-3 py-2 text-xs leading-relaxed text-brand">
                입력이 구체적일수록 더 좋은 초안이 나와요. 아래 항목을 채워 보세요.
              </p>

              {/* 사진 */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-foreground">사진</span>
                <PhotoPicker selected={photoUrls} onChange={setPhotoUrls} />
                <p className="text-[11px] text-muted-foreground">
                  사진을 넣으면 색감·분위기를 읽어 더 생생하게 써드려요.
                </p>
              </div>

              {/* 키워드(필수) */}
              <div className="space-y-1.5">
                <label htmlFor="mkt-keyword" className="text-sm font-medium text-foreground">
                  검색 키워드 <span className="text-brand">*</span>
                </label>
                <Input
                  id="mkt-keyword"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value.slice(0, KEYWORD_MAX))}
                  placeholder="예) 어버이날 카네이션 꽃다발"
                  maxLength={KEYWORD_MAX}
                  required
                  aria-required="true"
                />
                <p className="text-[11px] text-muted-foreground">
                  손님이 네이버에 검색할 법한 문구를 적어주세요. 구체적일수록 노출이 잘 돼요.
                </p>
              </div>

              {/* 상황/시즌(선택) */}
              <div className="space-y-1.5">
                <label htmlFor="mkt-situation" className="text-sm font-medium text-foreground">
                  상황·시즌 <span className="text-muted-foreground">(선택)</span>
                </label>
                <Input
                  id="mkt-situation"
                  value={situation}
                  onChange={(e) => setSituation(e.target.value.slice(0, SITUATION_MAX))}
                  placeholder="예) 어버이날"
                  maxLength={SITUATION_MAX}
                />
                <p className="text-[11px] text-muted-foreground">
                  상황, 시즌 등을 적으면 그 맥락에 맞춰 써드려요.
                </p>
              </div>

              {/* 메모(선택) */}
              <div className="space-y-1.5">
                <label htmlFor="mkt-memo" className="text-sm font-medium text-foreground">
                  메모 <span className="text-muted-foreground">(선택)</span>
                </label>
                <Textarea
                  id="mkt-memo"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value.slice(0, MEMO_MAX))}
                  placeholder="강조하고 싶은 점이 있으면 적어주세요. 예) 24시간 무인 영업, 당일 배송 가능"
                  className="min-h-[80px] resize-y text-sm"
                  maxLength={MEMO_MAX}
                />
                <p className="text-[11px] text-muted-foreground">
                  강조할 점을 적으면 본문에 자연스럽게 녹여 드려요.
                </p>
              </div>

              <Button
                type="submit"
                variant="brand"
                className="w-full gap-1.5"
                disabled={generating || keyword.trim().length === 0}
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {generating ? '초안 작성 중…' : '초안 생성'}
              </Button>
            </div>
          </div>
        </form>

        {/* 결과 미리보기 */}
        <div ref={resultRef} className="min-w-0">
          {generating ? (
            <GeneratingSkeleton />
          ) : draft ? (
            <BlogDraftView draft={draft} onChange={setDraft} />
          ) : (
            <EmptyResult />
          )}
        </div>
      </div>

      {/* 생성된 초안 목록 */}
      <section aria-label="생성된 초안" className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">생성된 초안</h2>
        <BlogHistory refreshKey={historyKey} onOpen={openHistory} />
      </section>

      {/* 블로그 말투 설정 모달 */}
      <Dialog open={toneOpen} onOpenChange={setToneOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle className="sr-only">블로그 말투 설정</DialogTitle>
          <ToneProfileCard />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GeneratingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-brand">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>초안 작성 중…</span>
      </div>
      <div className="space-y-6 rounded-2xl border border-border bg-card p-5 sm:p-7">
        <Skeleton className="h-7 w-3/4" />
        <div className="space-y-3">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="flex flex-wrap gap-1.5 pt-2">
          {[16, 20, 14, 18].map((w, i) => (
            <Skeleton key={i} className="h-6 rounded-full" style={{width: `${w * 4}px`}} />
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyResult() {
  return (
    <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
      <span
        className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
        style={{background: 'linear-gradient(135deg,var(--ai-grad-from),var(--ai-grad-to))'}}
        aria-hidden="true"
      >
        <Wand2 className="h-5 w-5 text-white" />
      </span>
      <p className="text-sm font-medium text-foreground">키워드를 넣고 초안을 만들어 보세요</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
        제목·소제목·FAQ·해시태그까지 한 번에 뽑아드려요.
      </p>
    </div>
  );
}
