import { Link } from 'react-router-dom';
import type { DailyBrief } from '../utils/dailyBrief';

interface TodayCardProps {
  brief: DailyBrief;
  fallbackDinner?: string | null;
}

export default function TodayCard({ brief, fallbackDinner }: TodayCardProps) {
  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const household = brief.household;
  const dinner = household?.today_dinner?.trim() || fallbackDinner?.trim() || null;
  const shoppingDue = household?.shopping_due === true;
  const shoppingStore = household?.shopping_store?.trim();
  const shoppingListId = household?.shopping_list_id?.trim();

  return (
    <section className="bg-white rounded-xl border border-brand-border p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-brand-text mb-3">Today — {dateLabel}</h2>

      <div className="space-y-2 text-sm text-brand-text">
        <p>
          🛒{' '}
          {shoppingDue
            ? `${shoppingStore || 'Shopping'} due today`
            : 'No shopping run due today'}
        </p>

        {dinner && <p>🍽️ Tonight: {dinner}</p>}

        {brief.headline && <p>📋 {brief.headline}</p>}
      </div>

      {shoppingDue && shoppingListId && (
        <Link
          to={`/list/${shoppingListId}`}
          className="inline-flex mt-4 bg-sams text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-sams-dark transition-colors"
        >
          Open list
        </Link>
      )}
    </section>
  );
}
