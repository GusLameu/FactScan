import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

interface QRScannerProps {
  onDetected: (url: string) => void;
  loading: boolean;
}

/* ─── Web QR scanner (getUserMedia + jsQR) ─────────────────────────────── */
function WebQRScanner({ onDetected, loading }: QRScannerProps) {
  const colors = useColors();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cooldownRef = useRef(false);
  const [camState, setCamState] = useState<"idle" | "requesting" | "active" | "denied" | "unsupported">("idle");
  const [scanned, setScanned] = useState(false);
  const [manualUrl, setManualUrl] = useState("");

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const tick = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    if (!cooldownRef.current && !loading) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      try {
        const jsQR = (await import("jsqr")).default;
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code?.data) {
          cooldownRef.current = true;
          setScanned(true);
          onDetected(code.data);
          setTimeout(() => {
            cooldownRef.current = false;
            setScanned(false);
          }, 3000);
          return;
        }
      } catch {
        /* jsQR parse error — keep scanning */
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [loading, onDetected]);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamState("unsupported");
      return;
    }
    setCamState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamState("active");
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setCamState("denied");
    }
  }, [tick]);

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, [startCamera, stopCamera]);

  function handleManualSubmit() {
    if (!manualUrl.trim()) return;
    onDetected(manualUrl.trim());
  }

  /* Camera denied or unsupported → text fallback */
  if (camState === "denied" || camState === "unsupported") {
    return (
      <View style={styles.webFallback}>
        <View style={[styles.webBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="camera-outline" size={40} color={colors.mutedForeground} />
          <Text style={[styles.webTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            {camState === "denied" ? "Câmera bloqueada" : "Câmera não disponível"}
          </Text>
          <Text style={[styles.webSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {camState === "denied"
              ? "Permita o acesso à câmera nas configurações do browser"
              : "Cole a URL do QR code manualmente"}
          </Text>
          <View style={[styles.webInputRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <TextInput
              style={[styles.webInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
              placeholder="https://..."
              placeholderTextColor={colors.mutedForeground}
              value={manualUrl}
              onChangeText={setManualUrl}
              autoCapitalize="none"
              keyboardType="url"
              onSubmitEditing={handleManualSubmit}
              returnKeyType="done"
            />
          </View>
          <Pressable
            onPress={handleManualSubmit}
            disabled={loading || !manualUrl.trim()}
            style={[styles.webBtn, { backgroundColor: manualUrl.trim() ? colors.primary : colors.secondary, opacity: manualUrl.trim() ? 1 : 0.5 }]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <>
                <Ionicons name="shield-checkmark-outline" size={18} color={manualUrl.trim() ? colors.primaryForeground : colors.mutedForeground} />
                <Text style={[styles.webBtnText, { color: manualUrl.trim() ? colors.primaryForeground : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                  Verificar
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  /* Loading / requesting state */
  if (camState === "idle" || camState === "requesting") {
    return (
      <View style={[styles.centered, { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.permSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Iniciando câmera…
        </Text>
      </View>
    );
  }

  /* Active camera */
  const CORNER_COLOR = scanned ? "#34D399" : colors.primary;
  return (
    <View style={styles.scannerContainer}>
      {/* Native video element rendered via dangerouslySetInnerHTML approach via ref */}
      <video
        ref={videoRef as React.RefObject<HTMLVideoElement>}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" } as React.CSSProperties}
        playsInline
        muted
        autoPlay
      />
      <canvas ref={canvasRef as React.RefObject<HTMLCanvasElement>} style={{ display: "none" } as React.CSSProperties} />

      {/* Dark overlay with viewfinder cutout */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {/* Top */}
        <View style={[styles.overlayEdge, { backgroundColor: "rgba(10,22,40,0.72)" }]} />
        {/* Middle */}
        <View style={styles.overlayMiddle}>
          <View style={{ flex: 1, backgroundColor: "rgba(10,22,40,0.72)" }} />
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.cornerTL, { borderColor: CORNER_COLOR }]} />
            <View style={[styles.corner, styles.cornerTR, { borderColor: CORNER_COLOR }]} />
            <View style={[styles.corner, styles.cornerBL, { borderColor: CORNER_COLOR }]} />
            <View style={[styles.corner, styles.cornerBR, { borderColor: CORNER_COLOR }]} />
            {loading ? (
              <View style={[styles.statusBadge, { backgroundColor: "rgba(10,22,40,0.85)" }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.statusText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Verificando…</Text>
              </View>
            ) : scanned ? (
              <View style={[styles.statusBadge, { backgroundColor: "rgba(10,22,40,0.85)" }]}>
                <Ionicons name="checkmark-circle" size={18} color="#34D399" />
                <Text style={[styles.statusText, { color: "#34D399", fontFamily: "Inter_500Medium" }]}>Lido!</Text>
              </View>
            ) : null}
          </View>
          <View style={{ flex: 1, backgroundColor: "rgba(10,22,40,0.72)" }} />
        </View>
        {/* Bottom */}
        <View style={[styles.overlayEdge, { backgroundColor: "rgba(10,22,40,0.72)", justifyContent: "center" }]}>
          <Text style={[styles.hint, { color: "#fff", fontFamily: "Inter_400Regular" }]}>
            Aponte a câmera para um QR Code
          </Text>
        </View>
      </View>
    </View>
  );
}

/* ─── Native QR scanner (expo-camera CameraView) ────────────────────────── */
export function QRScanner({ onDetected, loading }: QRScannerProps) {
  const colors = useColors();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const cooldownRef = useRef(false);

  if (Platform.OS === "web") {
    return <WebQRScanner onDetected={onDetected} loading={loading} />;
  }

  function handleBarcode({ data }: { data: string }) {
    if (cooldownRef.current || loading) return;
    cooldownRef.current = true;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onDetected(data);
    setTimeout(() => {
      cooldownRef.current = false;
      setScanned(false);
    }, 3000);
  }

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, padding: 28 }]}>
        <Ionicons name="camera-outline" size={48} color={colors.mutedForeground} />
        <Text style={[styles.permTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          Câmera bloqueada
        </Text>
        <Text style={[styles.permSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Permita o acesso à câmera para escanear QR codes ao vivo
        </Text>
        <Pressable onPress={requestPermission} style={[styles.permBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="camera-outline" size={18} color={colors.primaryForeground} />
          <Text style={[styles.permBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
            Permitir câmera
          </Text>
        </Pressable>
      </View>
    );
  }

  const CORNER_COLOR = scanned ? "#34D399" : colors.primary;
  return (
    <View style={styles.scannerContainer}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned || loading ? undefined : handleBarcode}
      >
        <View style={styles.overlay}>
          <View style={[styles.overlayEdge, { backgroundColor: "rgba(10,22,40,0.72)" }]} />
          <View style={styles.overlayMiddle}>
            <View style={[styles.overlayEdge, { backgroundColor: "rgba(10,22,40,0.72)" }]} />
            <View style={styles.viewfinder}>
              <View style={[styles.corner, styles.cornerTL, { borderColor: CORNER_COLOR }]} />
              <View style={[styles.corner, styles.cornerTR, { borderColor: CORNER_COLOR }]} />
              <View style={[styles.corner, styles.cornerBL, { borderColor: CORNER_COLOR }]} />
              <View style={[styles.corner, styles.cornerBR, { borderColor: CORNER_COLOR }]} />
              {loading ? (
                <View style={[styles.statusBadge, { backgroundColor: "rgba(10,22,40,0.85)" }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.statusText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>Verificando…</Text>
                </View>
              ) : scanned ? (
                <View style={[styles.statusBadge, { backgroundColor: "rgba(10,22,40,0.85)" }]}>
                  <Ionicons name="checkmark-circle" size={18} color="#34D399" />
                  <Text style={[styles.statusText, { color: "#34D399", fontFamily: "Inter_500Medium" }]}>Lido!</Text>
                </View>
              ) : null}
            </View>
            <View style={[styles.overlayEdge, { backgroundColor: "rgba(10,22,40,0.72)" }]} />
          </View>
          <View style={[styles.overlayEdge, { backgroundColor: "rgba(10,22,40,0.72)", justifyContent: "center" }]}>
            <Text style={[styles.hint, { color: "#fff", fontFamily: "Inter_400Regular" }]}>
              Aponte para um QR Code para verificar automaticamente
            </Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const VIEWFINDER = 240;
const CORNER = 24;
const CORNER_BORDER = 3;

const styles = StyleSheet.create({
  scannerContainer: { height: 380, borderRadius: 16, overflow: "hidden" },
  camera: { flex: 1 },
  overlay: { flex: 1, flexDirection: "column" },
  overlayEdge: { flex: 1, alignItems: "center", paddingBottom: 14 },
  overlayMiddle: { flexDirection: "row", height: VIEWFINDER },
  viewfinder: { width: VIEWFINDER, height: VIEWFINDER, alignItems: "center", justifyContent: "center" },
  corner: { position: "absolute", width: CORNER, height: CORNER, borderWidth: CORNER_BORDER },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  statusText: { fontSize: 14 },
  hint: { fontSize: 13, textAlign: "center", paddingHorizontal: 20, opacity: 0.9 },
  centered: { height: 300, alignItems: "center", justifyContent: "center", gap: 14, padding: 24 },
  permTitle: { fontSize: 17, marginTop: 8, textAlign: "center" },
  permSub: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  permBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  permBtnText: { fontSize: 15 },
  webFallback: { gap: 0 },
  webBox: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", gap: 12 },
  webTitle: { fontSize: 17 },
  webSub: { fontSize: 13, textAlign: "center" },
  webInputRow: { width: "100%", borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  webInput: { fontSize: 14, width: "100%" },
  webBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 13, borderRadius: 12, marginTop: 2, width: "100%", justifyContent: "center" },
  webBtnText: { fontSize: 15 },
});
