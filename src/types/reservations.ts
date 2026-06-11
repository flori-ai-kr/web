export type ReservationChannel = 'phone' | 'kakaotalk' | 'naver_booking' | 'road' | 'other';
export type ReservationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Reservation {
  id: string;
  user_id: string;
  date: string;
  time: string | null;
  customer_name: string;
  customer_phone: string | null;
  title: string;
  memo: string | null;
  status: ReservationStatus;
  sale_id: string | null;
  amount: number;
  reminder_at: string | null;
  reminder_sent: boolean;
  pickup_completed: boolean;
  created_at: string;
  updated_at: string;
}

export const RESERVATION_STATUS = [
  { value: 'pending', label: '제작 필요', color: '#F5A623' },
  { value: 'confirmed', label: '픽업 필요', color: '#5B8DEF' },
  { value: 'completed', label: '픽업 완료', color: '#8B9D83' },
  { value: 'cancelled', label: '취소', color: '#9B9B93' },
] as const;

// 캘린더 일정 (여러 날에 걸친 스케줄)
export interface Schedule {
  id: string;
  user_id: string;
  title: string;
  start_date: string;
  end_date: string;
  color: string;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export const SCHEDULE_COLORS = [
  { value: '#f43f5e', label: '로즈' },
  { value: '#a855f7', label: '퍼플' },
  { value: '#3b82f6', label: '블루' },
  { value: '#10b981', label: '그린' },
  { value: '#f59e0b', label: '앰버' },
  { value: '#6b7280', label: '그레이' },
] as const;
