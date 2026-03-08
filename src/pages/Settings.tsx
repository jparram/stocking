import { useState } from 'react';
import type { AppState, HouseholdSettings, Store } from '../types';
import { storeLabel } from '../utils';

interface SettingsProps {
  state: AppState;
  onUpdate: (settings: HouseholdSettings) => void;
}

const STORE_OPTIONS: { value: Store; label: string }[] = [
  { value: 'both', label: 'Both Stores' },
  { value: 'sams', label: "Sam's Club" },
  { value: 'ht', label: 'Harris Teeter' },
];

export default function Settings({ state, onUpdate }: SettingsProps) {
  const [form, setForm] = useState<HouseholdSettings>({ ...state.settings });
  const [saved, setSaved] = useState(false);

  const handleChange = (key: keyof HouseholdSettings, value: string | number | Store) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    if (confirm('Reset all app data? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-brand-text">Settings</h1>

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-brand-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-brand-border bg-brand-bg">
          <h2 className="font-semibold text-brand-text">Household Settings</h2>
        </div>
        <div className="px-6 py-5 space-y-5">
          {/* Household Name */}
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">
              Household Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
              placeholder="e.g., The Smith Family"
            />
          </div>

          {/* Member Count */}
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">
              Family Members
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={form.memberCount}
              onChange={e => handleChange('memberCount', parseInt(e.target.value) || 1)}
              className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
            />
          </div>

          {/* Default Store */}
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">
              Default Store
            </label>
            <div className="flex gap-2 flex-wrap">
              {STORE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleChange('defaultStore', opt.value)}
                  className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                    form.defaultStore === opt.value
                      ? opt.value === 'ht'
                        ? 'bg-ht text-white border-ht'
                        : 'bg-sams text-white border-sams'
                      : 'bg-white border-brand-border text-brand-muted hover:border-gray-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cadence Start Date */}
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">
              Cadence Start Date
              <span className="text-xs text-brand-muted ml-2">
                (Used to calculate when items are due)
              </span>
            </label>
            <input
              type="date"
              value={form.cadenceStartDate}
              onChange={e => handleChange('cadenceStartDate', e.target.value)}
              className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sams"
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-brand-bg border-t border-brand-border flex items-center justify-between">
          {saved && (
            <span className="text-green-600 text-sm font-medium flex items-center gap-1">
              ✓ Settings saved!
            </span>
          )}
          {!saved && <span />}
          <button
            type="submit"
            className="bg-sams text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-sams-dark transition-colors"
          >
            Save Settings
          </button>
        </div>
      </form>

      {/* App Info */}
      <div className="bg-white rounded-xl border border-brand-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-brand-border bg-brand-bg">
          <h2 className="font-semibold text-brand-text">App Info</h2>
        </div>
        <div className="px-6 py-5 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-brand-muted">Current Store Preference</span>
            <span className="font-medium">{storeLabel(form.defaultStore)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-brand-muted">Data Storage</span>
            <span className="font-medium">Local (Browser)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-brand-muted">Version</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-brand-muted">Total Lists</span>
            <span className="font-medium">{state.lists.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-brand-muted">Trip Logs</span>
            <span className="font-medium">{state.weeklyLogs.length}</span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-red-200 bg-red-50">
          <h2 className="font-semibold text-red-700">Danger Zone</h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-brand-muted mb-3">
            Permanently delete all lists, history, and settings from this browser.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Reset All Data
          </button>
        </div>
      </div>
    </div>
  );
}
