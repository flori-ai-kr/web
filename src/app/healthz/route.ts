// 헬스체크 전용 라우트 — API/DB 의존 없이 항상 가벼운 200을 반환한다.
// ALB 타깃그룹·컨테이너(docker) 헬스체크가 이 경로를 찌른다(랜딩 "/" 대신).
//
// 왜 별도 라우트인가:
//   "/" 는 (public) 랜딩이며 async 서버컴포넌트라, 렌더될 때마다 getWaitlistCount→API 를
//   호출한다. 이 "/" 를 헬스체크 대상으로 두면 (1) 30초마다 불필요한 /waitlist/count 호출이
//   self-트래픽으로 발생하고 (2) API 가 잠깐 도달 불가일 때 헬스체크가 같이 실패해 오탐이 난다.
//   헬스체크는 "web 프로세스가 살아있나"만 보면 되므로 외부 의존 없는 정적 200으로 분리한다.
export const dynamic = 'force-static';

export function GET() {
  return new Response('ok', {
    status: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
