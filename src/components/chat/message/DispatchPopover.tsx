import { useEffect, useRef } from 'react';
import { useTaskCardStore } from '@/store/useTaskCardStore';

// ── Mock data ────────────────────────────────────────────────────────

const SALES_TEAM = [
  { name: '李明', tasks: 3 },
  { name: '张强', tasks: 5 },
  { name: '王芳', tasks: 2 },
  { name: '刘洋', tasks: 1 },
];

// ── Component ────────────────────────────────────────────────────────

interface DispatchPopoverProps {
  cardId: string;
  onClose: () => void;
}

export function DispatchPopover({ cardId, onClose }: DispatchPopoverProps) {
  const dispatchCard = useTaskCardStore((s) => s.dispatchCard);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  async function handleSelect(name: string) {
    await dispatchCard(cardId, name);
    onClose();
  }

  return (
    <div
      ref={popoverRef}
      className="absolute left-0 z-50 w-64 rounded-lg border shadow-xl"
      style={{
        top: 'calc(100% + 4px)',
        backgroundColor: '#1E293B',
        borderColor: '#334155',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}
    >
      <div className="p-2">
        <div className="mb-1.5 px-2 text-xs font-medium" style={{ color: '#94A3B8' }}>
          选择派发对象
        </div>
        {SALES_TEAM.map((person) => (
          <button
            key={person.name}
            onClick={() => handleSelect(person.name)}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-white/5"
          >
            {/* Avatar circle */}
            <span
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: '#0EA5E9' }}
            >
              {person.name.charAt(0)}
            </span>
            <div className="flex flex-col items-start">
              <span style={{ color: '#F1F5F9' }}>{person.name}</span>
              <span className="text-xs" style={{ color: '#94A3B8' }}>
                当前 {person.tasks} 个任务
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
