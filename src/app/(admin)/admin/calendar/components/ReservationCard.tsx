import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {BellRing, ExternalLink, Image as ImageIcon, Pencil, Trash2} from 'lucide-react';
import {format} from 'date-fns';
import {cn} from '@/lib/utils';
import type {SaleCategory} from '@/lib/actions/sale-settings';
import type {CalendarReservation} from '../types';

function formatCurrency(amount: number): string {
  if (!amount) return '';
  return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

/**
 * 선택한 날짜 패널의 '예약' 탭 카드 1건. 표시 + 제작/픽업 토글·사진·수정·삭제 버튼.
 * 상태는 보유하지 않고 모든 변경은 콜백으로 부모(CalendarClient)에 위임한다.
 */
export function ReservationCard({
  r,
  siblingReservations,
  saleIdsWithPhotos,
  saleCategories,
  onCustomerClick,
  onSaleClick,
  onPhotoClick,
  onEdit,
  onDelete,
  onToggleCompletion,
  onTogglePickup,
}: {
  r: CalendarReservation;
  siblingReservations: Map<string, CalendarReservation[]>;
  saleIdsWithPhotos: Set<string>;
  saleCategories: SaleCategory[];
  onCustomerClick: (customerId: string) => void;
  onSaleClick: (saleId: string) => void;
  onPhotoClick: (saleId: string, defaultTitle: string) => void;
  onEdit: (r: CalendarReservation) => void;
  onDelete: (r: CalendarReservation) => void;
  onToggleCompletion: (r: CalendarReservation) => void;
  onTogglePickup: (r: CalendarReservation) => void;
}) {
  return (
    <Card className="group">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {r.time && (
                <span className="text-xs text-muted-foreground">{r.time.slice(0, 5)}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <p className={cn('text-sm font-medium truncate', r.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground')}>{r.title}</p>
              {r.sale_is_unpaid && r.sale_payment_method === 'unpaid' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 bg-destructive/10 text-destructive">
                  미수
                </span>
              )}
            </div>
            {r.customer_name && (
              <div className="flex items-center gap-1.5 mt-0.5">
                {r.customer_id ? (
                  <button
                    type="button"
                    className="text-xs text-brand hover:text-brand/80 flex items-center gap-0.5 transition-colors whitespace-nowrap"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCustomerClick(r.customer_id!);
                    }}
                    aria-label={`${r.customer_name} 고객 상세 보기`}
                  >
                    {r.customer_name}
                    {r.customer_phone && ` · ${r.customer_phone}`}
                    <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {r.customer_name}
                    {r.customer_phone && ` · ${r.customer_phone}`}
                  </span>
                )}
                {r.purchase_count != null && r.purchase_count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium shrink-0">
                    {r.purchase_count}번 방문
                  </span>
                )}
              </div>
            )}
            {r.amount > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(r.amount)}</p>
            )}
            {r.memo && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.memo}</p>
            )}
            {r.reminder_at && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <BellRing className="w-3 h-3" />
                {format(new Date(r.reminder_at), 'yyyy-MM-dd HH:mm')} 알림
              </p>
            )}

            {/* 매출 확인 링크 */}
            {r.sale_id && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  className="text-xs text-brand hover:text-brand/80 flex items-center gap-1 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSaleClick(r.sale_id!);
                  }}
                  aria-label="연결된 매출 확인"
                >
                  매출 확인 <ExternalLink className="w-3 h-3" />
                </button>
                {r.sale_date && (
                  <span className="text-[10px] text-muted-foreground">
                    결제 {format(new Date(r.sale_date), 'yy.MM.dd')}
                  </span>
                )}
              </div>
            )}

            {/* 같은 매출의 다른 픽업 날짜 */}
            {r.sale_id && (siblingReservations.get(r.sale_id) || []).length > 1 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                <span className="text-[10px] text-muted-foreground font-medium">다른 픽업:</span>
                {(siblingReservations.get(r.sale_id) || [])
                  .filter(s => s.id !== r.id)
                  .map(s => (
                    <span
                      key={s.id}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                    >
                      {s.date} {s.time?.slice(0, 5) || ''}
                    </span>
                  ))}
              </div>
            )}

          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {/* 사진/수정/삭제 (가로, 위) */}
            <div className="flex gap-0.5">
              {(() => {
                const hasPhoto = !!r.sale_id && saleIdsWithPhotos.has(r.sale_id);
                return (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className={hasPhoto ? 'text-brand hover:text-brand/80' : 'text-muted-foreground hover:text-foreground'}
                    onClick={() => {
                      const catLabel = r.product_category
                        ? saleCategories.find(c => c.value === r.product_category)?.label || r.product_category
                        : r.title;
                      const dateStr = format(new Date(r.date), 'yy/MM/dd');
                      onPhotoClick(r.sale_id ?? '', `${dateStr} ${catLabel}`);
                    }}
                    aria-label={hasPhoto ? '사진 수정' : '사진 등록'}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                  </Button>
                );
              })()}
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground" onClick={() => onEdit(r)} aria-label="수정">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-danger" onClick={() => onDelete(r)} aria-label="삭제">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            {/* 제작/픽업 (일반 버튼, 아래) */}
            <div className="flex gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleCompletion(r); }}
                disabled={r.status === 'completed'}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-md border font-medium transition-colors shrink-0',
                  r.status !== 'pending' ? 'bg-brand text-brand-foreground border-brand' : 'border-input text-muted-foreground hover:bg-muted',
                  r.status === 'completed' && 'opacity-60 cursor-not-allowed'
                )}
                aria-label={r.status !== 'pending' ? '제작 완료 취소' : '제작 완료로 변경'}
              >
                제작
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onTogglePickup(r); }}
                disabled={r.status === 'pending'}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-md border font-medium transition-colors shrink-0',
                  r.status === 'completed' ? 'bg-success text-success-foreground border-success' : 'border-input text-muted-foreground hover:bg-muted',
                  r.status === 'pending' && 'opacity-40 cursor-not-allowed'
                )}
                aria-label={r.status === 'completed' ? '픽업 완료 취소' : '픽업 완료로 변경'}
              >
                픽업
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
