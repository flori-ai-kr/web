import type {Sale} from '@/types/sales';

// Kotlin SaleResponse (camelCase). 서버 계약과 1:1.
// 카테고리·채널은 id 기반 + 라벨 동봉(label_settings).
export interface KotlinSale {
  id: string;
  date: string;
  categoryId: number | string | null;
  categoryLabel: string | null;
  amount: number;
  paymentMethodId: number | string | null;
  paymentMethodLabel: string | null;
  channelId: number | string | null;
  channelLabel: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerId: string | null;
  memo: string | null;
  isUnpaid: boolean;
  hasReview: boolean;
  photos: string[] | null;
  createdAt: string;
  updatedAt: string;
}

// camelCase(Kotlin) → snake_case(웹 Sale 타입) 매핑.
// 멀티테넌시는 서버 JWT(TenantContext)가 처리하므로 user_id는 비운다(뷰에서 미사용).
// photos는 연결된 사진 URL 목록(없으면 undefined). 리스트 썸네일 표시에 사용.
export function mapKotlinSale(s: KotlinSale): Sale {
  return {
    id: s.id,
    user_id: '',
    date: s.date,
    category_id: s.categoryId != null ? String(s.categoryId) : null,
    category_label: s.categoryLabel,
    amount: s.amount,
    payment_method_id: s.paymentMethodId != null ? String(s.paymentMethodId) : null,
    payment_method_label: s.paymentMethodLabel,
    channel_id: s.channelId != null ? String(s.channelId) : null,
    channel_label: s.channelLabel,
    customer_name: s.customerName ?? undefined,
    customer_phone: s.customerPhone ?? undefined,
    customer_id: s.customerId ?? undefined,
    memo: s.memo ?? undefined,
    is_unpaid: s.isUnpaid,
    has_review: s.hasReview,
    photos: s.photos && s.photos.length > 0 ? s.photos : undefined,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  };
}
