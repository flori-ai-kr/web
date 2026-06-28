export type CustomerGrade = 'new' | 'regular' | 'vip' | 'blacklist';
export type CustomerGender = 'male' | 'female';

/** 고객 대표 썸네일 한 장. card_id로 사진첩 해당 카드 딥링크 가능. (BFF id-as-string 규약) */
export interface PhotoThumbnail {
  url: string;
  card_id: string;
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  /** 등급명(자유 문자열). 더 이상 고정 union이 아니며, 등급 미지정 시 null. */
  grade: string | null;
  /** 적용된 등급 설정 id (자동/수동 모두). 미지정 시 null. */
  grade_id: string | null;
  /** true면 사용자가 수동으로 고정한 등급(자동 재계산 제외). */
  grade_locked: boolean;
  gender?: CustomerGender | null;
  total_purchase_count: number;
  total_purchase_amount: number;
  first_purchase_date?: string;
  last_purchase_date?: string;
  /** 대표 사진 썸네일(카드 id 포함, 딥링크용). 서버 집계값. */
  photo_thumbnails: PhotoThumbnail[];
  /** 연결된 사진 카드 수. 서버 집계값. */
  photo_count: number;
  memo?: string;
  created_at: string;
  updated_at: string;
}

/** 등급 설정(테넌트별 CRUD 대상). 서버 /customer-grades 계약 미러. */
export interface CustomerGradeConfig {
  id: string;
  name: string;
  threshold: number | null;
  sort_order: number;
}
