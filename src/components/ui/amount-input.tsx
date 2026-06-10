'use client';

import * as React from 'react';
import { Input } from './input';
import { formatAmountInput, parseAmountInput } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface AmountInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  name: string;
  value?: number;
  onChange?: (value: number) => void;
  className?: string;
}

/** 숫자 문자열에 천 단위 콤마 삽입(앞자리 0 보존 — 편집 중 중간 상태 허용). */
function groupDigits(digits: string): string {
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 포맷 문자열에서 'n번째 숫자 뒤'의 문자열 인덱스(커서 복원용). */
function caretForDigit(formatted: string, digitIndex: number): number {
  if (digitIndex <= 0) return 0;
  let count = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (formatted[i] >= '0' && formatted[i] <= '9') {
      count++;
      if (count === digitIndex) return i + 1;
    }
  }
  return formatted.length;
}

export function AmountInput({
  name,
  value,
  onChange,
  className,
  placeholder = '0',
  ...props
}: AmountInputProps) {
  const [displayValue, setDisplayValue] = React.useState(() =>
    value ? formatAmountInput(value) : ''
  );
  const inputRef = React.useRef<HTMLInputElement>(null);
  const caretRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (value !== undefined) {
      setDisplayValue(value ? formatAmountInput(value) : '');
    }
  }, [value]);

  // 재포맷 후 커서 위치 복원(천 단위 콤마로 인덱스가 밀리는 것 보정)
  React.useLayoutEffect(() => {
    if (caretRef.current !== null && inputRef.current) {
      const pos = caretForDigit(displayValue, caretRef.current);
      inputRef.current.setSelectionRange(pos, pos);
      caretRef.current = null;
    }
  }, [displayValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const caret = e.target.selectionStart ?? rawValue.length;
    // 커서 앞의 숫자 개수를 기억 → 재포맷 후 같은 숫자 위치로 복원
    caretRef.current = rawValue.slice(0, caret).replace(/[^0-9]/g, '').length;

    const digits = rawValue.replace(/[^0-9]/g, '');
    // 편집 중엔 앞자리 0 보존: "80,000"에서 8 지우면 "0,000" 유지 → 6 입력 시 "60,000"
    setDisplayValue(groupDigits(digits));
    onChange?.(digits ? parseInt(digits, 10) : 0);
  };

  // 포커스 아웃 시 숫자값 기준으로 정규화(앞자리 0 제거)
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const num = parseAmountInput(displayValue);
    setDisplayValue(num ? formatAmountInput(num) : '');
    props.onBlur?.(e);
  };

  return (
    <>
      <Input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(className)}
        {...props}
        onBlur={handleBlur}
      />
      <input type="hidden" name={name} value={parseAmountInput(displayValue)} />
    </>
  );
}
