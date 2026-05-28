import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useHistory } from "@/context/HistoryContext";
import { QRScanner } from "@/components/QRScanner";
import { VoiceScanner } from "@/components/VoiceScanner";
import { AnalyzingOverlay } from "@/components/AnalyzingOverlay";

type ScanMode = "image" | "text" | "qr" | "voice";

const MODES: { id: ScanMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "image", label: "Imagem", icon: "camera-outline" },
  { id: "text", label: "Texto", icon: "text-outline" },
  { id: "qr", label: "QR Code", icon: "qr-code-outline" },
  { id: "voice", label: "Voz", icon: "mic-outline" },
];

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

export default function ScannerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addRecord } = useHistory();

  const [mode, setMode] = useState<ScanMode>("image");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  async function analyzeImage(fromCamera: boolean) {
    let result;
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permissão necessária", "Permita o acesso à câmera para escanear.");
        return;
      }
      result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, base64: true });
    }

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const base64 = asset.base64;

    if (!base64) {
      Alert.alert("Erro", "Não foi possível ler a imagem. Tente novamente.");
      return;
    }

    const mimeType = asset.mimeType ?? "image/jpeg";
    await doFactCheck({ imageBase64: base64, mimeType, mode: "image" });
  }

  async function analyzeText() {
    if (!text.trim()) {
      Alert.alert("Texto vazio", "Digite ou cole o conteúdo que deseja verificar.");
      return;
    }
    await doFactCheck({ text: text.trim(), mode: "text" });
  }

  async function handleVoiceTranscript(transcript: string) {
    await doFactCheck({ text: transcript, mode: "voice" });
  }

  async function handleQRDetected(qrData: string) {
    const isUrl = qrData.startsWith("http://") || qrData.startsWith("https://") || qrData.includes(".");
    await doFactCheck({
      text: qrData,
      url: isUrl ? qrData : undefined,
      mode: "qr",
    });
  }

  async function doFactCheck(payload: {
    imageBase64?: string;
    mimeType?: string;
    text?: string;
    url?: string;
    mode: string;
  }) {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await fetch(`${API_BASE}/api/fact-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error ?? "Falha na análise");
      }

      const data = await res.json();
      const record = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        score: data.score,
        verdict: data.verdict,
        summary: data.summary,
        reasoning: data.reasoning,
        claims: data.claims,
        sources: data.sources ?? [],
        usedGrounding: data.usedGrounding ?? false,
        mode: payload.mode,
        analyzedAt: data.analyzedAt,
        inputText: payload.text,
        inputUrl: payload.url,
      };

      addRecord(record);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({ pathname: "/result", params: { id: record.id } });
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Erro", err instanceof Error ? err.message : "Falha ao analisar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
              FactScan
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Verificador de fatos com IA
            </Text>
          </View>

          {/* Mode selector */}
          <View style={styles.modeRow}>
            {MODES.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.modeChip,
                  {
                    backgroundColor: mode === m.id ? colors.primary : colors.card,
                    borderColor: mode === m.id ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  setMode(m.id);
                  Haptics.selectionAsync();
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={m.icon}
                  size={16}
                  color={mode === m.id ? colors.primaryForeground : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.modeLabel,
                    {
                      color: mode === m.id ? colors.primaryForeground : colors.mutedForeground,
                      fontFamily: "Inter_500Medium",
                    },
                  ]}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── ANALYZING OVERLAY (all modes) ── */}
          {loading && <AnalyzingOverlay visible />}

          {/* ── IMAGE MODE ── */}
          {!loading && mode === "image" && (
            <View style={styles.imageSection}>
              <View style={[styles.scanFrame, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="scan" size={64} color={colors.primary} />
                <Text style={[styles.scanHint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  Escaneie artigos, notícias, revistas{"\n"}ou qualquer documento impresso
                </Text>
              </View>
              <View style={styles.imageButtons}>
                <TouchableOpacity
                  style={[styles.imgBtn, { backgroundColor: colors.primary }]}
                  onPress={() => analyzeImage(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="camera" size={22} color={colors.primaryForeground} />
                  <Text style={[styles.imgBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
                    Câmera
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.imgBtn, { backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1 }]}
                  onPress={() => analyzeImage(false)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="images-outline" size={22} color={colors.foreground} />
                  <Text style={[styles.imgBtnText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                    Galeria
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── TEXT MODE ── */}
          {!loading && mode === "text" && (
            <View style={styles.textSection}>
              <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={colors.mutedForeground}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.textInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                  placeholder="Cole ou digite o texto do artigo / notícia..."
                  placeholderTextColor={colors.mutedForeground}
                  value={text}
                  onChangeText={setText}
                  multiline
                  textAlignVertical="top"
                  returnKeyType="default"
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.analyzeBtn,
                  {
                    backgroundColor: text.trim() ? colors.primary : colors.secondary,
                    opacity: text.trim() ? 1 : 0.5,
                  },
                ]}
                onPress={analyzeText}
                disabled={!text.trim()}
                activeOpacity={0.85}
              >
                <Ionicons name="shield-checkmark-outline" size={20} color={text.trim() ? colors.primaryForeground : colors.mutedForeground} />
                <Text style={[styles.analyzeBtnText, { color: text.trim() ? colors.primaryForeground : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                  Verificar Fatos
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── QR CODE MODE ── live camera scanner ── */}
          {!loading && mode === "qr" && (
            <View style={styles.qrSection}>
              <QRScanner onDetected={handleQRDetected} loading={false} />
            </View>
          )}

          {/* ── VOICE MODE ── */}
          {!loading && mode === "voice" && (
            <VoiceScanner onTranscript={handleVoiceTranscript} loading={false} />
          )}

          {/* Info card */}
          {!loading && (
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="globe-outline" size={16} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Verificação em tempo real com múltiplas fontes jornalísticas via IA
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { alignItems: "center", marginBottom: 28 },
  title: { fontSize: 32, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4 },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  modeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modeLabel: { fontSize: 13 },
  imageSection: { gap: 16 },
  qrSection: { gap: 0 },
  scanFrame: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 16,
  },
  scanHint: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  imageButtons: { flexDirection: "row", gap: 12 },
  imgBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  imgBtnText: { fontSize: 16 },
  textSection: { gap: 14 },
  inputWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    minHeight: 160,
  },
  inputIcon: { alignSelf: "flex-start", marginBottom: 8 },
  textInput: { fontSize: 15, lineHeight: 22, minHeight: 120 },
  analyzeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  analyzeBtnText: { fontSize: 16 },
  loadingCard: {
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    padding: 28,
    gap: 10,
  },
  loadingText: { fontSize: 16 },
  loadingSubtext: { fontSize: 13 },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginTop: 16,
  },
  infoText: { fontSize: 13, lineHeight: 19, flex: 1 },
});
