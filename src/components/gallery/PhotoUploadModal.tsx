'use client';

import {useCallback, useEffect, useState} from 'react';
import {PhotoCard, PhotoFile, PhotoTag} from '@/types/database';
import {Dialog, DialogContent, DialogHeader, DialogTitle,} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Label} from '@/components/ui/label';
import {Badge} from '@/components/ui/badge';
import {GripVertical, Loader2, Plus, Upload, X} from 'lucide-react';
import {toast} from 'sonner';
import {createPhotoCard, reorderPhotos, updatePhotoCard} from '@/lib/actions/photo-cards';
import {uploadPhotoFiles, uploadPhotoFilesStandalone} from '@/lib/photo-upload';
import {createPhotoTag} from '@/lib/actions/photo-tags';
import {CustomerAutocomplete} from '@/components/sales/CustomerAutocomplete';
import {cn} from '@/lib/utils';

const MAX_FILE_SIZE_MB = 5;

// 통합 사진 아이템 타입 (기존 PhotoFile 또는 새 파일)
type PhotoItem =
  | { type: 'existing'; photo: PhotoFile }
  | { type: 'new'; file: File; preview: string };

interface PhotoUploadModalProps {
  open: boolean;
  onClose: () => void;
  tags: PhotoTag[];
  editingCard: PhotoCard | null;
  onSuccess: () => void;
  onTagsChange?: () => void;
}

const MAX_PHOTOS = 10;

export function PhotoUploadModal({
  open,
  onClose,
  tags,
  editingCard,
  onSuccess,
  onTagsChange,
}: PhotoUploadModalProps) {
  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTags, setAvailableTags] = useState<PhotoTag[]>(tags);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    // Cleanup previews on unmount
    return () => {
      photoItems.forEach(item => {
        if (item.type === 'new') URL.revokeObjectURL(item.preview);
      });
    };
  }, []);

  useEffect(() => {
    if (editingCard) {
      setTitle(editingCard.title);
      setMemo(editingCard.memo || '');
      setSelectedTags(editingCard.tags);
      setCustomerName(editingCard.customer_name || '');
      setCustomerId(editingCard.customer_id || null);
      setPhotoItems(editingCard.photos.map(photo => ({ type: 'existing', photo })));
    } else {
      setTitle('');
      setMemo('');
      setSelectedTags([]);
      setCustomerName('');
      setCustomerId(null);
      setPhotoItems([]);
    }
    setNewTagName('');
  }, [editingCard, open]);

  useEffect(() => {
    setAvailableTags(tags);
  }, [tags]);

  const addFiles = useCallback((files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));

    const oversized = imageFiles.filter(f => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
    const validFiles = imageFiles.filter(f => f.size <= MAX_FILE_SIZE_MB * 1024 * 1024);

    if (oversized.length > 0) {
      toast.error(`${MAX_FILE_SIZE_MB}MB를 초과하는 이미지는 등록할 수 없습니다`);
    }
    if (validFiles.length === 0) return;

    const totalCount = photoItems.length + validFiles.length;
    if (totalCount > MAX_PHOTOS) {
      toast.error(`사진은 최대 ${MAX_PHOTOS}장까지 등록할 수 있습니다`);
      return;
    }

    const newItems: PhotoItem[] = validFiles.map(file => ({
      type: 'new',
      file,
      preview: URL.createObjectURL(file),
    }));

    setPhotoItems(prev => [...prev, ...newItems]);
  }, [photoItems.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = ''; // Reset input
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const removePhoto = (index: number) => {
    setPhotoItems(prev => {
      const item = prev[index];
      if (item.type === 'new') URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const MAX_TAGS = 3;

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tagName)) {
        return prev.filter(t => t !== tagName);
      }
      if (prev.length >= MAX_TAGS) {
        toast.error(`태그는 최대 ${MAX_TAGS}개까지 선택할 수 있습니다`);
        return prev;
      }
      return [...prev, tagName];
    });
  };

  const handleAddNewTag = async () => {
    if (!newTagName.trim()) return;

    // 이미 3개 선택된 경우 자동 선택 안 함
    const canAutoSelect = selectedTags.length < MAX_TAGS;

    try {
      const newTag = await createPhotoTag(newTagName.trim(), newTagColor || undefined);
      if (newTag) {
        setAvailableTags(prev => [...prev, newTag]);
        if (canAutoSelect) {
          setSelectedTags(prev => [...prev, newTag.name]);
        }
        setNewTagName('');
        setNewTagColor('');
        toast.success(canAutoSelect ? '태그가 추가되었습니다' : '태그가 추가되었습니다 (최대 3개 선택됨)');
        onTagsChange?.();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '태그 추가에 실패했습니다');
    }
  };

  // Photo reorder handlers
  const handlePhotoDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handlePhotoDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handlePhotoDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      setPhotoItems(prev => {
        const newItems = [...prev];
        const [removed] = newItems.splice(draggedIndex, 1);
        newItems.splice(dragOverIndex, 0, removed);
        return newItems;
      });
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };


  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('제목을 입력해주세요');
      return;
    }

    if (photoItems.length === 0) {
      toast.error('사진을 최소 1장 이상 등록해주세요');
      return;
    }

    setIsSubmitting(true);
    try {
      // 기존 사진들 (순서 유지)
      const existingPhotos = photoItems
        .filter((item): item is { type: 'existing'; photo: PhotoFile } => item.type === 'existing')
        .map(item => item.photo);

      // 새 파일들 (순서 유지)
      const newFileItems = photoItems
        .filter((item): item is { type: 'new'; file: File; preview: string } => item.type === 'new');

      const formData = new FormData();
      formData.append('title', title);
      formData.append('memo', memo);
      formData.append('tags', JSON.stringify(selectedTags));
      formData.append('photos', JSON.stringify(existingPhotos));
      // 고객 연결: 선택된 고객 id만 전송. 비우면 액션이 연결 해제(clearCustomer) 처리한다.
      formData.append('customer_id', customerId || '');

      if (editingCard) {
        await updatePhotoCard(editingCard.id, formData);

        if (newFileItems.length > 0) {
          const uploadedPhotos = await uploadPhotoFiles(
            editingCard.id,
            newFileItems.map(({ file }) => file),
          );

          // 새 파일들이 업로드된 후, 전체 순서를 반영
          const uploadedQueue = [...uploadedPhotos];
          const finalPhotos: PhotoFile[] = photoItems.map(item =>
            item.type === 'existing' ? item.photo : uploadedQueue.shift()!
          );
          await reorderPhotos(editingCard.id, finalPhotos);
        }

        toast.success('카드가 수정되었습니다');
      } else {
        // 업로드 먼저 → 성공한 뒤에 카드 생성(DB). 업로드 실패 시 createPhotoCard를 호출하지 않으므로
        // DB에 고아 카드가 남지 않는다(presigned 업로드는 브라우저→S3 직접이라 서버 트랜잭션으로 못 묶음).
        const uploadedPhotos =
          newFileItems.length > 0
            ? await uploadPhotoFilesStandalone(newFileItems.map(({ file }) => file))
            : [];

        const uploadedQueue = [...uploadedPhotos];
        const finalPhotos: PhotoFile[] = photoItems.map(item =>
          item.type === 'existing' ? item.photo : uploadedQueue.shift()!
        );
        formData.set('photos', JSON.stringify(finalPhotos));

        await createPhotoCard(formData);

        toast.success('카드가 생성되었습니다');
      }

      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPhotos = photoItems.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{editingCard ? '카드 수정' : '새 카드 추가'}</DialogTitle>
          <p className="text-sm text-muted-foreground">사진은 최대 10장, 태그는 3개까지 가능해요.</p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">제목 *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="작업물 제목을 입력하세요"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="memo">메모</Label>
              <span className={cn(
                "text-xs",
                memo.length > 200 ? "text-danger" : "text-muted-foreground"
              )}>
                {memo.length}/200
              </span>
            </div>
            <Textarea
              id="memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value.slice(0, 200))}
              placeholder="메모를 입력하세요 (선택)"
              className="min-h-[100px] resize-none"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>태그 ({selectedTags.length}/{MAX_TAGS})</Label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className={cn(
                    'cursor-pointer px-3 py-1.5 transition-colors',
                    selectedTags.includes(tag.name)
                      ? 'bg-brand text-brand-foreground'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  )}
                  onClick={() => toggleTag(tag.name)}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="새 태그 추가"
                className="flex-1 max-w-xs"
                onKeyDown={(e) => e.key === 'Enter' && handleAddNewTag()}
              />
              <input
                type="color"
                value={newTagColor || '#6b7280'}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="w-9 h-9 rounded border cursor-pointer"
                title="색상 선택 (비워두면 랜덤)"
              />
              <Button type="button" size="icon" variant="outline" onClick={handleAddNewTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>


          <div className="space-y-2">
            <Label>고객 연결 (선택)</Label>
            <CustomerAutocomplete
              value={customerName}
              onChange={(name, id) => {
                setCustomerName(name);
                setCustomerId(id);
              }}
              placeholder="고객명 검색 또는 입력"
            />
            <p className="text-xs text-muted-foreground">이름·연락처로 검색해 연결. 연결 안 해도 저장 가능.</p>
          </div>

          <div className="space-y-2">
            <Label>사진 ({totalPhotos}/{MAX_PHOTOS}) *</Label>

            <div
              className={cn(
                "border-2 border-dashed border-border rounded-lg p-6 text-center transition-colors",
                "hover:border-brand/50"
              )}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-1">
                이미지를 드래그하거나 클릭하여 업로드
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                {MAX_FILE_SIZE_MB}MB 이하 이미지만 등록할 수 있습니다
              </p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="photo-upload"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('photo-upload')?.click()}
              >
                파일 선택
              </Button>
            </div>

            {photoItems.length > 0 && (
              <>
                {photoItems.length > 1 && (
                  <p className="text-xs text-muted-foreground mt-2">드래그하여 순서를 변경할 수 있습니다</p>
                )}
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {photoItems.map((item, index) => (
                    <div
                      key={item.type === 'existing' ? item.photo.url : `new-${index}`}
                      draggable
                      onDragStart={() => handlePhotoDragStart(index)}
                      onDragOver={(e) => handlePhotoDragOver(e, index)}
                      onDragEnd={handlePhotoDragEnd}
                      className={cn(
                        'relative aspect-square cursor-move',
                        draggedIndex === index && 'opacity-50',
                        dragOverIndex === index && 'ring-2 ring-brand ring-offset-2'
                      )}
                    >
                      <img
                        src={item.type === 'existing' ? item.photo.url : item.preview}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute top-1 left-1 bg-black/50 text-white rounded p-0.5">
                        <GripVertical className="w-3 h-3" />
                      </div>
                      <div className={cn(
                        'absolute bottom-1 left-1 text-white text-xs px-1 rounded',
                        item.type === 'new' ? 'bg-info' : 'bg-black/50'
                      )}>
                        {item.type === 'new' ? 'NEW' : index + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 -right-2 bg-danger text-danger-foreground rounded-full p-1 hover:bg-danger/90"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingCard ? '수정' : '저장'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
