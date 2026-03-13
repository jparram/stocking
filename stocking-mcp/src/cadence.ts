/**
 * Cadence engine — determines which store is due and what items to suggest.
 *
 * Bi-weekly schedule (4-week repeating cycle):
 *   Week 0: Sam's Club  (shop Sunday)
 *   Week 1: Harris Teeter (shop Wednesday)
 *   Week 2: Sam's Club  (shop Sunday)
 *   Week 3: Harris Teeter (shop Wednesday)
 *   → repeat
 *
 * cadenceStartDate = the Sunday of the first Sam's run (default 2026-01-04)
 */

import { MASTER_CATALOG } from './catalog.js';

export interface DueStoreResult {
  due_store: 'sams' | 'ht';
  week_in_cycle: number;           // 0–3
  days_into_current_week: number;
  days_until_next_sams: number;
  days_until_next_ht: number;
  recommended_shop_day: string;    // 'Sunday' or 'Wednesday'
}

export interface SuggestedItem {
  id: string;
  name: string;
  category: string;
  store: string;
  quantity: number;
  unit: string;
  approx_cost: number;
  cadence_days: number;
  urgency: 'overdue' | 'due' | 'approaching' | 'routine';
  par_min: string;
  buy_qty: string;
  is_ht_only: boolean;
  notes: string;
}

export class CadenceEngine {
  private startDate: Date;

  constructor(cadenceStartDate: string) {
    // Noon to avoid DST edge cases
    this.startDate = new Date(cadenceStartDate + 'T12:00:00');
  }

  /** Returns the ISO date string for the Monday of the given date's week */
  getMondayOf(date: Date = new Date()): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  }

  getDueStore(date: Date = new Date()): DueStoreResult {
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysSinceStart = Math.floor(
      (date.getTime() - this.startDate.getTime()) / msPerDay
    );
    const weeksSinceStart = Math.floor(daysSinceStart / 7);
    const weekInCycle = weeksSinceStart % 4;   // 0, 1, 2, 3
    const daysIntoWeek = daysSinceStart % 7;

    // Sam's on weeks 0 and 2; HT on weeks 1 and 3
    const dueStore: 'sams' | 'ht' =
      weekInCycle === 0 || weekInCycle === 2 ? 'sams' : 'ht';

    // Weeks until next Sam's run (weeks 0 or 2 in cycle)
    const weeksUntilSams =
      weekInCycle === 0 ? 0
      : weekInCycle === 1 ? 1
      : weekInCycle === 2 ? 0
      : 1; // week 3

    // Weeks until next HT run (weeks 1 or 3 in cycle)
    const weeksUntilHT =
      weekInCycle === 0 ? 1
      : weekInCycle === 1 ? 0
      : weekInCycle === 2 ? 1
      : 0; // week 3

    return {
      due_store: dueStore,
      week_in_cycle: weekInCycle,
      days_into_current_week: daysIntoWeek,
      days_until_next_sams: weeksUntilSams * 7 - daysIntoWeek,
      days_until_next_ht: weeksUntilHT * 7 - daysIntoWeek,
      recommended_shop_day: dueStore === 'sams' ? 'Sunday' : 'Wednesday',
    };
  }

  suggestItems(
    store: 'sams' | 'ht',
    includeRoutine = false,
    daysSinceLastShopOverride?: number
  ): SuggestedItem[] {
    const today = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;

    // Derive days since last shop from cadence position unless overridden
    let daysSinceLastShop: number;
    if (daysSinceLastShopOverride !== undefined) {
      daysSinceLastShop = daysSinceLastShopOverride;
    } else {
      const due = this.getDueStore(today);
      const daysSinceStart = Math.floor(
        (today.getTime() - this.startDate.getTime()) / msPerDay
      );
      if (store === 'sams') {
        // Sam's runs on weeks 0 and 2
        const weekInCycle = due.week_in_cycle;
        daysSinceLastShop =
          weekInCycle === 0 ? due.days_into_current_week
          : weekInCycle === 2 ? due.days_into_current_week
          : weekInCycle === 1 ? 7 + due.days_into_current_week
          : 14 + due.days_into_current_week; // week 3
      } else {
        const weekInCycle = due.week_in_cycle;
        daysSinceLastShop =
          weekInCycle === 1 ? due.days_into_current_week
          : weekInCycle === 3 ? due.days_into_current_week
          : weekInCycle === 0 ? 21 + due.days_into_current_week
          : 7 + due.days_into_current_week; // week 2
      }
    }

    const storeItems = MASTER_CATALOG.filter(
      (item) => item.store === store || item.store === 'both'
    );

    const urgencyOrder = { overdue: 0, due: 1, approaching: 2, routine: 3 };
    const suggestions: SuggestedItem[] = [];

    for (const item of storeItems) {
      const pctUsed = daysSinceLastShop / item.cadenceDays;
      let urgency: SuggestedItem['urgency'];
      if      (pctUsed >= 1.0)  urgency = 'overdue';
      else if (pctUsed >= 0.85) urgency = 'due';
      else if (pctUsed >= 0.65) urgency = 'approaching';
      else                      urgency = 'routine';

      if (urgency === 'routine' && !includeRoutine) continue;

      suggestions.push({
        id:           item.id,
        name:         item.name,
        category:     item.category,
        store:        item.store,
        quantity:     item.parStock,
        unit:         item.unit,
        approx_cost:  item.approxCost,
        cadence_days: item.cadenceDays,
        urgency,
        par_min:   item.parMin  ?? '',
        buy_qty:   item.buyQty  ?? '',
        is_ht_only: item.isHTOnly ?? false,
        notes:     item.notes   ?? '',
      });
    }

    suggestions.sort(
      (a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
    );
    return suggestions;
  }
}
