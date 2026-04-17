import {NextResponse} from 'next/server';
import {ZodError} from 'zod';
import {verifyInternalAuth} from '@/lib/internal-auth';
import {createServiceClient} from '@/lib/supabase/service';
import {broadcastPush} from '@/lib/push-broadcast';
import {instagramPostsBulkSchema} from '@/lib/validations';

export async function POST(request: Request) {
  if (!verifyInternalAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const { posts } = instagramPostsBulkSchema.parse(payload);
    const supabase = createServiceClient();

    // 유저네임 → 계정 ID 매핑
    const uniqueUsernames = Array.from(new Set(posts.map((p) => p.username)));
    const { data: accounts, error: accErr } = await supabase
      .from('instagram_accounts')
      .select('id, username')
      .in('username', uniqueUsernames);

    if (accErr) {
      console.error('[API:instagram] account lookup error', accErr);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const usernameToId = new Map<string, string>();
    for (const a of accounts ?? []) usernameToId.set(a.username, a.id);

    const unknownUsernames: string[] = [];
    const rows: Array<{
      account_id: string;
      shortcode: string;
      permalink: string;
      image_urls: string[];
      caption: string | null;
      like_count: number;
      posted_at: string;
    }> = [];

    // 요청 내 shortcode 중복 제거
    const seenShortcodes = new Set<string>();

    for (const post of posts) {
      const accountId = usernameToId.get(post.username);
      if (!accountId) {
        if (!unknownUsernames.includes(post.username)) unknownUsernames.push(post.username);
        continue;
      }
      if (seenShortcodes.has(post.shortcode)) continue;
      seenShortcodes.add(post.shortcode);

      // URL 중복 제거 (Apify가 중복 반환 가능)
      const uniqueUrls = Array.from(new Set(post.image_urls));

      rows.push({
        account_id: accountId,
        shortcode: post.shortcode,
        permalink: post.permalink,
        image_urls: uniqueUrls,
        caption: post.caption ?? null,
        like_count: post.like_count ?? 0,
        posted_at: post.posted_at,
      });
    }

    if (rows.length === 0) {
      return NextResponse.json({
        inserted: 0,
        skipped: posts.length,
        unknown_usernames: unknownUsernames,
      });
    }

    const { data: inserted, error } = await supabase
      .from('instagram_posts')
      .upsert(rows, { onConflict: 'shortcode', ignoreDuplicates: true })
      .select('account_id');

    if (error) {
      console.error('[API:instagram] insert error', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const insertedList = inserted ?? [];
    const newCount = insertedList.length;

    if (newCount > 0) {
      // 알림 body: 신규 포스트가 있는 계정 상위 몇 개 표시
      const accountCounts = new Map<string, number>();
      for (const row of insertedList) {
        accountCounts.set(row.account_id, (accountCounts.get(row.account_id) || 0) + 1);
      }
      const idToUsername = new Map<string, string>();
      for (const a of accounts ?? []) idToUsername.set(a.id, a.username);

      const topAccountUsernames = Array.from(accountCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => idToUsername.get(id))
        .filter((v): v is string => !!v);

      const headline = topAccountUsernames.slice(0, 2).map((u) => `@${u}`).join(', ');
      const rest = topAccountUsernames.length - 2;
      const accountCount = accountCounts.size;
      const body =
        rest > 0
          ? `${headline} 외 ${rest}개 계정 (총 ${accountCount}개)`
          : `${headline} (총 ${accountCount}개 계정)`;

      await broadcastPush({
        title: `팔로우 — 신규 포스트 ${newCount}건`,
        body,
        url: '/insights/follows',
        tag: 'instagram',
      });
    }

    return NextResponse.json({
      inserted: newCount,
      skipped: posts.length - newCount,
      unknown_usernames: unknownUsernames,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      );
    }
    console.error('[API:instagram] error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
