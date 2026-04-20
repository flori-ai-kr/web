import {z} from 'zod';

// 공통 유틸리티
const koreanPhoneRegex = /^01[016789]-?\d{3,4}-?\d{4}$/;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

export const uuidSchema = z.string().regex(uuidRegex, 'UUID 형식이 올바르지 않습니다');
export const dateSchema = z.string().regex(dateRegex, '날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)');
export const phoneSchema = z.string().regex(koreanPhoneRegex, '전화번호 형식이 올바르지 않습니다');
export const colorSchema = z.string().regex(hexColorRegex, '색상 형식이 올바르지 않습니다');

// 매출 생성/수정
export const saleSchema = z.object({
  date: dateSchema,
  product_category: z.string().min(1).max(100),
  amount: z.number().int().min(0).max(100_000_000),
  payment_method: z.enum(['cash', 'card', 'transfer', 'naverpay', 'kakaopay', 'unpaid']),
  card_company: z.string().max(50).nullable().optional(),
  fee: z.number().int().min(0).nullable().optional(),
  expected_deposit: z.number().int().min(0).nullable().optional(),
  expected_deposit_date: dateSchema.nullable().optional(),
  deposit_status: z.enum(['pending', 'completed', 'not_applicable']).optional(),
  reservation_channel: z.enum(['phone', 'kakaotalk', 'naver_booking', 'road', 'other']).optional(),
  customer_name: z.string().max(100).nullable().optional(),
  customer_phone: z.string().max(20).nullable().optional(),
  customer_id: uuidSchema.nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
});

// 고객 생성/수정
export const customerSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요').max(100),
  phone: z.string().min(10).max(20),
  grade: z.enum(['new', 'regular', 'vip', 'blacklist']).optional(),
  gender: z.enum(['male', 'female']).nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
});

// 지출 생성/수정
export const expenseSchema = z.object({
  date: dateSchema,
  item_name: z.string().min(1, '품명을 입력해주세요').max(200),
  category: z.string().min(1).max(30),
  unit_price: z.number().int().min(0).max(100_000_000),
  quantity: z.number().int().min(1).max(10_000),
  payment_method: z.enum(['cash', 'card', 'transfer', 'naverpay', 'kakaopay']),
  card_company: z.string().max(50).nullable().optional(),
  vendor: z.string().max(100).nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
});

// 예약 생성
export const reservationSchema = z.object({
  date: dateSchema,
  time: z.string().max(10).nullable().optional(),
  customer_name: z.string().min(1, '고객명을 입력해주세요').max(100),
  customer_phone: z.string().max(20).nullable().optional(),
  title: z.string().min(1, '제목을 입력해주세요').max(255),
  description: z.string().max(1000).nullable().optional(),
  amount: z.number().int().min(0).max(100_000_000).optional(),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
  reminder_at: z.string().datetime({ offset: true }).nullable().optional(),
});

// 캘린더 이벤트
export const calendarEventBaseSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(255),
  start_date: dateSchema,
  end_date: dateSchema,
  color: colorSchema.optional(),
  description: z.string().max(1000).nullable().optional(),
});

export const calendarEventSchema = calendarEventBaseSchema.refine(
  (data) => data.end_date >= data.start_date,
  { message: '종료일은 시작일보다 이전일 수 없습니다', path: ['end_date'] },
);

// 카테고리 설정
export const categorySettingSchema = z.object({
  label: z.string().min(1).max(100),
  color: colorSchema.optional(),
});

// 카드사 설정
export const cardCompanySettingSchema = z.object({
  name: z.string().min(1).max(50),
  fee_rate: z.number().min(0).max(100),
  deposit_days: z.number().int().min(0).max(365),
});

// 사진 카드
export const photoCardSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(255),
  description: z.string().max(1000).nullable().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  photos: z.array(z.object({
    url: z.string().url(),
    originalName: z.string().max(255),
  })).max(10).optional(),
});

// 사진 태그
export const photoTagSchema = z.object({
  name: z.string().min(1, '태그 이름을 입력해주세요').max(50),
  color: colorSchema.optional(),
});

// ID 배열 (입금 확인 등)
export const idsSchema = z.array(uuidSchema).min(1).max(100);

// 검색 쿼리
export const searchQuerySchema = z.string().min(1).max(100);

// 월 필터
export const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, '월 형식이 올바르지 않습니다 (YYYY-MM)');

// 이미지 파일 검증
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];
const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
];

const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file

export function validateImageFile(file: File): string | null {
  if (file.size > MAX_IMAGE_FILE_SIZE) {
    return `파일 크기는 5MB 이하여야 합니다 (현재: ${(file.size / 1024 / 1024).toFixed(1)}MB)`;
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    return `허용되지 않는 파일 형식입니다: .${ext || '(없음)'}`;
  }
  if (!file.type || !ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    return `허용되지 않는 MIME 타입입니다: ${file.type || '(없음)'}`;
  }
  return null;
}

// 고객 등급 단독 검증
export const customerGradeSchema = z.enum(['new', 'regular', 'vip', 'blacklist']);

// ─── 인사이트 섹션 ──────────────────────────────────────────

// javascript:/data: URI 차단 — DB에 저장되어 <a href>로 렌더링되므로 XSS 방지.
const httpUrlSchema = z
  .string()
  .url()
  .max(1000)
  .refine((u) => /^https?:\/\//i.test(u), {
    message: 'http 또는 https URL만 허용됩니다',
  });

// 트렌드 기사 (루틴이 POST로 저장)
export const trendArticleInputSchema = z.object({
  category: z.enum(['flower', 'inspiration', 'business', 'industry']),
  title: z.string().min(1).max(300),
  summary: z.string().min(1).max(2000),
  key_points: z.array(z.string().max(500)).max(20).optional().default([]),
  source_url: httpUrlSchema,
  source_name: z.string().max(100).nullable().optional(),
  published_at: z.string().datetime({ offset: true }).nullable().optional(),
});

export const trendArticlesBulkSchema = z.object({
  articles: z.array(trendArticleInputSchema).min(1).max(20),
});

// Instagram 포스트 (루틴이 POST로 저장)
export const instagramPostInputSchema = z.object({
  username: z.string().min(1).max(60),
  shortcode: z.string().min(1).max(60),
  permalink: httpUrlSchema,
  image_urls: z.array(httpUrlSchema).min(1).max(20),
  caption: z.string().max(5000).nullable().optional(),
  like_count: z.number().int().nonnegative().default(0),
  posted_at: z.string().datetime({ offset: true }),
});

export const instagramPostsBulkSchema = z.object({
  posts: z.array(instagramPostInputSchema).min(1).max(500),
});

// Instagram 계정 관리 (유저용)
export const instagramAccountCreateSchema = z.object({
  username: z
    .string()
    .min(1, '유저네임을 입력해주세요')
    .max(60)
    .regex(/^[a-zA-Z0-9._]+$/, 'Instagram 유저네임 형식만 허용됩니다'),
  display_name: z.string().max(100).nullable().optional(),
  region: z.enum(['domestic', 'international']),
  sort_order: z.number().int().min(0).max(10_000).optional(),
  active: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const instagramAccountUpdateSchema = instagramAccountCreateSchema.partial();

// 하단바 커스터마이즈
export const navItemKeySchema = z.enum([
  'calendar',
  'sales',
  'expenses',
  'customers',
  'gallery',
  'deposits',
  'insights',
  'follows',
]);

export const bottomNavItemsSchema = z
  .array(navItemKeySchema)
  .min(4, '최소 4개 선택해야 합니다')
  .max(6, '최대 6개까지 선택 가능합니다')
  .refine((items) => new Set(items).size === items.length, {
    message: '중복된 메뉴가 있습니다',
  });

// 스크랩/메모
export const scrapTargetTypeSchema = z.enum(['trend', 'post']);

export const scrapToggleSchema = z.object({
  target_type: scrapTargetTypeSchema,
  target_id: uuidSchema,
});

export const scrapMemoSchema = z.object({
  target_type: scrapTargetTypeSchema,
  target_id: uuidSchema,
  memo: z.string().max(1000, '메모는 1000자 이내로 입력해주세요').nullable(),
});

// FormData에서 값을 안전하게 추출하는 헬퍼
export function getFormString(formData: FormData, key: string): string {
  const val = formData.get(key);
  return typeof val === 'string' ? val : '';
}

export function getFormInt(formData: FormData, key: string): number | null {
  const val = formData.get(key);
  if (!val || typeof val !== 'string' || val === '') return null;
  const parsed = parseInt(val, 10);
  return Number.isNaN(parsed) ? null : parsed;
}
