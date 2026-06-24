'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PenLine } from 'lucide-react';
import type { MyInquiry } from '@/types/support';
import { InquiryCard } from './inquiry-card';
import { ChannelCards } from './channel-cards';
import { CreateInquiryModal } from './create-inquiry-modal';

export function SupportClient({ initial }: { initial: MyInquiry[] }) {
  const [inquiries, setInquiries] = useState(initial);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="mx-auto max-w-lg space-y-6 p-4">
      {/* CTA */}
      <button
        onClick={() => setShowCreate(true)}
        className="flex w-full items-center justify-between rounded-xl bg-gradient-to-br from-brand to-brand/80 p-5 text-left text-white transition-transform hover:scale-[1.01]"
      >
        <div>
          <div className="text-[15px] font-semibold">문의·제보하기</div>
          <div className="text-xs opacity-80">버그, 기능 제안, 의견 무엇이든!</div>
        </div>
        <PenLine className="h-6 w-6 opacity-80" />
      </button>

      {/* My inquiries */}
      <section>
        <div className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          내 문의
          {inquiries.length > 0 && (
            <span className="rounded-full bg-brand-muted px-1.5 py-0.5 text-[11px] font-bold text-brand">
              {inquiries.length}
            </span>
          )}
        </div>
        {inquiries.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            아직 문의 내역이 없어요
          </div>
        ) : (
          <div className="space-y-2">
            {inquiries.map((inq) => (
              <InquiryCard key={inq.id} inquiry={inq} />
            ))}
          </div>
        )}
      </section>

      {/* Channel cards */}
      <section>
        <div className="mb-2.5 text-sm font-semibold text-muted-foreground">
          다른 방법으로 문의하기
        </div>
        <ChannelCards />
      </section>

      {/* Create modal */}
      <CreateInquiryModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(newInq) => {
          setInquiries((prev) => [newInq, ...prev]);
          setShowCreate(false);
        }}
      />
    </div>
  );
}
