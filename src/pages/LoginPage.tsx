import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';

export function LoginPage() {
  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: signInError } = await signIn(email.trim(), password);

    if (signInError) {
      let message = signInError;
      if (message.includes('Invalid login credentials')) {
        message = 'Invalid email or password. Please try again.';
      }
      setError(message);
      setSubmitting(false);
    }
    // On success, the auth state change will trigger the useEffect redirect.
  };

  const isLoading = submitting || loading;

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Left brand panel */}
      <div
        className="hidden lg:flex w-1/2 relative bg-zinc-950 items-center justify-center overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(61, 13, 28, 0.92), rgba(9, 9, 11, 0.72)), url('/WhatsApp_Image_2026-09-10_at_10.18.27.jpeg')",
        }}
      >
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-maroon-800/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-maroon-700/10 rounded-full blur-[100px]" />
        </div>
        <div className="relative z-10 max-w-md px-12 text-center">
          <div className="w-64 h-32 rounded-3xl bg-white flex items-center justify-center shadow-2xl shadow-black/30 mx-auto mb-8 p-4">
            <img src="/lifegiver-logo.png" alt="LifeGiver Davao" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold font-display text-zinc-100 mb-3">LifeGiver Media Studio</h1>
          <p className="text-zinc-400 leading-relaxed">
            Presentation and media management for your church worship team.
            Create, design, and deliver beautiful worship experiences.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-4 text-center">
            {['Presentations', 'Songs', 'Media'].map((label) => (
              <div key={label} className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/50">
                <p className="text-xs text-zinc-400 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="w-56 h-28 rounded-2xl bg-white flex items-center justify-center shadow-xl mb-3 p-3">
              <img src="/lifegiver-logo.png" alt="LifeGiver Davao" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl font-bold font-display text-zinc-100">LifeGiver Media Studio</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-zinc-100 mb-1">Welcome Back</h2>
            <p className="text-sm text-zinc-500">Sign in to access your media studio.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@church.org"
                  className="w-full rounded-xl bg-zinc-900/80 border border-zinc-700/80 text-zinc-100 placeholder-zinc-500 pl-11 pr-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-maroon-500/40 focus:border-maroon-600/60"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-zinc-900/80 border border-zinc-700/80 text-zinc-100 placeholder-zinc-500 pl-11 pr-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-maroon-500/40 focus:border-maroon-600/60"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl bg-red-950/40 border border-red-900/50 px-4 py-3 text-sm text-red-300">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" size="lg" disabled={isLoading} className="w-full mt-1">
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-zinc-600">
            Access is invitation-only. Contact your church administrator if you need an account.
          </p>
        </div>
      </div>
    </div>
  );
}
