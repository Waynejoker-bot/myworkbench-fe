import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";
import { useToast, type ToastType } from "@/contexts/ToastContext";

const iconClassMap: Record<ToastType, string> = {
  success: "text-success",
  error: "text-destructive",
  info: "text-primary",
  warning: "text-warning",
};

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={18} className="text-success" />,
  error: <XCircle size={18} className="text-destructive" />,
  info: <Info size={18} className="text-primary" />,
  warning: <AlertTriangle size={18} className="text-warning" />,
};

const borderColorMap: Record<ToastType, string> = {
  success: "border-l-success",
  error: "border-l-destructive",
  info: "border-l-primary",
  warning: "border-l-warning",
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
        transform: visible ? "translateX(0)" : "translateX(100%)",
        opacity: visible ? 1 : 0,
        transition: "transform 300ms ease-out, opacity 300ms ease-out",
      }}
      className={`flex items-center gap-3 rounded-md border border-border ${borderColorMap[type]} border-l-4 bg-muted px-4 py-3 shadow-lg`}
    >
      <span className="flex-shrink-0">{iconMap[type]}</span>
      <span className="flex-1 text-sm text-foreground">
        {message}
      </span>
      <button
        onClick={() => onRemove(id)}
        className="flex-shrink-0 cursor-pointer rounded p-0.5 transition-colors hover:bg-white/10"
        aria-label="Close toast"
      >
        <X size={14} className="text-muted-foreground" />
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
