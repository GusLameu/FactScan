import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

interface Curiosidade {
  id: string;
  emoji: string;
  category: string;
  title: string;
  fact: string;
  why: string;
  tip: string;
  source: string;
  generatedAt: string;
  savedAt?: string;
}

const CATEGORIES = [
  { key: "", label: "Todas", emoji: "✨" },
  { key: "saude", label: "Saúde", emoji: "🩺" },
  { key: "ciencia", label: "Ciência", emoji: "🔬" },
  { key: "dinheiro", label: "Dinheiro", emoji: "💰" },
  { key: "natureza", label: "Natureza", emoji: "🌿" },
  { key: "tecnologia", label: "Tecnologia", emoji: "💻" },
  { key: "historia", label: "História", emoji: "📜" },
  { key: "alimentacao", label: "Alimentação", emoji: "🥗" },
  { key: "psicologia", label: "Psicologia", emoji: "🧠" },
  { key: "corpo", label: "Corpo", emoji: "🫀" },
  { key: "idiomas", label: "Idiomas", emoji: "🗣️" },
];

const STORAGE_KEY = "@factscan_curiosidades_saved";

/* ─── Shimmer loading card ────────────────────────────────── */
function ShimmerCard() {
  const colors = useColors();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });

  return (
    <View style={[shimmer.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Animated.View style={{ opacity }}>
        <View style={[shimmer.circle, { backgroundColor: colors.secondary }]} />
        <View style={[shimmer.line, { backgroundColor: colors.secondary, width: "60%", marginBottom: 10 }]} />
        <View style={[shimmer.line, { backgroundColor: colors.secondary, width: "100%", marginBottom: 6 }]} />
        <View style={[shimmer.line, { backgroundColor: colors.secondary, width: "85%", marginBottom: 6 }]} />
        <View style={[shimmer.line, { backgroundColor: colors.secondary, width: "70%", marginBottom: 18 }]} />
        <View style={[shimmer.line, { backgroundColor: colors.secondary, width: "100%", marginBottom: 6 }]} />
        <View style={[shimmer.line, { backgroundColor: colors.secondary, width: "50%" }]} />
      </Animated.View>
    </View>
  );
}

const shimmer = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 24, marginBottom: 16 },
  circle: { width: 52, height: 52, borderRadius: 26, marginBottom: 14 },
  line: { height: 12, borderRadius: 6, marginBottom: 4 },
});

/* ─── Curiosidade card ────────────────────────────────────── */
function CuriCard({
  item,
  saved,
  onSave,
  onRemove,
}: {
  item: Curiosidade;
  saved: boolean;
  onSave: (c: Curiosidade) => void;
  onRemove: (id: string) => void;
}) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(1)).current;

  function handleSavePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    if (saved) onRemove(item.id);
    else onSave(item);
  }

  return (
    <Animated.View style={[{ transform: [{ scale }] }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.emojiCircle, { backgroundColor: `${colors.primary}18` }]}>
            <Text style={styles.emoji}>{item.emoji}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.cardCategory, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
              {item.category}
            </Text>
            <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {item.title}
            </Text>
          </View>
          <TouchableOpacity onPress={handleSavePress} hitSlop={12} style={styles.saveBtn}>
            <Ionicons
              name={saved ? "bookmark" : "bookmark-outline"}
              size={22}
              color={saved ? colors.primary : colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Fact */}
        <Text style={[styles.factText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
          {item.fact}
        </Text>

        {/* Why it matters */}
        <View style={[styles.whyBox, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}28` }]}>
          <Ionicons name="bulb-outline" size={15} color={colors.primary} />
          <Text style={[styles.whyText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
            {item.why}
          </Text>
        </View>

        {/* Practical tip */}
        <View style={[styles.tipBox, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.tipLabel, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
            💡 Dica prática
          </Text>
          <Text style={[styles.tipText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
            {item.tip}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Ionicons name="library-outline" size={12} color={colors.mutedForeground} />
          <Text style={[styles.sourceText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {item.source}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

/* ─── Main screen ─────────────────────────────────────────── */
export default function CuriosidadesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [selectedCat, setSelectedCat] = useState("");
  const [currentItem, setCurrentItem] = useState<Curiosidade | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Curiosidade[]>([]);
  const [view, setView] = useState<"discover" | "saved">("discover");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  /* Load saved curiosidades */
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setSaved(JSON.parse(raw));
    });
  }, []);

  function persistSaved(items: Curiosidade[]) {
    setSaved(items);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function handleSave(item: Curiosidade) {
    persistSaved([{ ...item, id: item.id, savedAt: new Date().toISOString() }, ...saved]);
  }

  function handleRemove(id: string) {
    persistSaved(saved.filter((s) => s.id !== id));
  }

  const isSaved = (id: string) => saved.some((s) => s.id === id);

  const animateIn = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(24);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const fetchCuriosity = useCallback(async (cat: string) => {
    setLoading(true);
    setError("");
    try {
      const url = `${API_BASE}/api/curiosidades${cat ? `?category=${cat}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error((await res.json()).error ?? "Falha ao gerar");
      const data: Omit<Curiosidade, "id"> = await res.json();
      const item: Curiosidade = { ...data, id: Date.now().toString() + Math.random().toString(36).slice(2, 7) };
      setCurrentItem(item);
      animateIn();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tente novamente.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }, [animateIn]);

  /* Auto-fetch on first mount */
  useEffect(() => {
    fetchCuriosity("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCatSelect(key: string) {
    setSelectedCat(key);
    Haptics.selectionAsync();
    fetchCuriosity(key);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
            Curiosidades
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Fatos úteis e surpreendentes do cotidiano
          </Text>
        </View>

        {/* View toggle */}
        <View style={[styles.toggle, { backgroundColor: colors.secondary }]}>
          {(["discover", "saved"] as const).map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => { setView(v); Haptics.selectionAsync(); }}
              style={[styles.toggleBtn, view === v && { backgroundColor: colors.card }]}
              activeOpacity={0.8}
            >
              <Ionicons
                name={v === "discover" ? "sparkles-outline" : "bookmark-outline"}
                size={15}
                color={view === v ? colors.primary : colors.mutedForeground}
              />
              <Text style={[styles.toggleLabel, { color: view === v ? colors.foreground : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                {v === "discover" ? "Descobrir" : `Salvos (${saved.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── DISCOVER view ── */}
        {view === "discover" && (
          <>
            {/* Category chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.catScroll}
              contentContainerStyle={styles.catRow}
            >
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  onPress={() => handleCatSelect(c.key)}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: selectedCat === c.key ? colors.primary : colors.card,
                      borderColor: selectedCat === c.key ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.catEmoji}>{c.emoji}</Text>
                  <Text style={[styles.catLabel, { color: selectedCat === c.key ? colors.primaryForeground : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Card area */}
            {loading ? (
              <ShimmerCard />
            ) : error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="alert-circle-outline" size={40} color={colors.scoreLow} />
                <Text style={[styles.errorText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                  {error}
                </Text>
                <TouchableOpacity
                  onPress={() => fetchCuriosity(selectedCat)}
                  style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={[{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 }]}>
                    Tentar novamente
                  </Text>
                </TouchableOpacity>
              </View>
            ) : currentItem ? (
              <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                <CuriCard
                  item={currentItem}
                  saved={isSaved(currentItem.id)}
                  onSave={handleSave}
                  onRemove={handleRemove}
                />
              </Animated.View>
            ) : null}

            {/* Generate button */}
            {!loading && (
              <TouchableOpacity
                style={[styles.genBtn, { backgroundColor: colors.primary }]}
                onPress={() => fetchCuriosity(selectedCat)}
                activeOpacity={0.87}
              >
                <Ionicons name="sparkles" size={20} color={colors.primaryForeground} />
                <Text style={[styles.genBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
                  Nova curiosidade
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ── SAVED view ── */}
        {view === "saved" && (
          <>
            {saved.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="bookmark-outline" size={52} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  Nenhuma curiosidade salva
                </Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  Toque no ícone de marcador nas curiosidades para salvá-las aqui.
                </Text>
                <TouchableOpacity
                  onPress={() => setView("discover")}
                  style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={[{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 }]}>
                    Descobrir curiosidades
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {saved.map((item) => (
                  <CuriCard
                    key={item.id}
                    item={item}
                    saved
                    onSave={handleSave}
                    onRemove={handleRemove}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { alignItems: "center", marginBottom: 20 },
  title: { fontSize: 32, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4 },
  toggle: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  toggleLabel: { fontSize: 13 },
  catScroll: { marginHorizontal: -20, marginBottom: 20 },
  catRow: { paddingHorizontal: 20, gap: 8, flexDirection: "row" },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  catEmoji: { fontSize: 14 },
  catLabel: { fontSize: 13 },
  /* Card */
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    marginBottom: 16,
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  emojiCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emoji: { fontSize: 26 },
  cardCategory: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8 },
  cardTitle: { fontSize: 17, lineHeight: 23 },
  saveBtn: { padding: 4 },
  divider: { height: 1, marginVertical: 0 },
  factText: { fontSize: 15, lineHeight: 23 },
  whyBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  whyText: { fontSize: 13, lineHeight: 20, flex: 1 },
  tipBox: {
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  tipLabel: { fontSize: 13 },
  tipText: { fontSize: 14, lineHeight: 21 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sourceText: { fontSize: 12 },
  /* Generate button */
  genBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 8,
  },
  genBtnText: { fontSize: 16 },
  /* Error */
  errorBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  errorText: { fontSize: 15, textAlign: "center" },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  /* Empty saved */
  emptyBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 14,
    borderStyle: "dashed",
  },
  emptyTitle: { fontSize: 17, textAlign: "center" },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 20 },
});
