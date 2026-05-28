import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface ScoreMeterProps {
  score: number;
}

function getScoreColor(score: number, colors: ReturnType<typeof useColors>) {
  if (score >= 70) return colors.scoreHigh;
  if (score >= 40) return colors.scoreMid;
  return colors.scoreLow;
}

function getVerdictLabel(score: number): string {
  if (score >= 90) return "Verdadeiro";
  if (score >= 70) return "Majoritariamente Verdadeiro";
  if (score >= 40) return "Misto";
  if (score >= 20) return "Enganoso";
  return "Falso";
}

export function ScoreMeter({ score }: ScoreMeterProps) {
  const colors = useColors();
  const animWidth = useRef(new Animated.Value(0)).current;
  const scoreColor = getScoreColor(score, colors);
  const verdict = getVerdictLabel(score);

  useEffect(() => {
    Animated.spring(animWidth, {
      toValue: score,
      useNativeDriver: false,
      tension: 60,
      friction: 8,
    }).start();
  }, [score]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.scoreNum, { color: scoreColor, fontFamily: "Inter_700Bold" }]}>
          {score}
          <Text style={[styles.outOf, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>/100</Text>
        </Text>
        <View style={[styles.verdictBadge, { backgroundColor: scoreColor + "22", borderColor: scoreColor + "44" }]}>
          <Text style={[styles.verdictText, { color: scoreColor, fontFamily: "Inter_600SemiBold" }]}>
            {verdict}
          </Text>
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: scoreColor,
              width: animWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
                extrapolate: "clamp",
              }),
            },
          ]}
        />
      </View>
      <View style={styles.ticks}>
        {[0, 25, 50, 75, 100].map((tick) => (
          <Text key={tick} style={[styles.tick, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {tick}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  scoreNum: {
    fontSize: 48,
    lineHeight: 56,
  },
  outOf: {
    fontSize: 18,
  },
  verdictBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  verdictText: {
    fontSize: 14,
  },
  track: {
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 5,
  },
  ticks: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  tick: {
    fontSize: 11,
  },
});
