import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useHistory } from "@/context/HistoryContext";
import { ScoreMeter } from "@/components/ScoreMeter";
import { ClaimItem } from "@/components/ClaimItem";
import { SourceItem } from "@/components/SourceItem";
import { speakText, stopSpeaking } from "@/components/VoiceScanner";

export default function ResultScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { records } = useHistory();
  const [speaking, setSpeaking] = useState(false);
  const spokenRef = useRef(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const record = records.find((r) => r.id === id);

  /* Auto-speak when result came from voice mode */
  useEffect(() => {
    if (!record || spokenRef.current || Platform.OS !== "web") return;
    if (record.mode !== "voice") return;
    spokenRef.current = true;
    const delay = setTimeout(() => {
      setSpeaking(true);
      const text =
        `${record.verdict}. Pontuação: ${record.score} de 100. ${record.summary}`;
      speakText(text);
      // Reset speaking badge after estimated duration
      const ms = text.length * 65;
      setTimeout(() => setSpeaking(false), ms);
    }, 600);
    return () => clearTimeout(delay);
  }, [record]);

  /* Stop TTS on unmount */
  useEffect(() => () => { stopSpeaking(); }, []);

  function handleSpeakToggle() {
    if (!record) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      setSpeaking(true);
      const text = `${record.verdict}. Pontuação: ${record.score} de 100. ${record.summary}`;
      speakText(text);
      const ms = text.length * 65;
      setTimeout(() => setSpeaking(false), ms);
    }
  }

  if (!record) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <View style={styles.notFound}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.notFoundText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            Resultado não encontrado
          </Text>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.backBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
              Voltar
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function handleClose() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    stopSpeaking();
    router.back();
  }

  const scoreColor =
    record.score >= 70
      ? colors.scoreHigh
      : record.score >= 40
      ? colors.scoreMid
      : colors.scoreLow;

  const hasSources = record.sources && record.sources.length > 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 16, paddingBottom: botPad + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={handleClose} style={[styles.closeBtn, { backgroundColor: colors.card }]}>
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          </Pressable>

          <Text style={[styles.topTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            Resultado
          </Text>

          <View style={styles.topRight}>
            {/* Speaker button (web only) */}
            {Platform.OS === "web" && (
              <Pressable
                onPress={handleSpeakToggle}
                style={[
                  styles.speakBtn,
                  {
                    backgroundColor: speaking ? colors.primary + "22" : colors.card,
                    borderColor: speaking ? colors.primary + "55" : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={speaking ? "volume-high" : "volume-medium-outline"}
                  size={16}
                  color={speaking ? colors.primary : colors.mutedForeground}
                />
                {speaking && (
                  <Text style={[styles.speakLabel, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                    Lendo…
                  </Text>
                )}
              </Pressable>
            )}

            {/* Grounding badge */}
            <View style={[styles.groundingBadge, {
              backgroundColor: record.usedGrounding ? colors.primary + "22" : colors.card,
              borderColor: record.usedGrounding ? colors.primary + "55" : colors.border,
            }]}>
              <Ionicons
                name={record.usedGrounding ? "globe-outline" : "cloud-offline-outline"}
                size={12}
                color={record.usedGrounding ? colors.primary : colors.mutedForeground}
              />
              <Text style={[styles.groundingText, {
                color: record.usedGrounding ? colors.primary : colors.mutedForeground,
                fontFamily: "Inter_500Medium",
              }]}>
                {record.usedGrounding ? "Fontes ao vivo" : "Dados de treino"}
              </Text>
            </View>
          </View>
        </View>

        {/* Score meter */}
        <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ScoreMeter score={record.score} />
        </View>

        {/* Summary */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              Resumo
            </Text>
          </View>
          <Text style={[styles.bodyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {record.summary}
          </Text>
        </View>

        {/* Reasoning */}
        {record.reasoning ? (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                Análise Detalhada
              </Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {record.reasoning}
            </Text>
          </View>
        ) : null}

        {/* Claims */}
        {record.claims && record.claims.length > 0 && (
          <View style={styles.claimsSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                Afirmações analisadas ({record.claims.length})
              </Text>
            </View>
            <View style={{ height: 10 }} />
            {record.claims.map((claim, i) => (
              <ClaimItem key={i} {...claim} />
            ))}
          </View>
        )}

        {/* Sources */}
        {hasSources && (
          <View style={styles.sourcesSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="newspaper-outline" size={16} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                Fontes consultadas ({record.sources.length})
              </Text>
            </View>
            <View style={{ height: 10 }} />
            {record.sources.map((s, i) => (
              <SourceItem key={i} title={s.title} domain={s.domain} />
            ))}
          </View>
        )}

        {/* Perfect score */}
        {record.score === 100 && (
          <View style={[styles.perfectNote, {
            backgroundColor: colors.scoreHigh + "22",
            borderColor: colors.scoreHigh + "44",
          }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.scoreHigh} />
            <Text style={[styles.perfectText, { color: colors.scoreHigh, fontFamily: "Inter_500Medium" }]}>
              Conteúdo verificado como completamente preciso
            </Text>
          </View>
        )}

        <Text style={[styles.timestamp, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Analisado em {new Date(record.analyzedAt).toLocaleString("pt-BR")}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 8,
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  topTitle: { fontSize: 17, flex: 1, textAlign: "center" },
  topRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  speakBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  speakLabel: { fontSize: 11 },
  groundingBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1,
  },
  groundingText: { fontSize: 11 },
  scoreCard: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 16 },
  section: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12, gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 15 },
  bodyText: { fontSize: 14, lineHeight: 22 },
  claimsSection: { marginBottom: 12 },
  sourcesSection: { marginBottom: 12 },
  perfectNote: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16,
  },
  perfectText: { fontSize: 14, flex: 1 },
  timestamp: { fontSize: 12, textAlign: "center", marginTop: 8 },
  notFound: { alignItems: "center", flex: 1, justifyContent: "center", gap: 12 },
  notFoundText: { fontSize: 18 },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  backBtnText: { fontSize: 15 },
});
