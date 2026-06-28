/** D-day 숫자 → 마감 배지 라벨 + 긴급도 색. 지원사업 카드·상세 모달이 공유. */
export function ddayMeta(dDay: number | null): {label: string; cls: string} {
  if (dDay == null) return {label: '상시', cls: 'bg-[#eef1f5] text-muted-foreground'};
  if (dDay < 0) return {label: '마감', cls: 'bg-[#eef1f5] text-muted-foreground'};
  if (dDay === 0) return {label: '마감 D-DAY', cls: 'bg-danger-soft text-danger'};
  if (dDay <= 7) return {label: `마감 D-${dDay}`, cls: 'bg-danger-soft text-danger'};
  if (dDay <= 14) return {label: `마감 D-${dDay}`, cls: 'bg-[#fdf4e3] text-[#b07d18]'};
  return {label: `마감 D-${dDay}`, cls: 'bg-[#eef1f5] text-muted-foreground'};
}
