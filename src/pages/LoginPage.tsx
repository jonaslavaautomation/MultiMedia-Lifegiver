import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';

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
    <div className="min-h-screen relative flex items-center justify-center px-4 py-10 overflow-hidden">
      {/* Full-bleed background photo */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/login-bg.jpg')" }}
      />
      {/* Dark/brand tint so the form stays legible over the photo */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/85 via-zinc-950/75 to-zinc-950/95" />
      <div className="absolute inset-0 bg-brand-950/20" />
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-800/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-brand-700/10 rounded-full blur-[100px]" />
      </div>

      {/* Centered content */}
      <div className="relative z-10 w-full max-w-md">
        <Reveal>
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-40 h-20 sm:w-48 sm:h-24 rounded-2xl bg-white flex items-center justify-center shadow-2xl shadow-black/40 p-3 mb-5">
              <img src="/lifegiver-logo.png" alt="LifeGiver Davao" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-zinc-100">LifeGiver Media Studio</h1>
            <p className="text-sm text-zinc-400 mt-2 max-w-xs">
              Presentation and media management for your church worship team.
            </p>
          </div>
        </Reveal>

        <Reveal delay={90}>
          <div className="rounded-3xl bg-zinc-950/60 backdrop-blur-xl border border-zinc-800/60 shadow-2xl shadow-black/50 p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-zinc-100 mb-1">Welcome Back</h2>
              <p className="text-sm text-zinc-500">Sign in to access your media studio.</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <Reveal delay={180} size="sm">
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@church.org"
                    className="w-full rounded-xl bg-zinc-900/80 border border-zinc-700/80 text-zinc-100 placeholder-zinc-500 pl-11 pr-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-600/60"
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </Reveal>

              <Reveal delay={270} size="sm">
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl bg-zinc-900/80 border border-zinc-700/80 text-zinc-100 placeholder-zinc-500 pl-11 pr-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-600/60"
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                </div>
              </Reveal>

              {error && (
                <div className="flex items-start gap-2.5 rounded-xl bg-red-950/40 border border-red-900/50 px-4 py-3 text-sm text-red-300">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Reveal delay={360} size="sm">
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
              </Reveal>
            </form>
          </div>
        </Reveal>

        <Reveal delay={450} size="sm">
          <p className="mt-6 text-center text-xs text-zinc-500">
            Access is invitation-only. Contact your church administrator if you need an account.
          </p>
        </Reveal>
      </div>
    </div>
  );
}
