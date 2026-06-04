import type {Reservation} from '@/types/database';

/**
 * 캘린더에서 쓰는 예약 타입. 기본 Reservation에 매출 조인으로 따라오는
 * 부가 필드(결제/미수/방문횟수 등)를 더한 형태. calendar-client와 하위
 * 프레젠테이션 컴포넌트가 공유한다.
 */
export type CalendarReservation = Reservation & {
  sale_date?: string;
  product_category?: string;
  customer_id?: string;
  purchase_count?: number;
  sale_is_unpaid?: boolean;
  sale_payment_method?: string;
  sale_reservation_channel?: string;
};
