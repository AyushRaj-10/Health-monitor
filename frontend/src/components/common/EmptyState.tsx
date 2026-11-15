import React, { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-10 flex flex-col items-center justify-center text-center min-h-[260px]">
      <div className="w-12 h-12 rounded-xl bg-healthcare-surfaceLight border border-healthcare-border flex items-center justify-center text-teal-400 mb-4">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-semibold text-healthcare-textPrimary mb-1">
        {title}
      </h3>
      <p className="text-sm text-healthcare-textSecondary max-w-sm mb-5">
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition-colors border border-teal-500/40"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
