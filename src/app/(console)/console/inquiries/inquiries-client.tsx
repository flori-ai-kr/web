'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  listInquiries,
  answerInquiry,
  setInquiryStatus,
} from '@/lib/actions/admin-inquiries';
import type { InquiryStatus, SupportInquiry } from '@/types/admin';
import { InquiryStatusBadge, InquiryCategoryBadge } from './inquiry-meta';
import { InquiryDetailDialog } from './inquiry-detail-dialog';

type InquiryFilter = InquiryStatus | 'all';

const TABS: { value: InquiryFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'open', label: '접수' },
  { value: 'in_progress', label: '처리중' },
  { value: 'resolved', label: '완료' },
  { value: 'closed', label: '종료' },
];

export function InquiriesClient({ initial }: { initial: SupportInquiry[] }) {
  const [status, setStatus] = useState<InquiryFilter>('all');
  const [rows, setRows] = useState<SupportInquiry[]>(initial);
  const [selected, setSelected] = useState<SupportInquiry | null>(null);
  const [pending, startTransition] = useTransition();

  const fetchByFilter = (filter: InquiryFilter) =>
    listInquiries(filter === 'all' ? undefined : filter);

  const load = (next: InquiryFilter) => {
    setStatus(next);
    startTransition(async () => setRows(await fetchByFilter(next)));
  };
  const refresh = () => startTransition(async () => setRows(await fetchByFilter(status)));

  const onAnswer = (id: number, answer: string, next: InquiryStatus) => {
    if (!answer.trim()) {
      toast.error('답변 내용을 입력하세요');
      return;
    }
    startTransition(async () => {
      try {
        await answerInquiry(id, answer.trim(), next);
        toast.success('답변이 저장되었습니다');
        setSelected(null);
        refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '처리 실패');
      }
    });
  };

  const onSetStatus = (id: number, next: InquiryStatus) => {
    startTransition(async () => {
      try {
        await setInquiryStatus(id, next);
        toast.success('상태가 변경되었습니다');
        setSelected(null);
        refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '처리 실패');
      }
    });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">1:1 문의 · 피드백</h1>
      <Tabs value={status} onValueChange={(v) => load(v as InquiryFilter)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>카테고리</TableHead>
              <TableHead>제목</TableHead>
              <TableHead>작성자</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>등록일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  문의가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              rows.map((q) => (
                <TableRow
                  key={q.id}
                  onClick={() => setSelected(q)}
                  className="cursor-pointer hover:bg-muted/40"
                >
                  <TableCell>
                    <InquiryCategoryBadge category={q.category} />
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{q.title}</TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {q.authorStoreName ?? q.authorNickname ?? `#${q.userId}`}
                    </div>
                    {q.authorStoreName && q.authorNickname && (
                      <div className="text-xs text-muted-foreground">{q.authorNickname}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <InquiryStatusBadge status={q.status} />
                  </TableCell>
                  <TableCell className="tabular-nums">{q.createdAt.slice(0, 10)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <InquiryDetailDialog
        inquiry={selected}
        pending={pending}
        onClose={() => setSelected(null)}
        onAnswer={onAnswer}
        onSetStatus={onSetStatus}
      />
    </div>
  );
}
