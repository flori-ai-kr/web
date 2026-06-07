'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SuggestionInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
  maxLength?: number;
  name?: string;
  required?: boolean;
  multiline?: boolean;
  'aria-label'?: string;
}

export function SuggestionInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
  maxLength,
  name,
  required,
  multiline,
  'aria-label': ariaLabel,
}: SuggestionInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 감지
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    if (!value.trim()) return suggestions.slice(0, 10);
    const query = value.toLowerCase();
    return suggestions.filter(s => s.toLowerCase().includes(query)).slice(0, 10);
  }, [value, suggestions]);

  const handleSelect = (item: string) => {
    onChange(maxLength ? item.slice(0, maxLength) : item);
    setIsOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = maxLength ? e.target.value.slice(0, maxLength) : e.target.value;
    onChange(newValue);
    setIsOpen(true);
  };

  const showDropdown = isOpen && filtered.length > 0 && !(filtered.length === 1 && filtered[0] === value);

  return (
    <div ref={wrapperRef} className="relative">
      {multiline ? (
        <textarea
          value={value}
          onChange={handleChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base md:text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring field-sizing-content min-h-[60px] max-h-[160px] overflow-y-auto',
            className
          )}
          autoComplete="off"
          maxLength={maxLength}
          name={name}
          required={required}
          aria-label={ariaLabel}
        />
      ) : (
        <Input
          value={value}
          onChange={handleChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={className}
          autoComplete="off"
          maxLength={maxLength}
          name={name}
          required={required}
          aria-label={ariaLabel}
        />
      )}

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-auto">
          {filtered.map((item) => (
            <button
              key={item}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted border-b border-border last:border-0 truncate"
              onClick={() => handleSelect(item)}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
