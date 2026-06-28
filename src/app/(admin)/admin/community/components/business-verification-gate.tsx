'use client';

import {useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {BadgeCheck, Clock, FileText, Loader2, LogOut, ShieldCheck, Upload, X} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {signOut} from '@/lib/actions/auth';
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

/** flori 로고+워드마크 (헤더와 동일한 5장 꽃잎 SVG). 네비 없는 블락 화면 상단용. */
function BrandMark() {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 100 100" width={28} height={28} aria-hidden="true" className="shrink-0">
        <defs>
          <path id="flori-petal-gate" d="M50 50 C 42 44 39 27 49 15 C 53 11 60 14 60 22 C 60 35 55 44 50 50 Z" />
        </defs>
        <g transform="translate(0 3.5)">
          <use href="#flori-petal-gate" fill="#A85475" />
          <use href="#flori-petal-gate" transform="rotate(72 50 50)" fill="#E0739A" />
          <use href="#flori-petal-gate" transform="rotate(144 50 50)" fill="#A85475" />
          <use href="#flori-petal-gate" transform="rotate(216 50 50)" fill="#E0739A" />
          <use href="#flori-petal-gate" transform="rotate(288 50 50)" fill="#8E3F5F" />
          <circle cx="50" cy="50" r="6" fill="#ffffff" />
          <circle cx="50" cy="50" r="3.2" fill="#A85475" />
        </g>
      </svg>
      <span
        className="font-display text-[24px] font-semibold text-foreground leading-none"
        style={{ fontVariantLigatures: 'none', letterSpacing: '0.2rem' }}
      >
        flori<span className="text-brand">.</span>
      </span>
    </div>
  );
}

/**
 * 사업자 인증 전체 블락 셸. 승인(APPROVED) 전에는 AppLayout 밖에서 풀스크린으로 렌더되어
 * 사이드바·하단탭 등 어떤 네비도 노출하지 않는다. 로그아웃 동선은 항상 제공.
 */
function GateShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col items-center overflow-y-auto bg-background px-4 py-10">
      <div className="mb-8 shrink-0">
        <BrandMark />
      </div>
      <main className="flex w-full max-w-md flex-1 flex-col justify-center">{children}</main>
      <button
        type="button"
        onClick={() => signOut()}
        className="mt-8 inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
        로그아웃
      </button>
    </div>
  );
}

export function BusinessVerificationGate({ initial }: { initial: BusinessVerification }) {
  const router = useRouter();

  // PENDING — 승인 대기
  if (initial.status === 'PENDING') {
    const submittedLabel = initial.submittedAt
      ? new Date(initial.submittedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
      : null;
    return (
      <GateShell>
        <div className="w-full text-center space-y-5">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-muted">
            <Clock className="h-10 w-10 text-brand" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">승인을 기다리고 있어요</h1>
            <p className="text-sm text-muted-foreground break-keep leading-relaxed">
              사업자 인증을 제출했어요. 보통 영업일 기준 하루 안에 확인돼요.
              <br />
              승인되면 카카오 알림톡으로 바로 알려드릴게요.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-left">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <BadgeCheck className="w-4 h-4 text-brand" aria-hidden="true" />
              인증 신청 완료
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {submittedLabel ? `${submittedLabel} 제출됨` : '제출이 접수되었어요'}
            </p>
          </div>
          <div className="rounded-xl bg-muted p-3.5 text-xs text-muted-foreground break-keep">
            궁금한 점이 있으시면 이용 가이드 또는 문의로 알려주세요.
          </div>
        </div>
      </GateShell>
    );
  }

  // NONE / REJECTED — 신청 폼
  return (
    <GateShell>
      <VerificationForm initial={initial} onDone={() => router.refresh()} />
    </GateShell>
  );
}

function VerificationForm({
  initial,
  onDone,
}: {
  initial: BusinessVerification;
  onDone: () => void;
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
    <div className="w-full">
      <header className="mb-5 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-muted">
          <ShieldCheck className="w-6 h-6 text-brand" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">사업자 인증이 필요해요</h1>
        <p className="text-sm text-muted-foreground mt-1.5 break-keep">
          flori는 사업자 회원 전용 서비스예요. 사업자등록증을 제출하면 확인 후 모든 기능을 이용할 수 있어요.
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

        <p className="text-xs text-muted-foreground">* 담당자가 빠른 시일 내에 확인 후 권한을 부여해드려요.</p>

        <Button type="submit" className="w-full h-11" disabled={pending}>
          {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          인증 신청
        </Button>
      </form>
    </div>
  );
}
