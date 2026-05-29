import type {NextConfig} from "next";
import {validateEnv} from "./src/lib/env";

const env = validateEnv();

// 사진 스토리지 공개 호스트. 업로드·삭제·presigned 발급은 BFF가 소유하지만,
// 브라우저가 이미지를 표시(next/image, CSP img-src)하고 presigned PUT(CSP connect-src)을
// 하려면 호스트명이 필요하다. 미설정 시 스토리지 호스트는 허용 목록에서 빠진다.
const storageHostname = env.STORAGE_PUBLIC_URL ? new URL(env.STORAGE_PUBLIC_URL).hostname : null;

const nextConfig: NextConfig = {
  images: {
    // Instagram signed URL은 며칠 뒤 만료. 최적화 캐시 30일 유지해서
    // 원본 만료 후에도 Vercel edge 캐시에서 계속 서빙 가능.
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
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
              `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net`,
              `img-src 'self' data: blob:${storageHostname ? ` https://${storageHostname}` : ''} https://*.cdninstagram.com https://*.fbcdn.net https://images.unsplash.com`,
              `font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:`,
              // 브라우저 직접 업로드(presigned PUT) + 원본 다운로드(presigned GET)는 S3 버킷 호스트로
              // 향한다(<bucket>.s3.<region>.amazonaws.com). 공개 읽기는 CloudFront(img-src)라 별개다.
              `connect-src 'self' https://*.s3.ap-northeast-2.amazonaws.com${storageHostname ? ` https://${storageHostname}` : ''}`,
              `frame-ancestors 'none'`,
              "base-uri 'self'",
              "form-action 'self'",
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
