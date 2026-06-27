import Link from 'next/link';
import {AlertTriangle} from 'lucide-react';

/**
 * IN_GRACE(결제 유예) 상단 경고 배너.
 * 결제에 실패했지만 아직 만료되지 않은 구독에 한해 AppLayout 콘텐츠 최상단에 노출된다.
 * 기능은 정상 사용 가능하며, 카드 교체를 유도한다(→ /admin/settings 구독·결제 카드).
 */
export function SubscriptionGraceBanner() {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-warning/30 bg-warning-soft px-4 py-2.5">
      <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
      <p className="flex-1 text-[12.5px] text-warning break-keep">
        <b className="font-semibold">결제에 실패했어요.</b>{' '}
        <span className="text-muted-foreground">
          카드를 확인해주세요. 매일 자동으로 재시도 중이에요.
        </span>
      </p>
      <Link
        href="/admin/settings"
        className="shrink-0 rounded-lg bg-warning px-3 py-1.5 text-[11.5px] font-semibold text-warning-foreground hover:opacity-90 transition-opacity"
      >
        카드 교체
      </Link>
    </div>
  );
}
