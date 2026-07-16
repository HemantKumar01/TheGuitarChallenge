'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { DetectedNote } from '@/lib/analysis/noteUtils';

export interface PitchDetectorState {
  isActive: boolean;
  isSupported: boolean;
  currentNote: DetectedNote | null;
  clarity: number;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

const BUFFER_SIZE = 2048;
const MIN_CLARITY = 0.85;
const SAMPLE_RATE = 44100;

export function usePitchDetector(): PitchDetectorState {
  const [isActive, setIsActive] = useState(false);
  const [isSupported] = useState(() =>
    typeof window !== 'undefined' && 'AudioContext' in window && 'getUserMedia' in (navigator.mediaDevices ?? {})
  );
  const [currentNote, setCurrentNote] = useState<DetectedNote | null>(null);
  const [clarity, setClarity] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const detectorRef = useRef<{ findPitch: (buf: Float32Array, sr: number) => [number, number] } | null>(null);

  const stop = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    setIsActive(false);
    setCurrentNote(null);
    setClarity(0);
  }, []);

  const start = useCallback(async () => {
    if (isActive) return;
    setError(null);

    try {
      // Dynamically import pitchy to avoid SSR issues
      const { PitchDetector } = await import('pitchy');
      const { freqToNote } = await import('@/lib/analysis/noteUtils');

      const detector = PitchDetector.forFloat32Array(BUFFER_SIZE);
      detectorRef.current = detector;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = BUFFER_SIZE * 2;

      // Use ScriptProcessorNode for broad compatibility
      const processor = audioCtx.createScriptProcessor(BUFFER_SIZE, 1, 1);
      processorRef.current = processor;

      const inputBuffer = new Float32Array(BUFFER_SIZE);

      processor.onaudioprocess = () => {
        analyser.getFloatTimeDomainData(inputBuffer);
        const [pitch, cl] = detector.findPitch(inputBuffer, audioCtx.sampleRate);

        if (cl >= MIN_CLARITY && pitch > 60 && pitch < 1500) {
          const note = freqToNote(pitch);
          setCurrentNote(note);
          setClarity(cl);
        } else {
          setClarity(cl);
          if (cl < 0.5) setCurrentNote(null);
        }
      };

      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(audioCtx.destination);

      setIsActive(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied';
      setError(msg);
      stop();
    }
  }, [isActive, stop]);

  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  return { isActive, isSupported, currentNote, clarity, error, start, stop };
}
