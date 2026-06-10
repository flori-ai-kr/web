'use client';

import {useState} from 'react';
import {PhotoCard} from '@/types/database';
import {Dialog, DialogContent, DialogHeader, DialogTitle,} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {ChevronLeft, ChevronRight, Download, Edit, ExternalLink, Loader2, Trash2, User} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import Image from 'next/image';
import {toast} from 'sonner';
import {deletePhotoCard, downloadAllPhotos} from '@/lib/actions/photo-cards';

interface PhotoCardDialogProps {
  card: PhotoCard | null;
  onClose: () => void;
  onEdit: (card: PhotoCard) => void;
  onDelete: () => void;
}

export function PhotoCardDialog({ card, onClose, onEdit, onDelete }: PhotoCardDialogProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!card) return null;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : card.photos.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < card.photos.length - 1 ? prev + 1 : 0));
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePhotoCard(card.id);
      toast.success('카드가 삭제되었습니다');
      onDelete();
      onClose();
    } catch (error) {
      toast.error('삭제에 실패했습니다');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const downloadBlob = async (url: string, filename: string) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  const handleDownloadAll = async () => {
    setIsDownloading(true);
    try {
      const { urls } = await downloadAllPhotos(card.id);
      for (const item of urls) {
        await downloadBlob(item.url, item.filename);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      toast.success(`${urls.length}개 사진 다운로드 완료`);
    } catch (error) {
      toast.error('다운로드에 실패했습니다');
    } finally {
      setIsDownloading(false);
    }
  };


  return (
    <Dialog open={!!card} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{card.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {card.photos.length > 0 && (
            <div className="relative">
              <div className="relative h-[58vh] bg-muted rounded-lg overflow-hidden">
                <Image
                  src={card.photos[currentIndex].url}
                  alt={`${card.title} - ${currentIndex + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="object-contain"
                  priority={currentIndex === 0}
                  unoptimized
                />
              </div>

              {card.photos.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
                    {currentIndex + 1} / {card.photos.length}
                  </div>
                </>
              )}
            </div>
          )}

          {card.photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {card.photos.map((photo, index) => (
                <button
                  key={photo.url}
                  onClick={() => setCurrentIndex(index)}
                  aria-label={`${index + 1}번째 사진 보기`}
                  className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                    index === currentIndex ? 'border-brand' : 'border-transparent'
                  }`}
                >
                  <Image
                    src={photo.url}
                    alt={`사진 ${index + 1}`}
                    fill
                    sizes="64px"
                    className="object-cover"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {card.memo && (
              <p className="text-foreground">{card.memo}</p>
            )}

            {card.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {card.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
              {card.customer_name && (
                <button
                  type="button"
                  onClick={() => {
                    if (!card.customer_id) return;
                    router.push(`/admin/customers?customerId=${card.customer_id}`);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
                >
                  <User className="w-3.5 h-3.5" />
                  {card.customer_name}
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}

              {card.sale_id && (
                <Link
                  href={`/sales?saleId=${card.sale_id}`}
                  className="inline-flex items-center gap-1.5 text-sm text-brand hover:text-brand hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  연결된 매출 보기
                </Link>
              )}
            </div>
          </div>

          {showDeleteConfirm ? (
            <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg">
              <p className="text-sm text-destructive">정말 삭제하시겠습니까?</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  삭제
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap justify-end gap-2 pt-4 border-t">
              {card.photos.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleDownloadAll}
                  disabled={isDownloading}
                >
                  {isDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  다운로드
                </Button>
              )}
              <Button variant="outline" onClick={() => onEdit(card)}>
                <Edit className="w-4 h-4 mr-2" />
                수정
              </Button>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                삭제
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
