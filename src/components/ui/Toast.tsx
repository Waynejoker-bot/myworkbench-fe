import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";
import { useToast, type ToastType } from "@/contexts/ToastContext";

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={18} color="#22c55e" />,
  error: <XCircle size={18} color="#ef4444" />,
  info: <Info size={18} color="#0ea5e9" />,
  warning: <AlertTriangle size={18} color="#f59e0b" />,
};

const borderColorMap: Record<ToastType, string> = {
  success: "#22c55e",
  error: "#ef4444",
  info: "#0ea5e9",
  warning: "#f59e0b",
};

function ToastItem({
  id,
  message,
  type,
  onRemove,
}: {
  id: string;
  message: string;
  type: ToastType;
  onRemove: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-in on next frame
    const raf = requestAnimationFrame(() => {
      setVisible(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      style={{
        backgroundColor: "#f9fafb",
        borderColor: "#d1d5db",
        borderLeftColor: borderColorMap[type],
        transform: visible ? "translateX(0)" : "translateX(100%)",
        opacity: visible ? 1 : 0,
        transition: "transform 300ms ease-out, opacity 300ms ease-out",
      }}
      className="flex items-center gap-3 rounded-md border border-l-4 px-4 py-3 shadow-lg"
    >
      <span className="flex-shrink-0">{iconMap[type]}</span>
      <span
        className="flex-1 text-sm"
        style={{ color: "#111827" }}
      >
        {message}
      </span>
      <button
        onClick={() => onRemove(id)}
        className="flex-shrink-0 cursor-pointer rounded p-0.5 transition-colors hover:bg-white/10"
        aria-label="Close toast"
      >
        <X size={14} color="#64748b" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 flex w-80 flex-col gap-2"
      style={{ zIndex: 9999 }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem
            id={toast.id}
            message={toast.message}
            type={toast.type}
            onRemove={removeToast}
          />
        </div>
      ))}
    </div>
  );
}
