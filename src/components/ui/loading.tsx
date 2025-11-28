import { cn } from "@/lib/utils";

interface LoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "spinner" | "dots" | "pulse" | "skeleton";
  text?: string;
}

export function Loading({ 
  className, 
  size = "md", 
  variant = "spinner", 
  text 
}: LoadingProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8", 
    lg: "w-12 h-12",
    xl: "w-16 h-16"
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg", 
    xl: "text-xl"
  };

  const renderSpinner = () => (
    <div 
      className={cn(
        "border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin",
        sizeClasses[size],
        className
      )}
    />
  );

  const renderDots = () => (
    <div className={cn("flex space-x-1", className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full animate-pulse",
            size === "sm" ? "w-1 h-1" : size === "md" ? "w-2 h-2" : "w-3 h-3"
          )}
          style={{
            animationDelay: `${i * 0.1}s`,
            animationDuration: "1s"
          }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <div 
      className={cn(
        "bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full animate-pulse",
        sizeClasses[size],
        className
      )}
    />
  );

  const renderSkeleton = () => (
    <div className={cn("animate-pulse", className)}>
      <div className="bg-slate-200 rounded-lg h-4 w-3/4 mb-2"></div>
      <div className="bg-slate-200 rounded-lg h-4 w-1/2"></div>
    </div>
  );

  const renderContent = () => {
    switch (variant) {
      case "dots": return renderDots();
      case "pulse": return renderPulse();
      case "skeleton": return renderSkeleton();
      default: return renderSpinner();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      {renderContent()}
      {text && (
        <p className={cn(
          "text-slate-600 font-medium animate-pulse",
          textSizeClasses[size]
        )}>
          {text}
        </p>
      )}
    </div>
  );
}

// Specific loading components for common use cases
export function LoadingPage({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex items-center justify-center">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8">
        <Loading size="xl" text={text} />
      </div>
    </div>
  );
}

export function LoadingCard({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6">
      <Loading size="lg" text={text} />
    </div>
  );
}

export function LoadingInline({ text }: { text?: string }) {
  return (
    <div className="flex items-center justify-center p-4">
      <Loading size="md" text={text} />
    </div>
  );
}
