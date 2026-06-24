'use client';

export function CreateInquiryModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (inquiry: any) => void;
}) {
  if (!open) return null;
  return null;
}
