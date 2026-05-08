import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import {
  Bell,
  Check,
  Copy,
  Crown,
  Heart,
  HeartCrack,
  LogIn,
  LogOut,
  Pencil,
  Shield,
  Sparkles,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Header from "@/components/Header";
import { Colors } from "@/constants/colors";
import { useTasks } from "@/providers/tasks-provider";
import { usePurchases } from "@/providers/purchases-provider";
import { useAuth } from "@/providers/auth-provider";

export default function PairScreen() {
  const insets = useSafeAreaInsets();
  const { pair, generatePairCode, unpair, updatePair, persona, switchPersona } =
    useTasks();
  const { isPremium } = usePurchases();
  const { currentUser, logout } = useAuth();
  const [editingMe, setEditingMe] = useState<boolean>(false);
  const [editingPartner, setEditingPartner] = useState<boolean>(false);
  const [myName, setMyName] = useState<string>(pair.myName);
  const [partnerName, setPartnerName] = useState<string>(pair.partnerName);
  const [copied, setCopied] = useState<boolean>(false);

  const onGenerate = useCallback(async () => {
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    generatePairCode();
  }, [generatePairCode]);

  const onCopy = useCallback(async () => {
    if (!pair.pairCode) return;
    try {
      await Clipboard.setStringAsync(pair.pairCode);
      setCopied(true);
      if (Platform.OS !== "web") {
        await Haptics.selectionAsync();
      }
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.log("[pair] copy error", e);
    }
  }, [pair.pairCode]);

  const onUnpair = useCallback(() => {
    const doUnpair = () => {
      unpair();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    };
    if (Platform.OS === "web") {
      doUnpair();
      return;
    }
    Alert.alert("Unpair?", "Your tasks will stay on this device.", [
      { text: "Cancel", style: "cancel" },
      { text: "Unpair", style: "destructive", onPress: doUnpair },
    ]);
  }, [unpair]);

  const saveMyName = useCallback(() => {
    updatePair({ myName: myName.trim() || "You" });
    setEditingMe(false);
  }, [myName, updatePair]);

  const savePartnerName = useCallback(() => {
    updatePair({ partnerName: partnerName.trim() || "Partner" });
    setEditingPartner(false);
  }, [partnerName, updatePair]);

  const isPaired = !!pair.pairCode;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 48,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Header
        eyebrow="Pair"
        title="You & them"
        subtitle="Link up to send nudges that nag until done."
      />

      <View style={styles.heroWrap}>
        <LinearGradient
          colors={[Colors.coral, "#FF8A5C", Colors.amber]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroRow}>
            <View style={[styles.bubble, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
              <Text style={styles.bubbleInitial}>
                {(pair.myName || "Y").slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={styles.heart}>
              <Heart size={20} color="#fff" fill="#fff" strokeWidth={0} />
            </View>
            <View style={[styles.bubble, { backgroundColor: "rgba(15,23,48,0.25)" }]}>
              <Text style={styles.bubbleInitial}>
                {(pair.partnerName || "P").slice(0, 1).toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>
            {isPaired ? "You're paired" : "Get paired"}
          </Text>
          <Text style={styles.heroSub}>
            {isPaired
              ? "Share the code below with your partner on their device."
              : "Generate a code so you two can send each other gentle reminders."}
          </Text>

          {isPaired ? (
            <Pressable
              onPress={onCopy}
              style={({ pressed }) => [
                styles.codeWrap,
                pressed && { opacity: 0.85 },
              ]}
              testID="copy-code"
            >
              <Text style={styles.code}>{pair.pairCode}</Text>
              <View style={styles.copyIcon}>
                {copied ? (
                  <Check size={16} color="#fff" strokeWidth={2.6} />
                ) : (
                  <Copy size={16} color="#fff" strokeWidth={2.4} />
                )}
              </View>
            </Pressable>
          ) : (
            <Pressable
              onPress={onGenerate}
              style={({ pressed }) => [
                styles.genBtn,
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
              testID="generate-code"
            >
              <Sparkles size={16} color={Colors.coralDark} strokeWidth={2.6} />
              <Text style={styles.genText}>Generate pair code</Text>
            </Pressable>
          )}
        </LinearGradient>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <View style={[styles.avatar, { backgroundColor: Colors.navy }]}> 
            <Shield size={18} color="#FFFFFF" strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>{currentUser ? `${currentUser.provider} account` : "Not signed in"}</Text>
            <Text style={styles.cardName}>{currentUser ? `${currentUser.name} · ${currentUser.identifier}` : "Create a Google, Facebook, or phone account"}</Text>
          </View>
          <Pressable
            onPress={() => {
              if (currentUser) logout();
              else router.push("/login");
            }}
            style={styles.iconBtn}
            hitSlop={10}
            testID={currentUser ? "logout" : "open-login"}
          >
            {currentUser ? <LogOut size={18} color={Colors.sub} strokeWidth={2.2} /> : <LogIn size={18} color={Colors.coral} strokeWidth={2.4} />}
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>People</Text>

        <View style={styles.card}>
          <View style={[styles.avatar, { backgroundColor: Colors.coral }]}>
            <Text style={styles.avatarText}>
              {(pair.myName || "Y").slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>You</Text>
            {editingMe ? (
              <TextInput
                value={myName}
                onChangeText={setMyName}
                onBlur={saveMyName}
                onSubmitEditing={saveMyName}
                autoFocus
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={Colors.muted}
                testID="input-my-name"
              />
            ) : (
              <Text style={styles.cardName}>{pair.myName}</Text>
            )}
          </View>
          <Pressable
            onPress={() => {
              if (editingMe) saveMyName();
              else setEditingMe(true);
            }}
            style={styles.iconBtn}
            hitSlop={10}
          >
            {editingMe ? (
              <Check size={18} color={Colors.ink} strokeWidth={2.4} />
            ) : (
              <Pencil size={16} color={Colors.sub} strokeWidth={2.2} />
            )}
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={[styles.avatar, { backgroundColor: Colors.sky }]}>
            <Text style={styles.avatarText}>
              {(pair.partnerName || "P").slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>Partner</Text>
            {editingPartner ? (
              <TextInput
                value={partnerName}
                onChangeText={setPartnerName}
                onBlur={savePartnerName}
                onSubmitEditing={savePartnerName}
                autoFocus
                style={styles.input}
                placeholder="Their name"
                placeholderTextColor={Colors.muted}
                testID="input-partner-name"
              />
            ) : (
              <Text style={styles.cardName}>{pair.partnerName}</Text>
            )}
          </View>
          <Pressable
            onPress={() => {
              if (editingPartner) savePartnerName();
              else setEditingPartner(true);
            }}
            style={styles.iconBtn}
            hitSlop={10}
          >
            {editingPartner ? (
              <Check size={18} color={Colors.ink} strokeWidth={2.4} />
            ) : (
              <Pencil size={16} color={Colors.sub} strokeWidth={2.2} />
            )}
          </Pressable>
        </View>

        <Pressable
          onPress={switchPersona}
          style={({ pressed }) => [
            styles.card,
            styles.switchCard,
            pressed && { opacity: 0.85 },
          ]}
          testID="switch-persona"
        >
          <View style={[styles.avatar, { backgroundColor: Colors.chipBg }]}>
            <Shield size={18} color={Colors.sub} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>Preview mode</Text>
            <Text style={styles.cardName}>
              Viewing as {persona === "me" ? pair.myName : pair.partnerName}
            </Text>
          </View>
          <Text style={styles.switchLink}>Swap</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Pressable
          onPress={() => router.push("/premium")}
          style={({ pressed }) => [styles.premiumCard, pressed && { transform: [{ scale: 0.99 }] }]}
          testID="open-premium"
        >
          <LinearGradient
            colors={[Colors.navy, "#24334F"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.premiumGradient}
          >
            <View style={styles.premiumIcon}>
              <Crown size={18} color={Colors.amber} fill={Colors.amber} strokeWidth={1.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.premiumTitle}>{isPremium ? "Premium active" : "Upgrade your nudges"}</Text>
              <Text style={styles.premiumBody}>Unlimited partner task pushes plus stronger reminder loops.</Text>
            </View>
            <Text style={styles.premiumPrice}>{isPremium ? "On" : "$5/mo"}</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>How it works</Text>
        <View style={styles.infoCard}>
          <Row
            icon={<Bell size={16} color={Colors.coral} strokeWidth={2.4} />}
            title="Repeating reminders"
            body="Each nudge schedules up to 10 gentle notifications until it's marked done."
          />
          <Divider />
          <Row
            icon={<Sparkles size={16} color={Colors.coral} strokeWidth={2.4} />}
            title="Poke to nag more"
            body="Tap Poke on a sent task to fire an extra reminder right now."
          />
          <Divider />
          <Row
            icon={<Heart size={16} color={Colors.coral} strokeWidth={2.4} />}
            title="Stay on the same page"
            body="Paired devices see each other's tasks and can both mark them done."
          />
        </View>
      </View>

      {isPaired ? (
        <View style={styles.section}>
          <Pressable
            onPress={onUnpair}
            style={({ pressed }) => [
              styles.unpair,
              pressed && { opacity: 0.8 },
            ]}
            testID="unpair"
          >
            <HeartCrack size={16} color={Colors.coralDark} strokeWidth={2.4} />
            <Text style={styles.unpairText}>Unpair</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

function Row({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowBody}>{body}</Text>
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  heroWrap: {
    paddingHorizontal: 20,
  },
  hero: {
    borderRadius: 28,
    padding: 22,
    gap: 12,
    shadowColor: Colors.coralDark,
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  bubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.45)",
  },
  bubbleInitial: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
  },
  heart: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.4,
  },
  heroSub: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 19,
  },
  codeWrap: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 10,
    backgroundColor: "rgba(15,23,48,0.22)",
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 10,
    borderRadius: 100,
  },
  code: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 8,
    fontVariant: ["tabular-nums"],
  },
  copyIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  genBtn: {
    marginTop: 4,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 100,
  },
  genText: {
    color: Colors.coralDark,
    fontWeight: "800",
    fontSize: 14,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.sub,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
    marginLeft: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
  },
  switchCard: {},
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  cardLabel: {
    fontSize: 11,
    color: Colors.sub,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  cardName: {
    fontSize: 16,
    color: Colors.ink,
    fontWeight: "700",
  },
  input: {
    fontSize: 16,
    color: Colors.ink,
    fontWeight: "700",
    paddingVertical: 2,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.chipBg,
    alignItems: "center",
    justifyContent: "center",
  },
  switchLink: {
    color: Colors.coral,
    fontWeight: "800",
    fontSize: 13,
    marginRight: 8,
  },
  premiumCard: {
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: Colors.navy,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 3,
  },
  premiumGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  premiumIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,176,32,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  premiumTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  premiumBody: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    marginTop: 2,
  },
  premiumPrice: {
    color: Colors.amber,
    fontWeight: "900",
    fontSize: 14,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
  },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFE4DE",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.ink,
  },
  rowBody: {
    fontSize: 13,
    color: Colors.sub,
    lineHeight: 18,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.line,
    marginLeft: 40,
  },
  unpair: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: "#FFE4DE",
  },
  unpairText: {
    color: Colors.coralDark,
    fontWeight: "800",
    fontSize: 14,
  },
});
