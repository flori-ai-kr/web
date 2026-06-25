export type InquiryCategory = 'bug' | 'feature' | 'account' | 'payment' | 'feedback' | 'etc';
export type InquiryStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface MyInquiry {
  id: number;
  userId: number;
  category: InquiryCategory;
  title: string;
  body: string;
  imageUrls: string[];
  status: InquiryStatus;
  answer: string | null;
  answeredBy: number | null;
  answeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InquiryUploadTarget {
  uploadUrl: string;
  publicUrl: string;
  originalName: string;
}
