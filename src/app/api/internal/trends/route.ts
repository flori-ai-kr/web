import {NextResponse} from 'next/server';
import {ZodError} from 'zod';
import {verifyInternalAuth} from '@/lib/internal-auth';
import {createServiceClient} from '@/lib/supabase/service';
import {broadcastPush} from '@/lib/push-broadcast';
import {trendArticlesBulkSchema} from '@/lib/validations';
import {TREND_CATEGORY_LABELS, type TrendCategory} from '@/types/database';

type CategoryCounts = Record<TrendCategory, number>;

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
    const { articles } = trendArticlesBulkSchema.parse(payload);
    const supabase = createServiceClient();

    const today = new Date().toISOString().slice(0, 10);
    const rows = articles.map((a) => ({
      category: a.category,
      title: a.title,
      summary: a.summary,
      key_points: a.key_points ?? [],
      source_url: a.source_url,
      source_name: a.source_name ?? null,
      published_at: a.published_at ?? null,
      collected_at: today,
    }));

    const { data: inserted, error } = await supabase
      .from('trend_articles')
      .upsert(rows, { onConflict: 'source_url', ignoreDuplicates: true })
      .select('id, category');

    if (error) {
      console.error('[API:trends] insert error', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const insertedList = inserted ?? [];
    const newCount = insertedList.length;

    if (newCount > 0) {
      const counts: CategoryCounts = { flower: 0, inspiration: 0, business: 0, industry: 0 };
      for (const row of insertedList) {
        const cat = row.category as TrendCategory;
        if (cat in counts) counts[cat]++;
      }

      const bodyParts = (['flower', 'inspiration', 'business', 'industry'] as TrendCategory[])
        .filter((c) => counts[c] > 0)
        .map((c) => `${TREND_CATEGORY_LABELS[c]} ${counts[c]}`);

      await broadcastPush({
        title: `트렌드 — 새로운 인사이트 ${newCount}건`,
        body: bodyParts.join(' · ') || '새로운 트렌드가 도착했어요',
        url: '/insights/trends',
        tag: 'trends',
      });
    }

    return NextResponse.json({
      inserted: newCount,
      skipped: articles.length - newCount,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      );
    }
    console.error('[API:trends] error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
