import { AlertCircle } from 'lucide-react';

interface AlertProps {
  message: string;
  onRetry?: () => void;
}

export function Alert({ message, onRetry }: AlertProps) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-red-950/40 border border-red-900/50 px-4 py-3 text-sm text-red-300">
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1">
        <span>{message}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="block mt-1.5 text-xs font-medium text-red-200 underline underline-offset-2 hover:text-red-100 transition-colors"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
