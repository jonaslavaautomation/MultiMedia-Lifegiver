import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  /** The <audio> element currently playing — the visualizer attaches its analyser to this. */
  audioEl: HTMLAudioElement | null;
  className?: string;
}

/**
 * Real-time VU meter for the Media tab's audio preview — a Web Audio API
 * AnalyserNode driving an animated frequency-bar canvas, in the app's own
 * brand/leaf gradient.
 *
 * Two Web Audio gotchas this guards against:
 * - `createMediaElementSource` can only ever be called ONCE for a given
 *   <audio> element (a second call throws) — wrapped in try/catch so a
 *   remount or dev double-invoke can't crash the page, it just silently
 *   skips visualizing.
 * - Routing the element through an AnalyserNode reroutes its audio output
 *   through the Web Audio graph — without also connecting the analyser to
 *   `audioContext.destination`, the audio would visualize but go silent.
 */
export function AudioVisualizer({ audioEl, className = '' }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keep the canvas's backing store crisp and responsive to its actual
  // on-screen size, matching the resize pattern used elsewhere for canvases
  // in this app (useFabricCanvas.ts) rather than a fixed pixel size.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!audioEl) return;

    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return; // Web Audio unsupported — the <audio> element still plays normally either way.

    const audioContext = new AudioContextClass();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.75;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let source: MediaElementAudioSourceNode;
    try {
      source = audioContext.createMediaElementSource(audioEl);
    } catch {
      void audioContext.close();
      return;
    }
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }

    let rafId = 0;
    function draw() {
      rafId = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      analyser.getByteFrequencyData(dataArray);

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const gap = Math.max(1, width * 0.004);
      const barWidth = (width - gap * (bufferLength - 1)) / bufferLength;

      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i] / 255;
        const barHeight = Math.max(height * 0.02, value * height);
        const x = i * (barWidth + gap);
        const y = height - barHeight;

        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#1c544a'); // brand-700
        gradient.addColorStop(0.6, '#2f8271'); // brand-500
        gradient.addColorStop(1, '#82b354'); // leaf-400
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    }
    draw();

    return () => {
      cancelAnimationFrame(rafId);
      source.disconnect();
      analyser.disconnect();
      void audioContext.close();
    };
  }, [audioEl]);

  return <canvas ref={canvasRef} className={`w-full h-24 rounded-xl bg-zinc-950/60 ${className}`} />;
}
