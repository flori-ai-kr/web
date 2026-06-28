import { describe, it, expect } from 'vitest'
import {
  validateImageFile,
  validateImageMeta,
  getFormString,
  getFormInt,
  recurringExpenseSchema,
  scheduleSchema,
  bottomNavItemsSchema,
  photoCardSchema,
  scrapMemoSchema,
  scrapToggleSchema,
} from '../validations'

// ─── 이미지 파일/메타 검증 ──────────────────────────────────

const makeFile = (name: string, type: string, size: number): File => {
  const file = new File(['x'], name, { type })
  // jsdom File.size는 내용 길이를 따르므로 size를 강제 지정한다
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('validateImageFile', () => {
  it('정상 이미지는 null(에러 없음)을 반환한다', () => {
    expect(validateImageFile(makeFile('photo.jpg', 'image/jpeg', 1024))).toBeNull()
  })

  it('5MB를 초과하면 크기 에러를 반환한다', () => {
    const msg = validateImageFile(makeFile('big.png', 'image/png', 6 * 1024 * 1024))
    expect(msg).toContain('5MB')
  })

  it('허용되지 않는 확장자는 형식 에러를 반환한다', () => {
    const msg = validateImageFile(makeFile('doc.gif', 'image/gif', 1024))
    expect(msg).toContain('허용되지 않는 파일 형식')
  })

  it('확장자가 없으면 형식 에러를 반환한다', () => {
    const msg = validateImageFile(makeFile('noext', 'image/jpeg', 1024))
    expect(msg).toContain('허용되지 않는 파일 형식')
  })

  it('확장자는 맞지만 MIME이 허용 목록 밖이면 MIME 에러를 반환한다', () => {
    const msg = validateImageFile(makeFile('photo.jpg', 'application/octet-stream', 1024))
    expect(msg).toContain('MIME')
  })

  it('대문자 확장자도 허용한다', () => {
    expect(validateImageFile(makeFile('PHOTO.JPG', 'image/jpeg', 1024))).toBeNull()
  })
})

describe('validateImageMeta', () => {
  it('정상 메타는 null을 반환한다', () => {
    expect(validateImageMeta({ name: 'a.webp', type: 'image/webp', size: 2048 })).toBeNull()
  })

  it('크기 초과 → 크기 에러', () => {
    expect(
      validateImageMeta({ name: 'a.webp', type: 'image/webp', size: 6 * 1024 * 1024 })
    ).toContain('5MB')
  })

  it('확장자 누락 → 형식 에러', () => {
    expect(validateImageMeta({ name: 'noext', type: 'image/webp', size: 1 })).toContain('형식')
  })

  it('MIME 누락 → MIME 에러', () => {
    expect(validateImageMeta({ name: 'a.png', type: '', size: 1 })).toContain('MIME')
  })
})

// ─── FormData 헬퍼 ──────────────────────────────────────────

describe('getFormString', () => {
  it('문자열 값을 그대로 반환한다', () => {
    const fd = new FormData()
    fd.set('name', '홍길동')
    expect(getFormString(fd, 'name')).toBe('홍길동')
  })

  it('키가 없으면 빈 문자열을 반환한다', () => {
    expect(getFormString(new FormData(), 'missing')).toBe('')
  })
})

describe('getFormInt', () => {
  it('숫자 문자열을 정수로 변환한다', () => {
    const fd = new FormData()
    fd.set('count', '42')
    expect(getFormInt(fd, 'count')).toBe(42)
  })

  it('빈 문자열·키 없음은 null', () => {
    const fd = new FormData()
    fd.set('empty', '')
    expect(getFormInt(fd, 'empty')).toBeNull()
    expect(getFormInt(fd, 'missing')).toBeNull()
  })

  it('숫자가 아니면 null', () => {
    const fd = new FormData()
    fd.set('bad', 'abc')
    expect(getFormInt(fd, 'bad')).toBeNull()
  })
})

// ─── 고정비(반복 지출) refine 분기 ──────────────────────────

const baseRecurring = {
  item_name: '장미 정기',
  category_id: '5',
  unit_price: 10000,
  quantity: 1,
  payment_method_id: '3',
  start_date: '2026-01-01',
}

describe('recurringExpenseSchema', () => {
  it('매주 반복은 요일을 1개 이상 요구한다', () => {
    expect(recurringExpenseSchema.safeParse({ ...baseRecurring, frequency: 'weekly', days_of_week: [] }).success).toBe(false)
    expect(recurringExpenseSchema.safeParse({ ...baseRecurring, frequency: 'weekly', days_of_week: [1] }).success).toBe(true)
  })

  it('매월 반복은 날짜를 1개 이상 요구한다', () => {
    expect(recurringExpenseSchema.safeParse({ ...baseRecurring, frequency: 'monthly', days_of_month: [] }).success).toBe(false)
    expect(recurringExpenseSchema.safeParse({ ...baseRecurring, frequency: 'monthly', days_of_month: [15] }).success).toBe(true)
  })

  it('매년 반복은 일자를 1개 이상 요구한다', () => {
    expect(recurringExpenseSchema.safeParse({ ...baseRecurring, frequency: 'yearly', yearly_dates: [] }).success).toBe(false)
    expect(recurringExpenseSchema.safeParse({ ...baseRecurring, frequency: 'yearly', yearly_dates: [{ m: 5, d: 1 }] }).success).toBe(true)
  })

  it('종료일이 시작일보다 빠르면 실패한다', () => {
    const r = recurringExpenseSchema.safeParse({
      ...baseRecurring, frequency: 'weekly', days_of_week: [1],
      end_date: '2025-12-31',
    })
    expect(r.success).toBe(false)
  })
})

// ─── 캘린더 이벤트 refine ────────────────────────────────────

describe('scheduleSchema', () => {
  it('종료일이 시작일 이후면 통과한다', () => {
    expect(scheduleSchema.safeParse({ title: '행사', start_date: '2026-01-01', end_date: '2026-01-03' }).success).toBe(true)
  })

  it('종료일이 시작일보다 이전이면 실패한다', () => {
    expect(scheduleSchema.safeParse({ title: '행사', start_date: '2026-01-03', end_date: '2026-01-01' }).success).toBe(false)
  })
})

// ─── 하단바 커스터마이즈 ─────────────────────────────────────

describe('bottomNavItemsSchema', () => {
  it('4~6개의 고유 메뉴를 허용한다', () => {
    expect(bottomNavItemsSchema.safeParse(['dashboard', 'calendar', 'sales', 'expenses']).success).toBe(true)
  })

  it('4개 미만은 실패한다', () => {
    expect(bottomNavItemsSchema.safeParse(['dashboard', 'calendar', 'sales']).success).toBe(false)
  })

  it('6개 초과는 실패한다', () => {
    expect(bottomNavItemsSchema.safeParse(['dashboard', 'calendar', 'sales', 'expenses', 'customers', 'gallery', 'community']).success).toBe(false)
  })

  it('중복된 메뉴는 실패한다', () => {
    expect(bottomNavItemsSchema.safeParse(['dashboard', 'dashboard', 'sales', 'expenses']).success).toBe(false)
  })
})

// ─── 사진 카드 ───────────────────────────────────────────────

describe('photoCardSchema', () => {
  it('제목과 유효한 사진 URL을 허용한다', () => {
    const r = photoCardSchema.safeParse({
      title: '봄 부케',
      photos: [{ url: 'https://cdn.example.com/a.jpg', originalName: 'a.jpg' }],
    })
    expect(r.success).toBe(true)
  })

  it('사진이 10장을 초과하면 실패한다', () => {
    const photos = Array.from({ length: 11 }, (_, i) => ({ url: `https://cdn.example.com/${i}.jpg`, originalName: `${i}.jpg` }))
    expect(photoCardSchema.safeParse({ title: 't', photos }).success).toBe(false)
  })

  it('잘못된 URL은 실패한다', () => {
    expect(photoCardSchema.safeParse({ title: 't', photos: [{ url: 'not-a-url', originalName: 'a.jpg' }] }).success).toBe(false)
  })
})

// ─── 스크랩 ──────────────────────────────────────────────────

describe('scrap schemas', () => {
  it('scrapToggleSchema는 target_type/target_id를 검증한다', () => {
    expect(scrapToggleSchema.safeParse({ target_type: 'grant', target_id: '12' }).success).toBe(true)
    expect(scrapToggleSchema.safeParse({ target_type: 'trend', target_id: '12' }).success).toBe(false)
    expect(scrapToggleSchema.safeParse({ target_type: 'post', target_id: '12' }).success).toBe(false)
    expect(scrapToggleSchema.safeParse({ target_type: 'invalid', target_id: '12' }).success).toBe(false)
  })

  it('scrapMemoSchema는 1000자 초과 메모를 거부한다', () => {
    expect(scrapMemoSchema.safeParse({ target_type: 'grant', target_id: '1', memo: 'a'.repeat(1001) }).success).toBe(false)
    expect(scrapMemoSchema.safeParse({ target_type: 'grant', target_id: '1', memo: null }).success).toBe(true)
  })
})
