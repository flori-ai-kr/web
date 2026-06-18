'use client';

import {useState} from 'react';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Check, ChevronDown} from 'lucide-react';

// 매출 페이지(SalesFilters)의 FilterDropdown 과 동일한 트리거+팝오버 스타일의 단일 선택 드롭다운.
export function FilterSelect({
  label,
  value,
  options,
  defaultValue,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  defaultValue: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const displayLabel = options.find(o => o.value === value)?.label ?? value;
  const isCustom = value !== defaultValue;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="inline-flex shrink-0 items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-background text-xs whitespace-nowrap hover:bg-muted transition-colors"
        >
          <span className="text-muted-foreground">{label}</span>
          <span className={`font-medium ${isCustom ? 'text-brand' : 'text-foreground'}`}>
            {displayLabel}
          </span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-44 p-1">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => { onChange(opt.value); setOpen(false); }}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs hover:bg-muted transition-colors"
          >
            <span className={`w-3.5 h-3.5 flex items-center justify-center ${value === opt.value ? 'text-brand' : 'text-transparent'}`}>
              <Check className="w-3 h-3" />
            </span>
            {opt.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
