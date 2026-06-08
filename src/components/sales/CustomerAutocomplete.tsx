'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { searchCustomersByName } from '@/lib/actions/customers';
import { cn, formatPhoneNumber } from '@/lib/utils';
import { User, Loader2 } from 'lucide-react';

interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  grade: string | null;
}

interface CustomerAutocompleteProps {
  value: string;
  onChange: (name: string, customerId: string | null, phone: string | null) => void;
  placeholder?: string;
  className?: string;
}

const gradeLabels: Record<string, { label: string; icon: string }> = {
  new: { label: '신규', icon: '' },
  regular: { label: '단골', icon: '🌟' },
  vip: { label: 'VIP', icon: '👑' },
  blacklist: { label: '블랙', icon: '⚠️' },
};

export function CustomerAutocomplete({
  value,
  onChange,
  placeholder = '고객명 입력',
  className
}: CustomerAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [options, setOptions] = useState<CustomerOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // 외부 value prop 변경 시 내부 상태 동기화
  useEffect(() => {
    setInputValue(value);
    if (!value) setSelectedId(null);
  }, [value]);

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

  // 검색 디바운스
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!inputValue || inputValue.length < 1) {
      setOptions([]);
      setIsOpen(false);
      return;
    }

    // 이미 선택된 상태면 검색 안함
    if (selectedId) return;

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchCustomersByName(inputValue);
        setOptions(results);
        setIsOpen(results.length > 0 || inputValue.length > 0);
      } catch (error) {
        console.error('Customer search failed:', error);
        setOptions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, selectedId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedId(null);
    onChange(newValue, null, null);
  };

  const handleSelect = (customer: CustomerOption) => {
    setInputValue(customer.name);
    setSelectedId(customer.id);
    setIsOpen(false);
    onChange(customer.name, customer.id, formatPhoneNumber(customer.phone));
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => inputValue && !selectedId && setIsOpen(true)}
          placeholder={placeholder}
          className={cn('bg-muted', isLoading && 'pr-8', className)}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Hidden inputs for form submission */}
      <input type="hidden" name="customer_name" value={inputValue} />
      <input type="hidden" name="customer_id" value={selectedId || ''} />

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              검색 중...
            </div>
          ) : (
            <>
              {options.length === 0 && inputValue && (
                <div className="px-3 py-2 text-sm text-muted-foreground">일치하는 고객이 없습니다</div>
              )}
              {options.map((customer) => {
                const grade = gradeLabels[customer.grade ?? ''] || gradeLabels.new;
                return (
                  <button
                    key={customer.id}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2 border-b border-border last:border-0"
                    onClick={() => handleSelect(customer)}
                  >
                    <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground">{customer.name}</span>
                        {grade.icon && <span className="text-xs">{grade.icon}</span>}
                      </div>
                      <span className="text-xs text-muted-foreground">{customer.phone}</span>
                    </div>
                  </button>
                );
              })}

            </>
          )}
        </div>
      )}
    </div>
  );
}
