'use server';

import {requireAuth} from '@/lib/auth-guard';
import {AppError, withErrorLogging} from '@/lib/errors';
import {apiFetch} from '@/lib/api/client';

// ─── 타입 ──────────────────────────────────────────────────────

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// ─── 푸시 구독 ─────────────────────────────────────────────────

async function _subscribeToPush(
  subscription: PushSubscriptionData,
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();

  try {
    // 서버가 endpoint 기준 upsert + is_active=true 처리한다 (204 No Content)
    await apiFetch<void>('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      }),
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message };
    throw error;
  }
}

export const subscribeToPush = withErrorLogging('subscribeToPush', _subscribeToPush);

// ─── 푸시 구독 해제 ────────────────────────────────────────────

async function _unsubscribeFromPush(
  endpoint: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();

  try {
    // 서버가 endpoint 구독을 is_active=false 처리한다 (204 No Content)
    await apiFetch<void>(`/push/unsubscribe?endpoint=${encodeURIComponent(endpoint)}`, {
      method: 'POST',
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message };
    throw error;
  }
}

export const unsubscribeFromPush = withErrorLogging('unsubscribeFromPush', _unsubscribeFromPush);

// ─── 구독 상태 확인 ────────────────────────────────────────────

interface PushStatusDto {
  subscribed: boolean;
}

async function _getPushSubscriptionStatus(): Promise<{
  success: boolean;
  isSubscribed: boolean;
}> {
  await requireAuth();

  const dto = await apiFetch<PushStatusDto>('/push/status');
  return { success: true, isSubscribed: dto.subscribed };
}

export const getPushSubscriptionStatus = withErrorLogging(
  'getPushSubscriptionStatus',
  _getPushSubscriptionStatus,
);

// ─── 테스트 알림 전송 ──────────────────────────────────────────

export type PushTestType = 'pickup_reminder' | 'daily_summary' | 'test';

async function _sendTestNotification(
  type?: PushTestType,
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();

  try {
    const params = type ? `?type=${type}` : '';
    const result = await apiFetch<{ sent: number } | void>(`/push/test${params}`, { method: 'POST' });
    const sent = result?.sent ?? 0;
    if (result && sent === 0) {
      return { success: false, error: '활성 구독이 없습니다' };
    }
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message };
    throw error;
  }
}

export const sendTestNotification = withErrorLogging('sendTestNotification', _sendTestNotification);
