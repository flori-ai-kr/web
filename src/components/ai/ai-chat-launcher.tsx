'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {Flower2, Loader2, SendHorizonal} from 'lucide-react';
import {toast} from 'sonner';
import {Sheet, SheetContent, SheetHeader, SheetTitle} from '@/components/ui/sheet';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {sendChatMessage} from '@/lib/actions/ai';
import {AppError} from '@/lib/errors';

// 다른 컴포넌트(예: 브리핑 카드의 "물어보기" 입력)에서 채팅 드로어를 열기 위한 전역 이벤트.
// 컨텍스트 배선 없이 디커플링 — window 커스텀 이벤트로 prefill 메시지를 전달한다.
export const OPEN_CHAT_EVENT = 'flori-ai:open-chat';

/** 외부에서 채팅을 열고 싶을 때 호출(클라이언트). detail.prefill 이 있으면 입력창에 채운다. */
export function openAiChat(prefill?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT, {detail: {prefill}}));
}

interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

const GREETING: ChatTurn = {
  role: 'assistant',
  text: '안녕하세요, 사장님! 매출·고객·예약에 대해 무엇이든 물어보세요. 예) "이번 달 매출 왜 떨어졌어?"',
};

export function AiChatLauncher() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([GREETING]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 외부 트리거(브리핑 카드 등)로 열기 + prefill.
  useEffect(() => {
    function onOpen(e: Event) {
      const prefill = (e as CustomEvent<{prefill?: string}>).detail?.prefill;
      if (prefill) setInput(prefill);
      setOpen(true);
    }
    window.addEventListener(OPEN_CHAT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen);
  }, []);

  // 새 턴이 쌓이면 맨 아래로 스크롤.
  useEffect(() => {
    scrollRef.current?.scrollTo({top: scrollRef.current.scrollHeight, behavior: 'smooth'});
  }, [turns, loading]);

  const send = useCallback(async () => {
    const message = input.trim();
    if (!message || loading) return;
    setInput('');
    setTurns((prev) => [...prev, {role: 'user', text: message}]);
    setLoading(true);
    try {
      const res = await sendChatMessage({message, sessionToken: sessionId});
      setSessionId(res.sessionToken);
      setTurns((prev) => [...prev, {role: 'assistant', text: res.reply}]);
    } catch (err) {
      const msg = err instanceof AppError ? err.message : '답변을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.';
      toast.error(msg);
      setTurns((prev) => [...prev, {role: 'assistant', text: msg}]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, sessionId]);

  // 채팅 UX: Enter 전송 / Shift+Enter 줄바꿈 (폼 제출이 아니라 명시적 전송 핸들러).
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <>
      {/* 플로팅 진입 버튼 — 하단 네비 위, 전역 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="flori AI 열기"
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95 md:bottom-6 md:right-6"
        style={{background: 'linear-gradient(135deg,var(--ai-grad-from),var(--ai-grad-to))'}}
      >
        <Flower2 className="h-6 w-6" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="flex-row items-center gap-2.5 border-b border-border px-4 py-3">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] shadow-sm"
              style={{background: 'linear-gradient(135deg,var(--ai-grad-from),var(--ai-grad-to))'}}
              aria-hidden="true"
            >
              <Flower2 className="h-[18px] w-[18px] text-white" />
            </span>
            <SheetTitle className="text-[15px] font-bold tracking-tight">
              <span className="text-brand">flori AI</span> · 데이터 분석
            </SheetTitle>
          </SheetHeader>

          {/* 메시지 영역 */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {turns.map((t, i) => (
              <div key={i} className={t.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={
                    t.role === 'user'
                      ? 'max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand px-3.5 py-2.5 text-[13.5px] leading-relaxed text-brand-foreground'
                      : 'max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5 text-[13.5px] leading-relaxed text-foreground'
                  }
                >
                  {t.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5 text-[13.5px] text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  분석 중…
                </div>
              </div>
            )}
          </div>

          {/* 입력 영역 */}
          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-card px-3 py-2 focus-within:border-brand">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="이번 달 카드 수수료 얼마 나갔어?"
                rows={1}
                aria-label="AI에게 질문"
                className="max-h-32 min-h-[24px] resize-none border-0 bg-transparent p-0 text-[14px] shadow-none focus-visible:ring-0"
              />
              <Button
                type="button"
                variant="brand"
                size="icon-sm"
                onClick={() => void send()}
                disabled={loading || !input.trim()}
                aria-label="전송"
                className="shrink-0 rounded-full"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
              AI 응답은 참고용이에요. 중요한 수치는 다시 확인해 주세요.
            </p>
          </div>

        </SheetContent>
      </Sheet>
    </>
  );
}
