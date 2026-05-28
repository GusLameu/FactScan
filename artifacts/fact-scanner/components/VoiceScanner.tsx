/**
 * VoiceScanner — Google-style voice UI
 * • 5 animated vivid-blue frequency bars (Canvas + AudioContext)
 * • Deep blue gradient card with radial glow
 * • SpeechRecognition pt-BR
 * • TTS utility exported for result screen auto-speak
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

/* ─── Vivid blue palette ─────────────────────────────────── */
const V = {
  b1: "#0055FF",
  b2: "#0099FF",
  b3: "#4DC8F5",
  b4: "#00E5FF",
  b5: "#0077FF",
  bg: "#060E1D",
  glow: "rgba(0,100,255,0.22)",
  glowBright: "rgba(0,150,255,0.5)",
};
const BAR_COLORS = [V.b1, V.b2, V.b3, V.b4, V.b5];

/* ─── SpeechRecognition shims ────────────────────────────── */
interface SRResultItem { readonly transcript: string; readonly confidence: number; }
interface SRResult { readonly isFinal: boolean; readonly length: number; [i: number]: SRResultItem; }
interface SRResultList { readonly length: number; [i: number]: SRResult; }
interface SREvent extends Event { readonly resultIndex: number; readonly results: SRResultList; }
interface SRErrEvent extends Event { readonly error: string; }
interface ISR extends EventTarget {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: SRErrEvent) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void;
}
declare global {
  interface Window {
    SpeechRecognition: new () => ISR;
    webkitSpeechRecognition: new () => ISR;
  }
}

/* ─── TTS utility (exported for result screen) ───────────── */
export function speakText(text: string) {
  if (Platform.OS !== "web") return;
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "pt-BR";
  u.rate = 0.92;
  u.pitch = 1.05;
  // prefer a pt-BR voice if available
  const voices = window.speechSynthesis.getVoices();
  const ptVoice = voices.find((v) => v.lang.startsWith("pt"));
  if (ptVoice) u.voice = ptVoice;
  window.speechSynthesis.speak(u);
}
export function stopSpeaking() {
  if (Platform.OS !== "web") return;
  if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
}

/* ─── CSS keyframes injected once ───────────────────────── */
const CSS = `
@keyframes vsGlow {
  0%,100% { box-shadow: 0 0 28px 10px rgba(0,100,255,0.45); }
  50%      { box-shadow: 0 0 52px 22px rgba(0,180,255,0.75); }
}
@keyframes vsRing {
  0%   { transform: scale(1);   opacity: 0.7; }
  100% { transform: scale(2.8); opacity: 0;   }
}
@keyframes vsDot {
  0%,100% { opacity: 0.5; transform: scale(0.7); }
  50%     { opacity: 1;   transform: scale(1);   }
}
@keyframes vsIdleBar {
  0%,100% { transform: scaleY(0.18); }
  50%     { transform: scaleY(0.55); }
}`;

if (Platform.OS === "web" && typeof document !== "undefined" && !document.getElementById("vs-css")) {
  const s = document.createElement("style");
  s.id = "vs-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/* ─── Props ──────────────────────────────────────────────── */
interface VoiceScannerProps { onTranscript: (t: string) => void; loading: boolean; }

/* ─── Native fallback ────────────────────────────────────── */
function NativeVoiceFallback() {
  const colors = useColors();
  return (
    <View style={[styles.fallback, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name="mic-outline" size={48} color={colors.mutedForeground} />
      <Text style={[styles.fallbackTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
        Voz disponível na web
      </Text>
      <Text style={[styles.fallbackSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        Abra o FactScan no browser para usar o comando de voz.
      </Text>
    </View>
  );
}

/* ─── Web voice scanner ──────────────────────────────────── */
type VoiceState = "idle" | "listening" | "processing";

function WebVoiceScanner({ onTranscript, loading }: VoiceScannerProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recogRef = useRef<ISR | null>(null);
  const finalRef = useRef("");
  const stateRef = useRef<VoiceState>("idle");

  useEffect(() => { stateRef.current = voiceState; }, [voiceState]);
  useEffect(() => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) setSupported(false);
  }, []);

  /* ── Canvas: 5 vivid-blue bars ── */
  const drawBars = useCallback((getHeight: (i: number) => number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const N = 5, barW = 9, r = barW / 2;
    const totalW = N * barW + (N - 1) * 10;
    const startX = (W - totalW) / 2;

    for (let i = 0; i < N; i++) {
      const h = getHeight(i);
      const x = startX + i * (barW + 10);
      const y = (H - h) / 2;
      // outer glow
      const glow = ctx.createRadialGradient(x + r, H / 2, 0, x + r, H / 2, h / 1.5);
      glow.addColorStop(0, BAR_COLORS[i] + "55");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(x - 6, y - 6, barW + 12, h + 12);
      // bar
      const grad = ctx.createLinearGradient(x, y + h, x, y);
      grad.addColorStop(0, BAR_COLORS[i] + "bb");
      grad.addColorStop(0.5, BAR_COLORS[i]);
      grad.addColorStop(1, "#ffffff99");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, h, r);
      ctx.fill();
    }
  }, []);

  const drawIdle = useCallback(() => {
    const t = Date.now() / 1000;
    drawBars((i) => {
      const phase = (i / 5) * Math.PI * 2;
      return 6 + (Math.sin(t * 1.6 + phase) + 1) / 2 * 18;
    });
    rafRef.current = requestAnimationFrame(drawIdle);
  }, [drawBars]);

  const drawLive = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const step = Math.floor(data.length / 5);
    const H = canvasRef.current?.height ?? 80;
    drawBars((i) => Math.max(10, (data[i * step] / 255) * H * 0.88));
    rafRef.current = requestAnimationFrame(drawLive);
  }, [drawBars]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(drawIdle);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [drawIdle]);

  const stopAll = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (recogRef.current) { recogRef.current.onend = null; recogRef.current.stop(); recogRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
    analyserRef.current = null;
  }, []);

  const startListening = useCallback(async () => {
    setErrorMsg(""); finalRef.current = ""; setTranscript("");
    setVoiceState("listening");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.75;
      src.connect(analyser);
      analyserRef.current = analyser;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(drawLive);
    } catch { /* no waveform but still try SR */ }

    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); stopAll(); setVoiceState("idle"); return; }

    const rec = new SR();
    recogRef.current = rec;
    rec.lang = "pt-BR"; rec.continuous = false; rec.interimResults = true; rec.maxAlternatives = 1;

    rec.onresult = (e: SREvent) => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (final) finalRef.current += final;
      setTranscript(finalRef.current + interim);
    };
    rec.onerror = (e: SRErrEvent) => {
      const msgs: Record<string, string> = {
        "no-speech": "Nenhuma fala detectada. Tente novamente.",
        "not-allowed": "Permita o acesso ao microfone.",
      };
      setErrorMsg(msgs[e.error] ?? "Erro ao capturar voz.");
      stopAll(); setVoiceState("idle");
      rafRef.current = requestAnimationFrame(drawIdle);
    };
    rec.onend = () => {
      const text = finalRef.current.trim();
      stopAll();
      if (text) { setVoiceState("processing"); onTranscript(text); }
      else {
        setVoiceState("idle");
        rafRef.current = requestAnimationFrame(drawIdle);
        setErrorMsg("Nenhuma fala detectada. Tente novamente.");
      }
    };
    rec.start();
  }, [drawLive, drawIdle, stopAll, onTranscript]);

  const stopListening = useCallback(() => { recogRef.current?.stop(); }, []);

  useEffect(() => {
    if (!loading && voiceState === "processing") {
      setVoiceState("idle"); setTranscript(""); finalRef.current = "";
      rafRef.current = requestAnimationFrame(drawIdle);
    }
  }, [loading, voiceState, drawIdle]);

  useEffect(() => () => { stopAll(); }, [stopAll]);

  const isListening = voiceState === "listening";
  const isProcessing = voiceState === "processing" || loading;
  const isIdle = voiceState === "idle" && !loading;

  if (!supported) {
    return (
      <View style={[styles.fallback, { backgroundColor: "#0D1A2E", borderColor: "#1E3A5F" }]}>
        <Ionicons name="mic-outline" size={48} color="#4DC8F5" />
        <Text style={[styles.fallbackTitle, { color: "#E8F1FB", fontFamily: "Inter_600SemiBold" }]}>
          Use Chrome ou Edge para voz
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.outer}>
      {/* ── Google-style card ── */}
      <div style={cardStyle as React.CSSProperties}>

        {/* Radial glow behind mic */}
        <div style={glowBlobStyle as React.CSSProperties} />

        {/* 5-bar waveform */}
        <div style={{ marginBottom: 20, width: "100%" } as React.CSSProperties}>
          <canvas
            ref={canvasRef as React.RefObject<HTMLCanvasElement>}
            width={280}
            height={72}
            style={{ width: "100%", height: 72, display: "block" } as React.CSSProperties}
          />
        </div>

        {/* Mic orb */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 } as React.CSSProperties}>
          {/* Concentric rings */}
          {isListening && [0, 0.55, 1.1].map((delay, i) => (
            <div key={i} style={{
              position: "absolute",
              width: 100, height: 100,
              borderRadius: "50%",
              border: `1.5px solid ${BAR_COLORS[i % 5]}`,
              animation: `vsRing 2s ease-out ${delay}s infinite`,
              pointerEvents: "none",
            } as React.CSSProperties} />
          ))}

          {/* Mic button */}
          <button
            onClick={isListening ? stopListening : isProcessing ? undefined : startListening}
            disabled={isProcessing}
            style={{
              width: 100, height: 100,
              borderRadius: "50%",
              border: "none",
              cursor: isProcessing ? "default" : "pointer",
              background: isListening
                ? `radial-gradient(circle at 38% 38%, ${V.b2}, ${V.b1})`
                : isProcessing
                ? "rgba(14,26,50,0.9)"
                : `radial-gradient(circle at 38% 38%, #1A2E50, #0D1A30)`,
              animation: isListening ? "vsGlow 1.8s ease-in-out infinite" : "none",
              boxShadow: isListening
                ? `0 0 40px 14px rgba(0,100,255,0.55), inset 0 1px 0 rgba(255,255,255,0.15)`
                : `0 0 24px 4px rgba(0,80,200,0.25), inset 0 1px 0 rgba(255,255,255,0.08)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.25s ease",
              position: "relative",
              zIndex: 1,
              outline: "none",
            } as React.CSSProperties}
          >
            {isProcessing ? (
              <div style={{
                width: 28, height: 28,
                border: `3px solid rgba(77,200,245,0.2)`,
                borderTop: `3px solid ${V.b3}`,
                borderRadius: "50%",
                animation: "aoSpin 0.8s linear infinite",
              } as React.CSSProperties} />
            ) : (
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
                {isListening ? (
                  /* Stop square */
                  <rect x="6" y="6" width="12" height="12" rx="2" fill="white" />
                ) : (
                  /* Mic shape */
                  <>
                    <rect x="9" y="2" width="6" height="11" rx="3" fill={V.b3} />
                    <path d="M5 11a7 7 0 0 0 14 0" stroke={V.b3} strokeWidth="2" strokeLinecap="round" fill="none" />
                    <line x1="12" y1="18" x2="12" y2="22" stroke={V.b3} strokeWidth="2" strokeLinecap="round" />
                    <line x1="8" y1="22" x2="16" y2="22" stroke={V.b3} strokeWidth="2" strokeLinecap="round" />
                  </>
                )}
              </svg>
            )}
          </button>
        </div>

        {/* Status text */}
        <p style={{
          margin: 0,
          fontSize: 15,
          fontFamily: "Inter, sans-serif",
          fontWeight: isListening ? 600 : 400,
          color: isListening ? V.b3 : isProcessing ? "#E8F1FB" : "#7A95B0",
          textAlign: "center",
          letterSpacing: 0.2,
          minHeight: 22,
          transition: "color 0.3s",
        } as React.CSSProperties}>
          {isListening ? "Ouvindo… toque para parar" : isProcessing ? "Analisando com IA…" : "Toque no microfone e fale"}
        </p>

        {/* Processing dots (Google-style) */}
        {isProcessing && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center" } as React.CSSProperties}>
            {BAR_COLORS.map((c, i) => (
              <div key={i} style={{
                width: 8, height: 8,
                borderRadius: "50%",
                background: c,
                animation: `vsDot 1.2s ease-in-out ${i * 0.18}s infinite`,
                boxShadow: `0 0 8px 2px ${c}66`,
              } as React.CSSProperties} />
            ))}
          </div>
        )}

        {/* Live transcript */}
        {transcript ? (
          <div style={{
            marginTop: 16,
            width: "100%",
            background: "rgba(14,28,55,0.8)",
            borderRadius: 12,
            border: "1px solid rgba(77,200,245,0.2)",
            padding: "12px 14px",
            boxSizing: "border-box",
          } as React.CSSProperties}>
            <p style={{ margin: "0 0 4px", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "#7A95B0", fontFamily: "Inter, sans-serif" } as React.CSSProperties}>
              Transcrição ao vivo
            </p>
            <p style={{ margin: 0, fontSize: 14, color: "#E8F1FB", fontStyle: "italic", lineHeight: 1.55, fontFamily: "Inter, sans-serif" } as React.CSSProperties}>
              "{transcript}"
            </p>
          </div>
        ) : null}

        {/* Error */}
        {errorMsg && isIdle ? (
          <div style={{
            marginTop: 14,
            width: "100%",
            background: "rgba(244,67,54,0.07)",
            border: "1px solid rgba(244,67,54,0.22)",
            borderRadius: 10, padding: "10px 14px",
            display: "flex", gap: 8, alignItems: "flex-start",
            boxSizing: "border-box",
          } as React.CSSProperties}>
            <span style={{ color: "#F44336", fontSize: 13, fontFamily: "Inter, sans-serif" } as React.CSSProperties}>⚠ {errorMsg}</span>
          </div>
        ) : null}

        {/* Hint */}
        {isIdle && !transcript && !errorMsg && (
          <div style={{
            marginTop: 14,
            width: "100%",
            background: "rgba(10,30,60,0.6)",
            border: "1px solid rgba(77,200,245,0.12)",
            borderRadius: 10, padding: "10px 14px",
            boxSizing: "border-box",
          } as React.CSSProperties}>
            <p style={{ margin: 0, fontSize: 13, color: "#7A95B0", textAlign: "center", lineHeight: 1.55, fontFamily: "Inter, sans-serif" } as React.CSSProperties}>
              💬 Diga uma notícia, afirmação ou URL para verificar os fatos com IA
            </p>
          </div>
        )}
      </div>
    </View>
  );
}

/* ─── Card CSS-in-JS styles ──────────────────────────────── */
const cardStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 22,
  border: "1px solid rgba(0,100,255,0.25)",
  padding: "28px 20px",
  background: "linear-gradient(175deg, #06111F 0%, #08152A 50%, #0A1A38 100%)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  boxSizing: "border-box",
  position: "relative",
  overflow: "hidden",
  boxShadow: "0 2px 40px rgba(0,60,180,0.18), inset 0 1px 0 rgba(255,255,255,0.04)",
};

const glowBlobStyle: React.CSSProperties = {
  position: "absolute",
  width: 280,
  height: 280,
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(0,80,200,0.18) 0%, transparent 70%)",
  top: "30%",
  left: "50%",
  transform: "translateX(-50%)",
  pointerEvents: "none",
};

/* ─── Spin keyframe for processing dot ──────────────────── */
if (Platform.OS === "web" && typeof document !== "undefined" && !document.getElementById("ao-spin-vs")) {
  const s = document.createElement("style");
  s.id = "ao-spin-vs";
  s.textContent = `@keyframes aoSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
  document.head.appendChild(s);
}

/* ─── Public export ──────────────────────────────────────── */
export function VoiceScanner({ onTranscript, loading }: VoiceScannerProps) {
  if (Platform.OS !== "web") return <NativeVoiceFallback />;
  return <WebVoiceScanner onTranscript={onTranscript} loading={loading} />;
}

/* ─── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  outer: { width: "100%" },
  fallback: { borderRadius: 16, borderWidth: 1, padding: 28, alignItems: "center", gap: 14 },
  fallbackTitle: { fontSize: 17, textAlign: "center" },
  fallbackSub: { fontSize: 13, textAlign: "center", lineHeight: 20 },
});
