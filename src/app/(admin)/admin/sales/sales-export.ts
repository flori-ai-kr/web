import type {ExportConfig} from '@/lib/export';
import {isUnsettledUnpaid} from '@/lib/utils';
import type {Sale} from '@/types/database';

/**
 * 매출 내보내기(Excel/PDF) 설정 빌더 — 파일명/제목은 현재 년/월/일 컨텍스트를 따른다. sales-client에서 이동.
 */
export function buildSalesExportConfig({
  sales,
  currentYear,
  currentMonth,
  currentDay,
}: {
  sales: Sale[];
  currentYear: number;
  currentMonth: number;
  currentDay: number;
}): ExportConfig<Sale> {
  const yearLabel = currentYear === 0 ? '전체' : `${currentYear}년`;
  const monthLabel = currentMonth === 0 ? '전체' : `${currentMonth}월`;
  const dayLabel = currentDay === 0 ? '' : ` ${currentDay}일`;
  const isAll = currentYear === 0 || currentMonth === 0;
  const monthSuffix = isAll ? '' : `_${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const daySuffix = currentDay === 0 ? '' : `-${String(currentDay).padStart(2, '0')}`;
  return {
    filename: isAll ? '매출_전체' : `매출${monthSuffix}${daySuffix}`,
    title: `매출 내역 (${yearLabel} ${monthLabel}${dayLabel})`,
    columns: [
      { header: '날짜', accessor: (s) => String(s.date || '') },
      { header: '카테고리', accessor: (s) => s.category_label || '' },
      { header: '금액', accessor: (s) => Number(s.amount) || 0, format: 'currency' },
      { header: '결제방법', accessor: (s) => isUnsettledUnpaid(s) ? '미수' : (s.payment_method_label ?? '') },
      { header: '채널', accessor: (s) => s.channel_label || '' },
      { header: '고객명', accessor: (s) => String(s.customer_name || '') },
      { header: '메모', accessor: (s) => String(s.memo || '') },
    ],
    data: sales,
  };
}
