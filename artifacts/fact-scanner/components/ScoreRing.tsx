import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface ScoreRingProps {
  score: number;
  size?: number;
}

function getScoreColor(score: number, colors: ReturnType<typeof useColors>) {
  if (score >= 70) return colors.scoreHigh;
  if (score >= 40) return colors.scoreMid;
  return colors.scoreLow;
}

function getVerdictLabel(score: number): string {
  if (score >= 90) return "Verdadeiro";
  if (score >= 70) return "Majoritariamente\nVerdadeiro";
  if (score >= 40) return "Misto";
  if (score >= 20) return "Enganoso";
  return "Falso";
}

export function ScoreRing({ score, size = 160 }: ScoreRingProps) {
  const colors = useColors();
  const animatedScore = useRef(new Animated.Value(0)).current;
  const displayScore = useRef(0);

  useEffect(() => {
    Animated.timing(animatedScore, {
      toValue: score,
      duration: 1000,
      useNativeDriver: false,
    }).start();
    animatedScore.addListener(({ value }) => {
      displayScore.current = Math.round(value);
    });
    return () => animatedScore.removeAllListeners();
  }, [score]);

  const color = getScoreColor(score, colors);
  const verdict = getVerdictLabel(score);
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const strokeDashoffset = circumference - progress;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: colors.border }]}>
        <View style={styles.innerContent}>
          <Text style={[styles.scoreText, { color, fontFamily: "Inter_700Bold" }]}>
            {score}
          </Text>
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            /100
          </Text>
        </View>
      </View>
      <View style={[styles.progressOverlay, { width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: "transparent", borderTopColor: color }]} />
      <Text style={[styles.verdict, { color, fontFamily: "Inter_600SemiBold" }]} numberOfLines={2}>
        {verdict}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ring: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
  },
  innerContent: {
    alignItems: "center",
    flexDirection: "row",
    alignContent: "flex-end",
  },
  progressOverlay: {
    position: "absolute",
    transform: [{ rotate: "-90deg" }],
  },
  scoreText: {
    fontSize: 44,
    lineHeight: 52,
  },
  scoreLabel: {
    fontSize: 16,
    marginTop: 8,
  },
  verdict: {
    marginTop: 140,
    fontSize: 14,
    textAlign: "center",
  },
});
