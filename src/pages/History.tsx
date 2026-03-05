import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AppState } from '../types';
import { formatDate, formatCurrency, storeLabel } from '../utils';
import StoreBadge from '../components/StoreBadge';

interface HistoryProps {
  state: AppState;
}

export default function History({ state }: HistoryProps) {
  const { lists, weeklyLogs } = state;
  const [tab, setTab] = useState<'logs' | 'lists'>('logs');

  const completedLists = lists.filter(l => l.status === 'complete');
  const totalSpend = weeklyLogs.reduce((s, l) => s + l.totalSpend, 0);
  const avgSpend = weeklyLogs.length > 0 ? totalSpend / weeklyLogs.length : 0;

  // Simple bar chart data (last 8 weeks)
  const chartData = weeklyLogs.slice(0, 8).reverse();
  const maxSpend = Math.max(...chartData.map(l => l.totalSpend), 1);

  const handleExportAllCSV = () => {
    const headers = ['Week Of', 'Store', 'Total Spend', 'Items', 'Completed At'];
    const rows = weeklyLogs.map(log => [
      formatDate(log.weekOf),
      storeLabel(log.store),
      formatCurrency(log.totalSpend),
      log.itemCount.toString(),
      new Date(log.completedAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grocery-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">Shopping History</h1>
        <button
          onClick={handleExportAllCSV}
          className="px-3 py-2 bg-white border border-brand-border rounded-lg text-sm font-medium hover:bg-brand-bg transition-colors"
        >
          📊 Export CSV
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-brand-border p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-sams">{weeklyLogs.length}</div>
          <div className="text-xs text-brand-muted">Total Trips</div>
        </div>
        <div className="bg-white rounded-xl border border-brand-border p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-sams">{formatCurrency(totalSpend)}</div>
          <div className="text-xs text-brand-muted">Total Spent</div>
        </div>
        <div className="bg-white rounded-xl border border-brand-border p-4 shadow-sm text-center">
          <div className="text-2xl font-bold text-sams">{formatCurrency(avgSpend)}</div>
          <div className="text-xs text-brand-muted">Avg Per Trip</div>
        </div>
      </div>

      {/* Spend Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-brand-border p-4 shadow-sm">
          <h2 className="font-semibold text-sm mb-4 text-brand-text">Spend Per Trip (Last {chartData.length})</h2>
          <div className="flex items-end gap-2 h-32">
            {chartData.map((log) => {
              const heightPct = (log.totalSpend / maxSpend) * 100;
              const barColor = log.store === 'ht' ? 'bg-ht' : 'bg-sams';
              return (
                <div key={log.id} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-brand-muted">{formatCurrency(log.totalSpend)}</span>
                  <div
                    className={`w-full ${barColor} rounded-t transition-all`}
                    style={{ height: `${heightPct}%` }}
                    title={`${formatDate(log.weekOf)}: ${formatCurrency(log.totalSpend)}`}
                  />
                  <span className="text-xs text-brand-muted" style={{ fontSize: '10px' }}>
                    {log.weekOf.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-brand-border">
        <button
          onClick={() => setTab('logs')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'logs' ? 'border-sams text-sams' : 'border-transparent text-brand-muted hover:text-brand-text'
          }`}
        >
          Trip Logs ({weeklyLogs.length})
        </button>
        <button
          onClick={() => setTab('lists')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'lists' ? 'border-sams text-sams' : 'border-transparent text-brand-muted hover:text-brand-text'
          }`}
        >
          Completed Lists ({completedLists.length})
        </button>
      </div>

      {/* Tab Content */}
      {tab === 'logs' && (
        <div className="space-y-3">
          {weeklyLogs.length === 0 && (
            <div className="text-center py-12 text-brand-muted">
              <div className="text-4xl mb-3">📊</div>
              <p>No shopping trips recorded yet.</p>
              <Link to="/list/new" className="text-sams hover:underline text-sm mt-2 block">
                Create your first list →
              </Link>
            </div>
          )}
          {weeklyLogs.map(log => (
            <div key={log.id} className="bg-white rounded-xl border border-brand-border p-4 shadow-sm flex justify-between items-center">
              <div>
                <p className="font-semibold text-brand-text">Week of {formatDate(log.weekOf)}</p>
                <p className="text-xs text-brand-muted">
                  {log.itemCount} items · {storeLabel(log.store)} ·{' '}
                  {new Date(log.completedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StoreBadge store={log.store} />
                <span className="text-lg font-bold text-brand-text">{formatCurrency(log.totalSpend)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'lists' && (
        <div className="space-y-3">
          {completedLists.length === 0 && (
            <div className="text-center py-12 text-brand-muted">
              <div className="text-4xl mb-3">📝</div>
              <p>No completed lists yet.</p>
            </div>
          )}
          {completedLists.map(list => (
            <Link
              key={list.id}
              to={`/list/${list.id}`}
              className="block bg-white rounded-xl border border-brand-border p-4 shadow-sm hover:border-sams transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-brand-text">{list.name}</p>
                  <p className="text-xs text-brand-muted">
                    {list.items.length} items · Week of {formatDate(list.weekOf)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StoreBadge store={list.store} />
                  <span className="text-sm font-bold">
                    {formatCurrency(list.totalSpend ?? 0)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
