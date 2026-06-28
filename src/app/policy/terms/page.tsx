import type { Metadata } from 'next'
import Link from 'next/link'
import { FLORI_LEGAL, FLORI_LEGAL_JURISDICTION } from '../legal-config'
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
  title: 'flori | 서비스 이용약관',
  description: 'flori 서비스의 이용약관입니다.',
}

const TOC = [
  { id: 'purpose', label: '목적' },
  { id: 'definitions', label: '정의' },
  { id: 'effect', label: '약관의 게시와 개정' },
  { id: 'provision', label: '서비스의 제공 및 변경' },
  { id: 'suspension', label: '서비스의 중단' },
  { id: 'signup', label: '회원가입' },
  { id: 'withdrawal', label: '회원 탈퇴 및 자격 상실' },
  { id: 'member-duty', label: '회원의 의무' },
  { id: 'company-duty', label: '운영자의 의무' },
  { id: 'content', label: '게시물 및 콘텐츠의 귀속' },
  { id: 'paid', label: '유료서비스 및 결제' },
  { id: 'billing', label: '정기결제 및 자동갱신' },
  { id: 'cancel-refund', label: '구독 해지, 청약철회 및 환불' },
  { id: 'liability', label: '책임 제한 및 면책' },
  { id: 'dispute', label: '분쟁 해결, 준거법 및 관할' },
]

export default function TermsOfServicePage() {
  const { serviceName, companyName, termsEffectiveDate } = FLORI_LEGAL
  const { court } = FLORI_LEGAL_JURISDICTION

  return (
    <>
      <article>
        <PolicyHeader title="서비스 이용약관" effectiveDate={termsEffectiveDate} />

        <TableOfContents items={TOC} />

        <Section id="purpose" title="제1조 (목적)">
          <P>
            본 약관은 {companyName}(이하 &lsquo;운영자&rsquo;라 합니다)가 제공하는 {serviceName}{' '}
            서비스(이하 &lsquo;서비스&rsquo;라 합니다)의 이용과 관련하여 운영자와 회원 간의 권리, 의무 및
            책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
          </P>
        </Section>

        <Section id="definitions" title="제2조 (정의)">
          <P>본 약관에서 사용하는 용어의 정의는 다음과 같습니다.</P>
          <OL>
            <li>
              <Term>서비스</Term>: 운영자가 제공하는 매장 운영 관리(매출, 지출, 고객, 예약, 사진 등) 및
              이에 부수하는 일체의 서비스를 의미합니다.
            </li>
            <li>
              <Term>회원</Term>: 본 약관에 동의하고 운영자와 이용계약을 체결하여 서비스를 이용하는 자를
              의미합니다.
            </li>
            <li>
              <Term>계정</Term>: 회원의 식별과 서비스 이용을 위하여 소셜 로그인을 통해 부여되는 소셜
              로그인 식별자 등을 의미합니다.
            </li>
            <li>
              <Term>고객 정보</Term>: 회원이 서비스를 이용하면서 직접 등록하는 자신의 매장 고객에 관한
              개인정보를 의미합니다.
            </li>
            <li>
              <Term>유료서비스</Term>: 운영자가 요금을 받고 제공하는 멤버십 등 유료 기능 및 서비스를
              의미합니다.
            </li>
            <li>
              <Term>결제대행사(PG)</Term>: 운영자를 위하여 신용카드 등 결제수단의 결제 처리 및
              정기결제(빌링) 업무를 대행하는 토스페이먼츠 등 전자결제 사업자를 의미합니다.
            </li>
          </OL>
          <P>
            본 약관에서 정의되지 않은 용어는 관계 법령 및 일반적인 상관례에 따릅니다.
          </P>
        </Section>

        <Section id="effect" title="제3조 (약관의 게시와 개정)">
          <OL>
            <li>운영자는 본 약관의 내용을 회원이 쉽게 확인할 수 있도록 서비스 화면에 게시합니다.</li>
            <li>
              운영자는 「약관의 규제에 관한 법률」 등 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할
              수 있습니다.
            </li>
            <li>
              운영자가 약관을 개정하는 경우 적용일자 및 개정 사유를 명시하여 적용일 7일 전(회원에게
              불리하거나 중대한 변경의 경우 30일 전)부터 서비스 내 공지사항을 통해 공지합니다.
            </li>
            <li>
              회원이 개정 약관의 적용일 이후 서비스를 계속 이용하는 경우 개정된 약관에 동의한 것으로
              봅니다.
            </li>
          </OL>
        </Section>

        <Section id="provision" title="제4조 (서비스의 제공 및 변경)">
          <OL>
            <li>운영자는 회원에게 매장 운영 관리 등 본 약관에서 정한 서비스를 제공합니다.</li>
            <li>
              운영자는 운영상·기술상의 필요에 따라 제공하는 서비스의 내용을 변경할 수 있으며, 이 경우
              변경 사유와 내용을 사전에 공지합니다.
            </li>
            <li>서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다.</li>
          </OL>
        </Section>

        <Section id="suspension" title="제5조 (서비스의 중단)">
          <OL>
            <li>
              운영자는 시스템 점검·보수·교체, 설비 장애, 통신 두절 등 운영상 상당한 이유가 있는 경우
              서비스의 제공을 일시적으로 중단할 수 있습니다.
            </li>
            <li>
              제1항에 의한 서비스 중단의 경우 운영자는 사전에 공지함을 원칙으로 하되, 부득이한 사유가 있는
              경우 사후에 공지할 수 있습니다.
            </li>
            <li>
              천재지변, 국가 비상사태 등 운영자가 통제할 수 없는 사유로 서비스를 제공할 수 없는 경우
              운영자는 서비스 제공에 관한 책임이 면제됩니다.
            </li>
          </OL>
        </Section>

        <Section id="signup" title="제6조 (회원가입)">
          <OL>
            <li>
              이용 신청자는 운영자가 정한 절차에 따라 본 약관 및 개인정보 처리방침에 동의하고 가입을
              신청합니다.
            </li>
            <li>
              운영자는 이용 신청자의 신청에 대하여 승낙함을 원칙으로 하되, 다음 각 호의 경우 승낙을
              유보하거나 거절할 수 있습니다.
            </li>
          </OL>
          <UL>
            <li>실명이 아니거나 타인의 정보를 이용하여 신청한 경우</li>
            <li>허위 정보를 기재하거나 운영자가 요청하는 사항을 기재하지 않은 경우</li>
            <li>이전에 회원 자격을 상실한 적이 있는 경우(운영자의 재가입 승낙을 받은 경우는 제외)</li>
            <li>기타 회원으로 등록하는 것이 서비스 운영에 현저히 지장이 있다고 판단되는 경우</li>
          </UL>
        </Section>

        <Section id="withdrawal" title="제7조 (회원 탈퇴 및 자격 상실)">
          <OL>
            <li>회원은 언제든지 서비스 내 절차를 통해 탈퇴를 요청할 수 있으며, 운영자는 지체 없이 이를 처리합니다.</li>
            <li>
              회원이 다음 각 호의 사유에 해당하는 경우 운영자는 회원 자격을 제한·정지 또는 상실시킬 수
              있습니다.
            </li>
          </OL>
          <UL>
            <li>가입 신청 시 허위 내용을 등록한 경우</li>
            <li>다른 회원 또는 제3자의 권리나 명예를 침해하거나 서비스 운영을 방해한 경우</li>
            <li>본 약관 또는 관계 법령을 위반한 경우</li>
          </UL>
          <P>
            회원 탈퇴 또는 자격 상실 시 개인정보의 처리는 운영자의 개인정보 처리방침에 따릅니다.
          </P>
        </Section>

        <Section id="member-duty" title="제8조 (회원의 의무)">
          <OL>
            <li>회원은 본 약관 및 관계 법령, 운영자가 공지하는 사항을 준수하여야 합니다.</li>
            <li>회원은 계정 정보를 선량한 관리자의 주의로 관리하여야 하며, 이를 제3자에게 양도·대여할 수 없습니다.</li>
            <li>
              회원은 서비스에 고객 정보를 등록·이용하기에 앞서 해당 고객으로부터 개인정보의 수집·이용에
              관한 적법한 동의를 확보하여야 하며, 등록한 고객 정보의 적법성·정확성에 대한 책임은
              회원에게 있습니다. 회원의 동의 미확보로 인하여 발생하는 분쟁 및 책임은 회원이 부담합니다.
            </li>
            <li>회원은 서비스를 본래의 이용 목적 외의 용도로 사용하거나 부정하게 이용해서는 안 됩니다.</li>
          </OL>
        </Section>

        <Section id="company-duty" title="제9조 (운영자의 의무)">
          <OL>
            <li>운영자는 관계 법령과 본 약관을 준수하며, 안정적이고 지속적인 서비스 제공을 위해 노력합니다.</li>
            <li>
              운영자는 회원의 개인정보를 보호하기 위하여 관련 법령이 정하는 바에 따라 개인정보 처리방침을
              수립·공개하고 이를 준수합니다.
            </li>
            <li>운영자는 회원으로부터 제기되는 의견이나 불만이 정당하다고 인정되는 경우 이를 적절히 처리하기 위해 노력합니다.</li>
          </OL>
        </Section>

        <Section id="content" title="제10조 (게시물 및 콘텐츠의 귀속)">
          <OL>
            <li>
              회원이 서비스 내에 등록·입력한 매장 운영 데이터 및 콘텐츠(이하 &lsquo;게시물&rsquo;)에 대한
              권리와 책임은 이를 등록한 회원에게 있습니다.
            </li>
            <li>
              운영자는 서비스의 제공·운영·개선 및 백업을 위해 필요한 범위 내에서 게시물을 저장·복제·처리할
              수 있으며, 이 범위를 초과하여 게시물을 이용하지 않습니다.
            </li>
            <li>
              회원이 작성한 게시물이 관계 법령에 위반되거나 제3자의 권리를 침해하는 경우 운영자는 관련
              법령에 따라 해당 게시물에 대한 조치를 취할 수 있습니다.
            </li>
          </OL>
        </Section>

        <Section id="paid" title="제11조 (유료서비스 및 결제)">
          <OL>
            <li>
              운영자는 무료서비스와 별도로 유료서비스(베이직 등 멤버십)를 제공할 수 있으며, 유료서비스의
              종류·내용·요금·결제주기 등 거래 조건은 서비스 화면 또는 요금제 안내를 통해 게시합니다.
            </li>
            <li>
              유료서비스의 결제는 <Term>결제대행사(PG, 토스페이먼츠 등)</Term>를 통한 신용·체크카드
              정기결제로 이루어지며, 운영자는 회원의 카드번호 등 결제수단 정보를 직접 보관하지 않습니다.
            </li>
            <li>
              회원이 유료서비스를 신청하는 경우 본 약관 및 결제·자동갱신에 관한 사항에 동의한 것으로 보며,
              운영자는 결제 전 결제금액·결제주기·자동갱신 여부를 회원이 명확히 인지할 수 있도록 고지합니다.
            </li>
            <li>
              요금은 운영자의 정책 또는 관계 법령에 따라 변경될 수 있으며, 변경 시 적용일 이전에 서비스 내
              공지 또는 전자적 방법으로 회원에게 고지합니다. 요금 변경은 이미 결제가 완료된 이용기간에는
              영향을 미치지 않습니다.
            </li>
          </OL>
        </Section>

        <Section id="billing" title="제12조 (정기결제 및 자동갱신)">
          <OL>
            <li>
              유료서비스는 회원이 선택한 결제주기(월간 또는 연간)에 따라 회원이 등록한 결제수단으로 매
              주기마다 <Term>자동으로 결제·갱신</Term>됩니다.
            </li>
            <li>
              자동갱신은 각 결제주기 만료 시 동일한 조건으로 다음 기간이 자동 연장되는 방식이며, 회원은
              다음 결제일 전까지 언제든지 서비스 내 절차를 통해 자동갱신(구독)을 해지할 수 있습니다.
            </li>
            <li>
              운영자가 무료 체험을 제공하는 경우, 체험 기간이 종료되면 회원이 그 전에 해지하지 않는 한
              자동으로 유료 정기결제로 전환되며, 운영자는 전환 전 가능한 범위에서 이를 회원에게 안내합니다.
            </li>
            <li>
              등록된 결제수단의 한도 초과·유효기간 만료 등의 사유로 결제가 실패하는 경우 유료서비스 이용이
              제한될 수 있으며, 운영자는 일정 기간 동안 재결제를 시도할 수 있습니다.
            </li>
          </OL>
        </Section>

        <Section id="cancel-refund" title="제13조 (구독 해지, 청약철회 및 환불)">
          <OL>
            <li>
              회원은 언제든지 서비스 내 절차를 통해 구독을 해지할 수 있으며, 해지 시 다음 결제일부터
              자동결제가 중단되고 이미 결제한 이용기간은 만료까지 이용할 수 있습니다.
            </li>
            <li>
              청약철회 및 환불에 관한 구체적인 사항은 「전자상거래 등에서의 소비자보호에 관한 법률」 및
              운영자가 별도로 게시하는 <Term>환불정책</Term>에 따릅니다.
            </li>
          </OL>
        </Section>

        <Section id="liability" title="제14조 (책임 제한 및 면책)">
          <OL>
            <li>
              운영자는 천재지변, 불가항력, 회원의 귀책사유로 인한 서비스 이용 장애에 대하여 책임을 지지
              않습니다.
            </li>
            <li>
              운영자는 회원이 서비스에 등록한 정보·자료의 신뢰도, 정확성에 대하여 책임을 지지 않으며,
              회원 상호 간 또는 회원과 제3자 간에 서비스를 매개로 발생한 분쟁에 대하여 개입할 의무가
              없습니다.
            </li>
            <li>
              운영자는 무료로 제공되는 서비스의 이용과 관련하여 관계 법령에 특별한 규정이 없는 한 책임을
              지지 않습니다.
            </li>
          </OL>
        </Section>

        <Section id="dispute" title="제15조 (분쟁 해결, 준거법 및 관할)">
          <OL>
            <li>본 약관 및 서비스 이용에 관하여는 대한민국 법령을 준거법으로 합니다.</li>
            <li>
              서비스 이용과 관련하여 운영자와 회원 간에 발생한 분쟁에 관한 소송의 관할 법원은{' '}
              {court}으로 합니다.
            </li>
            <li>본 약관의 시행일은 {termsEffectiveDate}입니다.</li>
          </OL>
        </Section>
      </article>

      <nav
        aria-label="다른 정책 문서"
        className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-sm"
      >
        <Link
          href="/policy/privacy"
          className="rounded-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          개인정보 처리방침
        </Link>
        <Link
          href="/policy/marketing"
          className="rounded-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          마케팅·혜택 정보 수신 동의
        </Link>
      </nav>
    </>
  )
}
