import {type ExportConfig, exportPeriodLabels} from '@/lib/export';
import {isUnsettledUnpaid} from '@/lib/utils';
import type {Sale} from '@/types/database';

/**
 * 매출 내보내기(Excel/PDF) 설정 빌더 — 컬럼은 매출 상세와 동일, 파일명/제목은 활성 기간 범위를 따른다.
 */
export function buildSalesExportConfig({
  sales,
  currentYear,
  currentMonth,
  currentDay,
  dateRange,
}: {
  sales: Sale[];
  currentYear: number;
  currentMonth: number;
  currentDay: number;
  dateRange: { startDate: string; endDate: string } | null;
}): ExportConfig<Sale> {
  const { fileSuffix, rangeLabel } = exportPeriodLabels(
    dateRange ? { range: dateRange } : { year: currentYear, month: currentMonth, day: currentDay },
  );
  return {
    filename: `매출${fileSuffix}`,
    title: `매출 내역 (${rangeLabel})`,
    columns: [
      { header: '날짜', accessor: (s) => String(s.date || '') },
      { header: '카테고리', accessor: (s) => s.category_label || '' },
      { header: '금액', accessor: (s) => Number(s.amount) || 0, format: 'currency' },
      { header: '결제방식', accessor: (s) => isUnsettledUnpaid(s) ? '미수' : (s.payment_method_label ?? '') },
      { header: '예약방식', accessor: (s) => s.channel_label || '' },
      { header: '고객명', accessor: (s) => String(s.customer_name || '') },
      { header: '연락처', accessor: (s) => String(s.customer_phone || '') },
      { header: '메모', accessor: (s) => String(s.memo || '') },
    ],
    data: sales,
  };
}
