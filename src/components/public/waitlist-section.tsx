'use client';

import {useState} from 'react';
import Link from 'next/link';
import {getWaitlistCount, submitWaitlist, type WaitlistCount} from '@/lib/actions/waitlist';

function KakaoButton({kakaoUrl}: {kakaoUrl?: string}) {
  if (kakaoUrl) {
    return (
      <a
        href={kakaoUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: '#FEE500',
          color: '#191600',
          borderRadius: '10px',
          fontWeight: 700,
          fontSize: '14px',
          padding: '12px',
          textDecoration: 'none',
        }}
      >
        💬 카카오톡 오픈채팅 참여하기
      </a>
    );
  }
  return (
    <button
      type="button"
      disabled
      aria-label="카카오톡 오픈채팅 (준비 중)"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        background: '#FEE500',
        color: '#191600',
        borderRadius: '10px',
        fontWeight: 700,
        fontSize: '14px',
        padding: '12px',
        width: '100%',
        border: 'none',
        cursor: 'not-allowed',
        opacity: 0.6,
      }}
    >
      💬 오픈채팅 링크 준비 중
    </button>
  );
}

export function WaitlistSection({
  initialCount,
  kakaoUrl,
}: {
  initialCount: WaitlistCount;
  kakaoUrl?: string;
}) {
  const [count, setCount] = useState(initialCount);
  const [email, setEmail] = useState('');
  const [shopName, setShopName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  const closed = count.closed;
  const pct = Math.min(100, Math.round((count.count / count.capacity) * 100));
  const remaining = Math.max(0, count.capacity - count.count);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const next = await submitWaitlist({email, shopName});
      setCount(next);
      setRegistered(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '잠시 후 다시 시도해 주세요');
      // 마감(100명 도달) 등으로 실패했을 수 있으니 카운트를 새로고침해 마감 UI로 전환되게 한다.
      try {
        setCount(await getWaitlistCount());
      } catch {
        // 카운트 갱신 실패는 무시(에러 메시지는 이미 표시됨)
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      id="waitlist"
      style={{
        borderTop: '1px solid var(--site-line)',
        borderBottom: '1px solid var(--site-line)',
        background: 'linear-gradient(180deg,#FBEFF3,#F7E9EF)',
      }}
    >
      <div className="wrap" style={{padding: 'clamp(40px,6vw,64px) 0'}}>
        <div style={{maxWidth: '560px', margin: '0 auto', textAlign: 'center'}}>
          <span
            className="chip"
            style={{background: '#fff', color: 'var(--site-accent-deep)', marginBottom: '14px'}}
          >
            🎁 출시 전 한정 혜택
          </span>
          <h2
            style={{
              fontSize: 'clamp(24px,3.6vw,38px)',
              fontWeight: 800,
              letterSpacing: '-.02em',
              margin: '0 0 8px',
              color: 'var(--site-ink)',
            }}
          >
            선착순 <span style={{color: 'var(--site-accent)'}}>100명</span>, 첫 달 무료
          </h2>
          <p
            style={{
              fontSize: '15px',
              color: 'var(--site-accent-deep)',
              margin: '0 0 22px',
            }}
          >
            지금 사전등록하면 한 달간 <b>모든 기능을 무료로</b> 써보세요
          </p>

          {/* 진행 게이지 */}
          <div style={{margin: '0 auto 24px'}}>
            <div
              style={{
                height: '10px',
                borderRadius: '99px',
                background: '#fff',
                overflow: 'hidden',
                border: '1px solid #EAD3DD',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: 'var(--site-accent)',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            <div
              style={{
                fontSize: '13px',
                color: 'var(--site-accent-deep)',
                marginTop: '8px',
                fontWeight: 700,
              }}
            >
              <span style={{fontSize: '18px'}}>{count.count}</span> / {count.capacity}명 등록 완료{' '}
              <span style={{fontWeight: 500, opacity: 0.7}}>· {remaining}자리 남음</span>
            </div>
          </div>

          {closed ? (
            /* 마감 화면 */
            <div className="card" style={{padding: '20px', background: '#fff', textAlign: 'center'}}>
              <div
                style={{
                  height: '10px',
                  borderRadius: '99px',
                  background: '#fff',
                  overflow: 'hidden',
                  border: '1px solid #EAD3DD',
                  maxWidth: '300px',
                  margin: '0 auto',
                }}
              >
                <div style={{width: '100%', height: '100%', background: 'var(--site-accent)'}} />
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--site-accent-deep)',
                  marginTop: '10px',
                  fontWeight: 700,
                }}
              >
                🎉 선착순 100명 모집 완료
              </div>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--site-ink-soft)',
                  margin: '8px 0 14px',
                }}
              >
                사전등록이 마감됐어요. 정식 출시 소식은 카카오톡 오픈채팅에서 가장 먼저
                받아보세요.
              </p>
              {kakaoUrl ? (
                <a
                  href={kakaoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#FEE500',
                    color: '#191600',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '14px',
                    padding: '11px 20px',
                    textDecoration: 'none',
                  }}
                >
                  💬 오픈채팅으로 출시 소식 받기
                </a>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#FEE500',
                    color: '#191600',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '14px',
                    padding: '11px 20px',
                    opacity: 0.6,
                    cursor: 'not-allowed',
                  }}
                >
                  💬 오픈채팅 링크 준비 중
                </span>
              )}
            </div>
          ) : (
            <>
              {/* STEP 1 */}
              <div className="card" style={{padding: '22px', textAlign: 'left', background: '#fff'}}>
                <div
                  style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px'}}
                >
                  <span
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '99px',
                      background: 'var(--site-accent)',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    1
                  </span>
                  <b style={{fontSize: '14px'}}>정보 입력</b>
                </div>

                {registered ? (
                  <p
                    style={{
                      fontSize: '14px',
                      color: 'var(--site-accent-deep)',
                      fontWeight: 600,
                      margin: '0 0 4px',
                    }}
                  >
                    ✓ 등록 완료! 마지막으로 오픈채팅에 참여하면 끝이에요.
                  </p>
                ) : (
                  <form onSubmit={onSubmit} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                    <label htmlFor="wl-email" className="sr-only">이메일</label>
                    <input
                      id="wl-email"
                      placeholder="이메일 (예: hazel@flori.ai.kr)"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      type="email"
                      autoComplete="email"
                      style={{
                        border: '1px solid var(--site-line)',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        background: '#FAFBFC',
                      }}
                    />
                    <label htmlFor="wl-shop-name" className="sr-only">가게명</label>
                    <input
                      id="wl-shop-name"
                      placeholder="가게명 (예: 헤이즐 플라워)"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      required
                      style={{
                        border: '1px solid var(--site-line)',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        background: '#FAFBFC',
                      }}
                    />
                    {error && (
                      <p style={{fontSize: '13px', color: 'var(--destructive)', margin: 0}}>{error}</p>
                    )}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-rose"
                      style={{justifyContent: 'center', opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer'}}
                    >
                      {submitting ? '등록 중...' : '사전등록하기'}
                    </button>
                  </form>
                )}

                <p style={{fontSize: '12px', color: 'var(--site-ink-soft)', margin: '12px 0 0'}}>
                  입력하신 이메일은 <b>출시·사전등록 안내</b>에만 써요. 등록 시{' '}
                  <Link
                    href="/policy/privacy"
                    style={{color: 'var(--site-accent)', textDecoration: 'underline'}}
                  >
                    개인정보처리방침
                  </Link>
                  에 동의하게 됩니다.
                </p>
              </div>

              <div style={{fontSize: '20px', color: 'var(--site-accent)', margin: '8px 0'}}>↓</div>

              {/* STEP 2 */}
              <div
                className="card"
                style={{
                  padding: '22px',
                  textAlign: 'left',
                  background: '#fff',
                  ...(registered && {
                    border: '2px solid var(--site-accent)',
                    boxShadow: '0 8px 24px -16px rgba(168,84,117,.35)',
                  }),
                }}
              >
                <div
                  style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}
                >
                  <span
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '99px',
                      background: 'var(--site-accent)',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    2
                  </span>
                  <b style={{fontSize: '14px'}}>
                    카카오톡 오픈채팅 참여{' '}
                    <span style={{color: 'var(--site-accent)'}}>(필수)</span>
                  </b>
                </div>
                <p style={{fontSize: '13px', color: 'var(--site-ink-soft)', margin: '0 0 12px'}}>
                  오픈채팅까지 들어오셔야 사전등록이 <b>최종 완료</b>돼요. 출시 소식·무료 혜택을
                  여기로 안내드립니다.
                </p>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--site-accent-deep)',
                    background: 'var(--site-accent-soft)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    margin: '0 0 14px',
                    lineHeight: 1.6,
                  }}
                >
                  💡 입장하면 <b>채팅방 닉네임을 이메일 앞부분(@ 앞 아이디)</b>으로 바꿔주세요.
                  {email.includes('@') && (
                    <>
                      {' '}예: <b>{email.split('@')[0]}</b>
                    </>
                  )}{' '}
                  실제 참여 확인에 사용돼요.
                </p>
                <KakaoButton kakaoUrl={kakaoUrl} />
              </div>
            </>
          )}

          <p
            style={{
              fontSize: '11px',
              color: 'var(--site-accent-deep)',
              opacity: 0.7,
              marginTop: '16px',
            }}
          >
            ※ 별도 마감 기한 없이 선착순 100명 도달 시 마감됩니다
          </p>
        </div>
      </div>
    </section>
  );
}
