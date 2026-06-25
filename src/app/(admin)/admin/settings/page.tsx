'use client';

import {useCallback, useEffect, useState} from 'react';
import {Card, CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Bell, BellOff, BellRing, Loader2, Send} from 'lucide-react';
import {toast} from 'sonner';
import type {PushSubscriptionData} from '@/lib/actions/push';
import {sendTestNotification, subscribeToPush, unsubscribeFromPush} from '@/lib/actions/push';
import {BottomNavCustomizer} from './components/bottom-nav-customizer';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as Uint8Array<ArrayBuffer>;
}

export default function SettingsPage() {
  // 푸시 알림 상태
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);
  const [isPushLoading, setIsPushLoading] = useState(true);
  const [isPushToggling, setIsPushToggling] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // 푸시 알림 지원 확인 + 기존 구독 확인
  const checkPushStatus = useCallback(async () => {
    setIsPushLoading(true);
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPushSupported(false);
        return;
      }
      setPushSupported(true);
      setPushPermission(Notification.permission);

      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setPushSubscription(sub);
    } catch (err) {
      console.error('Push status check failed:', err);
    } finally {
      setIsPushLoading(false);
    }
  }, []);

  useEffect(() => {
    checkPushStatus();
  }, [checkPushStatus]);

  // 푸시 구독
  const handlePushSubscribe = async () => {
    setIsPushToggling(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        ),
      });

      setPushSubscription(sub);
      setPushPermission(Notification.permission);

      // 서버에 구독 정보 저장
      const subJson = sub.toJSON();
      const subscriptionData: PushSubscriptionData = {
        endpoint: subJson.endpoint!,
        keys: {
          p256dh: subJson.keys!.p256dh!,
          auth: subJson.keys!.auth!,
        },
      };

      const result = await subscribeToPush(subscriptionData);
      if (result.success) {
        toast.success('푸시 알림이 활성화되었습니다');
      } else {
        toast.error(result.error || '구독 저장에 실패했습니다');
        await sub.unsubscribe();
        setPushSubscription(null);
      }
    } catch (err) {
      console.error('Push subscribe failed:', err);
      if (Notification.permission === 'denied') {
        toast.error('브라우저에서 알림이 차단되어 있습니다. 브라우저 설정에서 허용해주세요.');
      } else {
        toast.error('푸시 알림 활성화에 실패했습니다');
      }
      setPushPermission(Notification.permission);
    } finally {
      setIsPushToggling(false);
    }
  };

  // 푸시 구독 해제
  const handlePushUnsubscribe = async () => {
    if (!pushSubscription) return;
    setIsPushToggling(true);
    try {
      const result = await unsubscribeFromPush(pushSubscription.endpoint);
      if (result.success) {
        await pushSubscription.unsubscribe();
        setPushSubscription(null);
        toast.success('푸시 알림이 비활성화되었습니다');
      } else {
        toast.error(result.error || '구독 해제에 실패했습니다');
      }
    } catch (err) {
      console.error('Push unsubscribe failed:', err);
      toast.error('푸시 알림 비활성화에 실패했습니다');
    } finally {
      setIsPushToggling(false);
    }
  };

  // 테스트 알림
  const handleTestNotification = async () => {
    setIsSendingTest(true);
    try {
      const result = await sendTestNotification();
      if (result.success) {
        toast.success('테스트 알림을 전송했습니다');
      } else {
        toast.error(result.error || '테스트 알림 전송에 실패했습니다');
      }
    } catch {
      toast.error('테스트 알림 전송에 실패했습니다');
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6 px-4 sm:px-6 py-1 sm:py-2">
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">설정</h1>
      </div>

      {/* 푸시 알림 설정 */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-foreground mb-1">푸시 알림</h3>
          <p className="text-xs text-muted-foreground mb-4">
            다양한 알림을 푸시로 받을 수 있어요.
          </p>

          {isPushLoading ? (
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-muted animate-pulse" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                <div className="h-3 w-48 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ) : !pushSupported ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <BellOff className="w-5 h-5 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">
                이 브라우저는 푸시 알림을 지원하지 않습니다. Chrome, Edge, Safari 등 최신 브라우저를 사용해주세요.
              </p>
            </div>
          ) : pushPermission === 'denied' ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10">
              <BellOff className="w-5 h-5 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">알림이 차단되어 있습니다</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  브라우저 설정에서 이 사이트의 알림을 허용해주세요.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {pushSubscription ? (
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand/10">
                      <BellRing className="w-5 h-5 text-brand" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted">
                      <Bell className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {pushSubscription ? '알림 활성화됨' : '알림 비활성화'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {pushSubscription
                        ? '예약 리마인더와 알림을 받고 있습니다'
                        : '푸시 알림을 켜면 예약 리마인더를 받을 수 있어요'}
                    </p>
                  </div>
                </div>
                <Button
                  variant={pushSubscription ? 'outline' : 'default'}
                  size="sm"
                  onClick={pushSubscription ? handlePushUnsubscribe : handlePushSubscribe}
                  disabled={isPushToggling}
                  className="ml-3 shrink-0"
                >
                  {isPushToggling && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                  {pushSubscription ? '끄기' : '켜기'}
                </Button>
              </div>

              {pushSubscription && (
                <div className="pt-2 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleTestNotification}
                    disabled={isSendingTest}
                    className="text-muted-foreground"
                  >
                    {isSendingTest ? (
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-1.5" />
                    )}
                    테스트 알림 보내기
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 하단바 커스터마이즈 */}
      <BottomNavCustomizer />
    </div>
  );
}
