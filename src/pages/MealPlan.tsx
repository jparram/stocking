import { useState, useMemo, useRef, useEffect } from 'react';
import { useMealCalendar, nextMemberColor } from '../hooks/useMealCalendar';
import { useRecipes } from '../hooks/useRecipes';
import type { DayOfWeek, MealType, MealCalendarEntry, MealPlanMember } from '../types';
import { getMondayOf } from '../utils';

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'sun', label: 'Sun' },
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
];

const FAMILY_ROWS: { key: MealType; label: string }[] = [
  { key: 'dinner', label: 'Dinner' },
  { key: 'lunch', label: 'Lunch' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Add/subtract weeks from a Monday ISO date */
function shiftWeek(weekOf: string, delta: number): string {
  const d = new Date(weekOf + 'T12:00:00');
  d.setDate(d.getDate() + delta * 7);
  return d.toISOString().split('T')[0];
}

/** Format Monday date as "Apr 6 – Apr 12, 2026" */
function formatWeekRange(weekOf: string): string {
  const mon = new Date(weekOf + 'T12:00:00');
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(mon)} – ${fmt(sun)}, ${sun.getFullYear()}`;
}

/** Get the date for a specific day column */
function dayDate(weekOf: string, dayIdx: number): Date {
  // weekOf is Monday. Keep the existing Sun-first column order, but map
  // Sunday to the end of the same Monday-based week instead of the previous week.
  const mon = new Date(weekOf + 'T12:00:00');
  const d = new Date(mon);
  const offset = dayIdx === 0 ? 6 : dayIdx - 1;
  d.setDate(d.getDate() + offset);
  return d;
}

/** Format a day column header */
function formatDayHeader(weekOf: string, dayIdx: number): string {
  const d = dayDate(weekOf, dayIdx);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Check if a day is today */
function isToday(weekOf: string, dayIdx: number): boolean {
  const d = dayDate(weekOf, dayIdx);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

// ── Cell component ─────────────────────────────────────────────────────────────

interface CellProps {
  entry?: MealCalendarEntry;
  accentColor: string;
  onClick: () => void;
}

function MealCell({ entry, accentColor, onClick }: CellProps) {
  const recipeName = entry?.recipeName?.trim();
  const label = entry?.label?.trim();
  const notes = entry?.notes?.trim();
  const displayText = recipeName || label || (notes ? `Note: ${notes}` : '');
  const hasContent = Boolean(displayText);

  return (
    <button
      onClick={onClick}
      className={`w-full min-h-[52px] rounded-lg border text-left px-2 py-1.5 text-xs transition-colors group ${
        hasContent
          ? 'border-transparent hover:border-gray-300'
          : 'border-dashed border-brand-border hover:border-gray-400 hover:bg-brand-bg'
      }`}
      style={hasContent ? { backgroundColor: accentColor + '18', borderColor: accentColor + '40' } : undefined}
    >
      {hasContent ? (
        <span className="font-medium leading-snug line-clamp-2" style={{ color: accentColor }}>
          {displayText}
        </span>
      ) : (
        <span className="text-brand-muted opacity-0 group-hover:opacity-100 transition-opacity">+</span>
      )}
    </button>
  );
}

// ── Edit Modal ─────────────────────────────────────────────────────────────────

interface EditModalProps {
  weekOf: string;
  dayOfWeek: DayOfWeek;
  dayLabel: string;
  mealType: MealType;
  planType: 'family' | 'individual';
  memberId?: string;
  memberName?: string;
  existing?: MealCalendarEntry;
  onSave: (data: { recipeId?: string; recipeName?: string; label?: string; notes?: string }) => void;
  onDelete: () => void;
  onClose: () => void;
}

function EditModal({
  dayLabel,
  mealType,
  planType,
  memberName,
  existing,
  onSave,
  onDelete,
  onClose,
}: EditModalProps) {
  const { recipes } = useRecipes();
  const [recipeSearch, setRecipeSearch] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState(existing?.recipeId ?? '');
  const [selectedRecipeName, setSelectedRecipeName] = useState(existing?.recipeName ?? '');
  const [label, setLabel] = useState(existing?.label ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [mode, setMode] = useState<'recipe' | 'text'>(
    existing?.recipeId ? 'recipe' : existing?.label ? 'text' : 'recipe'
  );
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const filteredRecipes = useMemo(() => {
    if (!recipeSearch.trim()) return recipes.slice(0, 8);
    const q = recipeSearch.toLowerCase();
    return recipes.filter(r => r.name.toLowerCase().includes(q)).slice(0, 8);
  }, [recipes, recipeSearch]);

  const sectionLabel = planType === 'family' ? 'Family' : memberName ?? 'Individual';
  const mealLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);
  const title = `${sectionLabel} ${mealLabel} — ${dayLabel}`;

  const handleSave = () => {
    if (mode === 'recipe' && selectedRecipeId) {
      onSave({ recipeId: selectedRecipeId, recipeName: selectedRecipeName, label: undefined, notes });
    } else if (mode === 'text' && label.trim()) {
      onSave({ recipeId: undefined, recipeName: undefined, label: label.trim(), notes });
    } else if (notes.trim()) {
      // notes only — keep existing entry data if any
      onSave({
        recipeId: existing?.recipeId,
        recipeName: existing?.recipeName,
        label: existing?.label,
        notes,
      });
    }
  };

  const canSave =
    (mode === 'recipe' && !!selectedRecipeId) ||
    (mode === 'text' && !!label.trim()) ||
    !!notes.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between">
          <h2 className="font-semibold text-brand-text text-sm">{title}</h2>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-text text-xl leading-none">
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('recipe')}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                mode === 'recipe'
                  ? 'bg-ht text-white border-ht'
                  : 'bg-white border-brand-border text-brand-muted hover:border-gray-400'
              }`}
            >
              🍳 From recipe library
            </button>
            <button
              onClick={() => setMode('text')}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                mode === 'text'
                  ? 'bg-ht text-white border-ht'
                  : 'bg-white border-brand-border text-brand-muted hover:border-gray-400'
              }`}
            >
              ✏️ Free text
            </button>
          </div>

          {mode === 'recipe' ? (
            <div className="space-y-2">
              {/* Selected recipe chip */}
              {selectedRecipeId && (
                <div className="flex items-center gap-2 px-3 py-2 bg-ht-light rounded-lg">
                  <span className="text-sm font-medium text-ht flex-1">{selectedRecipeName}</span>
                  <button
                    onClick={() => { setSelectedRecipeId(''); setSelectedRecipeName(''); }}
                    className="text-ht hover:text-ht-dark text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}
              {/* Search */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted text-sm">🔍</span>
                <input
                  ref={searchRef}
                  type="text"
                  value={recipeSearch}
                  onChange={e => setRecipeSearch(e.target.value)}
                  placeholder="Search recipes…"
                  className="w-full pl-8 pr-3 py-2 border border-brand-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ht"
                />
              </div>
              {/* Results */}
              {filteredRecipes.length > 0 && (
                <ul className="border border-brand-border rounded-lg divide-y divide-brand-border max-h-44 overflow-y-auto">
                  {filteredRecipes.map(r => (
                    <li key={r.id}>
                      <button
                        onClick={() => {
                          setSelectedRecipeId(r.id);
                          setSelectedRecipeName(r.name);
                          setRecipeSearch('');
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-ht-light transition-colors ${
                          selectedRecipeId === r.id ? 'bg-ht-light font-medium text-ht' : 'text-brand-text'
                        }`}
                      >
                        {r.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {recipeSearch && filteredRecipes.length === 0 && (
                <p className="text-sm text-brand-muted px-1">No matching recipes found.</p>
              )}
            </div>
          ) : (
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Tacos, Leftovers…"
              className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ht"
            />
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-brand-muted mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. double batch, kids don't like mushrooms…"
              className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ht"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-brand-border flex gap-2">
          {existing && (
            <button
              onClick={onDelete}
              className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 hover:border-red-400 rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-brand-muted border border-brand-border rounded-lg hover:border-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 text-sm font-semibold text-white bg-ht rounded-lg hover:bg-ht-dark transition-colors disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Member management modal ───────────────────────────────────────────────────

interface ManageMembersModalProps {
  members: MealPlanMember[];
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

function ManageMembersModal({ members, onAdd, onRename, onRemove, onClose }: ManageMembersModalProps) {
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAdd(newName.trim());
    setNewName('');
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editing.name.trim()) return;
    onRename(editing.id, editing.name);
    setEditing(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between">
          <h2 className="font-semibold text-brand-text">Manage Members</h2>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-text text-xl leading-none">
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-80 overflow-y-auto">
          {members.length === 0 && (
            <p className="text-sm text-brand-muted">No members yet. Add one below.</p>
          )}
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: m.color }}
              />
              {editing?.id === m.id ? (
                <form onSubmit={handleRenameSubmit} className="flex gap-2 flex-1">
                  <input
                    autoFocus
                    type="text"
                    value={editing.name}
                    onChange={e => setEditing({ id: m.id, name: e.target.value })}
                    className="flex-1 border border-brand-border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ht"
                  />
                  <button
                    type="submit"
                    className="text-xs px-2 py-1 bg-ht text-white rounded-lg"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="text-xs px-2 py-1 border border-brand-border rounded-lg text-brand-muted"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-brand-text">{m.name}</span>
                  <button
                    onClick={() => setEditing({ id: m.id, name: m.name })}
                    className="text-xs text-brand-muted hover:text-brand-text"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${m.name}? Their meal entries will also be deleted.`)) {
                        onRemove(m.id);
                      }
                    }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleAdd} className="px-5 py-4 border-t border-brand-border">
          <label className="block text-xs font-medium text-brand-muted mb-2">Add member</label>
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0 mt-2.5" style={{ backgroundColor: nextMemberColor(members) }} />
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Alex, Jordan…"
              className="flex-1 border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ht"
            />
            <button
              type="submit"
              disabled={!newName.trim()}
              className="px-4 py-2 bg-ht text-white text-sm font-medium rounded-lg hover:bg-ht-dark disabled:opacity-40 transition-colors"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type TabFilter = 'all' | 'family' | string; // string = memberId

interface EditTarget {
  dayOfWeek: DayOfWeek;
  dayLabel: string;
  mealType: MealType;
  planType: 'family' | 'individual';
  memberId?: string;
  memberName?: string;
}

export default function MealPlan() {
  const [weekOf, setWeekOf] = useState(getMondayOf());
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);

  const {
    members,
    addMember,
    renameMember,
    removeMember,
    getEntry,
    upsertEntry,
    deleteEntry,
    weekEntries,
  } = useMealCalendar();

  const currentEntries = weekEntries(weekOf);

  // Derive visible rows based on tab filter
  const showFamily = activeTab === 'all' || activeTab === 'family';
  const visibleMembers = useMemo(() => {
    if (activeTab === 'all') return members;
    if (activeTab === 'family') return [];
    return members.filter(m => m.id === activeTab);
  }, [activeTab, members]);

  // When a member is removed, reset tab if it was selected
  useEffect(() => {
    if (typeof activeTab === 'string' && activeTab !== 'all' && activeTab !== 'family') {
      if (!members.find(m => m.id === activeTab)) {
        setActiveTab('all');
      }
    }
  }, [members, activeTab]);

  const openEditModal = (
    dayOfWeek: DayOfWeek,
    dayIdx: number,
    mealType: MealType,
    planType: 'family' | 'individual',
    memberId?: string
  ) => {
    const d = dayDate(weekOf, dayIdx);
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const member = members.find(m => m.id === memberId);
    setEditTarget({
      dayOfWeek,
      dayLabel,
      mealType,
      planType,
      memberId,
      memberName: member?.name,
    });
  };

  const handleSave = (data: { recipeId?: string; recipeName?: string; label?: string; notes?: string }) => {
    if (!editTarget) return;
    upsertEntry(
      weekOf,
      editTarget.planType,
      editTarget.dayOfWeek,
      editTarget.mealType,
      data,
      editTarget.memberId
    );
    setEditTarget(null);
  };

  const handleDelete = () => {
    if (!editTarget) return;
    const entry = getEntry(
      weekOf,
      editTarget.planType,
      editTarget.dayOfWeek,
      editTarget.mealType,
      editTarget.memberId
    );
    if (entry) deleteEntry(entry.id);
    setEditTarget(null);
  };

  const editingEntry = editTarget
    ? getEntry(weekOf, editTarget.planType, editTarget.dayOfWeek, editTarget.mealType, editTarget.memberId)
    : undefined;

  // Family accent colour
  const FAMILY_ACCENT_COLOR = '#00843D'; // ht green

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-brand-text">Meal Plan</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMembersModal(true)}
            className="px-3 py-1.5 text-sm font-medium border border-brand-border rounded-lg hover:border-gray-400 text-brand-muted hover:text-brand-text transition-colors"
          >
            👥 Members
          </button>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setWeekOf(w => shiftWeek(w, -1))}
          className="p-2 rounded-lg border border-brand-border hover:bg-brand-bg transition-colors text-brand-muted hover:text-brand-text"
          aria-label="Previous week"
        >
          ‹
        </button>
        <div className="flex-1 text-center">
          <span className="font-semibold text-brand-text text-sm sm:text-base">
            {formatWeekRange(weekOf)}
          </span>
        </div>
        <button
          onClick={() => setWeekOf(w => shiftWeek(w, 1))}
          className="p-2 rounded-lg border border-brand-border hover:bg-brand-bg transition-colors text-brand-muted hover:text-brand-text"
          aria-label="Next week"
        >
          ›
        </button>
        <button
          onClick={() => setWeekOf(getMondayOf())}
          className="px-3 py-2 text-xs font-medium border border-brand-border rounded-lg hover:bg-brand-bg text-brand-muted hover:text-brand-text transition-colors"
        >
          Today
        </button>
      </div>

      {/* Tab filter row */}
      <div className="flex gap-2 flex-wrap items-center overflow-x-auto pb-1">
        {[
          { id: 'all' as TabFilter, label: 'All' },
          { id: 'family' as TabFilter, label: '🏠 Family' },
          ...members.map(m => ({ id: m.id, label: m.name, color: m.color })),
        ].map(tab => {
          const isActive = activeTab === tab.id;
          const color = 'color' in tab ? (tab as { color: string }).color : undefined;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${
                isActive
                  ? 'text-white'
                  : 'bg-white border border-brand-border text-brand-muted hover:text-brand-text'
              }`}
              style={isActive
                ? { backgroundColor: color ?? (tab.id === 'family' ? FAMILY_ACCENT_COLOR : '#004990') }
                : undefined
              }
            >
              {tab.label}
            </button>
          );
        })}
        <button
          onClick={() => setShowMembersModal(true)}
          className="px-3 py-1.5 rounded-full text-sm font-medium bg-white border border-dashed border-brand-border text-brand-muted hover:border-gray-400 hover:text-brand-text transition-colors flex-shrink-0"
        >
          + Member
        </button>
      </div>

      {/* Calendar grid — horizontally scrollable on small screens */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="min-w-[640px]">
          {/* Day header row */}
          <div className="grid grid-cols-[120px_repeat(7,1fr)] gap-1 mb-1">
            <div /> {/* label column */}
            {DAYS.map((day, idx) => {
              const today = isToday(weekOf, idx);
              return (
                <div
                  key={day.key}
                  className={`text-center py-2 rounded-lg text-xs font-semibold ${
                    today
                      ? 'bg-sams text-white'
                      : 'text-brand-muted bg-brand-bg'
                  }`}
                >
                  <div>{day.label}</div>
                  <div className={`text-xs font-normal mt-0.5 ${today ? 'text-blue-100' : 'text-brand-muted'}`}>
                    {formatDayHeader(weekOf, idx)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Family section ───────────────────────────── */}
          {showFamily && (
            <div className="mb-3">
              <div className="grid grid-cols-[120px_repeat(7,1fr)] gap-1 mb-1">
                <div
                  className="flex items-center px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wide"
                  style={{ color: FAMILY_ACCENT_COLOR }}
                >
                  🏠 Family
                </div>
                {DAYS.map(day => (
                  <div key={`fhdr-${day.key}`} />
                ))}
              </div>
              {FAMILY_ROWS.map(row => (
                <div key={row.key} className="grid grid-cols-[120px_repeat(7,1fr)] gap-1 mb-1">
                  <div className="flex items-center px-3 text-xs font-medium text-brand-muted">
                    {row.label}
                  </div>
                  {DAYS.map((day, idx) => {
                    const entry = currentEntries.find(
                      e =>
                        e.planType === 'family' &&
                        e.dayOfWeek === day.key &&
                        e.mealType === row.key
                    );
                    return (
                      <MealCell
                        key={day.key}
                        entry={entry}
                        accentColor={FAMILY_ACCENT_COLOR}
                        onClick={() => openEditModal(day.key, idx, row.key, 'family')}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Divider between family and individual */}
          {showFamily && visibleMembers.length > 0 && (
            <div className="border-t border-brand-border my-3" />
          )}

          {/* ── Individual sections ──────────────────────── */}
          {visibleMembers.map(member => (
            <div key={member.id} className="mb-3">
              {/* Member label row */}
              <div className="grid grid-cols-[120px_repeat(7,1fr)] gap-1 mb-1">
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wide"
                  style={{ color: member.color }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: member.color }}
                  />
                  {member.name}
                </div>
                {DAYS.map(day => <div key={`mhdr-${member.id}-${day.key}`} />)}
              </div>
              {/* Single row per member (dinner) */}
              <div className="grid grid-cols-[120px_repeat(7,1fr)] gap-1">
                <div className="flex items-center px-3 text-xs font-medium text-brand-muted">Dinner</div>
                {DAYS.map((day, idx) => {
                  const entry = currentEntries.find(
                    e =>
                      e.planType === 'individual' &&
                      e.memberId === member.id &&
                      e.dayOfWeek === day.key &&
                      e.mealType === 'dinner'
                  );
                  return (
                    <MealCell
                      key={day.key}
                      entry={entry}
                      accentColor={member.color}
                      onClick={() => openEditModal(day.key, idx, 'dinner', 'individual', member.id)}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Empty state when no members and no family visible */}
          {!showFamily && visibleMembers.length === 0 && (
            <div className="text-center py-16 text-brand-muted">
              <div className="text-4xl mb-3">🗓️</div>
              <p>Select a tab to view the schedule.</p>
            </div>
          )}

          {/* Prompt to add first member */}
          {activeTab === 'all' && members.length === 0 && (
            <div className="mt-4 rounded-xl border border-dashed border-brand-border bg-brand-bg p-6 text-center">
              <p className="text-sm text-brand-muted mb-3">
                Add family members to create individual meal rows.
              </p>
              <button
                onClick={() => setShowMembersModal(true)}
                className="px-4 py-2 bg-ht text-white text-sm font-medium rounded-lg hover:bg-ht-dark transition-colors"
              >
                + Add Member
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editTarget && (
        <EditModal
          weekOf={weekOf}
          dayOfWeek={editTarget.dayOfWeek}
          dayLabel={editTarget.dayLabel}
          mealType={editTarget.mealType}
          planType={editTarget.planType}
          memberId={editTarget.memberId}
          memberName={editTarget.memberName}
          existing={editingEntry}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Manage Members Modal */}
      {showMembersModal && (
        <ManageMembersModal
          members={members}
          onAdd={addMember}
          onRename={renameMember}
          onRemove={removeMember}
          onClose={() => setShowMembersModal(false)}
        />
      )}
    </div>
  );
}
