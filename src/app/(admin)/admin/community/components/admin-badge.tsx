import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

/** 운영자 작성물에 표시하는 "관리자" 칩. */
export function AdminBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand',
        className,
      )}
    >
      <ShieldCheck className="h-3 w-3" aria-hidden="true" />
      관리자
    </span>
  )
}
