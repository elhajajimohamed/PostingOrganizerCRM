import { Button } from "./button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = "md"
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: "p-6",
      icon: "w-12 h-12",
      title: "text-lg",
      description: "text-sm"
    },
    md: {
      container: "p-8",
      icon: "w-16 h-16",
      title: "text-xl",
      description: "text-base"
    },
    lg: {
      container: "p-12",
      icon: "w-20 h-20",
      title: "text-2xl",
      description: "text-lg"
    }
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 shadow-sm",
      currentSize.container,
      className
    )}>
      {icon && (
        <div className={cn(
          "bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mb-4 shadow-sm",
          currentSize.icon
        )}>
          <div className="text-slate-600">
            {icon}
          </div>
        </div>
      )}
      
      <h3 className={cn(
        "font-bold text-slate-800 mb-2",
        currentSize.title
      )}>
        {title}
      </h3>
      
      {description && (
        <p className={cn(
          "text-slate-600 mb-6 max-w-md leading-relaxed",
          currentSize.description
        )}>
          {description}
        </p>
      )}
      
      <div className="flex flex-col sm:flex-row gap-3">
        {action && (
          <Button
            onClick={action.onClick}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {action.label}
          </Button>
        )}
        
        {secondaryAction && (
          <Button
            variant="outline"
            onClick={secondaryAction.onClick}
            className="border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-700"
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}

// Pre-built empty state components for common use cases
export function EmptyCallCenters({ 
  onAddFirst, 
  onImport,
  className 
}: {
  onAddFirst: () => void;
  onImport?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      size="lg"
      className={className}
      icon={
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      }
      title="No Call Centers Found"
      description="Start building your call center database by adding your first entry or importing existing data."
      action={{
        label: "Add First Call Center",
        onClick: onAddFirst
      }}
      secondaryAction={onImport ? {
        label: "Import Data",
        onClick: onImport
      } : undefined}
    />
  );
}

export function EmptySearchResults({ 
  onClearFilters, 
  className 
}: {
  onClearFilters: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      size="lg"
      className={className}
      icon={
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      }
      title="No Search Results"
      description="We couldn't find any call centers matching your current search criteria. Try adjusting your filters or search terms."
      action={{
        label: "Clear Filters",
        onClick: onClearFilters
      }}
    />
  );
}

export function EmptyDashboard({ 
  title = "Welcome to Your CRM Dashboard",
  description = "Start by adding some call centers to get meaningful insights and track your progress.",
  action,
  className 
}: {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}) {
  return (
    <EmptyState
      size="lg"
      className={className}
      icon={
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      }
      title={title}
      description={description}
      action={action}
    />
  );
}

export function EmptyWhatsApp({ 
  onGenerate, 
  className 
}: {
  onGenerate: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      size="lg"
      className={className}
      icon={
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      }
      title="No WhatsApp Suggestions"
      description="Generate new WhatsApp suggestions to start engaging with call centers today."
      action={{
        label: "Generate Suggestions",
        onClick: onGenerate
      }}
    />
  );
}

export function EmptyCalendar({ 
  onAddEvent, 
  className 
}: {
  onAddEvent: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      size="lg"
      className={className}
      icon={
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      }
      title="No Events Scheduled"
      description="Start organizing your schedule by adding your first calendar event."
      action={{
        label: "Add First Event",
        onClick: onAddEvent
      }}
    />
  );
}
