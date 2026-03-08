import type { Store } from '../types';
import { storeLabel } from '../utils';

interface StoreBadgeProps {
  store: Store;
  size?: 'sm' | 'md';
}

export default function StoreBadge({ store, size = 'sm' }: StoreBadgeProps) {
  const base = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  const color =
    store === 'sams'
      ? 'bg-sams text-white'
      : store === 'ht'
      ? 'bg-ht text-white'
      : 'bg-gray-700 text-white';
  return (
    <span className={`inline-block rounded-full font-medium ${base} ${color}`}>
      {storeLabel(store)}
    </span>
  );
}
