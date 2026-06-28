'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { MARKETING_CONSENT_URL, PRIVACY_POLICY_URL, TERMS_URL } from '@/lib/constants'

/** 가입 동의 값 — 필수 2(이용약관·개인정보) + 선택 1(마케팅). */
export interface ConsentValue {
  terms: boolean
  privacy: boolean
  marketing: boolean
}

const ITEMS: { key: keyof ConsentValue; required: boolean; label: string; href: string }[] = [
  { key: 'terms', required: true, label: '이용약관 동의', href: TERMS_URL },
  { key: 'privacy', required: true, label: '개인정보 수집·이용 동의', href: PRIVACY_POLICY_URL },
  { key: 'marketing', required: false, label: '마케팅·혜택 정보 수신 동의', href: MARKETING_CONSENT_URL },
]

/**
 * 온보딩 가입 동의 블록(controlled). 전체동의 ↔ 개별 항목 양방향 연동.
 * 라벨은 htmlFor로 체크박스에 연관(sibling) — 클릭 영역 확보 + 이중 토글 방지.
 * "보기"는 admin 내부 정책 페이지(/policy/*)를 새 탭으로 연다(입력값은 sessionStorage로 보존).
 */
export function ConsentAgreements({
  value,
  onChange,
  disabled,
}: {
  value: ConsentValue
  onChange: (next: ConsentValue) => void
  disabled?: boolean
}) {
  const allChecked = value.terms && value.privacy && value.marketing
  const toggleAll = () => {
    const next = !allChecked
    onChange({ terms: next, privacy: next, marketing: next })
  }
  const toggle = (key: keyof ConsentValue) => onChange({ ...value, [key]: !value[key] })

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* 전체 동의 */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <Checkbox
          id="consent-all"
          checked={allChecked}
          onCheckedChange={toggleAll}
          disabled={disabled}
        />
        <label htmlFor="consent-all" className="cursor-pointer text-[15px] font-semibold text-foreground">
          약관 전체 동의
        </label>
      </div>

      <div className="mx-4 border-t border-border" />

      {/* 개별 항목 */}
      <div className="px-4 py-1.5">
        {ITEMS.map((item) => (
          <div key={item.key} className="flex items-center gap-3 py-2.5">
            <Checkbox
              id={`consent-${item.key}`}
              checked={value[item.key]}
              onCheckedChange={() => toggle(item.key)}
              disabled={disabled}
            />
            <label
              htmlFor={`consent-${item.key}`}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
            >
              <span
                className={cn(
                  'shrink-0 text-xs font-bold',
                  item.required ? 'text-brand' : 'text-muted-foreground',
                )}
              >
                {item.required ? '필수' : '선택'}
              </span>
              <span className="truncate text-sm text-foreground">{item.label}</span>
            </label>
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${item.label} 보기 (새 탭)`}
              className="shrink-0 rounded-sm text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              보기
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
