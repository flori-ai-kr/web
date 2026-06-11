interface StatSectionHeaderProps {
  title: string;
  meta?: string;
}

export function StatSectionHeader({ title, meta }: StatSectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <h2 className="text-[13px] font-semibold text-foreground whitespace-nowrap">{title}</h2>
      <div className="h-px flex-1 bg-border" />
      {meta && (
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">{meta}</span>
      )}
    </div>
  );
}
