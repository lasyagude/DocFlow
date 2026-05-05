import useToastStore from '../store/toastStore';

const typeStyles = {
  success: {
    bg: 'bg-emerald-950/80 border-emerald-500/50',
    text: 'text-emerald-200',
    icon: '✓',
    iconBg: 'bg-emerald-500/20 text-emerald-400',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]'
  },
  error: {
    bg: 'bg-red-950/80 border-red-500/50',
    text: 'text-red-200',
    icon: '✕',
    iconBg: 'bg-red-500/20 text-red-400',
    glow: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]'
  },
  info: {
    bg: 'bg-cyan-950/80 border-cyan-500/50',
    text: 'text-cyan-200',
    icon: 'ℹ',
    iconBg: 'bg-cyan-500/20 text-cyan-400',
    glow: 'shadow-[0_0_15px_rgba(6,182,212,0.3)]'
  },
};

export default function Toast() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm font-mono">
      {toasts.map((toast) => {
        const style = typeStyles[toast.type] || typeStyles.info;
        return (
          <div
            key={toast.id}
            className={`${style.bg} ${style.glow} border backdrop-blur-xl rounded-xl px-4 py-3 flex items-center gap-4 animate-slide-in relative overflow-hidden`}
            style={{ animation: 'slideIn 0.3s ease-out' }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5 pointer-events-none" />
            <div className={`${style.iconBg} w-7 h-7 rounded-lg flex items-center justify-center font-bold flex-shrink-0 border border-current`}>
              {style.icon}
            </div>
            <p className={`${style.text} text-sm font-medium flex-1 antialiased tracking-wide`}>{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-500 hover:text-white transition-colors text-lg leading-none flex-shrink-0"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
