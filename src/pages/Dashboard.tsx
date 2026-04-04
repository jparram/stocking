import { Link } from 'react-router-dom';
import type { AppState } from '../types';
import { formatDate, formatCurrency, listProgress, listTotalCost, storeLabel, getMondayOf } from '../utils';
import { MASTER_CATALOG } from '../data/masterCatalog';
import StoreBadge from '../components/StoreBadge';
import ProgressBar from '../components/ProgressBar';
import { useRecipes } from '../hooks/useRecipes';

interface DashboardProps {
  state: AppState;
}

export default function Dashboard({ state }: DashboardProps) {
  const { lists, weeklyLogs, settings } = state;
  const { recipes } = useRecipes();

  const weekOf = getMondayOf();
  const thisWeekLists = lists.filter(l => l.weekOf === weekOf);
  const activeLists = lists.filter(l => l.status === 'active');
  const recentLogs = weeklyLogs.slice(0, 3);

  // Items due this week based on cadence
  const dueItems = MASTER_CATALOG.filter(item => {
    const start = new Date(settings.cadenceStartDate + 'T12:00:00');
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince % item.cadenceDays < 7;
  });

  const dueSams = dueItems.filter(i => i.store === 'sams');
  const dueHT = dueItems.filter(i => i.store === 'ht');

  const totalSpend = weeklyLogs.slice(0, 4).reduce((s, l) => s + l.totalSpend, 0);
  const avgSpend = weeklyLogs.length > 0 ? totalSpend / Math.min(weeklyLogs.length, 4) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">
            {settings.name} Dashboard
          </h1>
          <p className="text-brand-muted text-sm">
            Week of {formatDate(weekOf)} · {settings.memberCount} family members
          </p>
        </div>
        <Link
          to="/list/new"
          className="bg-sams text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-sams-dark transition-colors"
        >
          + New List
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Lists" value={activeLists.length.toString()} icon="📝" />
        <StatCard label="This Week" value={thisWeekLists.length.toString()} icon="📅" />
        <StatCard label="Items Due" value={dueItems.length.toString()} icon="🔔" />
        <StatCard label="Avg Weekly Spend" value={formatCurrency(avgSpend)} icon="💰" />
      </div>

      {/* Items Due This Week */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Sam's Club Due */}
        <div className="bg-white rounded-xl border border-brand-border p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-brand-text flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-sams inline-block"></span>
              Sam's Club ({dueSams.length} items)
            </h2>
            <Link
              to="/list/new"
              className="text-xs text-sams hover:underline font-medium"
            >
              Create List →
            </Link>
          </div>
          <ul className="space-y-1.5 max-h-48 overflow-y-auto">
            {dueSams.slice(0, 8).map(item => (
              <li key={item.id} className="flex justify-between text-sm">
                <span className="text-brand-text">{item.name}</span>
                <span className="text-brand-muted">{item.parStock} {item.unit}</span>
              </li>
            ))}
            {dueSams.length > 8 && (
              <li className="text-xs text-brand-muted pt-1">+{dueSams.length - 8} more items</li>
            )}
            {dueSams.length === 0 && (
              <li className="text-sm text-brand-muted italic">No items due this week</li>
            )}
          </ul>
        </div>

        {/* Harris Teeter Due */}
        <div className="bg-white rounded-xl border border-brand-border p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-brand-text flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-ht inline-block"></span>
              Harris Teeter ({dueHT.length} items)
            </h2>
            <Link
              to="/list/new"
              className="text-xs text-ht hover:underline font-medium"
            >
              Create List →
            </Link>
          </div>
          <ul className="space-y-1.5 max-h-48 overflow-y-auto">
            {dueHT.slice(0, 8).map(item => (
              <li key={item.id} className="flex justify-between text-sm">
                <span className="text-brand-text">{item.name}</span>
                <span className="text-brand-muted">{item.parStock} {item.unit}</span>
              </li>
            ))}
            {dueHT.length > 8 && (
              <li className="text-xs text-brand-muted pt-1">+{dueHT.length - 8} more items</li>
            )}
            {dueHT.length === 0 && (
              <li className="text-sm text-brand-muted italic">No items due this week</li>
            )}
          </ul>
        </div>
      </div>

      {/* Active / In-Progress Lists */}
      {activeLists.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">In-Progress Lists</h2>
          <div className="space-y-3">
            {activeLists.map(list => {
              const progress = listProgress(list);
              const total = listTotalCost(list);
              const barColor = list.store === 'ht' ? 'bg-ht' : 'bg-sams';
              return (
                <Link
                  key={list.id}
                  to={`/list/${list.id}`}
                  className="block bg-white rounded-xl border border-brand-border p-4 shadow-sm hover:border-sams transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-brand-text">{list.name}</p>
                      <p className="text-xs text-brand-muted">{formatDate(list.weekOf)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StoreBadge store={list.store} />
                      <span className="text-sm font-medium text-brand-muted">{formatCurrency(total)}</span>
                    </div>
                  </div>
                  <ProgressBar percent={progress} color={barColor} />
                  <p className="text-xs text-brand-muted mt-1">
                    {list.items.filter(i => i.checked).length} / {list.items.length} items
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent History */}
      {recentLogs.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Recent Trips</h2>
            <Link to="/history" className="text-sm text-sams hover:underline">View All →</Link>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {recentLogs.map(log => (
              <div key={log.id} className="bg-white rounded-xl border border-brand-border p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium text-brand-text">Week of {formatDate(log.weekOf)}</p>
                  <StoreBadge store={log.store} />
                </div>
                <p className="text-2xl font-bold text-brand-text mt-2">{formatCurrency(log.totalSpend)}</p>
                <p className="text-xs text-brand-muted">{log.itemCount} items · {storeLabel(log.store)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recipes Widget */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Recipes</h2>
          <Link to="/recipes" className="text-sm text-sams hover:underline">View All →</Link>
        </div>
        <div className="bg-white rounded-xl border border-brand-border p-4 shadow-sm">
          {recipes.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-2">📖</div>
              <p className="text-brand-muted text-sm mb-3">No recipes yet. Add your first one!</p>
              <Link
                to="/recipes/new"
                className="bg-sams text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-sams-dark transition-colors"
              >
                + Add Recipe
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-6 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand-text">{recipes.length}</div>
                  <div className="text-xs text-brand-muted">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand-text">
                    {recipes.filter(r => r.isFavorite).length}
                  </div>
                  <div className="text-xs text-brand-muted">Favorites</div>
                </div>
                <div className="ml-auto">
                  <Link
                    to="/recipes/new"
                    className="bg-sams text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-sams-dark transition-colors"
                  >
                    + Add Recipe
                  </Link>
                </div>
              </div>
              {(() => {
                const recentlyMade = recipes
                  .filter(r => r.lastMadeDate)
                  .sort((a, b) => new Date(b.lastMadeDate!).getTime() - new Date(a.lastMadeDate!).getTime())
                  .slice(0, 3);
                if (recentlyMade.length === 0) return null;
                return (
                  <div>
                    <p className="text-xs font-medium text-brand-muted uppercase tracking-wide mb-2">Recently Made</p>
                    <ul className="space-y-1.5">
                      {recentlyMade.map(r => (
                        <li key={r.id} className="flex justify-between text-sm">
                          <Link to={`/recipes/${r.id}`} className="text-brand-text hover:text-sams hover:underline">
                            {r.name}
                          </Link>
                          <span className="text-brand-muted">{r.lastMadeDate && formatDate(r.lastMadeDate)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </section>

      {/* Empty state */}
      {lists.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-xl font-semibold text-brand-text mb-2">Welcome to Family Grocery Tracker!</h2>
          <p className="text-brand-muted mb-6 max-w-sm mx-auto">
            Start by creating your first shopping list. We'll suggest items based on your family's cadence.
          </p>
          <Link
            to="/list/new"
            className="bg-sams text-white px-6 py-3 rounded-lg font-semibold hover:bg-sams-dark transition-colors"
          >
            Create Your First List
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-white rounded-xl border border-brand-border p-4 shadow-sm text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-brand-text">{value}</div>
      <div className="text-xs text-brand-muted">{label}</div>
    </div>
  );
}
