import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AmountInput } from '../ui/amount-input'

describe('AmountInput', () => {
  it('초기 값을 천 단위로 포맷해 표시한다', () => {
    render(<AmountInput name="amount" value={1000000} />)
    expect(screen.getByRole('textbox')).toHaveValue('1,000,000')
  })

  it('value가 0이면 빈 문자열', () => {
    render(<AmountInput name="amount" value={0} />)
    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  it('입력 시 숫자만 추출해 onChange로 전달한다', () => {
    const onChange = vi.fn()
    render(<AmountInput name="amount" onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '50,00x0원' } })
    expect(onChange).toHaveBeenCalledWith(50000)
  })

  it('입력 후 표시값을 포맷한다', () => {
    render(<AmountInput name="amount" />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '123456' } })
    expect(input).toHaveValue('123,456')
  })

  it('hidden 필드에 파싱된 숫자를 둔다', () => {
    const { container } = render(<AmountInput name="amount" value={1500} />)
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement
    expect(hidden.name).toBe('amount')
    expect(hidden.value).toBe('1500')
  })
})
