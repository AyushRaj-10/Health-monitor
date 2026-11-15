import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load telemetry',
  message = 'An unexpected error occurred while communicating with the IoMT gateway.',
  onRetry,
}) => {
  return (
    <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-8 flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 rounded-xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400 mb-4">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-rose-200 mb-1">
        {title}
      </h3>
      <p className="text-sm text-rose-300/80 max-w-md mb-5">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-900/50 hover:bg-rose-900/80 text-rose-200 text-xs font-medium transition-colors border border-rose-700/50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Connection</span>
        </button>
      )}
    </div>
  );
};
