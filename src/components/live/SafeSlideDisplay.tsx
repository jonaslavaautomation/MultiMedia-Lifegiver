/**
 * The "Safe Slide" — a calm, branded fallback shown on audience-facing
 * outputs instead of the current slide (e.g. between services, or when the
 * operator needs a moment without going to a hard Blackout). Purely a
 * static local image (public/lifegiver-logo.png, bundled with the app) —
 * no network or Supabase dependency, consistent with every other
 * emergency-control surface.
 */
export function SafeSlideDisplay({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center bg-black ${className}`}>
      <img src="/lifegiver-logo.png" alt="" className="max-w-[40%] max-h-[40%] object-contain opacity-90" />
    </div>
  );
}
