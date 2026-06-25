export interface ExportColumn<T = Record<string, unknown>> {
  header: string;
  accessor: (row: T) => string | number;
  format?: 'currency' | 'date' | 'text';
}

export interface ExportConfig<T = Record<string, unknown>> {
  filename: string;
  title?: string;
  columns: ExportColumn<T>[];
  data: T[];
}

const padN = (n: number) => String(n).padStart(2, '0');

function todayKst(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}-${padN(kst.getUTCMonth() + 1)}-${padN(kst.getUTCDate())}`;
}

/** 내보내기 기간 입력 — 커스텀 범위 또는 년/월(+선택 일). */
export type ExportPeriodInput =
  | { range: { startDate: string; endDate: string } }
  | { year: number; month: number; day?: number };

/**
 * 활성 기간 → 파일명 접미사 + 제목 범위 라벨.
 * - 종료일은 오늘(KST)로 캡한다(이번 달/미래엔 데이터가 없으므로 260601~오늘 식으로 표기).
 * - 단일 일/전체도 처리. 예: '_260601~260625' / '_260625' / '_전체'.
 */
export function exportPeriodLabels(input: ExportPeriodInput | null): { fileSuffix: string; rangeLabel: string } {
  let start: string | null = null;
  let end: string | null = null;
  if (input && 'range' in input) {
    start = input.range.startDate;
    end = input.range.endDate;
  } else if (input && input.year > 0 && input.month > 0) {
    if (input.day && input.day > 0) {
      start = end = `${input.year}-${padN(input.month)}-${padN(input.day)}`;
    } else {
      start = `${input.year}-${padN(input.month)}-01`;
      const lastDay = new Date(Date.UTC(input.year, input.month, 0)).getUTCDate();
      end = `${input.year}-${padN(input.month)}-${padN(lastDay)}`;
    }
  }
  if (!start || !end) return { fileSuffix: '_전체', rangeLabel: '전체' };
  const today = todayKst();
  if (end > today) end = today; // 이번 달/미래 → 오늘로 캡
  if (end < start) return { fileSuffix: '_전체', rangeLabel: '전체' }; // 시작이 미래 등 비정상 범위
  const ymd = (d: string) => d.slice(2).replace(/-/g, ''); // 2026-06-01 → 260601
  const dot = (d: string) => d.replace(/-/g, '.'); // 2026.06.01
  if (start === end) return { fileSuffix: `_${ymd(start)}`, rangeLabel: dot(start) };
  return { fileSuffix: `_${ymd(start)}~${ymd(end)}`, rangeLabel: `${dot(start)} ~ ${dot(end)}` };
}

function formatCellValue(value: string | number, format?: string): string {
  if (value === null || value === undefined) return '';
  if (format === 'currency' && typeof value === 'number') {
    return new Intl.NumberFormat('ko-KR').format(value);
  }
  return String(value);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportToCSV<T>(config: ExportConfig<T>): void {
  const BOM = '\uFEFF';
  const headers = config.columns.map(c => escapeCSVField(c.header));

  const rows = config.data.map(row =>
    config.columns.map(col => {
      const val = col.accessor(row);
      const formatted = formatCellValue(val, col.format);
      return escapeCSVField(formatted);
    })
  );

  const csvContent = BOM + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, `${config.filename}.csv`);
}

export async function exportToExcel<T>(config: ExportConfig<T>): Promise<void> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(config.title || 'Sheet1');

  // 헤더 행 — 브랜드 로즈(#A85475) 배경 + 흰 글자(WCAG AA 5.01:1)
  const headerRow = sheet.addRow(config.columns.map(c => c.header));
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFA85475' },
    };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFF0E6EC' } },
    };
  });
  headerRow.height = 28;

  // 데이터 행 — 화이트(헤더만 컬러). 통화 컬럼만 우측정렬 + 천단위.
  config.data.forEach((row) => {
    const values = config.columns.map(col => {
      const val = col.accessor(row);
      if (col.format === 'currency' && typeof val === 'number') return val;
      return formatCellValue(val, col.format);
    });

    const dataRow = sheet.addRow(values);

    config.columns.forEach((col, colIdx) => {
      if (col.format === 'currency') {
        const cell = dataRow.getCell(colIdx + 1);
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'right' };
      }
    });
  });

  // 열 너비 자동 조정
  sheet.columns.forEach((column, idx) => {
    const header = config.columns[idx]?.header || '';
    let maxLen = header.length * 2;
    config.data.forEach(row => {
      const val = config.columns[idx]?.accessor(row);
      const str = formatCellValue(val as string | number, config.columns[idx]?.format);
      maxLen = Math.max(maxLen, str.length * 1.2);
    });
    column.width = Math.max(Math.min(maxLen + 4, 40), 10);
  });

  // 자동 필터
  if (config.data.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: config.columns.length },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerDownload(blob, `${config.filename}.xlsx`);
}

export async function exportToPDF<T>(config: ExportConfig<T>): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const { font: nanumGothicBase64 } = await import('@/lib/fonts/nanumgothic-normal');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // 한글 폰트 등록
  doc.addFileToVFS('NanumGothic-Regular.ttf', nanumGothicBase64);
  doc.addFont('NanumGothic-Regular.ttf', 'NanumGothic', 'normal');
  doc.setFont('NanumGothic');

  // 제목 — ink(#1C2024)
  doc.setFontSize(16);
  doc.setTextColor(28, 32, 36);
  doc.text(config.title || config.filename, 14, 15);

  // 내보내기 일시 — sage(#8A929E)
  doc.setFontSize(9);
  doc.setTextColor(138, 146, 158);
  doc.text(`내보내기 일시: ${new Date().toLocaleString('ko-KR')}`, 14, 22);
  doc.setTextColor(28, 32, 36);

  const head = [config.columns.map(c => c.header)];
  const body = config.data.map(row =>
    config.columns.map(col => formatCellValue(col.accessor(row), col.format))
  );

  autoTable(doc, {
    head,
    body,
    startY: 28,
    styles: {
      font: 'NanumGothic',
      fontStyle: 'normal',
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [168, 84, 117], // 브랜드 로즈 #A85475 (헤더만 컬러, 데이터행은 화이트)
      textColor: 255,
      fontStyle: 'normal',
    },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${config.filename}.pdf`);
}
