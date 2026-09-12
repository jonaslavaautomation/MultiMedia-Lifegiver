import type {
  MotionParams,
  GradientDriftParams,
  ParticlesParams,
  RaysParams,
  WavesParams,
  AuroraParams,
  GeometricParams,
  ScanlinesParams,
  CountdownRingParams,
} from '@/types/motion';

/**
 * Pure, stateless-per-frame renderers: `draw(ctx, w, h, t, params)` paints
 * one frame for time `t` (seconds since the loop started) and nothing else
 * — no engine keeps internal mutable simulation state. Two things fall out
 * of that for free, which matters for something meant to loop unattended
 * for a whole service:
 *  - No drift/accumulation bugs (a bug in frame 4000 can't compound into
 *    frame 4001 — every frame is computed fresh from `t`).
 *  - A paused/reduced-motion render is just "call draw() once and stop",
 *    not a separate code path.
 * Particle-style engines use a cheap deterministic hash per index instead
 * of `Math.random()` per particle, so a given particle's size/phase/speed
 * is stable across frames without needing an array of mutable state.
 */

function hash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function lerpColor(a: string, b: string, t: number): string {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  const r = Math.round(pa.r + (pb.r - pa.r) * t);
  const g = Math.round(pa.g + (pb.g - pa.g) * t);
  const bl = Math.round(pa.b + (pb.b - pa.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function drawGradientDrift(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, p: GradientDriftParams) {
  const cycle = (t * p.speed) / 60; // fraction of a full cycle
  const phase = (Math.sin(cycle * Math.PI * 2) + 1) / 2; // 0..1 ping-pong
  const angle = (p.angleDeg * Math.PI) / 180;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const grad = ctx.createLinearGradient(w / 2 - dx * w, h / 2 - dy * h, w / 2 + dx * w, h / 2 + dy * h);
  grad.addColorStop(0, p.colors[0]);
  grad.addColorStop(0.5, lerpColor(p.colors[1], p.colors[2], phase));
  grad.addColorStop(1, p.colors[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  if (p.grain) {
    ctx.globalAlpha = 0.035;
    ctx.fillStyle = '#ffffff';
    const step = 3;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        if (hash(x * 7.13 + y * 13.7) > 0.5) ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, p: ParticlesParams) {
  ctx.fillStyle = p.background;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < p.count; i++) {
    const seed = i * 97.13;
    const size = p.minSize + hash(seed) * (p.maxSize - p.minSize);
    const speed = p.speed * (0.5 + hash(seed + 1) * 0.9);
    const startX = hash(seed + 2) * w;
    const startY = hash(seed + 3) * h;
    const phase = hash(seed + 4) * Math.PI * 2;

    let x: number;
    let y: number;
    switch (p.direction) {
      case 'up':
        x = startX + Math.sin(t * 0.4 + phase) * 20;
        y = ((startY - t * speed) % (h + 40)) - 40;
        if (y < -40) y += h + 40;
        break;
      case 'down':
        x = startX + Math.sin(t * 0.4 + phase) * 20;
        y = ((startY + t * speed) % (h + 40)) - 40;
        if (y < -40) y += h + 40;
        break;
      case 'radial-out': {
        const cx = w / 2;
        const cy = h / 2;
        const dist = ((t * speed + hash(seed + 5) * 400) % (Math.max(w, h) * 0.7));
        const ang = hash(seed + 6) * Math.PI * 2;
        x = cx + Math.cos(ang) * dist;
        y = cy + Math.sin(ang) * dist * (h / w);
        break;
      }
      default:
        x = startX + Math.sin(t * 0.15 * speed + phase) * w * 0.08;
        y = startY + Math.cos(t * 0.1 * speed + phase) * h * 0.08;
    }

    const twinkle = p.twinkle ? 0.4 + 0.6 * ((Math.sin(t * 2 + phase) + 1) / 2) : 1;
    const color = p.particleColors[i % p.particleColors.length];

    if (p.glow) {
      const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
      glowGrad.addColorStop(0, color);
      glowGrad.addColorStop(1, 'transparent');
      ctx.globalAlpha = twinkle * 0.5;
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(x, y, size * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = twinkle;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawRays(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, p: RaysParams) {
  ctx.fillStyle = p.background;
  ctx.fillRect(0, 0, w, h);

  const origin =
    p.origin === 'top-left' ? { x: 0, y: 0 } :
    p.origin === 'top-right' ? { x: w, y: 0 } :
    p.origin === 'center' ? { x: w / 2, y: h / 2 } :
    { x: w / 2, y: -h * 0.2 };

  const sweep = (t * p.speed * Math.PI) / 180;
  const radius = Math.hypot(w, h) * 1.2;

  ctx.save();
  ctx.globalAlpha = p.opacity;
  for (let i = 0; i < p.rayCount; i++) {
    const baseAngle = (i / p.rayCount) * Math.PI * 2 + sweep;
    const width = (Math.PI * 2) / p.rayCount / 2.4;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.arc(origin.x, origin.y, radius, baseAngle, baseAngle + width);
    ctx.closePath();
    const grad = ctx.createRadialGradient(origin.x, origin.y, 0, origin.x, origin.y, radius);
    grad.addColorStop(0, p.rayColor);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fill();
  }
  ctx.restore();
}

function drawWaves(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, p: WavesParams) {
  ctx.fillStyle = p.background;
  ctx.fillRect(0, 0, w, h);

  for (let layer = 0; layer < p.layers; layer++) {
    const baseY = h * (0.35 + (layer / Math.max(1, p.layers - 1)) * 0.45);
    const freq = 0.006 + layer * 0.002;
    const speed = p.speed * (1 + layer * 0.3);
    const amp = p.amplitude * (1 - layer * 0.12);
    const color = p.bandColors[layer % p.bandColors.length];

    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) {
      const y = baseY + Math.sin(x * freq + t * speed * 0.02 + layer) * amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();

    if (p.fill === 'gradient') {
      const grad = ctx.createLinearGradient(0, baseY - amp, 0, h);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = color;
    }
    ctx.globalAlpha = 0.55;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawAurora(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, p: AuroraParams) {
  ctx.fillStyle = p.background;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.filter = `blur(${p.blurPx}px)`;
  for (let i = 0; i < p.ribbons; i++) {
    const seed = i * 41.7;
    const color = p.ribbonColors[i % p.ribbonColors.length];
    const speed = p.speed * (0.6 + hash(seed) * 0.8);
    const yBase = h * (0.15 + hash(seed + 1) * 0.6);
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 12) {
      const y = yBase + Math.sin(x * 0.004 + t * speed * 0.05 + seed) * h * 0.18;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawGeometric(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, p: GeometricParams) {
  ctx.fillStyle = p.background;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = p.lineColor;
  ctx.lineWidth = 1;
  const pulse = p.pulse ? 0.5 + 0.5 * ((Math.sin(t * 1.2) + 1) / 2) : 1;
  ctx.globalAlpha = 0.35 * pulse + 0.15;

  const spacing = Math.max(24, 160 / p.density);
  const drift = t * p.speed * 4;

  if (p.shape === 'grid') {
    for (let x = -spacing; x < w + spacing; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x + (drift % spacing), 0);
      ctx.lineTo(x + (drift % spacing), h);
      ctx.stroke();
    }
    for (let y = -spacing; y < h + spacing; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y + (drift % spacing));
      ctx.lineTo(w, y + (drift % spacing));
      ctx.stroke();
    }
  } else if (p.shape === 'triangles') {
    for (let y = -spacing; y < h + spacing; y += spacing) {
      for (let x = -spacing; x < w + spacing; x += spacing) {
        const ox = x + (drift % (spacing * 2));
        ctx.beginPath();
        ctx.moveTo(ox, y);
        ctx.lineTo(ox + spacing / 2, y + spacing);
        ctx.lineTo(ox - spacing / 2, y + spacing);
        ctx.closePath();
        ctx.stroke();
      }
    }
  } else if (p.shape === 'hex') {
    const r = spacing / 1.8;
    for (let row = -1; row * r * 1.5 < h + r; row++) {
      for (let col = -1; col * r * 1.75 < w + r; col++) {
        const cx = col * r * 1.75 + (row % 2 ? r * 0.875 : 0) + (drift % (r * 3.5));
        const cy = row * r * 1.5;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const ang = (Math.PI / 3) * i;
          const px = cx + r * Math.cos(ang);
          const py = cy + r * Math.sin(ang);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  } else {
    // orbits
    const cx = w / 2;
    const cy = h / 2;
    const rings = Math.max(3, Math.round(p.density));
    for (let i = 1; i <= rings; i++) {
      const r = (Math.min(w, h) / (rings + 1)) * i;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      const ang = t * p.speed * 0.3 + i;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 3, 0, Math.PI * 2);
      ctx.fillStyle = p.lineColor;
      ctx.globalAlpha = 0.8;
      ctx.fill();
      ctx.globalAlpha = 0.35 * pulse + 0.15;
    }
  }
  ctx.globalAlpha = 1;
}

function drawScanlines(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, p: ScanlinesParams) {
  ctx.fillStyle = p.background;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate((p.angleDeg * Math.PI) / 180);
  ctx.translate(-w / 2, -h / 2);

  const diag = Math.hypot(w, h);
  const offset = (t * p.speed) % (p.stripeWidth * 2);
  ctx.fillStyle = p.lineColor;
  ctx.globalAlpha = p.opacity;
  for (let x = -diag; x < diag * 2; x += p.stripeWidth * 2) {
    ctx.fillRect(x + offset - diag / 2, -diag / 2, p.stripeWidth, diag * 2);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawCountdownRing(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, p: CountdownRingParams) {
  ctx.fillStyle = p.background;
  ctx.fillRect(0, 0, w, h);

  const remaining = Math.max(0, p.defaultDurationSeconds - t);
  const fraction = p.defaultDurationSeconds > 0 ? remaining / p.defaultDurationSeconds : 0;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.28;

  ctx.lineWidth = Math.max(6, r * 0.06);
  ctx.strokeStyle = p.trackColor;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = p.ringColor;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + fraction * Math.PI * 2);
  ctx.stroke();

  // Faint pulsing accent glow at the ring's leading edge.
  const leadAngle = -Math.PI / 2 + fraction * Math.PI * 2;
  const lx = cx + Math.cos(leadAngle) * r;
  const ly = cy + Math.sin(leadAngle) * r;
  const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * 0.25);
  glow.addColorStop(0, p.accentColor);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.globalAlpha = 0.6 + 0.4 * ((Math.sin(t * 3) + 1) / 2);
  ctx.beginPath();
  ctx.arc(lx, ly, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (p.showDigits) {
    const mins = Math.floor(remaining / 60);
    const secs = Math.floor(remaining % 60);
    const label = `${mins}:${String(secs).padStart(2, '0')}`;
    ctx.fillStyle = p.ringColor;
    ctx.font = `${Math.round(r * 0.5)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);
  }
}

/** Paints one frame (time `t`, in seconds since the loop started) for any preset's params. */
export function drawMotionFrame(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, params: MotionParams): void {
  switch (params.engine) {
    case 'gradient-drift': return drawGradientDrift(ctx, w, h, t, params);
    case 'particles': return drawParticles(ctx, w, h, t, params);
    case 'rays': return drawRays(ctx, w, h, t, params);
    case 'waves': return drawWaves(ctx, w, h, t, params);
    case 'aurora': return drawAurora(ctx, w, h, t, params);
    case 'geometric': return drawGeometric(ctx, w, h, t, params);
    case 'scanlines': return drawScanlines(ctx, w, h, t, params);
    case 'countdown-ring': return drawCountdownRing(ctx, w, h, t, params);
    default: {
      const _exhaustive: never = params;
      return _exhaustive;
    }
  }
}
