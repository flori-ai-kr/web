'use client';

import { Check, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface CategoryOption {
  value: string;
  label: string;
  color: string;
}

interface CategoryMultiSelectProps {
  options: CategoryOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  align?: 'start' | 'center' | 'end';
}

export function CategoryMultiSelect({
  options,
  selected,
  onChange,
  placeholder = '카테고리',
  className,
  triggerClassName,
  align = 'start',
}: CategoryMultiSelectProps) {
  const allSelected = selected.length === 0;

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const clear = () => onChange([]);

  const selectedOptions = options.filter(o => selected.includes(o.value));
  const visibleChips = selectedOptions.slice(0, 2);
  const overflowCount = selectedOptions.length - visibleChips.length;

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          'inline-flex items-center gap-1.5 h-9 px-3 rounded-md border bg-background text-sm whitespace-nowrap hover:bg-accent transition-colors',
          'min-w-[140px]',
          triggerClassName,
        )}
        aria-label={`${placeholder} 다중 선택`}
      >
        <span className="text-muted-foreground text-xs">{placeholder}</span>
        {allSelected ? (
          <span>전체</span>
        ) : (
          <span className="flex items-center gap-1">
            {visibleChips.map(opt => (
              <span
                key={opt.value}
                className="px-1.5 py-0.5 text-xs font-medium rounded"
                style={{ backgroundColor: `${opt.color}40`, color: opt.color }}
              >
                {opt.label}
              </span>
            ))}
            {overflowCount > 0 && (
              <span className="text-xs text-muted-foreground">+{overflowCount}</span>
            )}
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-auto" />
      </PopoverTrigger>
      <PopoverContent align={align} className={cn('w-56 p-1', className)}>
        <button
          type="button"
          onClick={clear}
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors',
            allSelected && 'bg-accent/60',
          )}
        >
          <span className="w-4 h-4 flex items-center justify-center">
            {allSelected && <Check className="w-3.5 h-3.5" />}
          </span>
          <span>전체</span>
        </button>
        <div className="h-px my-1 bg-border" />
        <div className="max-h-64 overflow-y-auto">
          {options.map(opt => {
            const checked = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors"
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  {checked && <Check className="w-3.5 h-3.5" />}
                </span>
                <span
                  className="px-1.5 py-0.5 text-xs font-medium rounded"
                  style={{ backgroundColor: `${opt.color}40`, color: opt.color }}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
