import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Claim {
  claim: string;
  accurate: boolean;
  explanation: string;
}

export function ClaimItem({ claim, accurate, explanation }: Claim) {
  const colors = useColors();
  const iconColor = accurate ? colors.scoreHigh : colors.scoreLow;
  const iconName = accurate ? "checkmark-circle" : "close-circle";
  const badgeBg = accurate ? colors.scoreHigh + "22" : colors.scoreLow + "22";
  const badgeBorder = accurate ? colors.scoreHigh + "44" : colors.scoreLow + "44";

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
          <Ionicons name={iconName} size={14} color={iconColor} />
          <Text style={[styles.badgeText, { color: iconColor, fontFamily: "Inter_600SemiBold" }]}>
            {accurate ? "Preciso" : "Impreciso"}
          </Text>
        </View>
      </View>
      <Text style={[styles.claim, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
        "{claim}"
      </Text>
      <Text style={[styles.explanation, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        {explanation}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  header: {
    flexDirection: "row",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 12,
  },
  claim: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: "italic",
  },
  explanation: {
    fontSize: 13,
    lineHeight: 19,
  },
});
