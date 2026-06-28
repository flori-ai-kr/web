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
  DefinitionTable,
} from '../policy-ui'

export const metadata: Metadata = {
  title: 'flori | 개인정보 처리방침',
  description: 'flori 서비스의 개인정보 처리방침입니다.',
}

const TOC = [
  { id: 'general', label: '총칙 및 목적' },
  { id: 'items', label: '수집하는 개인정보 항목 및 수집 방법' },
  { id: 'purpose', label: '개인정보의 수집 및 이용 목적' },
  { id: 'retention', label: '개인정보의 보유 및 이용 기간' },
  { id: 'third-party', label: '개인정보의 제3자 제공' },
  { id: 'consignment', label: '개인정보 처리의 위탁' },
  { id: 'overseas-transfer', label: '개인정보의 국외이전' },
  { id: 'customer-data', label: '회원이 등록한 고객(제3자) 개인정보의 처리' },
  { id: 'rights', label: '정보주체와 법정대리인의 권리·의무 및 행사 방법' },
  { id: 'destruction', label: '개인정보의 파기 절차 및 방법' },
  { id: 'security', label: '개인정보의 안전성 확보 조치' },
  { id: 'cookies', label: '쿠키 등 자동 수집 장치의 운영 및 거부' },
  { id: 'officer', label: '개인정보 보호책임자' },
  { id: 'remedy', label: '권익침해 구제 방법' },
  { id: 'notice', label: '고지의 의무' },
]

export default function PrivacyPolicyPage() {
  const { serviceName, companyName, privacyOfficer, privacyEffectiveDate } = FLORI_LEGAL

  return (
    <>
      <article>
        <PolicyHeader title="개인정보 처리방침" effectiveDate={privacyEffectiveDate} />

        <TableOfContents items={TOC} />

        <Section id="general" title="제1조 (총칙 및 목적)">
          <P>
            {companyName}(이하 &lsquo;운영자&rsquo;라 합니다)는 {serviceName} 서비스(이하
            &lsquo;서비스&rsquo;라 합니다)를 운영함에 있어 이용자의 개인정보를 중요하게 생각하며,
            「개인정보 보호법」 등 관련 법령을 준수합니다.
          </P>
          <P>
            본 개인정보 처리방침은 운영자가 제공하는 서비스를 이용하는 회원의 개인정보가 어떠한 항목으로
            수집되고, 어떤 목적으로 이용되며, 어떻게 보호·관리되는지를 안내하기 위해 마련되었습니다.
          </P>
          <P>
            운영자는 본 처리방침을 서비스 초기 화면 또는 연결 화면을 통해 회원이 언제든지 쉽게 확인할 수
            있도록 공개하고 있습니다.
          </P>
        </Section>

        <Section id="items" title="제2조 (수집하는 개인정보 항목 및 수집 방법)">
          <P>운영자는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.</P>
          <UL>
            <li>
              <Term>회원가입 및 인증</Term>: 소셜 로그인을 통한 소셜 서비스 식별자·닉네임 및 해당 소셜
              서비스가 제공하는 경우 이메일 주소(카카오, 구글, 네이버). 운영자는 자체 비밀번호를 수집하지
              않습니다.
            </li>
            <li>
              <Term>온보딩 프로필 정보</Term>: 가게명, 지역(시/도 및 시/군/구), 사장님 나이대, 관심사,
              가게 주력 상품
            </li>
            <li>
              <Term>서비스 이용 중 생성·입력되는 정보</Term>: 회원이 입력하는 매장 운영 데이터(매출,
              지출, 예약, 사진 등) 및 회원이 직접 등록하는 고객 정보(이름, 연락처, 성별 등) — 회원이
              등록한 고객 정보의 처리에 관하여는 제8조에서 별도로 정합니다.
            </li>
            <li>
              <Term>AI 기능 이용 정보</Term>: 회원이 AI 기능(채팅, 이미지 인식(OCR), 데이터 분석 등)을
              이용하는 과정에서 입력·전송되는 정보(고객 이름·전화번호, 예약·주문 내역, 대화·스크린샷
              이미지, 음성 등). 해당 정보의 국외 처리에 관하여는 제7조에서 별도로 정합니다.
            </li>
            <li>
              <Term>푸시 알림 정보</Term>: 푸시 알림 수신에 동의한 경우 푸시 구독 정보(엔드포인트/토큰),
              기기 정보
            </li>
            <li>
              <Term>결제 정보</Term>: 유료서비스 결제 시 결제·구독 내역(결제수단 종류, 결제 일시·금액,
              결제 식별자 등). 신용카드 번호 등 결제수단의 민감정보는 운영자가 직접 보관하지 않으며
              결제대행사(PG)가 처리합니다.
            </li>
            <li>
              <Term>자동 수집 정보</Term>: 서비스 이용 과정에서 접속 로그, IP 주소, 쿠키(인증 토큰 및
              분석용 쿠키), 기기 및 브라우저 정보가 자동으로 생성되어 수집될 수 있습니다.
            </li>
          </UL>
          <P>개인정보 수집 방법은 다음과 같습니다.</P>
          <UL>
            <li>회원가입, 온보딩, 서비스 이용 과정에서 회원이 직접 입력하는 방법</li>
            <li>소셜 로그인 제공자를 통해 회원이 동의한 정보를 전달받는 방법</li>
            <li>서비스 이용 과정에서 생성정보 수집 도구를 통해 자동으로 수집되는 방법</li>
          </UL>
        </Section>

        <Section id="purpose" title="제3조 (개인정보의 수집 및 이용 목적)">
          <P>운영자는 수집한 개인정보를 다음의 목적을 위해 이용합니다.</P>
          <UL>
            <li>회원 식별 및 인증, 계정 관리</li>
            <li>매장 운영 관리 등 서비스의 제공 및 운영</li>
            <li>온보딩 프로필 정보를 활용한 맞춤 추천 및 개인화 서비스 제공</li>
            <li>채팅·이미지 인식(OCR)·데이터 분석 등 AI 기능의 제공</li>
            <li>예약 리마인더 등 푸시 알림 및 카카오 알림톡·SMS 등 안내 메시지의 발송</li>
            <li>유료서비스의 결제·정기결제 처리 및 구독 관리</li>
            <li>문의 및 민원 처리, 공지사항 전달 등 고객 지원</li>
            <li>서비스 이용 통계 분석 및 서비스 품질 개선</li>
          </UL>
        </Section>

        <Section id="retention" title="제4조 (개인정보의 보유 및 이용 기간)">
          <P>
            운영자는 원칙적으로 회원의 개인정보를 회원 탈퇴 시 지체 없이 파기합니다. 다만 관계 법령에서
            일정 기간 보존을 정한 경우에는 해당 기간 동안 보관합니다.
          </P>
          <P>관계 법령에 따른 보존 항목 및 기간의 예시는 다음과 같습니다.</P>
          <UL>
            <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
            <li>대금 결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
            <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
            <li>접속에 관한 기록(로그): 3개월 (통신비밀보호법)</li>
          </UL>
          <P>
            구체적인 보존 항목 및 기간은 운영자의 서비스 운영 정책 및 관계 법령에 따라 확정되며, 위
            기간이 경과한 개인정보는 제10조의 절차에 따라 파기합니다.
          </P>
        </Section>

        <Section id="third-party" title="제5조 (개인정보의 제3자 제공)">
          <P>
            운영자는 회원의 개인정보를 본 처리방침에서 고지한 범위를 초과하여 이용하거나 제3자에게
            제공하지 않습니다. 다만 다음의 경우에는 예외로 합니다.
          </P>
          <UL>
            <li>회원이 사전에 제3자 제공에 동의한 경우</li>
            <li>
              법령에 특별한 규정이 있거나 수사기관이 적법한 절차에 따라 요청하는 등 법령상 의무를
              준수하기 위해 불가피한 경우
            </li>
          </UL>
        </Section>

        <Section id="consignment" title="제6조 (개인정보 처리의 위탁)">
          <P>
            운영자는 안정적인 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 외부에 위탁하고 있으며,
            일부 수탁업체는 국외에 위치하여 개인정보가 국외로 이전될 수 있습니다(국외이전 상세는 제7조 참조).
            운영자는 위탁 계약 시 개인정보가 안전하게 관리될 수 있도록 필요한 사항을 규정하고 있습니다.
          </P>
          <DefinitionTable
            caption="수탁사 목록은 실제 계약 현황에 따라 갱신될 수 있습니다."
            rows={[
              {
                heading: 'Amazon Web Services, Inc. (AWS)',
                fields: [
                  { label: '위탁 업무', value: '서비스 호스팅·데이터베이스 운영, 이미지 저장 및 콘텐츠 전송(CDN)' },
                  { label: '이전 국가', value: '대한민국(서울 리전). 단, 이미지 전송(CloudFront CDN)은 전 세계 엣지 로케이션에서 캐시·전송될 수 있음' },
                  { label: '이전 항목', value: '서비스 이용 과정에서 처리되는 개인정보 일체(접속 로그·요청 데이터, 회원이 업로드한 이미지 및 관련 메타데이터 등)' },
                  { label: '보유 기간', value: '위탁 계약 종료 또는 회원 탈퇴 시까지' },
                ],
              },
              {
                heading: 'Amazon Web Services, Inc. (AWS Bedrock — AI 추론)',
                fields: [
                  { label: '위탁 업무', value: 'AI 기능(채팅·이미지 인식(OCR)·데이터 분석)의 추론 처리' },
                  { label: '이전 국가', value: '미국 (US East / us-east-1 리전)' },
                  { label: '이전 항목', value: 'AI 기능 이용 시 회원이 입력·전송하는 정보(고객 이름·전화번호, 예약·주문 내역, 대화·스크린샷 이미지, 음성 등)' },
                  { label: '보유 기간', value: '추론 처리 완료 시까지(입력 데이터는 모델 학습에 사용되지 않음)' },
                ],
              },
              {
                heading: '토스페이먼츠(주)',
                fields: [
                  { label: '위탁 업무', value: '신용·체크카드 등 결제 처리 및 정기결제(빌링) 대행' },
                  { label: '이전 국가', value: '대한민국 (국내)' },
                  { label: '이전 항목', value: '결제 승인 및 정기결제에 필요한 정보(결제수단 정보, 결제 금액·일시 등)' },
                  { label: '보유 기간', value: '위탁 계약 종료 또는 관계 법령에서 정한 보존기간까지' },
                ],
              },
              {
                heading: '㈜누리고 (SOLAPI)',
                fields: [
                  { label: '위탁 업무', value: '카카오 알림톡 및 SMS 등 메시지 발송 대행' },
                  { label: '이전 국가', value: '대한민국 (국내)' },
                  { label: '이전 항목', value: '수신자 전화번호, 발송 내역(예약 안내·인증 등 거래·안내성 메시지)' },
                  { label: '보유 기간', value: '위탁 계약 종료 또는 관계 법령에서 정한 보존기간까지' },
                ],
              },
              {
                heading: '소셜 로그인 제공자 (카카오·네이버)',
                fields: [
                  { label: '위탁 업무', value: '소셜 로그인 인증' },
                  { label: '이전 국가', value: '대한민국 (국내)' },
                  { label: '이전 항목', value: '소셜 서비스 식별자, 닉네임, (제공 시) 이메일' },
                  { label: '보유 기간', value: '인증 처리 완료 시까지' },
                ],
              },
              {
                heading: '소셜 로그인 제공자 (구글 / Google LLC)',
                fields: [
                  { label: '위탁 업무', value: '소셜 로그인 인증' },
                  { label: '이전 국가', value: '미국 등 국외' },
                  { label: '이전 항목', value: '소셜 서비스 식별자, 닉네임, (제공 시) 이메일' },
                  { label: '보유 기간', value: '인증 처리 완료 시까지' },
                ],
              },
              {
                heading: 'Discord, Inc.',
                fields: [
                  { label: '위탁 업무', value: '서비스 운영 알림 수신(가입·문의 등 내부 운영 알림 채널)' },
                  { label: '이전 국가', value: '미국 등 국외' },
                  { label: '이전 항목', value: '운영 알림에 포함되는 회원 식별정보(이름·이메일·전화번호 등)' },
                  { label: '보유 기간', value: '알림 메시지 보관 정책 또는 위탁 계약 종료 시까지' },
                ],
              },
              {
                heading: 'Google LLC (Firebase Cloud Messaging)',
                fields: [
                  { label: '위탁 업무', value: '모바일 앱 푸시 알림 메시지 전송' },
                  { label: '이전 국가', value: '미국 등 국외' },
                  { label: '이전 항목', value: '푸시 토큰, 기기 정보' },
                  { label: '보유 기간', value: '푸시 구독 해지 또는 회원 탈퇴 시까지' },
                ],
              },
              {
                heading: '브라우저 푸시 서비스 (Google·Apple·Mozilla 등)',
                fields: [
                  { label: '위탁 업무', value: '웹 푸시 알림 메시지 전송(브라우저 푸시 서비스 경유)' },
                  { label: '이전 국가', value: '미국 등 국외' },
                  { label: '이전 항목', value: '푸시 구독 정보(엔드포인트/토큰)' },
                  { label: '보유 기간', value: '푸시 구독 해지 또는 회원 탈퇴 시까지' },
                ],
              },
              {
                heading: '웹 분석 서비스 (Google LLC — Google Analytics)',
                fields: [
                  { label: '위탁 업무', value: '서비스 이용 통계 분석(Google Analytics 4)' },
                  { label: '이전 국가', value: '미국 등 국외' },
                  { label: '이전 항목', value: '쿠키를 통한 온라인 식별자, 접속·이용 기록(페이지뷰·이벤트 등), 기기·브라우저 정보, IP 주소' },
                  { label: '보유 기간', value: 'Google Analytics 데이터 보관 정책에 따름' },
                ],
              },
              {
                heading: '사용성 분석 서비스 (Microsoft Corporation — Clarity)',
                fields: [
                  { label: '위탁 업무', value: '사용성 분석(세션 리플레이·히트맵)' },
                  { label: '이전 국가', value: '미국 등 국외' },
                  { label: '이전 항목', value: '쿠키를 통한 온라인 식별자, 페이지 상호작용 기록(클릭·스크롤·이동 경로 등), IP 주소' },
                  { label: '보유 기간', value: 'Microsoft Clarity 데이터 보관 정책에 따름' },
                ],
              },
              {
                heading: '제품 사용성 분석 서비스 (PostHog, Inc.)',
                fields: [
                  { label: '위탁 업무', value: '제품 사용성 분석(이벤트 자동 수집)' },
                  { label: '이전 국가', value: '미국 등 국외' },
                  { label: '이전 항목', value: '쿠키·온라인 식별자를 통한 사용 행동 기록, IP 주소' },
                  { label: '보유 기간', value: 'PostHog 데이터 보관 정책에 따름' },
                ],
              },
              {
                heading: '광고 전환 분석 서비스 (Meta Platforms, Inc. — Meta Pixel)',
                fields: [
                  { label: '위탁 업무', value: '광고 전환 추적·측정(Meta Pixel, 홈페이지)' },
                  { label: '이전 국가', value: '미국 등 국외' },
                  { label: '이전 항목', value: '쿠키를 통한 온라인 식별자, 페이지 조회·전환 이벤트(페이지뷰, 사전등록 완료 등)' },
                  { label: '보유 기간', value: 'Meta 데이터 보관 정책에 따름' },
                ],
              },
              {
                heading: 'ImprovMX',
                fields: [
                  { label: '위탁 업무', value: '도메인 이메일 수신 포워딩' },
                  { label: '이전 국가', value: '미국 등 국외' },
                  { label: '이전 항목', value: '수신 이메일에 포함된 개인정보(발신자 정보, 메일 본문 등)' },
                  { label: '보유 기간', value: '메일 전달 처리 완료 시까지' },
                ],
              },
            ]}
          />
        </Section>

        <Section id="overseas-transfer" title="제7조 (개인정보의 국외이전)">
          <P>
            운영자는 제6조의 위탁에 따라 일부 개인정보를 국외(주로 미국)에 위치한 수탁사의 설비를 통해
            처리하며, 「개인정보 보호법」 제28조의8에 따라 국외이전 현황을 아래와 같이 고지합니다. 본
            국외이전은 위탁·보관에 따른 이전으로, 운영자는 같은 법에 따라 본 처리방침의 공개로 고지에
            갈음합니다.
          </P>
          <P>
            특히 <Term>AI 기능(채팅·이미지 인식·데이터 분석)</Term>은 미국 리전의 AWS Bedrock을 통해
            추론 처리되므로, 회원이 AI 기능에 입력하는 정보(고객 이름·전화번호, 예약·주문 내역,
            대화·스크린샷 이미지, 음성 등)가 국외로 이전됩니다. 회원은 AI 기능에 타인의 민감정보나
            불필요한 개인정보를 입력하지 않도록 유의해 주시기 바랍니다.
          </P>
          <DefinitionTable
            rows={[
              {
                heading: 'Amazon Web Services, Inc. (AWS Bedrock)',
                fields: [
                  { label: '이전 국가', value: '미국 (us-east-1 리전)' },
                  { label: '이전 일시·방법', value: '회원이 AI 기능을 이용하는 시점에 정보통신망을 통해 암호화하여 전송' },
                  { label: '이전 항목', value: 'AI 입력 정보(고객 이름·전화번호, 예약·주문 내역, 대화·스크린샷 이미지, 음성 등)' },
                  { label: '이전 목적', value: '채팅·이미지 인식(OCR)·데이터 분석 등 AI 기능의 추론 처리' },
                  { label: '보유 기간', value: '추론 처리 완료 시까지(입력 데이터는 모델 학습에 사용되지 않음)' },
                ],
              },
              {
                heading: 'Google LLC',
                fields: [
                  { label: '이전 국가', value: '미국' },
                  { label: '이전 일시·방법', value: '소셜 로그인·웹 분석·푸시 발송 등 해당 기능 이용 시점에 정보통신망을 통해 전송' },
                  { label: '이전 항목', value: '소셜 계정 식별정보, 쿠키·온라인 식별자, 접속·이용 기록, 푸시 토큰·기기정보' },
                  { label: '이전 목적', value: '구글 소셜 로그인, 이용 통계 분석(Google Analytics), 모바일·웹 푸시 전송(FCM 등)' },
                  { label: '보유 기간', value: '각 처리 목적 달성 또는 회원 탈퇴 시까지' },
                ],
              },
              {
                heading: 'Discord, Inc.',
                fields: [
                  { label: '이전 국가', value: '미국' },
                  { label: '이전 일시·방법', value: '가입·문의 등 운영 이벤트 발생 시점에 정보통신망을 통해 전송' },
                  { label: '이전 항목', value: '운영 알림에 포함되는 회원 식별정보(이름·이메일·전화번호 등)' },
                  { label: '이전 목적', value: '서비스 운영 알림(내부 운영 채널)' },
                  { label: '보유 기간', value: '알림 메시지 보관 정책 또는 위탁 계약 종료 시까지' },
                ],
              },
              {
                heading: 'Microsoft Corporation (Clarity)',
                fields: [
                  { label: '이전 국가', value: '미국' },
                  { label: '이전 일시·방법', value: '회원이 서비스에 접속·이용하는 시점에 정보통신망을 통해 전송' },
                  { label: '이전 항목', value: '쿠키·온라인 식별자, 페이지 상호작용 기록, IP 주소' },
                  { label: '이전 목적', value: '사용성 분석(세션 리플레이·히트맵)' },
                  { label: '보유 기간', value: 'Microsoft Clarity 데이터 보관 정책에 따름' },
                ],
              },
              {
                heading: 'PostHog, Inc.',
                fields: [
                  { label: '이전 국가', value: '미국' },
                  { label: '이전 일시·방법', value: '회원이 서비스에 접속·이용하는 시점에 정보통신망을 통해 전송' },
                  { label: '이전 항목', value: '쿠키·온라인 식별자를 통한 사용 행동 기록, IP 주소' },
                  { label: '이전 목적', value: '제품 사용성 분석(이벤트 자동 수집)' },
                  { label: '보유 기간', value: 'PostHog 데이터 보관 정책에 따름' },
                ],
              },
              {
                heading: 'Meta Platforms, Inc. (Meta Pixel)',
                fields: [
                  { label: '이전 국가', value: '미국' },
                  { label: '이전 일시·방법', value: '홈페이지 방문·전환 이벤트 발생 시점에 정보통신망을 통해 전송' },
                  { label: '이전 항목', value: '쿠키를 통한 온라인 식별자, 페이지 조회·전환 이벤트' },
                  { label: '이전 목적', value: '광고 전환 측정(홈페이지)' },
                  { label: '보유 기간', value: 'Meta 데이터 보관 정책에 따름' },
                ],
              },
              {
                heading: 'ImprovMX',
                fields: [
                  { label: '이전 국가', value: '미국' },
                  { label: '이전 일시·방법', value: '도메인 이메일 수신 시점에 정보통신망을 통해 전송' },
                  { label: '이전 항목', value: '수신 이메일에 포함된 개인정보(발신자 정보, 메일 본문 등)' },
                  { label: '이전 목적', value: '도메인 이메일 수신 포워딩' },
                  { label: '보유 기간', value: '메일 전달 처리 완료 시까지' },
                ],
              },
            ]}
          />
          <P>
            회원은 개인정보의 국외이전을 거부할 수 있습니다. 다만 위 이전은 서비스 제공에 필수적인 처리를
            포함하므로, 이전을 거부하는 경우 AI 기능, 소셜 로그인, 푸시 알림 등 관련 서비스의 일부 또는
            전부의 이용이 제한될 수 있습니다.
          </P>
        </Section>

        <Section id="customer-data" title="제8조 (회원이 등록한 고객 개인정보의 처리)">
          <P>
            회원(가게 운영자)이 서비스에 등록하는 고객의 개인정보(이름, 연락처, 성별 등)에 대해서는
            해당 회원이 개인정보의 수집·이용 주체인 <Term>개인정보처리자</Term>의 지위를 가지며, 운영자는
            이를 회원을 대신하여 보관·처리하는 <Term>수탁자</Term>의 지위에서 처리합니다.
          </P>
          <UL>
            <li>
              회원은 고객 정보를 서비스에 등록·이용하기에 앞서 해당 고객으로부터 개인정보의 수집·이용에
              관한 적법한 동의를 확보할 책임이 있습니다.
            </li>
            <li>
              고객 정보의 수집·이용 목적 및 범위의 적법성, 정확성, 최신성 유지에 대한 책임은 해당
              정보를 등록한 회원에게 있습니다.
            </li>
            <li>
              운영자는 회원의 지시 및 본 처리방침·이용약관에서 정한 범위 내에서만 고객 정보를 처리하며,
              안전성 확보를 위한 기술적·관리적 보호조치를 적용합니다.
            </li>
          </UL>
        </Section>

        <Section id="rights" title="제9조 (정보주체와 법정대리인의 권리·의무 및 행사 방법)">
          <P>
            회원(정보주체) 및 그 법정대리인은 언제든지 다음의 권리를 행사할 수 있습니다.
          </P>
          <UL>
            <li>개인정보 열람 요구</li>
            <li>오류 등이 있을 경우 정정 요구</li>
            <li>삭제 요구</li>
            <li>처리 정지 요구</li>
            <li>개인정보 수집·이용 동의의 철회</li>
            <li>회원 탈퇴</li>
          </UL>
          <P>
            권리 행사는 서비스 내 설정 메뉴를 이용하거나 제13조의 개인정보 보호책임자에게 서면, 전자우편
            등을 통해 요청할 수 있으며, 운영자는 관계 법령에 따라 지체 없이 조치합니다. 회원은 본인의
            개인정보를 정확하고 최신의 상태로 유지할 의무가 있습니다.
          </P>
        </Section>

        <Section id="destruction" title="제10조 (개인정보의 파기 절차 및 방법)">
          <P>
            운영자는 개인정보 보유 기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때에는
            지체 없이 해당 개인정보를 파기합니다.
          </P>
          <UL>
            <li>
              <Term>파기 절차</Term>: 파기 사유가 발생한 개인정보를 선정하고, 개인정보 보호책임자의
              승인을 거쳐 파기합니다.
            </li>
            <li>
              <Term>파기 방법</Term>: 전자적 파일 형태의 정보는 복구·재생할 수 없는 기술적 방법으로
              영구 삭제하며, 종이 문서에 기록된 개인정보는 분쇄하거나 소각하여 파기합니다.
            </li>
          </UL>
        </Section>

        <Section id="security" title="제11조 (개인정보의 안전성 확보 조치)">
          <P>
            운영자는 개인정보의 안전성 확보를 위해 다음과 같은 기술적·관리적·물리적 조치를 취하고
            있습니다.
          </P>
          <UL>
            <li>소셜 로그인 기반 인증 채택(자체 비밀번호를 보관하지 않음)</li>
            <li>전송 구간 암호화(HTTPS/TLS 적용)</li>
            <li>개인정보 처리 시스템에 대한 접근 권한 통제 및 테넌트(회원) 간 데이터 격리</li>
            <li>접근 기록의 보관 및 관리</li>
          </UL>
        </Section>

        <Section id="cookies" title="제12조 (쿠키 등 자동 수집 장치의 운영 및 거부)">
          <P>
            운영자는 로그인 상태 유지 및 인증을 위해 쿠키(cookie)를 사용합니다. 인증에 사용되는 쿠키는
            스크립트를 통한 접근이 제한되는 httpOnly 방식으로 운영됩니다.
          </P>
          <P>
            또한 운영자는 서비스 품질 개선·이용 통계 분석 및 광고 전환 측정을 위해 Google Analytics,
            Microsoft Clarity, PostHog, Meta Pixel 등 외부 분석·광고 도구를 사용합니다. 이 과정에서 쿠키
            및 유사 기술을 통해 이용 기록(페이지뷰, 클릭·스크롤 등 상호작용, 사전등록 완료 등 전환
            이벤트)이 수집되어 국외(미국 등)로 이전·처리될 수 있으며, 구체적인 사항은 제6조의 위탁 및
            제7조의 국외이전 현황을 따릅니다.
          </P>
          <P>
            회원은 브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다. 다만 인증 쿠키 저장을 거부하는
            경우 로그인 등 서비스 이용에 제한이 발생할 수 있습니다. 분석용 쿠키는 브라우저의 쿠키 차단
            설정이나 Google Analytics 차단 부가기능 설치 등을 통해 수집을 거부할 수 있습니다.
          </P>
        </Section>

        <Section id="officer" title="제13조 (개인정보 보호책임자)">
          <P>
            운영자는 개인정보 처리에 관한 업무를 총괄하여 책임지고, 개인정보 처리와 관련한 회원의 문의 및
            불만 처리, 피해 구제 등을 위하여 다음과 같이 개인정보 보호책임자를 지정하고 있습니다.
          </P>
          <UL>
            <li>
              <Term>개인정보 보호책임자</Term>: {privacyOfficer.name}
            </li>
            <li>
              <Term>직책</Term>: {privacyOfficer.title}
            </li>
            <li>
              <Term>연락처</Term>: {privacyOfficer.email}
            </li>
          </UL>
        </Section>

        <Section id="remedy" title="제14조 (권익침해 구제 방법)">
          <P>
            정보주체는 개인정보 침해로 인한 구제를 받기 위하여 아래의 기관에 분쟁 해결이나 상담 등을
            신청할 수 있습니다.
          </P>
          <UL>
            <li>개인정보 분쟁조정위원회: (국번 없이) 1833-6972 (www.kopico.go.kr)</li>
            <li>개인정보 침해신고센터: (국번 없이) 118 (privacy.kisa.or.kr)</li>
            <li>대검찰청 사이버수사과: (국번 없이) 1301 (www.spo.go.kr)</li>
            <li>경찰청 사이버수사국: (국번 없이) 182 (ecrm.police.go.kr)</li>
          </UL>
        </Section>

        <Section id="notice" title="제15조 (고지의 의무)">
          <OL>
            <li>
              본 개인정보 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경 내용의 추가, 삭제
              및 정정이 있는 경우에는 변경 사항의 시행 7일 전부터 서비스 내 공지사항을 통하여
              고지합니다.
            </li>
            <li>본 개인정보 처리방침의 시행일은 {privacyEffectiveDate}입니다.</li>
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
          href="/policy/marketing"
          className="rounded-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          마케팅·혜택 정보 수신 동의
        </Link>
      </nav>
    </>
  )
}
