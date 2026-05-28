import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useHistory, ScanRecord } from "@/context/HistoryContext";
import { HistoryItem } from "@/components/HistoryItem";

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { records, clearHistory } = useHistory();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  function handleClear() {
    Alert.alert("Limpar histórico", "Deseja apagar todas as verificações?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Apagar", style: "destructive", onPress: clearHistory },
    ]);
  }

  function handlePress(record: ScanRecord) {
    router.push({ pathname: "/result", params: { id: record.id } });
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <HistoryItem record={item} onPress={() => handlePress(item)} />
        )}
        contentContainerStyle={[
          styles.list,
          { paddingTop: topPad + 16, paddingBottom: botPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!records.length}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={[styles.heading, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Histórico
            </Text>
            {records.length > 0 && (
              <TouchableOpacity onPress={handleClear} activeOpacity={0.75}>
                <Ionicons name="trash-outline" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              Nenhuma verificação ainda
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              As análises de fatos aparecem aqui
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingHorizontal: 20 },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  heading: { fontSize: 28 },
  empty: {
    alignItems: "center",
    marginTop: 80,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, marginTop: 8 },
  emptyText: { fontSize: 14, textAlign: "center" },
});
