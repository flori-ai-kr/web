import {Suspense} from 'react';
import {CalendarClient} from './calendar-client';
import {Skeleton} from '@/components/ui/skeleton';
import {GuideButton} from '@/components/guide/guide-button';

export default function CalendarPage() {
  return (
    <div className="relative">
      <div className="absolute right-4 top-0 sm:right-6 z-10"><GuideButton slug="calendar" /></div>
      <Suspense fallback={<Skeleton className="h-[600px] w-full rounded-xl" />}>
        <CalendarClient />
      </Suspense>
    </div>
  );
}
