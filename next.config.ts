import type {NextConfig} from "next";
import {validateEnv} from "./src/lib/env";

const env = validateEnv();

// 사진 스토리지 공개 호스트. 업로드·삭제·presigned 발급은 BFF가 소유하지만,
// 브라우저가 이미지를 표시(next/image, CSP img-src)하고 presigned PUT(CSP connect-src)을
// 하려면 호스트명이 필요하다. 미설정 시 스토리지 호스트는 허용 목록에서 빠진다.
const storageHostname = env.STORAGE_PUBLIC_URL ? new URL(env.STORAGE_PUBLIC_URL).hostname : null;

const nextConfig: NextConfig = {
  // Docker 배포용 독립 실행 번들(.next/standalone) — server.js + 최소 node_modules만 포함.
  output: 'standalone',
  images: {
    // [OOM 방지] 서버사이드 이미지 최적화(sharp/libvips) 비활성화 — 2026-06-25.
    // 사진은 전부 CloudFront(영구 URL·CDN 캐시)에서 서빙되어 Next 재최적화가 중복이고,
    // 고해상도 원본을 libvips로 디코드하다 512MB 컨테이너 한도를 넘겨 next-server 가
    // cgroup OOM-kill 되던 원인이었다(2026-06-24 15:50 dmesg 확인). libvips 메모리는
    // 파일 크기가 아닌 픽셀 수에 비례 + Node 힙 밖 네이티브라 max-old-space-size 로 못 잡는다.
    // 인스타 이미지 기능 제거됨(코드 내 cdninstagram 렌더 0건) → 만료-후-캐시 의존 없음.
    // 아래 formats/minimumCacheTTL/remotePatterns 는 unoptimized=true 동안 미사용(최적화 경로 비활성).
    unoptimized: true,
    // AVIF 우선(미지원 브라우저는 WebP 폴백) — 최적화 재활성 시 대비해 보존.
    formats: ['image/avif', 'image/webp'],
    // Instagram signed URL은 며칠 뒤 만료. 최적화 캐시 30일 유지해서
    // 원본 만료 후에도 Next 이미지 최적화 캐시에서 계속 서빙 가능.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      ...(storageHostname
        ? [{ protocol: 'https' as const, hostname: storageHostname, pathname: '/**' }]
        : []),
      // Instagram CDN (Apify 스크랩 썸네일)
      {
        protocol: 'https',
        hostname: '**.cdninstagram.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.fbcdn.net',
        pathname: '/**',
      },
      // 공개 사이트 더미 이미지 (실사진 교체 전까지만)
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline' https://js.tosspayments.com${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
              `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net`,
              `img-src 'self' data: blob:${storageHostname ? ` https://${storageHostname}` : ''} https://*.cdninstagram.com https://*.fbcdn.net https://images.unsplash.com`,
              `font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:`,
              // 브라우저 직접 업로드(presigned PUT) + 원본 다운로드(presigned GET)는 S3 버킷 호스트로
              // 향한다(<bucket>.s3.<region>.amazonaws.com). 공개 읽기는 CloudFront(img-src)라 별개다.
              `connect-src 'self' https://*.tosspayments.com https://*.s3.ap-northeast-2.amazonaws.com${storageHostname ? ` https://${storageHostname}` : ''}`,
              `frame-src 'self' https://*.tosspayments.com`,
              `frame-ancestors 'none'`,
              "base-uri 'self'",
              "form-action 'self' https://*.tosspayments.com",
              "worker-src 'self'",
            ].join('; '),
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
    ];
  },
};

export default nextConfig;
