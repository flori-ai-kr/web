import type {Reservation, ReservationStatus, Schedule} from '@/types/reservations';

// Kotlin ReservationResponse (camelCase). 서버 계약과 1:1.
// 매출 조인 enrichment 필드(saleDate~saleReservationChannel)는 /reservations 목록에만 실리고
// 대시보드 응답 등에는 없을 수 있어 옵셔널로 둔다.
export interface KotlinReservation {
  id: string;
  date: string;
  time: string | null;
  customerName: string;
  customerPhone: string | null;
  title: string;
  memo: string | null;
  status: string;
  saleId: string | null;
  amount: number;
  reminderAt: string | null;
  reminderSent: boolean;
  pickupCompleted: boolean;
  // 매출 조인 enrichment (매출 미연결 시 null)
  saleDate?: string | null;
  productCategory?: string | null;
  customerId?: string | null;
  purchaseCount?: number | null;
  saleIsUnpaid?: boolean | null;
  salePaymentMethod?: string | null;
  saleReservationChannel?: string | null;
  createdAt: string;
  updatedAt: string;
}

// camelCase(Kotlin) → snake_case(웹 Reservation 타입) 매핑.
// 멀티테넌시는 서버 JWT(TenantContext)가 처리하므로 user_id는 비운다(뷰에서 미사용).
export function mapKotlinReservation(r: KotlinReservation): Reservation {
  return {
    id: r.id,
    user_id: '',
    date: r.date,
    time: r.time ?? null,
    customer_name: r.customerName,
    customer_phone: r.customerPhone ?? null,
    title: r.title,
    memo: r.memo ?? null,
    status: r.status as ReservationStatus,
    sale_id: r.saleId ?? null,
    amount: r.amount,
    reminder_at: r.reminderAt ?? null,
    reminder_sent: r.reminderSent,
    pickup_completed: r.pickupCompleted,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

// Kotlin ScheduleResponse (camelCase). 서버 계약과 1:1.
export interface KotlinSchedule {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  color: string;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export function mapKotlinSchedule(e: KotlinSchedule): Schedule {
  return {
    id: e.id,
    user_id: '',
    title: e.title,
    start_date: e.startDate,
    end_date: e.endDate,
    color: e.color,
    memo: e.memo,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  };
}
