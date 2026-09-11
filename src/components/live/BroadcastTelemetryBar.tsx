import { useEffect, useState } from 'react';
import { Activity, Gauge, Radio, Timer as TimerIcon } from 'lucide-react';
import { useFpsCounter } from '@/hooks/useFpsCounter';
import { useNetworkPing } from '@/hooks/useNetworkPing';
import { getDisplayMs, formatDuration } from '@/lib/liveTimer';
import type { TimerState } from '@/types/live';

interface BroadcastTelemetryBarProps {
  /** True while the operator is actively showing output (i.e. not blacked out). */
  onAir: boolean;
  timer: TimerState;
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour12: false });
}

/**
 * Top telemetry strip for the Live Operator console — a vMix/Blackmagic-style
 * broadcast HUD readout. Every value shown here is a real measurement (frame
 * rate of this tab, round-trip latency to Supabase, wall clock, the actual
 * timer state) — nothing here is decorative/fake.
 */
export function BroadcastTelemetryBar({ onAir, timer }: BroadcastTelemetryBarProps) {
  const fps = useFpsCounter();
  const latencyMs = useNetworkPing();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timerMs = getDisplayMs(timer, now.getTime());
  const timerActive = timer.mode === 'countdown' || timer.accumulatedMs > 0 || timer.running;

  return (
    <div className="relative flex flex-wrap items-center gap-3 px-4 lg:px-6 py-2.5 border-b border-hud-border bg-hud-panel/80 backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 bg-hud-grid bg-hud-grid opacity-40" />

      {/* ON AIR / BLACKED OUT badge */}
      <div
        className={`relative z-10 flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
          onAir
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40'
            : 'bg-red-500/15 text-red-400 border border-red-500/40'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            onAir ? 'bg-emerald-400 animate-pulse-glow' : 'bg-red-400 animate-pulse-glow-red'
          }`}
        />
        {onAir ? 'Live On Air' : 'Blacked Out'}
      </div>

      <div className="relative z-10 h-4 w-px bg-hud-border hidden sm:block" />

      {/* Latency */}
      <div className="relative z-10 flex items-center gap-1.5 text-[11px] text-cyan-300/90 font-mono">
        <Radio className="w-3 h-3" />
        {latencyMs === null ? '—' : `${latencyMs}ms`}
      </div>

      {/* FPS */}
      <div className="relative z-10 flex items-center gap-1.5 text-[11px] text-cyan-300/90 font-mono">
        <Gauge className="w-3 h-3" />
        {fps} FPS
      </div>

      {/* Timer readout */}
      {timerActive && (
        <div className="relative z-10 flex items-center gap-1.5 text-[11px] text-emerald-300/90 font-mono">
          <TimerIcon className="w-3 h-3" />
          {formatDuration(timerMs)}
        </div>
      )}

      <div className="relative z-10 flex items-center gap-1.5 ml-auto text-[11px] text-zinc-300 font-mono">
        <Activity className="w-3 h-3 text-zinc-500" />
        {formatClock(now)}
      </div>
    </div>
  );
}
