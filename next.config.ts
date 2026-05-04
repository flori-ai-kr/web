import type {NextConfig} from "next";
import {validateEnv} from "./src/lib/env";

const env = validateEnv();

const supabaseHostname = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname;
const r2Hostname = new URL(env.R2_PUBLIC_URL).hostname;

const nextConfig: NextConfig = {
  images: {
    // Instagram signed URL은 며칠 뒤 만료. 최적화 캐시 30일 유지해서
    // 원본 만료 후에도 Vercel edge 캐시에서 계속 서빙 가능.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseHostname,
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: r2Hostname,
        pathname: '/**',
      },
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
  serverExternalPackages: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner'],
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
              `img-src 'self' data: blob: https://${supabaseHostname} https://${r2Hostname} https://*.cdninstagram.com https://*.fbcdn.net https://images.unsplash.com`,
              `font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:`,
              `connect-src 'self' https://${supabaseHostname} wss://${supabaseHostname} https://${r2Hostname}`,
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
