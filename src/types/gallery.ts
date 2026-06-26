export interface PhotoTag {
  id: string;
  name: string;
  created_at: string;
}

export interface PhotoFile {
  url: string;
  originalName: string;
  /** 바이트 크기 — 스토리지 쿼터 집계용. 업로드 시 클라가 채운다(구 데이터는 0). */
  size: number;
}

export interface PhotoCard {
  id: string;
  user_id: string;
  title: string;
  memo: string | null;
  tags: string[];
  photos: PhotoFile[];
  sale_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  created_at: string;
  updated_at: string;
}
