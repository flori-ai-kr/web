'use client';

const CHANNELS = [
  { icon: '💬', name: '카카오톡', desc: '채널 상담', href: 'http://pf.kakao.com/_eGxcXX/chat' },
  { icon: '👥', name: '오픈채팅방', desc: '실시간 소통', href: 'https://open.kakao.com/o/gLSH2Uyi' },
  { icon: '📸', name: '인스타그램', desc: '@flori.ai.official', href: 'https://www.instagram.com/flori.ai.official/' },
  { icon: '🌀', name: '스레드', desc: '@flori.ai.official', href: 'https://www.threads.com/@flori.ai.official/' },
  { icon: '📖', name: '이용 가이드', desc: '사용법 안내', href: '/admin/guide' },
  { icon: '📋', name: '이용약관', desc: '서비스 정책', href: 'https://flori.ai.kr/policy/terms/' },
] as const;

export function ChannelCards() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {CHANNELS.map((ch) => (
        <a
          key={ch.name}
          href={ch.href}
          target={ch.href.startsWith('http') ? '_blank' : undefined}
          rel={ch.href.startsWith('http') ? 'noopener noreferrer' : undefined}
          className="flex flex-col items-center rounded-lg border border-border bg-card p-3.5 text-center transition-colors hover:border-muted-foreground/30"
        >
          <span className="mb-1 text-xl">{ch.icon}</span>
          <span className="text-xs font-medium text-foreground">{ch.name}</span>
          <span className="text-[11px] text-muted-foreground">{ch.desc}</span>
        </a>
      ))}
    </div>
  );
}
