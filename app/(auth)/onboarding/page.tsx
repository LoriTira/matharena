'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { CountrySelector } from '@/components/onboarding/CountrySelector';
import { Shell } from '@/components/arcade/Shell';
import { Btn } from '@/components/arcade/Btn';

function MiniCelebration() {
  const particles = 6;
  const colors = ['var(--neon-cyan)', 'var(--neon-magenta)', 'var(--neon-gold)', 'var(--neon-lime)'];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: particles }).map((_, i) => {
        const angle = (360 / particles) * i;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * 60;
        const y = Math.sin(rad) * 60;
        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 w-[6px] h-[6px]"
            style={{ background: colors[i % colors.length], boxShadow: `0 0 8px ${colors[i % colors.length]}` }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{ x: [0, x], y: [0, y], opacity: [0, 1, 0], scale: [0, 1.2, 0] }}
            transition={{ duration: 0.7, delay: i * 0.04, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}

function OnboardingForm() {
  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('');
  const [affiliationType, setAffiliationType] = useState<'school' | 'company' | null>(null);
  const [affiliation, setAffiliation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const destination = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/dashboard';
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single();
        if (data) {
          const isGenerated = /^user_[a-f0-9]{8}$/.test(data.username);
          setUsername(isGenerated ? '' : data.username);
        }
      }
      setLoading(false);
    })();
  }, []);

  const handleCountryChange = (name: string) => {
    setCountry(name);
    if (name) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 800);
    }
  };

  const handleSubmit = async () => {
    if (username.length < 3) return setError('Username must be at least 3 characters');
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return setError('Username can only contain letters, numbers, and underscores');

    setError('');
    setSaving(true);
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        country: country || null,
        affiliation: affiliation || null,
        affiliation_type: affiliationType,
        onboarding_completed: true,
      }),
    });

    if (res.ok) {
      setDone(true);
      setTimeout(() => { router.push(destination); router.refresh(); }, 600);
    } else {
      const data = await res.json();
      setError(data.error || 'Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboarding_completed: true }),
    });
    router.push(destination);
    router.refresh();
  };

  if (loading) {
    return (
      <Shell>
        <div className="min-h-screen flex items-center justify-center font-mono text-[12px] text-ink-tertiary uppercase tracking-[1.4px]">
          Loading…
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="min-h-screen flex items-center justify-center px-5 py-12">
        <motion.div
          className="w-full max-w-[480px]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <Link href="/" className="flex items-center gap-[10px] justify-center mb-8">
            <span
              className="grid place-items-center font-mono font-bold text-[14px] text-[#0a0612]"
              style={{
                width: 28, height: 28,
                background: 'var(--neon-magenta)',
                boxShadow: '0 0 18px var(--neon-magenta), inset 0 0 0 2px rgba(0,0,0,0.15)',
              }}
            >∑</span>
            <span className="font-display font-bold text-[17px] tracking-[-0.3px] text-ink">
              MATHS<span className="text-cyan">ARENA</span>
            </span>
          </Link>

          <div className="border border-edge-strong bg-panel p-[28px] md:p-[40px] relative">
            {/* Success overlay */}
            <AnimatePresence>
              {done && (
                <motion.div
                  className="absolute inset-0 z-10 flex items-center justify-center bg-page/90"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-lime"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    style={{ filter: 'drop-shadow(0 0 20px var(--neon-lime))' }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </motion.svg>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="font-mono text-[10px] text-ink-faint uppercase tracking-[2px] text-center mb-[10px]">
              / Ready player one
            </div>
            <h1 className="font-display font-extrabold text-[30px] md:text-[40px] tracking-[-1.2px] leading-[1.05] text-ink text-center">
              Let&apos;s <span className="text-cyan italic">set you up.</span>
            </h1>
            <p className="font-mono text-[11px] text-ink-tertiary text-center mt-[10px] tracking-[0.5px]">
              A couple of quick things before your first match
            </p>

            <div className="mt-[24px] space-y-[18px]">
              {/* Username */}
              <div>
                <label className="block font-mono text-[10px] tracking-[1.6px] text-ink-faint mb-[6px] uppercase">
                  Choose a username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                  className="w-full px-3 py-3 bg-page border border-edge text-ink font-mono text-[13px] placeholder:text-ink-faint focus:outline-none focus:border-cyan transition-colors"
                  placeholder="mathwizard42"
                  minLength={3}
                  maxLength={30}
                />
              </div>

              {/* Country */}
              <div className="relative">
                <label className="block font-mono text-[10px] tracking-[1.6px] text-ink-faint mb-[6px] uppercase">
                  Where are you from?
                </label>
                <CountrySelector value={country} onChange={handleCountryChange} />
                <AnimatePresence>
                  {showCelebration && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <MiniCelebration />
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Affiliation */}
              <div>
                <label className="block font-mono text-[10px] tracking-[1.6px] text-ink-faint mb-[6px] uppercase">
                  School or Company{' '}
                  <span className="font-mono text-ink-faint normal-case tracking-normal text-[10px]">(optional)</span>
                </label>
                <div className="flex gap-2 mb-[10px]">
                  <button
                    type="button"
                    onClick={() => setAffiliationType(affiliationType === 'school' ? null : 'school')}
                    className={`flex-1 px-4 py-[10px] font-mono text-[11px] uppercase tracking-[1.4px] border transition-all ${
                      affiliationType === 'school'
                        ? 'bg-cyan text-[#0a0612] border-cyan'
                        : 'bg-page text-ink-tertiary border-edge hover:text-ink hover:border-edge-strong'
                    }`}
                  >
                    School
                  </button>
                  <button
                    type="button"
                    onClick={() => setAffiliationType(affiliationType === 'company' ? null : 'company')}
                    className={`flex-1 px-4 py-[10px] font-mono text-[11px] uppercase tracking-[1.4px] border transition-all ${
                      affiliationType === 'company'
                        ? 'bg-cyan text-[#0a0612] border-cyan'
                        : 'bg-page text-ink-tertiary border-edge hover:text-ink hover:border-edge-strong'
                    }`}
                  >
                    Company
                  </button>
                </div>

                <AnimatePresence>
                  {affiliationType && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <input
                        type="text"
                        value={affiliation}
                        onChange={(e) => setAffiliation(e.target.value)}
                        className="w-full px-3 py-3 bg-page border border-edge text-ink font-mono text-[13px] placeholder:text-ink-faint focus:outline-none focus:border-cyan transition-colors"
                        placeholder={
                          affiliationType === 'school'
                            ? 'e.g., MIT, Stanford, Oxford…'
                            : 'e.g., Google, SpaceX, NASA…'
                        }
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {error && (
                <p className="font-mono text-[11px] text-magenta">{error}</p>
              )}

              <div>
                <Btn
                  type="button"
                  onClick={handleSubmit}
                  variant="primary"
                  full
                  size="lg"
                  disabled={!username || !country || saving}
                >
                  {saving ? 'Setting up…' : "▶ Let's go"}
                </Btn>

                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={saving}
                  className="w-full mt-3 py-2 font-mono text-[11px] text-ink-faint hover:text-ink-tertiary uppercase tracking-[1.2px] transition-colors disabled:opacity-50"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </Shell>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <div className="min-h-screen flex items-center justify-center font-mono text-[12px] text-ink-tertiary uppercase tracking-[1.4px]">
            Loading…
          </div>
        </Shell>
      }
    >
      <OnboardingForm />
    </Suspense>
  );
}
