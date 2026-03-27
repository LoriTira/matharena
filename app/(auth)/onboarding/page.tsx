'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { CountrySelector } from '@/components/onboarding/CountrySelector';

function MiniCelebration() {
  const particles = 6;
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
            className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-accent"
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{
              x: [0, x],
              y: [0, y],
              opacity: [0, 1, 0],
              scale: [0, 1.2, 0],
            }}
            transition={{
              duration: 0.7,
              delay: i * 0.04,
              ease: 'easeOut',
            }}
          />
        );
      })}
    </div>
  );
}

export default function OnboardingPage() {
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
  const supabase = createClient();

  // Fetch current profile to pre-fill username
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        if (data) {
          // Only pre-fill if it's not a generated default
          const isGenerated = /^user_[a-f0-9]{8}$/.test(data.username);
          setUsername(isGenerated ? '' : data.username);
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleCountryChange = (name: string) => {
    setCountry(name);
    if (name) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 800);
    }
  };

  const handleSubmit = async () => {
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

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
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 600);
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
    router.push('/dashboard');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="text-ink-muted text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <motion.div
        className="w-full max-w-md p-8 border border-edge rounded-sm relative"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Success overlay */}
        <AnimatePresence>
          {done && (
            <motion.div
              className="absolute inset-0 z-10 flex items-center justify-center bg-page/80 rounded-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-accent"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <polyline points="20 6 9 17 4 12" />
              </motion.svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <h1 className="font-serif text-3xl font-normal text-ink mb-1">Welcome to MathArena</h1>
          <p className="text-ink-muted text-sm">Just a couple of quick things before you start</p>
          <div className="w-8 h-px bg-edge mx-auto mt-4" />
        </motion.div>

        {/* Username */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          <label className="block text-[11px] tracking-[2px] text-ink-muted mb-2 uppercase">
            Choose a username
          </label>
          <input
            type="text"
            value={username}
            onChange={e => { setUsername(e.target.value); setError(''); }}
            className="w-full px-4 py-3 bg-card border border-edge rounded-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-1 focus:ring-edge-strong focus:border-edge-strong transition-colors"
            placeholder="mathwizard42"
            minLength={3}
            maxLength={30}
          />
        </motion.div>

        {/* Country */}
        <motion.div
          className="mb-6 relative"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          <label className="block text-[11px] tracking-[2px] text-ink-muted mb-2 uppercase">
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
        </motion.div>

        {/* Affiliation */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
        >
          <label className="block text-[11px] tracking-[2px] text-ink-muted mb-2 uppercase">
            School or Company <span className="text-ink-faint normal-case tracking-normal">(optional)</span>
          </label>

          {/* Segmented toggle */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setAffiliationType(affiliationType === 'school' ? null : 'school')}
              className={`flex-1 px-4 py-2.5 text-[12px] tracking-[1.5px] font-medium border rounded-sm transition-all ${
                affiliationType === 'school'
                  ? 'bg-btn text-btn-text border-transparent'
                  : 'bg-card text-ink-muted border-edge hover:border-edge-strong hover:text-ink-tertiary'
              }`}
            >
              SCHOOL
            </button>
            <button
              type="button"
              onClick={() => setAffiliationType(affiliationType === 'company' ? null : 'company')}
              className={`flex-1 px-4 py-2.5 text-[12px] tracking-[1.5px] font-medium border rounded-sm transition-all ${
                affiliationType === 'company'
                  ? 'bg-btn text-btn-text border-transparent'
                  : 'bg-card text-ink-muted border-edge hover:border-edge-strong hover:text-ink-tertiary'
              }`}
            >
              COMPANY
            </button>
          </div>

          {/* Affiliation input */}
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
                  onChange={e => setAffiliation(e.target.value)}
                  className="w-full px-4 py-3 bg-card border border-edge rounded-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-1 focus:ring-edge-strong focus:border-edge-strong transition-colors"
                  placeholder={
                    affiliationType === 'school'
                      ? 'e.g., MIT, Stanford, Oxford...'
                      : 'e.g., Google, SpaceX, NASA...'
                  }
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Error */}
        {error && (
          <p className="text-red-400/70 text-sm mb-4">{error}</p>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <motion.button
            type="button"
            onClick={handleSubmit}
            disabled={!username || !country || saving}
            className="w-full py-3 bg-btn text-btn-text font-semibold text-xs tracking-[1.5px] rounded-sm transition-colors hover:bg-btn-hover disabled:opacity-50 disabled:cursor-not-allowed"
            animate={username && country && !saving ? { scale: [1, 1.015, 1] } : {}}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            {saving ? 'SETTING UP...' : "LET'S GO"}
          </motion.button>

          <button
            type="button"
            onClick={handleSkip}
            disabled={saving}
            className="w-full mt-3 py-2 text-ink-faint text-[12px] hover:text-ink-muted transition-colors disabled:opacity-50"
          >
            Skip for now
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
