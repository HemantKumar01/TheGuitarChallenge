'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

export interface MetronomeState {
  isPlaying: boolean;
  bpm: number;
  currentBeat: number;
  beatsPerMeasure: number;
  setBpm: (bpm: number) => void;
  setBeatsPerMeasure: (n: number) => void;
  start: () => Promise<void>;
  stop: () => void;
  toggle: () => Promise<void>;
}

export function useMetronome(initialBpm = 80): MetronomeState {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpmState] = useState(initialBpm);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [beatsPerMeasure, setBeatsPerMeasureState] = useState(4);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const currentBeatRef = useRef(0);
  const bpmRef = useRef(bpm);
  const beatsPerMeasureRef = useRef(beatsPerMeasure);
  const schedulerRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);

  bpmRef.current = bpm;
  beatsPerMeasureRef.current = beatsPerMeasure;

  const scheduleClick = useCallback((time: number, beat: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    // Downbeat is higher pitched
    osc.frequency.value = beat === 0 ? 1200 : 800;
    gain.gain.setValueAtTime(beat === 0 ? 0.8 : 0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.start(time);
    osc.stop(time + 0.05);
  }, []);

  const scheduler = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || !isPlayingRef.current) return;

    const lookahead = 0.1; // schedule 100ms ahead
    const scheduleAhead = 0.1;

    while (nextNoteTimeRef.current < ctx.currentTime + scheduleAhead) {
      const beat = currentBeatRef.current;
      scheduleClick(nextNoteTimeRef.current, beat);

      // Update visual beat slightly before the audio
      const visualDelay = Math.max(0, (nextNoteTimeRef.current - ctx.currentTime) * 1000 - 10);
      setTimeout(() => setCurrentBeat(beat), visualDelay);

      const secPerBeat = 60.0 / bpmRef.current;
      nextNoteTimeRef.current += secPerBeat;
      currentBeatRef.current = (currentBeatRef.current + 1) % beatsPerMeasureRef.current;
    }

    schedulerRef.current = window.setTimeout(scheduler, lookahead * 1000);
  }, [scheduleClick]);

  const start = useCallback(async () => {
    if (isPlayingRef.current) return;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }

    isPlayingRef.current = true;
    nextNoteTimeRef.current = audioCtxRef.current.currentTime;
    currentBeatRef.current = 0;
    setIsPlaying(true);
    scheduler();
  }, [scheduler]);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    if (schedulerRef.current !== null) {
      clearTimeout(schedulerRef.current);
      schedulerRef.current = null;
    }
    setIsPlaying(false);
    setCurrentBeat(0);
  }, []);

  const toggle = useCallback(async () => {
    if (isPlayingRef.current) stop();
    else await start();
  }, [start, stop]);

  const setBpm = useCallback((v: number) => setBpmState(Math.max(20, Math.min(300, v))), []);
  const setBeatsPerMeasure = useCallback((n: number) => setBeatsPerMeasureState(n), []);

  useEffect(() => { return () => stop(); }, [stop]);

  return { isPlaying, bpm, currentBeat, beatsPerMeasure, setBpm, setBeatsPerMeasure, start, stop, toggle };
}
