import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { ScanRecord } from "@/context/HistoryContext";

interface Props {
  record: ScanRecord;
  onPress: () => void;
}

function getScoreColor(score: number, colors: ReturnType<typeof useColors>) {
  if (score >= 70) return colors.scoreHigh;
  if (score >= 40) return colors.scoreMid;
  return colors.scoreLow;
}

function getModeIcon(mode: string): "camera-outline" | "text-outline" | "qr-code-outline" | "image-outline" {
  switch (mode) {
    case "image": return "camera-outline";
    case "text": return "text-outline";
    case "qr": return "qr-code-outline";
    default: return "image-outline";
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function HistoryItem({ record, onPress }: Props) {
  const colors = useColors();
  const scoreColor = getScoreColor(record.score, colors);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.scoreBox, { backgroundColor: scoreColor + "22", borderColor: scoreColor + "44" }]}>
        <Text style={[styles.scoreNum, { color: scoreColor, fontFamily: "Inter_700Bold" }]}>{record.score}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.row}>
          <Ionicons name={getModeIcon(record.mode)} size={13} color={colors.mutedForeground} />
          <Text style={[styles.verdict, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
            {record.verdict}
          </Text>
        </View>
        <Text style={[styles.summary, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
          {record.summary}
        </Text>
        <Text style={[styles.date, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {formatDate(record.analyzedAt)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  scoreBox: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  scoreNum: {
    fontSize: 20,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  verdict: {
    fontSize: 14,
    flex: 1,
  },
  summary: {
    fontSize: 12,
    lineHeight: 17,
  },
  date: {
    fontSize: 11,
    marginTop: 2,
  },
});
