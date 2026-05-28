import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Source {
  title: string;
  domain: string;
}

export function SourceItem({ title, domain }: Source) {
  const colors = useColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <View style={[styles.iconBox, { backgroundColor: colors.primary + "22" }]}>
        <Ionicons name="newspaper-outline" size={13} color={colors.primary} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.domain, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
          {domain}
        </Text>
        <Text style={[styles.title, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  text: { flex: 1 },
  domain: { fontSize: 12 },
  title: { fontSize: 11, marginTop: 1 },
});
