import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Short, plain-language name for whatever this boundary wraps (e.g.
   * "Media Library", "Projector Display") — shown to the Media Tech instead
   * of a raw component stack. Never shown as blame, just as orientation.
   */
  label: string;
  /**
   * When true, renders the calmer "live surface" fallback: reassures the
   * operator that local controls (keyboard, mouse, MIDI, the live output
   * itself) are unaffected, since this boundary sits around a secondary
   * feature next to — not inside — the actual Live Presentation Engine.
   */
  isLiveSurface?: boolean;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Isolates a crash in one part of the tree from the rest of the app. Per the
 * "never show raw technical errors to the Media Tech" requirement: the
 * default view is a plain-language message with a reload action; the actual
 * error/stack is available but tucked behind an explicit "Technical Details"
 * disclosure, never dumped on screen by default.
 *
 * Each top-level route in App.tsx gets its own instance (rather than one
 * shared boundary wrapping everything), so e.g. a crash while rendering the
 * Media Library can't take down the Dashboard shell, and a crash on the
 * Remote Control page can't take down the Projector window — they're
 * already separate top-level routes/windows, and this makes that isolation
 * hold even for render-time errors, not just navigation.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept in the console for real debugging — never shown to the Media
    // Tech by default, only via the "Technical Details" disclosure below.
    console.error(`[ErrorBoundary:${this.props.label}]`, error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.isLiveSurface) {
      return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400" />
          <div>
            <p className="text-lg font-semibold">{this.props.label} needs a reload</p>
            <p className="text-sm text-zinc-400 mt-1 max-w-sm">
              Something went wrong on this screen. This does not affect the live
              output — the booth computer's own controls keep working. Reload
              this window to restore it.
            </p>
          </div>
          <button
            onClick={this.handleReload}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Reload
          </button>
          {renderTechnicalDetails(error, true)}
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500" />
        <div>
          <p className="text-lg font-semibold text-zinc-900">{this.props.label} ran into a problem</p>
          <p className="text-sm text-zinc-500 mt-1 max-w-sm">
            Nothing you were working on elsewhere in the app is affected.
            Reloading this page usually fixes it.
          </p>
        </div>
        <button
          onClick={this.handleReload}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
        >
          <RotateCcw className="w-4 h-4" /> Reload
        </button>
        {renderTechnicalDetails(error, false)}
      </div>
    );
  }
}

function renderTechnicalDetails(error: Error, dark: boolean) {
  return (
    <details className={`text-xs max-w-md w-full mt-2 ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
      <summary className="cursor-pointer select-none hover:text-zinc-300">Technical Details</summary>
      <pre className={`mt-2 p-3 rounded-lg overflow-x-auto text-left whitespace-pre-wrap break-words ${dark ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-100 border border-zinc-200'}`}>
        {error.name}: {error.message}
        {error.stack ? `\n\n${error.stack}` : ''}
      </pre>
    </details>
  );
}
