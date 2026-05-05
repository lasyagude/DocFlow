export function Skeleton({ className = '', width, height, rounded = 'rounded-lg' }) {
  return (
    <div
      className={`animate-pulse bg-slate-800/50 ${rounded} ${className}`}
      style={{ width, height }}
    >
      <div className="w-full h-full bg-gradient-to-r from-slate-800/0 via-slate-700/20 to-slate-800/0 animate-[shimmer_2s_infinite]" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 relative overflow-hidden">
      <Skeleton className="w-14 h-14 mb-4 bg-slate-800" rounded="rounded-xl" />
      <Skeleton className="w-24 h-6 mb-2 bg-slate-800" />
      <Skeleton className="w-16 h-3 bg-slate-800" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 4 }) {
  return (
    <tr className="border-b border-slate-800/30">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton className="h-4 bg-slate-800/70" width={i === 0 ? '60%' : '40%'} rounded="rounded-md" />
        </td>
      ))}
    </tr>
  );
}

export function ChartSkeleton() {
  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800">
      <Skeleton className="w-48 h-5 mb-6 bg-slate-800" />
      <div className="flex items-end gap-3 h-48 px-2">
        {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
          <Skeleton key={i} className="flex-1 bg-slate-800" height={`${h}%`} rounded="rounded-t-lg" />
        ))}
      </div>
    </div>
  );
}
