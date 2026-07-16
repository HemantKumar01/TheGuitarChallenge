'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { DetectedNote } from '@/lib/analysis/noteUtils';

export interface PitchDetectorState {
  isActive: boolean;
  isSupported: boolean;
  currentNote: DetectedNote | null;
  clarity: number;
  signalLevel: number;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

const ANALYSIS_SIZE = 8192;
const PROCESSOR_SIZE = 4096;
const MEDIAN_WINDOW = 7;
const MIN_RMS = 0.003;
const MIN_CLARITY = 0.80;

function rms(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function usePitchDetector(): PitchDetectorState {
  const [isActive, setIsActive] = useState(false);
  const [isSupported] = useState(() =>
    typeof window !== 'undefined' && 'AudioContext' in window && 'getUserMedia' in (navigator.mediaDevices ?? {})
  );
  const [currentNote, setCurrentNote] = useState<DetectedNote | null>(null);
  const [clarity, setClarity] = useState(0);
  const [signalLevel, setSignalLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const accumBufRef = useRef(new Float32Array(ANALYSIS_SIZE));
  const freqHistoryRef = useRef<number[]>([]);

  const stop = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setIsActive(false);
    setCurrentNote(null);
    setClarity(0);
    setSignalLevel(0);
  }, []);

  const start = useCallback(async () => {
    if (isActive) return;
    setError(null);

    try {
      const { PitchDetector } = await import('pitchy');
      const { freqToNote } = await import('@/lib/analysis/noteUtils');

      // getUserMedia first to stay inside user-gesture activation window
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false,
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      await audioCtx.resume();

      const source = audioCtx.createMediaStreamSource(stream);
      const detector = PitchDetector.forFloat32Array(ANALYSIS_SIZE);

      const processor = audioCtx.createScriptProcessor(PROCESSOR_SIZE, 1, 1);
      processorRef.current = processor;

      let chunksReceived = 0;
      const accumBuf = accumBufRef.current;
      const freqHistory = freqHistoryRef.current;
      freqHistory.length = 0;

      processor.onaudioprocess = (e) => {
        const chunk = e.inputBuffer.getChannelData(0);
        chunksReceived++;

        accumBuf.copyWithin(0, PROCESSOR_SIZE);
        accumBuf.set(chunk, PROCESSOR_SIZE);

        if (chunksReceived < 2) return;

        const currentRms = rms(accumBuf);
        setSignalLevel(Math.min(1, currentRms / 0.05));

        if (currentRms < MIN_RMS) {
          setCurrentNote(null);
          setClarity(0);
          return;
        }

        const [rawFreq, cl] = detector.findPitch(accumBuf, audioCtx.sampleRate);

        if (cl < MIN_CLARITY || rawFreq < 70 || rawFreq > 1500) {
          setClarity(cl);
          if (cl < 0.5) setCurrentNote(null);
          return;
        }

        // Octave-error correction
        let freq = rawFreq;
        if (freqHistory.length >= 3) {
          const med = median(freqHistory);
          const octaveRatio = freq / med;
          if (octaveRatio > 1.7 && octaveRatio < 2.3) {
            freq = freq / 2;
          } else if (octaveRatio > 0.43 && octaveRatio < 0.58) {
            freq = freq * 2;
          }
        }

        // Median smoothing
        freqHistoryRef.current = [...freqHistory.slice(-(MEDIAN_WINDOW - 1)), freq];
        if (freqHistoryRef.current.length < 3) return;

        const smoothFreq = median(freqHistoryRef.current);
        const note = freqToNote(smoothFreq);
        setCurrentNote(note);
        setClarity(cl);
      };

      source.connect(processor);
      const silentGain = audioCtx.createGain();
      silentGain.gain.value = 0;
      processor.connect(silentGain);
      silentGain.connect(audioCtx.destination);

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

  return { isActive, isSupported, currentNote, clarity, signalLevel, error, start, stop };
}
