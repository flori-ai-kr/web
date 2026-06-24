'use server';

import {revalidatePath} from 'next/cache';
import {requireAuth} from '@/lib/auth-guard';
import {
    DEFAULT_BOTTOM_NAV_ITEMS,
    type NavItemKey,
    type UserPreferences,
} from '@/types/database';
import {bottomNavItemsSchema} from '@/lib/validations';
import {withErrorLogging} from '@/lib/errors';
import {apiFetch} from '@/lib/api/client';

interface KotlinUserPreferences {
  bottomNavItems: string[];
}

// ─── 유저 설정 (하단바 커스터마이즈) ─────────────────────

async function _getUserPreferences(): Promise<UserPreferences> {
  await requireAuth();

  const data = await apiFetch<KotlinUserPreferences>('/settings/preferences');
  const items = (data.bottomNavItems as NavItemKey[]) || [...DEFAULT_BOTTOM_NAV_ITEMS];
  return {
    user_id: '',
    bottom_nav_items: items,
    updated_at: new Date().toISOString(),
  };
}

export const getUserPreferences = withErrorLogging('getUserPreferences', _getUserPreferences);

async function _updateBottomNavItems(items: unknown): Promise<UserPreferences> {
  await requireAuth();
  const parsed = bottomNavItemsSchema.parse(items);

  const data = await apiFetch<KotlinUserPreferences>('/settings/preferences/bottom-nav', {
    method: 'PUT',
    body: JSON.stringify({ items: parsed }),
  });

  revalidatePath('/', 'layout');
  return {
    user_id: '',
    bottom_nav_items: (data.bottomNavItems as NavItemKey[]) ?? parsed,
    updated_at: new Date().toISOString(),
  };
}

export const updateBottomNavItems = withErrorLogging(
  'updateBottomNavItems',
  _updateBottomNavItems,
);
