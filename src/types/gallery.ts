export interface PhotoTag {
  id: string;
  name: string;
  created_at: string;
}

export interface PhotoFile {
  url: string;
  originalName: string;
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
