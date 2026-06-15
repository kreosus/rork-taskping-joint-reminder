import * as AppleAuthentication from "expo-apple-authentication";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Facebook, Mail, Phone, ShieldCheck } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { AuthProviderType, useAuth } from "@/providers/auth-provider";

const PROVIDERS: { key: AuthProviderType; label: string; helper: string }[] = [
  { key: "google", label: "Google", helper: "Use any Gmail or Google Workspace email." },
  { key: "facebook", label: "Facebook", helper: "Use the email tied to Facebook." },
  { key: "phone", label: "Phone", helper: "Use a mobile number for SMS-style sign in." },
];

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, signup, signInWithApple, users, hydrated } = useAuth();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [provider, setProvider] = useState<AuthProviderType>("google");
  const [name, setName] = useState<string>("");
  const [identifier, setIdentifier] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [appleAvailable, setAppleAvailable] = useState<boolean>(false);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  const onApple = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(" ")
        : "";
      const result = await signInWithApple(credential.user, credential.email ?? null, fullName || null);
      if (result.ok) {
        if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/(tabs)");
      } else {
        setMessage(result.message ?? "Apple sign in could not be completed.");
      }
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code !== "ERR_REQUEST_CANCELED") {
        console.log("[auth] apple error", e);
        setMessage("Apple sign in was not completed. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }, [busy, signInWithApple]);

  const selected = useMemo(() => PROVIDERS.find((p) => p.key === provider) ?? PROVIDERS[0], [provider]);
  const placeholder = provider === "phone" ? "+1 555 123 4567" : "you@example.com";

  const submit = useCallback(async () => {
    if (busy || !hydrated) return;
    setBusy(true);
    setMessage("");
    try {
      const result = mode === "signup" ? await signup(provider, identifier, name) : await login(provider, identifier);
      if (result.ok) {
        if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/(tabs)");
      } else {
        const msg = result.message ?? "Unable to continue. Check your details and try again.";
        setMessage(msg);
        if (Platform.OS === "web") console.log("[auth] form error", msg);
        else Alert.alert("Sign in", msg);
      }
    } catch (e) {
      console.log("[auth] submit error", e);
      const msg = "Something went wrong. Please try again.";
      setMessage(msg);
      if (Platform.OS !== "web") Alert.alert("Sign in", msg);
    } finally {
      setBusy(false);
    }
  }, [busy, hydrated, mode, signup, login, provider, identifier, name]);

  return (
    <View style={styles.root} testID="login-screen">
      <LinearGradient colors={["#0F1730", "#16284A", "#FF5E4C"]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.badge}>
            <ShieldCheck size={18} color={Colors.amber} strokeWidth={2.4} />
            <Text style={styles.badgeText}>Nudge account</Text>
          </View>
          <Text style={styles.title}>{mode === "signup" ? "Create your shared reminder account" : "Welcome back"}</Text>
          <Text style={styles.subtitle}>Sign up with Google, Facebook, or phone number. Users are stored in the local app database for this Expo build.</Text>

          <View style={styles.card}>
            {appleAvailable ? (
              <View style={styles.appleWrap}>
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={16}
                  style={styles.appleButton}
                  onPress={onApple}
                />
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>
              </View>
            ) : null}

            <View style={styles.segment}>
              <Pressable onPress={() => setMode("signup")} style={[styles.segmentBtn, mode === "signup" && styles.segmentActive]} testID="mode-signup">
                <Text style={[styles.segmentText, mode === "signup" && styles.segmentTextActive]}>Sign up</Text>
              </Pressable>
              <Pressable onPress={() => setMode("login")} style={[styles.segmentBtn, mode === "login" && styles.segmentActive]} testID="mode-login">
                <Text style={[styles.segmentText, mode === "login" && styles.segmentTextActive]}>Log in</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Continue with</Text>
            <View style={styles.providerRow}>
              {PROVIDERS.map((item) => (
                <Pressable key={item.key} onPress={() => {
                  setProvider(item.key);
                  setMessage("");
                }} style={[styles.provider, provider === item.key && styles.providerActive]} testID={`provider-${item.key}`}>
                  {item.key === "google" ? <Mail size={18} color={provider === item.key ? Colors.coral : Colors.sub} /> : item.key === "facebook" ? <Facebook size={18} color={provider === item.key ? Colors.coral : Colors.sub} /> : <Phone size={18} color={provider === item.key ? Colors.coral : Colors.sub} />}
                  <Text style={[styles.providerText, provider === item.key && styles.providerTextActive]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.helper}>{selected.helper}</Text>

            {mode === "signup" ? (
              <>
                <Text style={styles.label}>Your name</Text>
                <TextInput value={name} onChangeText={setName} placeholder="Alex" placeholderTextColor={Colors.muted} style={styles.input} autoCapitalize="words" testID="input-name" />
              </>
            ) : null}

            <Text style={styles.label}>{provider === "phone" ? "Phone number" : "Email address"}</Text>
            <TextInput value={identifier} onChangeText={(value) => {
              setIdentifier(value);
              setMessage("");
            }} placeholder={placeholder} placeholderTextColor={Colors.muted} style={styles.input} autoCapitalize="none" autoCorrect={false} keyboardType={provider === "phone" ? "phone-pad" : "email-address"} textContentType={provider === "phone" ? "telephoneNumber" : "emailAddress"} testID="input-identifier" />

            {message ? <Text style={styles.error}>{message}</Text> : null}

            <Pressable onPress={submit} disabled={busy || !hydrated} style={({ pressed }) => [styles.primary, (pressed || busy || !hydrated) && { opacity: 0.82, transform: [{ scale: 0.99 }] }]} testID="auth-submit">
              <Text style={styles.primaryText}>{!hydrated ? "Loading..." : busy ? "Checking..." : mode === "signup" ? "Create account" : "Log in"}</Text>
            </Pressable>

            <View style={styles.demoBox}>
              <Text style={styles.demoTitle}>Test credentials</Text>
              <Text style={styles.demoText}>Google: demo@gmail.com</Text>
              <Text style={styles.demoText}>Facebook: demo@facebook.com</Text>
              <Text style={styles.demoText}>Phone: +15551234567</Text>
              <Text style={styles.demoText}>Local users DB: AsyncStorage key nudge.users.v1 · {users.length} users</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.navy },
  content: { flexGrow: 1, paddingHorizontal: 20, justifyContent: "center" },
  badge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.14)", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 100, marginBottom: 18 },
  badgeText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  title: { color: "#FFFFFF", fontSize: 34, lineHeight: 39, fontWeight: "900", letterSpacing: -1.1, marginBottom: 10 },
  subtitle: { color: "rgba(255,255,255,0.78)", fontSize: 15, lineHeight: 22, marginBottom: 22 },
  card: { backgroundColor: "rgba(255,255,255,0.96)", borderRadius: 28, padding: 16, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
  appleWrap: { marginBottom: 6 },
  appleButton: { height: 50, width: "100%" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16, marginBottom: 4 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Colors.line },
  dividerText: { color: Colors.sub, fontSize: 12, fontWeight: "800" },
  segment: { flexDirection: "row", backgroundColor: Colors.chipBg, borderRadius: 18, padding: 4, marginBottom: 18 },
  segmentBtn: { flex: 1, alignItems: "center", paddingVertical: 11, borderRadius: 15 },
  segmentActive: { backgroundColor: Colors.surface },
  segmentText: { color: Colors.sub, fontWeight: "800" },
  segmentTextActive: { color: Colors.ink },
  label: { color: Colors.ink, fontSize: 13, fontWeight: "800", marginBottom: 8, marginTop: 8 },
  providerRow: { flexDirection: "row", gap: 8 },
  provider: { flex: 1, minHeight: 76, borderWidth: 1, borderColor: Colors.line, borderRadius: 18, alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#FFFDF9" },
  providerActive: { borderColor: Colors.coral, backgroundColor: "#FFF1EC" },
  providerText: { fontSize: 12, fontWeight: "800", color: Colors.sub },
  providerTextActive: { color: Colors.coralDark },
  helper: { color: Colors.sub, fontSize: 12, lineHeight: 17, marginTop: 8, marginBottom: 6 },
  input: { backgroundColor: "#FFFDF9", borderWidth: 1, borderColor: Colors.line, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, color: Colors.ink, fontSize: 16, fontWeight: "700" },
  error: { marginTop: 10, color: Colors.coralDark, fontSize: 13, fontWeight: "700" },
  primary: { marginTop: 16, backgroundColor: Colors.coral, borderRadius: 18, paddingVertical: 16, alignItems: "center" },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  demoBox: { marginTop: 14, backgroundColor: Colors.chipBg, borderRadius: 18, padding: 13 },
  demoTitle: { color: Colors.ink, fontWeight: "900", marginBottom: 5 },
  demoText: { color: Colors.sub, fontSize: 12, lineHeight: 18, fontWeight: "700" },
});
