import {Button} from '@/components/ui/button';
import {Pencil, Trash2} from 'lucide-react';
import {format} from 'date-fns';
import {ko} from '@/lib/date-locale';
import type {CalendarEvent} from '@/types/database';

/**
 * 선택한 날짜 패널의 '일정' 탭 카드 1건. 표시 전용이며 수정/삭제는 콜백으로 위임.
 */
export function EventCard({
  event,
  onEdit,
  onDelete,
}: {
  event: CalendarEvent;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
}) {
  return (
    <div className="p-3 rounded-lg border border-border">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
            <p className="text-xs text-muted-foreground">
              {event.start_date === event.end_date
                ? format(new Date(event.start_date), 'M월 d일', { locale: ko })
                : `${format(new Date(event.start_date), 'M.d', { locale: ko })} - ${format(new Date(event.end_date), 'M.d', { locale: ko })}`
              }
            </p>
            {event.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{event.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground" onClick={() => onEdit(event)} aria-label="일정 수정">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-danger" onClick={() => onDelete(event)} aria-label="일정 삭제">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
