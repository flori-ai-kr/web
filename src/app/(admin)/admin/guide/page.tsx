import type {Metadata} from 'next';
import {
  CalendarDays,
  ChevronDown,
  HelpCircle,
  Image as ImageIcon,
  type LucideIcon,
  MessagesSquare,
  Receipt,
  Settings,
  Users,
  Wallet,
} from 'lucide-react';
import {PageHeader} from '@/components/layout/page-header';
import {GUIDE_FAQS, GUIDE_SECTIONS} from '@/lib/guide-content';

export const metadata: Metadata = {title: '이용 가이드'};

const ICONS: Record<string, LucideIcon> = {
  receipt: Receipt,
  wallet: Wallet,
  users: Users,
  image: ImageIcon,
  'calendar-days': CalendarDays,
  'messages-square': MessagesSquare,
  settings: Settings,
};

export default function GuidePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="이용 가이드"
        description="flori 주요 기능과 자주 묻는 질문을 모았어요."
      />

      {/* 섹션 바로가기 */}
      <nav aria-label="가이드 섹션 바로가기" className="flex flex-wrap gap-2">
        {GUIDE_SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-foreground hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {section.title}
          </a>
        ))}
        <a
          href="#faq"
          className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-foreground hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          자주 묻는 질문
        </a>
      </nav>

      {/* 기능별 가이드 */}
      <div className="space-y-4">
        {GUIDE_SECTIONS.map((section) => {
          const Icon = ICONS[section.iconKey] ?? HelpCircle;
          return (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-20 rounded-2xl border border-border bg-card p-5 sm:p-6"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground break-keep">{section.summary}</p>
                </div>
              </div>

              <ol className="mt-4 space-y-2.5">
                {section.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-foreground">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-brand-foreground"
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <span className="leading-relaxed break-keep">{step}</span>
                  </li>
                ))}
              </ol>

              {section.tip && (
                <p className="mt-4 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground break-keep">
                  💡 {section.tip}
                </p>
              )}
            </section>
          );
        })}
      </div>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <HelpCircle className="h-5 w-5 text-brand" aria-hidden="true" />
          자주 묻는 질문
        </h2>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {GUIDE_FAQS.map((faq, i) => (
            <details key={i} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-medium text-foreground hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                <span className="break-keep">{faq.q}</span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground break-keep">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
