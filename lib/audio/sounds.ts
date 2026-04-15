/**
 * Synthesized sound catalog for MathsArena.
 *
 * We use Tone.js so we ship zero audio assets — each cue is generated in the
 * browser from an oscillator/synth. This keeps the critical path under 30 KB
 * gzipped and lets us programmatically vary pitch (e.g. streakTier escalates
 * with the tier number).
 *
 * The module lazy-imports `tone` on first use so the library only enters the
 * bundle for pages that actually play sound (basically just /play/[matchId]).
 *
 * All cues MUST be short (<400ms) and release their synth on completion —
 * otherwise iOS will start rate-limiting the AudioContext after ~30 plays.
 */

export type SoundKey =
  | 'correct'
  | 'wrong'
  | 'countdownTick'
  | 'countdownGo'
  | 'streakTier'
  | 'matchPoint'
  | 'victory'
  | 'defeat'
  | 'uiClick';

type Tone = typeof import('tone');

let tonePromise: Promise<Tone> | null = null;
function getTone(): Promise<Tone> {
  if (!tonePromise) tonePromise = import('tone');
  return tonePromise;
}

/**
 * Play a cue. Non-blocking — the returned promise resolves once the synth is
 * scheduled (not once it finishes playing). Callers can fire-and-forget.
 *
 * `extra` is an optional number used by pitched cues like `streakTier` to
 * escalate with the tier number.
 */
export async function playSound(key: SoundKey, extra = 0): Promise<void> {
  const Tone = await getTone();
  const now = Tone.now();

  switch (key) {
    case 'correct': {
      const synth = new Tone.PluckSynth({
        attackNoise: 0.3,
        dampening: 4200,
        resonance: 0.7,
        volume: -6,
      }).toDestination();
      synth.triggerAttack('E5', now);
      disposeAfter(synth, 350);
      return;
    }

    case 'wrong': {
      const synth = new Tone.MembraneSynth({
        pitchDecay: 0.12,
        octaves: 3,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
        volume: -10,
      }).toDestination();
      synth.triggerAttackRelease('C2', '8n', now);
      disposeAfter(synth, 400);
      return;
    }

    case 'countdownTick': {
      const synth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.05 },
        volume: -14,
      }).toDestination();
      synth.triggerAttackRelease('A4', '64n', now);
      disposeAfter(synth, 200);
      return;
    }

    case 'countdownGo': {
      const synth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.001, decay: 0.15, sustain: 0.1, release: 0.2 },
        volume: -6,
      }).toDestination();
      synth.triggerAttackRelease('E5', '16n', now);
      synth.triggerAttackRelease('A5', '16n', now + 0.08);
      disposeAfter(synth, 500);
      return;
    }

    case 'streakTier': {
      // Escalate chord voicing with the tier number.
      // tier 1 (HOT) → C major, tier 2 (ON FIRE) → C major high, tier 3 (UNSTOPPABLE) → C6 bright.
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.2, sustain: 0.15, release: 0.25 },
        volume: -8,
      }).toDestination();
      const chords: string[][] = [
        ['C5', 'E5', 'G5'],
        ['E5', 'G5', 'C6'],
        ['G5', 'C6', 'E6'],
      ];
      const chord = chords[Math.min(Math.max(extra - 1, 0), chords.length - 1)];
      synth.triggerAttackRelease(chord, '8n', now);
      disposeAfter(synth, 600);
      return;
    }

    case 'matchPoint': {
      const synth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.05, decay: 0.4, sustain: 0.1, release: 0.3 },
        volume: -12,
      }).toDestination();
      synth.triggerAttackRelease('C5', '4n', now);
      disposeAfter(synth, 800);
      return;
    }

    case 'victory': {
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.25, sustain: 0.25, release: 0.4 },
        volume: -6,
      }).toDestination();
      synth.triggerAttackRelease(['C5', 'E5', 'G5'], '8n', now);
      synth.triggerAttackRelease(['E5', 'G5', 'C6'], '8n', now + 0.18);
      synth.triggerAttackRelease(['G5', 'C6', 'E6'], '4n', now + 0.36);
      disposeAfter(synth, 1400);
      return;
    }

    case 'defeat': {
      const synth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 },
        volume: -10,
      }).toDestination();
      synth.triggerAttackRelease('C5', '8n', now);
      synth.triggerAttackRelease('A4', '8n', now + 0.22);
      synth.triggerAttackRelease('F4', '4n', now + 0.44);
      disposeAfter(synth, 1200);
      return;
    }

    case 'uiClick': {
      const synth = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.02 },
        volume: -20,
      }).toDestination();
      synth.triggerAttackRelease('G5', '128n', now);
      disposeAfter(synth, 150);
      return;
    }
  }
}

// Free the voice resources a short delay after the cue finishes. Without this,
// long sessions accumulate dead synth nodes and iOS throttles playback.
function disposeAfter(synth: { dispose: () => void }, ms: number) {
  setTimeout(() => {
    try { synth.dispose(); } catch { /* already disposed */ }
  }, ms);
}

/**
 * Kick off the Tone.js AudioContext from inside a user gesture.
 * iOS Safari will refuse to play any audio until this has been called from
 * within a real tap/click/keydown handler.
 */
export async function unlockAudio(): Promise<void> {
  const Tone = await getTone();
  await Tone.start();
}
