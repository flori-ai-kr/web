import type {Customer, CustomerGender} from '@/types/customers';

export interface KotlinPhotoThumbnail {
  url: string;
  cardId: number | string;
}

// Kotlin CustomerResponse (camelCase). 서버 계약과 1:1.
export interface KotlinCustomer {
  id: string;
  name: string;
  phone: string;
  grade: string | null;
  gradeId: number | string | null;
  gradeLocked: boolean;
  gender: string | null;
  memo: string | null;
  totalPurchaseCount: number;
  totalPurchaseAmount: number;
  firstPurchaseDate: string | null;
  lastPurchaseDate: string | null;
  photoThumbnails: (KotlinPhotoThumbnail | string)[] | null;
  photoCount: number;
  createdAt: string;
  updatedAt: string;
}

// camelCase(Kotlin) → snake_case(웹 Customer 타입) 매핑.
// 멀티테넌시는 서버 JWT(TenantContext)가 처리하므로 user_id는 비운다(뷰에서 미사용).
export function mapKotlinCustomer(c: KotlinCustomer): Customer {
  return {
    id: c.id,
    user_id: '',
    name: c.name,
    phone: c.phone,
    grade: c.grade ?? null,
    grade_id: c.gradeId != null ? String(c.gradeId) : null,
    grade_locked: c.gradeLocked ?? false,
    gender: (c.gender as CustomerGender | null) ?? null,
    total_purchase_count: c.totalPurchaseCount,
    total_purchase_amount: c.totalPurchaseAmount,
    first_purchase_date: c.firstPurchaseDate ?? undefined,
    last_purchase_date: c.lastPurchaseDate ?? undefined,
    // BFF가 신형({url,cardId} 객체) 또는 구형(문자열 URL) 어느 쪽을 줘도 안전하게 정규화하고, url 없는 항목은 제거
    photo_thumbnails: (c.photoThumbnails ?? [])
      .map((t) =>
        typeof t === 'string'
          ? { url: t, card_id: '' }
          : { url: t?.url ?? '', card_id: t?.cardId != null ? String(t.cardId) : '' },
      )
      .filter((t) => t.url),
    photo_count: c.photoCount ?? 0,
    memo: c.memo ?? undefined,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}
