import type { Metadata } from 'next'
import Link from 'next/link'
import { FLORI_LEGAL } from '../legal-config'
import {
  PolicyHeader,
  TableOfContents,
  Section,
  P,
  UL,
  OL,
  Term,
} from '../policy-ui'

export const metadata: Metadata = {
  title: 'flori | 마케팅·혜택 정보 수신 동의',
  description: 'flori 서비스의 광고성 정보 수신 동의 안내입니다.',
}

const TOC = [
  { id: 'purpose', label: '목적 및 근거' },
  { id: 'items', label: '수신 동의 항목(광고성 정보의 내용)' },
  { id: 'methods', label: '수신 방법' },
  { id: 'optional', label: '선택적 동의' },
  { id: 'withdrawal', label: '수신 동의의 철회' },
  { id: 'night', label: '야간 광고성 정보 전송 제한' },
  { id: 'contact', label: '문의 및 시행일' },
]

export default function MarketingConsentPage() {
  const { serviceName, companyName, contactEmail, marketingEffectiveDate } = FLORI_LEGAL

  return (
    <>
      <article>
        <PolicyHeader title="마케팅·혜택 정보 수신 동의" effectiveDate={marketingEffectiveDate} />

        <TableOfContents items={TOC} />

        <Section id="purpose" title="제1조 (목적 및 근거)">
          <P>
            본 동의는 {companyName}(이하 &lsquo;운영자&rsquo;라 합니다)가 제공하는 {serviceName}{' '}
            서비스(이하 &lsquo;서비스&rsquo;라 합니다)와 관련하여, 회원에게 신규 기능·혜택·이벤트 등
            광고성 정보를 전송하기 위한 것입니다.
          </P>
          <P>
            운영자는 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 제50조에 따라, 영리 목적의
            광고성 정보를 전송하기 전에 회원으로부터 사전 수신 동의를 받습니다.
          </P>
        </Section>

        <Section id="items" title="제2조 (수신 동의 항목 — 광고성 정보의 내용)">
          <P>운영자가 본 동의에 따라 전송하는 광고성 정보의 내용은 다음과 같습니다.</P>
          <UL>
            <li>신규 기능 및 서비스 업데이트 안내</li>
            <li>혜택·할인·프로모션 안내</li>
            <li>이벤트 및 캠페인 안내</li>
            <li>꽃집 운영에 도움이 되는 정보 및 소식</li>
          </UL>
          <P>
            거래·계약·고객 지원에 관한 안내(예: 결제·구독 안내, 예약 리마인더, 공지사항, 보안·약관 변경
            고지 등)는 광고성 정보가 아니므로 본 동의 여부와 관계없이 발송됩니다.
          </P>
        </Section>

        <Section id="methods" title="제3조 (수신 방법)">
          <P>광고성 정보는 다음의 방법으로 전송될 수 있습니다.</P>
          <UL>
            <li>앱 푸시 알림</li>
            <li>이메일</li>
            <li>카카오 알림톡(또는 친구톡) 등 메시지</li>
          </UL>
        </Section>

        <Section id="optional" title="제4조 (선택적 동의)">
          <P>
            본 마케팅·혜택 정보 수신 동의는 <Term>선택 사항</Term>입니다. 회원이 본 동의를 하지 않더라도
            서비스의 가입 및 이용에는 어떠한 제한도 없습니다.
          </P>
        </Section>

        <Section id="withdrawal" title="제5조 (수신 동의의 철회)">
          <OL>
            <li>
              회원은 동의 이후에도 언제든지 서비스 내 <Term>설정 화면</Term>에서 수신 동의를 철회할 수
              있으며, 이메일 등 메시지 내 수신거부(구독취소) 기능을 통해서도 철회할 수 있습니다.
            </li>
            <li>
              수신 동의를 철회하면 운영자는 지체 없이 광고성 정보의 발송을 중단합니다. 다만 거래·계약·고객
              지원에 관한 안내성 메시지는 철회와 관계없이 계속 발송됩니다.
            </li>
          </OL>
        </Section>

        <Section id="night" title="제6조 (야간 광고성 정보 전송 제한)">
          <P>
            운영자는 오후 9시부터 다음 날 오전 8시까지의 시간에 광고성 정보를 전송하고자 하는 경우, 본
            동의와 별도로 회원의 사전 수신 동의를 받습니다. 다만 위 시간대에도 회원이 별도로 동의한 경우
            또는 법령상 허용되는 경우에는 전송될 수 있습니다.
          </P>
        </Section>

        <Section id="contact" title="제7조 (문의 및 시행일)">
          <OL>
            <li>
              본 동의 및 광고성 정보 수신과 관련한 문의는 이메일{' '}
              <a
                href={`mailto:${contactEmail}`}
                className="font-medium text-brand underline underline-offset-2"
              >
                {contactEmail}
              </a>
              로 연락해 주세요.
            </li>
            <li>본 마케팅·혜택 정보 수신 동의의 시행일은 {marketingEffectiveDate}입니다.</li>
          </OL>
        </Section>
      </article>

      <nav
        aria-label="다른 정책 문서"
        className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-sm"
      >
        <Link
          href="/policy/terms"
          className="rounded-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          서비스 이용약관
        </Link>
        <Link
          href="/policy/privacy"
          className="rounded-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          개인정보 처리방침
        </Link>
      </nav>
    </>
  )
}
