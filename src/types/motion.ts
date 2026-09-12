/**
 * Motion Background Library — types.
 *
 * Architecture note (why 50+ "unique" motions aren't 50 bespoke animation
 * implementations): every real motion-graphics pack — CMG, Motion Worship,
 * Shift Worship included — is built the same way under the hood: a small
 * number of generator/shader "engines" (particles, gradients, rays, waves…)
 * reused across dozens of named, differently-parameterized presets. Doing
 * the same here keeps every motion actually production-quality (hand-tuning
 * 50 fully bespoke canvas animations in one pass would mean either an
 * enormous amount of code or 50 shallow ones) while still giving each
 * preset a genuinely distinct look via its own color palette, density,
 * speed, and direction. `MotionEngineType` is the closed set of renderers;
 * `MotionPreset` is one named, catalog-documented parameterization of one.
 */

export type MotionCategory =
  | 'worship'
  | 'prayer'
  | 'bible'
  | 'sermon'
  | 'countdown'
  | 'announcement';

export const MOTION_CATEGORIES: { value: MotionCategory; label: string; description: string }[] = [
  { value: 'worship', label: 'Worship', description: 'Ambient, atmospheric loops for sung worship — supportive, never distracting behind lyrics.' },
  { value: 'prayer', label: 'Prayer', description: 'Slow, still, contemplative motion for prayer and reflection moments.' },
  { value: 'bible', label: 'Bible', description: 'Warm, textural, timeless-feeling loops for scripture reading and verse callouts.' },
  { value: 'sermon', label: 'Sermon', description: 'Clean, modern, low-motion loops that keep full attention on the teaching.' },
  { value: 'countdown', label: 'Countdown', description: 'Pre-service countdown timers with a clear, legible, energetic ring or sweep.' },
  { value: 'announcement', label: 'Announcement', description: 'Bright, energetic loops for events, sign-ups, and community announcements.' },
];

/** The closed set of rendering generators every preset is built from. */
export type MotionEngineType =
  | 'gradient-drift'
  | 'particles'
  | 'rays'
  | 'waves'
  | 'aurora'
  | 'geometric'
  | 'scanlines'
  | 'countdown-ring';

export interface GradientDriftParams {
  engine: 'gradient-drift';
  colors: [string, string, string];
  angleDeg: number;
  speed: number; // full cycles per minute
  grain: boolean; // subtle film-grain overlay to hide gradient banding
}

export interface ParticlesParams {
  engine: 'particles';
  background: string;
  particleColors: string[];
  count: number;
  minSize: number;
  maxSize: number;
  direction: 'up' | 'down' | 'radial-out' | 'drift';
  speed: number; // px/sec baseline
  glow: boolean;
  twinkle: boolean;
}

export interface RaysParams {
  engine: 'rays';
  background: string;
  rayColor: string;
  rayCount: number;
  speed: number; // deg/min of sweep
  origin: 'top' | 'top-left' | 'top-right' | 'center';
  opacity: number;
}

export interface WavesParams {
  engine: 'waves';
  background: string;
  bandColors: string[];
  layers: number;
  amplitude: number; // px
  speed: number; // px/sec horizontal travel
  fill: 'solid' | 'gradient';
}

export interface AuroraParams {
  engine: 'aurora';
  background: string;
  ribbonColors: string[];
  ribbons: number;
  speed: number;
  blurPx: number;
}

export interface GeometricParams {
  engine: 'geometric';
  background: string;
  lineColor: string;
  shape: 'grid' | 'hex' | 'triangles' | 'orbits';
  density: number;
  speed: number;
  pulse: boolean;
}

export interface ScanlinesParams {
  engine: 'scanlines';
  background: string;
  lineColor: string;
  stripeWidth: number;
  angleDeg: number;
  speed: number;
  opacity: number;
}

export interface CountdownRingParams {
  engine: 'countdown-ring';
  background: string;
  ringColor: string;
  trackColor: string;
  accentColor: string;
  defaultDurationSeconds: number;
  showDigits: boolean;
}

export type MotionParams =
  | GradientDriftParams
  | ParticlesParams
  | RaysParams
  | WavesParams
  | AuroraParams
  | GeometricParams
  | ScanlinesParams
  | CountdownRingParams;

export interface MotionPreset {
  id: string;
  name: string;
  category: MotionCategory;
  description: string;
  /** Plain-language description of what actually moves and how. */
  visualBehavior: string;
  /** Short technical animation spec (used in the catalog / docs, not rendered). */
  animationSpec: string;
  /** Design note for what the still thumbnail should evoke — the live UI renders a real preview instead of a static image, but this documents intent. */
  thumbnailConcept: string;
  tags: string[];
  recommendedUsage: string;
  params: MotionParams;
}

/** Persisted per-user favorite (see `motion_favorites` table). */
export interface MotionFavorite {
  user_id: string;
  motion_id: string;
  created_at: string;
}
