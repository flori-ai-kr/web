'use client';

import {useMemo, useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {toast} from 'sonner';
import {Edit2, ExternalLink, Plus, Trash2} from 'lucide-react';
import {createInstagramAccount, deleteInstagramAccount, updateInstagramAccount,} from '@/lib/actions/insights';
import {INSTAGRAM_REGION_LABELS, type InstagramAccount, type InstagramRegion,} from '@/types/database';
import {AppError} from '@/lib/errors';
import {cn} from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';

interface AccountManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialAccounts: InstagramAccount[];
}

export function AccountManagerDialog({
  open,
  onOpenChange,
  initialAccounts,
}: AccountManagerDialogProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InstagramAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InstagramAccount | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const grouped = useMemo(() => {
    const sorted = [...initialAccounts].sort((a, b) => a.sort_order - b.sort_order);
    return {
      domestic: sorted.filter((a) => a.region === 'domestic'),
      international: sorted.filter((a) => a.region === 'international'),
    };
  }, [initialAccounts]);

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const account = deleteTarget;
    startDeleteTransition(async () => {
      try {
        await deleteInstagramAccount(account.id);
        toast.success(`@${account.username} 계정을 삭제했어요`);
        router.refresh();
        setDeleteTarget(null);
      } catch (error) {
        const message = error instanceof AppError ? error.message : '삭제에 실패했어요';
        toast.error(message);
      }
    });
  };

  const handleToggleActive = async (account: InstagramAccount) => {
    try {
      await updateInstagramAccount(account.id, { active: !account.active });
      toast.success(`@${account.username} ${!account.active ? '활성화' : '비활성화'}`);
      router.refresh();
    } catch (error) {
      const message = error instanceof AppError ? error.message : '변경에 실패했어요';
      toast.error(message);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Instagram 계정 관리</DialogTitle>
            <DialogDescription>
              루틴이 수집할 팔로우 계정을 관리합니다. 비활성 계정은 스크래핑 대상에서 제외돼요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            <button
              onClick={() => {
                setEditTarget(null);
                setFormOpen(true);
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-border text-sm text-foreground hover:border-brand hover:bg-brand/5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              계정 추가
            </button>

            {(['international', 'domestic'] as InstagramRegion[]).map((region) => {
              const items = grouped[region];
              if (items.length === 0) return null;
              return (
                <section key={region}>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {INSTAGRAM_REGION_LABELS[region]} ({items.length})
                  </h4>
                  <div className="space-y-2">
                    {items.map((account) => (
                      <AccountRow
                        key={account.id}
                        account={account}
                        onEdit={() => {
                          setEditTarget(account);
                          setFormOpen(true);
                        }}
                        onToggle={() => handleToggleActive(account)}
                        onDelete={() => setDeleteTarget(account)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <AccountFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editTarget={editTarget}
      />

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && !isDeleting && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>계정 삭제</DialogTitle>
            <DialogDescription>
              {deleteTarget && (
                <>
                  <span className="font-medium text-foreground">@{deleteTarget.username}</span>{' '}
                  계정을 삭제할까요? 수집된 포스트도 함께 삭제됩니다. 이 작업은 되돌릴 수 없어요.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AccountRow({
  account,
  onEdit,
  onToggle,
  onDelete,
}: {
  account: InstagramAccount;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 sm:gap-3 rounded-lg border border-border bg-card p-3',
        !account.active && 'opacity-55',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium text-foreground text-sm truncate">
          @{account.username}
        </div>
        {account.display_name && (
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {account.display_name}
          </div>
        )}
        {account.memo && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{account.memo}</p>
        )}
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={onToggle}
          className={cn(
            'text-[11px] px-2 py-1 rounded-md shrink-0',
            account.active
              ? 'bg-success-soft text-success'
              : 'bg-muted text-muted-foreground',
          )}
          aria-label={account.active ? '비활성화' : '활성화'}
        >
          {account.active ? '활성' : '비활성'}
        </button>
        <a
          href={account.profile_url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 text-muted-foreground hover:text-brand"
          aria-label={`${account.username} Instagram 열기`}
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        <button
          onClick={onEdit}
          className="p-1.5 text-muted-foreground hover:text-brand"
          aria-label="수정"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-muted-foreground hover:text-danger"
          aria-label="삭제"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function AccountFormDialog({
  open,
  onOpenChange,
  editTarget,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget: InstagramAccount | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const rawUsername = (data.get('username') as string).trim().replace(/^@/, '');
    const payload = {
      username: rawUsername,
      display_name: ((data.get('display_name') as string) || '').trim() || null,
      region: data.get('region') as InstagramRegion,
      memo: ((data.get('memo') as string) || '').trim() || null,
      sort_order: parseInt(((data.get('sort_order') as string) || '0').trim(), 10) || 0,
    };

    startTransition(async () => {
      try {
        if (editTarget) {
          await updateInstagramAccount(editTarget.id, payload);
          toast.success(`@${payload.username} 수정 완료`);
        } else {
          await createInstagramAccount(payload);
          toast.success(`@${payload.username} 추가 완료`);
        }
        router.refresh();
        onOpenChange(false);
      } catch (error) {
        const message = error instanceof AppError ? error.message : '저장에 실패했어요';
        toast.error(message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editTarget ? `@${editTarget.username} 수정` : '계정 추가'}
          </DialogTitle>
          <DialogDescription>
            Instagram 유저네임을 입력해주세요. URL이 아닌 @ 뒤에 붙는 ID만 입력하면 됩니다.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
              e.preventDefault();
            }
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="username">유저네임 *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                @
              </span>
              <Input
                id="username"
                name="username"
                required
                defaultValue={editTarget?.username ?? ''}
                placeholder="futurejenn"
                className="pl-7"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="display_name">표시 이름</Label>
            <Input
              id="display_name"
              name="display_name"
              defaultValue={editTarget?.display_name ?? ''}
              placeholder="Future Jenn (선택)"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label>지역 *</Label>
            <div className="flex gap-2">
              {(['international', 'domestic'] as InstagramRegion[]).map((region) => (
                <label
                  key={region}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-border cursor-pointer has-[:checked]:border-brand has-[:checked]:bg-brand/5 has-[:checked]:text-brand"
                >
                  <input
                    type="radio"
                    name="region"
                    value={region}
                    defaultChecked={
                      editTarget?.region === region ||
                      (!editTarget && region === 'international')
                    }
                    className="sr-only"
                  />
                  <span className="text-sm">{INSTAGRAM_REGION_LABELS[region]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="memo">메모</Label>
            <Input
              id="memo"
              name="memo"
              defaultValue={editTarget?.memo ?? ''}
              placeholder="선택 사항"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sort_order">정렬 순서</Label>
            <Input
              id="sort_order"
              name="sort_order"
              type="number"
              defaultValue={editTarget?.sort_order ?? 0}
              min={0}
              placeholder="0"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">작을수록 위에 표시돼요</p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              취소
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? '저장 중...' : editTarget ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
