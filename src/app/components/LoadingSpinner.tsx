"use client";

/**
 * Professional loading spinner with optional message.
 */
export function LoadingSpinner({
  message = "جاري التحميل...",
  size = "md",
}: {
  message?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div
        className={`${sizes[size]} border-amber-500/30 border-t-amber-500 rounded-full animate-spin`}
        role="status"
        aria-label={message}
      />
      <p className="text-sm text-neutral-500">{message}</p>
    </div>
  );
}

/**
 * Full-screen loading for initial page load.
 */
export function FullScreenLoader({ message = "جاري التحميل..." }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <LoadingSpinner message={message} size="lg" />
    </div>
  );
}

/**
 * Inline button spinner (small, no text).
 */
export function ButtonSpinner() {
  return (
    <div
      className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin align-middle"
      role="status"
      aria-label="Loading"
    />
  );
}
