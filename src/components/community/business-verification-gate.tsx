'use client';

import {useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Clock, FileText, Loader2, Upload, X} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Card, CardContent} from '@/components/ui/card';
import {BUSINESS_LICENSE_TYPES, type BusinessVerification} from '@/lib/business-verification';
import {
  createBusinessLicenseUploadTarget,
  submitBusinessVerification,
} from '@/lib/actions/business-verification';

const MAX_FILE_SIZE_MB = 10;

function formatBusinessNumber(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

export function BusinessVerificationGate({ initial }: { initial: BusinessVerification }) {
  const router = useRouter();

  // PENDING — 검토 대기
  if (initial.status === 'PENDING') {
    return (
      <div className="max-w-md mx-auto px-4 py-10">
        <Card>
          <CardContent className="p-8 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-brand-muted flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-brand" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">검토 중입니다</h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              제출하신 사업자 인증을 담당자가 확인하고 있어요.
              <br />
              수일 내로 결과를 알려드릴게요.
            </p>
            <Button variant="outline" className="mt-6" onClick={() => router.push('/admin')}>
              대시보드로
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // NONE / REJECTED — 신청 폼
  return <VerificationForm initial={initial} onDone={() => router.refresh()} onCancel={() => router.push('/admin')} />;
}

function VerificationForm({
  initial,
  onDone,
  onCancel,
}: {
  initial: BusinessVerification;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [businessNumber, setBusinessNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (!BUSINESS_LICENSE_TYPES.includes(f.type)) {
      toast.error('JPG·PNG·WEBP·PDF 파일만 업로드할 수 있습니다');
      return;
    }
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`${MAX_FILE_SIZE_MB}MB 이하 파일만 업로드할 수 있습니다`);
      return;
    }
    setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    if (!file) {
      toast.error('사업자등록증을 첨부해주세요');
      return;
    }
    if (businessNumber.replace(/\D/g, '').length !== 10) {
      toast.error('사업자번호 10자리를 입력해주세요');
      return;
    }
    if (!businessName.trim() || !representativeName.trim()) {
      toast.error('상호와 대표자명을 입력해주세요');
      return;
    }

    setPending(true);
    try {
      // 1) presigned 발급 → 2) 브라우저에서 S3로 직접 PUT
      const { uploadUrl, fileUrl } = await createBusinessLicenseUploadTarget(file.type);
      const put = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!put.ok) throw new Error('등록증 업로드에 실패했습니다');

      // 3) 신청 제출
      await submitBusinessVerification({
        businessNumber,
        businessName,
        representativeName,
        businessLicenseUrl: fileUrl,
      });

      toast.success('인증 신청이 접수되었습니다');
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '신청에 실패했어요');
      setPending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-7">
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-foreground tracking-tight">사업자 인증</h1>
        <p className="text-sm text-muted-foreground mt-1">
          커뮤니티는 사업자 회원만 이용할 수 있어요. 사업자등록증을 제출해주세요.
        </p>
      </header>

      {initial.status === 'REJECTED' && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 p-3">
          <p className="text-sm font-medium text-danger">인증이 반려되었어요</p>
          {initial.rejectReason && (
            <p className="text-xs text-muted-foreground mt-1">사유: {initial.rejectReason}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">아래에서 다시 신청할 수 있어요.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5 space-y-5">
        {/* 등록증 업로드 */}
        <div className="space-y-1.5">
          <Label>사업자등록증 <span className="text-destructive">*</span></Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => {
              pickFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          {file ? (
            <div className="flex items-center gap-2 rounded-lg border border-border p-3">
              <FileText className="w-4 h-4 text-brand shrink-0" />
              <span className="text-sm text-foreground truncate flex-1">{file.name}</span>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-muted-foreground hover:text-foreground shrink-0"
                aria-label="첨부 제거"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-border p-6 text-center hover:border-brand/50 transition-colors"
            >
              <Upload className="w-7 h-7 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">클릭하여 등록증 첨부</p>
              <p className="text-xs text-muted-foreground mt-1">JPG·PNG·WEBP·PDF, {MAX_FILE_SIZE_MB}MB 이하</p>
            </button>
          )}
        </div>

        {/* 사업자번호 */}
        <div className="space-y-1.5">
          <Label htmlFor="bizno">사업자등록번호 <span className="text-destructive">*</span></Label>
          <Input
            id="bizno"
            value={businessNumber}
            onChange={(e) => setBusinessNumber(formatBusinessNumber(e.target.value))}
            placeholder="123-45-67890"
            inputMode="numeric"
          />
        </div>

        {/* 상호 */}
        <div className="space-y-1.5">
          <Label htmlFor="bizname">상호 <span className="text-destructive">*</span></Label>
          <Input
            id="bizname"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="플로리 꽃집"
            maxLength={255}
          />
        </div>

        {/* 대표자명 */}
        <div className="space-y-1.5">
          <Label htmlFor="repname">대표자명 <span className="text-destructive">*</span></Label>
          <Input
            id="repname"
            value={representativeName}
            onChange={(e) => setRepresentativeName(e.target.value)}
            placeholder="홍길동"
            maxLength={100}
          />
        </div>

        <p className="text-xs text-muted-foreground">* 담당자가 수일 내로 확인 후 권한을 부여해드려요.</p>

        <div className="flex items-center justify-end gap-2 border-t border-border -mx-5 px-5 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            취소
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            신청
          </Button>
        </div>
      </form>
    </div>
  );
}
