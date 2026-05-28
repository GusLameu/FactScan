/**
 * AnalyzingOverlay
 * A vivid, animated "analyzing" screen rendered during fact-check API calls.
 *
 * Web:   Canvas — radar sweep, orbiting particles, glowing core
 * Native: React Native Animated — expanding rings + rotating icon + cycling text
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

const MESSAGES = [
  "Verificando afirmações…",
  "Consultando fontes jornalísticas…",
  "Cruzando dados em tempo real…",
  "Analisando credibilidade…",
  "Calculando confiabilidade…",
  "Checando contra fatos estabelecidos…",
];

/* ─────────────────────────────────────────────────────────────
   Inject CSS keyframes once (web only)
───────────────────────────────────────────────────────────── */
const KEYFRAMES = `
@keyframes aoRing {
  0%   { transform: scale(0.6); opacity: 0.7; }
  100% { transform: scale(2.4); opacity: 0;   }
}
@keyframes aoSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes aoGlow {
  0%, 100% { box-shadow: 0 0 24px 8px rgba(77,200,245,0.45); }
  50%       { box-shadow: 0 0 44px 18px rgba(77,200,245,0.75); }
}
@keyframes aoFadeSlide {
  0%   { opacity: 0; transform: translateY(10px); }
  15%  { opacity: 1; transform: translateY(0);    }
  85%  { opacity: 1; transform: translateY(0);    }
  100% { opacity: 0; transform: translateY(-8px); }
}`;

if (Platform.OS === "web" && typeof document !== "undefined") {
  if (!document.getElementById("ao-style")) {
    const s = document.createElement("style");
    s.id = "ao-style";
    s.textContent = KEYFRAMES;
    document.head.appendChild(s);
  }
}

/* ─────────────────────────────────────────────────────────────
   Web canvas animation
───────────────────────────────────────────────────────────── */
function WebAnalyzingCanvas({ size }: { size: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(Date.now());

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const t = (Date.now() - startRef.current) / 1000;

    ctx.clearRect(0, 0, W, H);

    /* ── Radar sweep ── */
    const sweepAngle = (t * 1.4) % (Math.PI * 2);
    const RADAR_R = size * 0.38;
    for (let i = 0; i < 60; i++) {
      const angle = sweepAngle - (i / 60) * (Math.PI * 0.55);
      const alpha = ((60 - i) / 60) * 0.18;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, RADAR_R, angle, angle + 0.05);
      ctx.closePath();
      ctx.fillStyle = `rgba(77,200,245,${alpha})`;
      ctx.fill();
    }

    /* ── Concentric rings (static, faint) ── */
    [0.2, 0.3, 0.38].forEach((ratio) => {
      ctx.beginPath();
      ctx.arc(cx, cy, size * ratio, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(77,200,245,0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    /* ── Crosshairs ── */
    ctx.strokeStyle = "rgba(77,200,245,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, cy - RADAR_R); ctx.lineTo(cx, cy + RADAR_R); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - RADAR_R, cy); ctx.lineTo(cx + RADAR_R, cy); ctx.stroke();

    /* ── Orbiting particles ── */
    const particles = [
      { r: size * 0.2,  speed: 1.1,  size: 3.5, phase: 0 },
      { r: size * 0.2,  speed: 1.1,  size: 2.5, phase: Math.PI },
      { r: size * 0.29, speed: 0.7,  size: 4,   phase: 1.2 },
      { r: size * 0.29, speed: 0.7,  size: 2.5, phase: 3.5 },
      { r: size * 0.38, speed: 0.45, size: 5,   phase: 0.5 },
      { r: size * 0.38, speed: 0.45, size: 2.5, phase: 2.7 },
      { r: size * 0.38, speed: 0.45, size: 2,   phase: 4.8 },
    ];

    particles.forEach(({ r, speed, size: ps, phase }) => {
      const angle = t * speed + phase;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);

      /* Glow */
      const grad = ctx.createRadialGradient(px, py, 0, px, py, ps * 3);
      grad.addColorStop(0, "rgba(77,200,245,0.9)");
      grad.addColorStop(1, "rgba(77,200,245,0)");
      ctx.beginPath();
      ctx.arc(px, py, ps * 3, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      /* Core dot */
      ctx.beginPath();
      ctx.arc(px, py, ps * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    });

    /* ── Central glowing orb ── */
    const pulse = 0.85 + 0.15 * Math.sin(t * 3.5);
    const orbR = size * 0.095 * pulse;

    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR * 2.8);
    coreGrad.addColorStop(0, "rgba(77,200,245,0.55)");
    coreGrad.addColorStop(1, "rgba(77,200,245,0)");
    ctx.beginPath();
    ctx.arc(cx, cy, orbR * 2.8, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(77,200,245,0.9)";
    ctx.fill();

    /* white specular */
    ctx.beginPath();
    ctx.arc(cx - orbR * 0.25, cy - orbR * 0.25, orbR * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fill();

    rafRef.current = requestAnimationFrame(draw);
  }, [size]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef as React.RefObject<HTMLCanvasElement>}
      width={size}
      height={size}
      style={{ width: size, height: size } as React.CSSProperties}
    />
  );
}

/* ─────────────────────────────────────────────────────────────
   Cycling text
───────────────────────────────────────────────────────────── */
function CyclingMessage() {
  const colors = useColors();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % MESSAGES.length), 2600);
    return () => clearInterval(id);
  }, []);

  if (Platform.OS === "web") {
    return (
      <div
        key={idx}
        style={{
          animation: "aoFadeSlide 2.6s ease forwards",
          textAlign: "center",
          color: colors.foreground,
          fontSize: 15,
          fontWeight: 500,
          letterSpacing: 0.2,
          minHeight: 24,
        } as React.CSSProperties}
      >
        {MESSAGES[idx]}
      </div>
    );
  }

  return (
    <Text style={[styles.msgText, { color: colors.foreground }]}>
      {MESSAGES[idx]}
    </Text>
  );
}

/* ─────────────────────────────────────────────────────────────
   Native rings (Animated API)
───────────────────────────────────────────────────────────── */
function NativeRing({ delay, primary }: { delay: number; primary: string }) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, { toValue: 2.4, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.6, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.7, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay, scale, opacity]);

  return (
    <Animated.View
      style={[
        styles.ring,
        { borderColor: primary, transform: [{ scale }], opacity },
      ]}
    />
  );
}

/* ─────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────── */
export function AnalyzingOverlay({ visible }: { visible: boolean }) {
  const colors = useColors();
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [visible, spinAnim]);

  if (!visible) return null;

  const spinDeg = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const CANVAS_SIZE = 220;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Canvas or Animated rings */}
      <View style={styles.orbArea}>
        {Platform.OS === "web" ? (
          <>
            {/* CSS pulse rings behind the canvas */}
            {[0, 0.6, 1.2].map((delay, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  border: `1.5px solid ${colors.primary}`,
                  animation: `aoRing 2.4s ease-out ${delay}s infinite`,
                  pointerEvents: "none",
                } as React.CSSProperties}
              />
            ))}
            <WebAnalyzingCanvas size={CANVAS_SIZE} />
          </>
        ) : (
          <>
            <NativeRing delay={0}    primary={colors.primary} />
            <NativeRing delay={600}  primary={colors.primary} />
            <NativeRing delay={1200} primary={colors.primary} />
            <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
              <Ionicons name="shield-checkmark-outline" size={56} color={colors.primary} />
            </Animated.View>
          </>
        )}
      </View>

      {/* Status bar */}
      <View style={styles.statusRow}>
        {/* Spinning indicator dot (web) */}
        {Platform.OS === "web" ? (
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: colors.primary,
              boxShadow: `0 0 10px 4px rgba(77,200,245,0.6)`,
              animation: "aoGlow 1.4s ease-in-out infinite",
              flexShrink: 0,
            } as React.CSSProperties}
          />
        ) : (
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
        )}
        <CyclingMessage />
      </View>

      {/* Sub-label */}
      <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>
        IA com acesso a fontes jornalísticas ao vivo
      </Text>

      {/* Progress bar */}
      {Platform.OS === "web" ? (
        <div
          style={{
            width: "100%",
            height: 2,
            borderRadius: 2,
            background: `rgba(77,200,245,0.12)`,
            overflow: "hidden",
          } as React.CSSProperties}
        >
          <div
            style={{
              height: "100%",
              width: "40%",
              background: `linear-gradient(90deg, transparent, ${colors.primary}, transparent)`,
              animation: "aoSpin 1.6s linear infinite",
              backgroundSize: "200% 100%",
              // Use a translate-based shimmer
              animationName: "aoShimmer",
            } as React.CSSProperties}
          />
        </div>
      ) : (
        <View style={[styles.progressTrack, { backgroundColor: `rgba(77,200,245,0.12)` }]}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                backgroundColor: colors.primary,
                transform: [{ scaleX: spinAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.1, 0.8, 0.1] }) }],
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}

/* Shimmer keyframe */
if (Platform.OS === "web" && typeof document !== "undefined") {
  if (!document.getElementById("ao-shimmer")) {
    const s = document.createElement("style");
    s.id = "ao-shimmer";
    s.textContent = `
@keyframes aoShimmer {
  0%   { transform: translateX(-250%); }
  100% { transform: translateX(600%); }
}`;
    document.head.appendChild(s);
  }
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 20,
    overflow: "hidden",
  },
  orbArea: {
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  msgText: {
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  subLabel: {
    fontSize: 12,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  progressTrack: {
    width: "100%",
    height: 2,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    width: "100%",
    borderRadius: 2,
  },
});
