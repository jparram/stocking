interface ProgressBarProps {
  percent: number;
  color?: string;
  showLabel?: boolean;
}

export default function ProgressBar({ percent, color = 'bg-sams', showLabel = true }: ProgressBarProps) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-brand-muted mb-1">
        {showLabel && <span>{percent}% complete</span>}
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
