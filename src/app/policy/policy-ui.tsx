import type { ReactNode } from 'react'

/**
 * 정책 문서(처리방침·이용약관) 공용 프레젠테이션 컴포넌트.
 * 전부 globals.css 토큰만 사용 → 다크모드 자동 대응.
 */

/** 문서 제목 + 시행일. */
export function PolicyHeader({
  title,
  effectiveDate,
}: {
  title: string
  effectiveDate: string
}) {
  return (
    <header className="mb-8 border-b border-border pb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">시행일: {effectiveDate}</p>
    </header>
  )
}

/** 앵커 기반 목차. items: { id, label }. */
export function TableOfContents({ items }: { items: { id: string; label: string }[] }) {
  return (
    <nav
      aria-label="목차"
      className="mb-10 rounded-lg border border-border bg-card p-4 sm:p-5"
    >
      <h2 className="mb-3 text-sm font-semibold text-foreground">목차</h2>
      <ol className="space-y-1.5">
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="inline-flex gap-2 rounded-sm text-sm leading-relaxed text-muted-foreground transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="tabular-nums text-muted-foreground/70">{i + 1}.</span>
              <span>{item.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

/** 번호 매긴 조항 섹션. id로 목차 앵커 연결. */
export function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-border py-8 first:border-t-0 first:pt-0">
      <h2 className="text-lg font-semibold text-foreground sm:text-xl">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-7 text-foreground/90">{children}</div>
    </section>
  )
}

/** 본문 문단. */
export function P({ children }: { children: ReactNode }) {
  return <p className="leading-7">{children}</p>
}

/** 글머리표 목록. */
export function UL({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 leading-7 marker:text-muted-foreground">{children}</ul>
}

/** 번호 목록. */
export function OL({ children }: { children: ReactNode }) {
  return <ol className="list-decimal space-y-2 pl-5 leading-7 marker:text-muted-foreground">{children}</ol>
}

/** 강조(소제목 인라인). */
export function Term({ children }: { children: ReactNode }) {
  return <span className="font-medium text-foreground">{children}</span>
}

/**
 * 모바일 안전 정의형 표.
 * rows: 각 항목은 라벨 + 값 쌍의 카드. 데스크톱·모바일 모두 가로 넘침 없이 세로로 쌓인다.
 * 처리 위탁 표처럼 다열 데이터를 표현할 때 사용.
 */
export function DefinitionTable({
  caption,
  rows,
}: {
  caption?: string
  rows: { heading: string; fields: { label: string; value: ReactNode }[] }[]
}) {
  return (
    <div className="space-y-3">
      {caption && <p className="text-sm text-muted-foreground">{caption}</p>}
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.heading} className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">{row.heading}</p>
            <dl className="mt-3 space-y-2">
              {row.fields.map((field) => (
                <div
                  key={field.label}
                  className="flex flex-col gap-0.5 sm:flex-row sm:gap-3"
                >
                  <dt className="shrink-0 text-xs font-medium text-muted-foreground sm:w-28">
                    {field.label}
                  </dt>
                  <dd className="text-sm leading-6 text-foreground/90">{field.value}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  )
}
