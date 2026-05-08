import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { BellRing, Check, HeartHandshake, Infinity, RotateCcw, ShieldCheck } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { usePurchases } from "@/providers/purchases-provider";

const HERO_ART = "https://r2-pub.rork.com/generated-images/a297da92-3f5c-4d4e-891d-6b58a8ad8023.png";
const LOOP_ART = "https://r2-pub.rork.com/generated-images/ed5bbbf5-394d-4366-b0f1-48352fb718b4.png";
const CROWN_ART = "https://r2-pub.rork.com/generated-images/9d36523a-daf8-41bd-b276-f4888954ecae.png";

const fallbackPlans = [
  { id: "monthly", title: "Monthly", subtitle: "Flexible premium nudging, billed monthly.", price: "$5" },
  { id: "annual", title: "Yearly", subtitle: "Best value for couples who run on reminders.", price: "$30", badge: "Save 50%" },
] as const;

export default function PremiumScreen() {
  const insets = useSafeAreaInsets();
  const {
    plans,
    isPremium,
    isLoading,
    isConfigured,
    purchasePlan,
    restorePurchases,
    isPurchasing,
    isRestoring,
  } = usePurchases();
  const [selectedId, setSelectedId] = useState<string>(plans[1]?.id ?? plans[0]?.id ?? "annual");

  const displayPlans = plans.length > 0 ? plans : fallbackPlans;
  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedId) ?? plans[0] ?? null,
    [plans, selectedId],
  );

  const onPurchase = useCallback(async () => {
    if (!selectedPlan) {
      Alert.alert("Plans loading", "Subscription plans are still loading. Try again in a moment.");
      return;
    }
    try {
      const customerInfo = await purchasePlan(selectedPlan);
      const unlocked = Boolean(customerInfo.entitlements.active.premium);
      if (unlocked) {
        if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Premium unlocked", "You can now use unlimited partner nudges.", [
          { text: "Nice", onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Purchase could not be completed.";
      if (!message.toLowerCase().includes("cancel")) {
        Alert.alert("Purchase failed", message);
      }
    }
  }, [purchasePlan, selectedPlan]);

  const onRestore = useCallback(async () => {
    try {
      const customerInfo = await restorePurchases();
      const unlocked = Boolean(customerInfo.entitlements.active.premium);
      Alert.alert(unlocked ? "Restored" : "Nothing to restore", unlocked ? "Premium is active again." : "No active Premium subscription was found.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Restore could not be completed.";
      Alert.alert("Restore failed", message);
    }
  }, [restorePurchases]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.navy, "#24334F", Colors.bg]} locations={[0, 0.52, 1]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.heroArtWrap}>
          <Image source={{ uri: HERO_ART }} style={styles.heroArt} resizeMode="contain" />
        </View>

        <View style={styles.hero}>
          <View style={styles.crownWrap}>
            <Image source={{ uri: CROWN_ART }} style={styles.crownArt} resizeMode="contain" />
          </View>
          <Text style={styles.eyebrow}>Nudge Premium</Text>
          <Text style={styles.title}>Make “I forgot” impossible.</Text>
          <Text style={styles.subtitle}>Unlimited couple reminders, stronger repeat nudges, and premium task accountability for $5/month or $30/year.</Text>
        </View>

        <View style={styles.benefitsCard}>
          <Image source={{ uri: LOOP_ART }} style={styles.loopArt} resizeMode="contain" pointerEvents="none" />
          <Benefit icon={<Infinity size={18} color={Colors.coral} strokeWidth={2.5} />} title="Unlimited active nudges" />
          <Benefit icon={<HeartHandshake size={18} color={Colors.coral} strokeWidth={2.5} />} title="Partner-powered task pushes" />
          <Benefit icon={<BellRing size={18} color={Colors.coral} strokeWidth={2.5} />} title="More persistent reminder loops" />
          <Benefit icon={<ShieldCheck size={18} color={Colors.coral} strokeWidth={2.5} />} title="Premium badge and priority support" />
        </View>

        <View style={styles.plans}>
          {displayPlans.map((plan) => {
            const selected = plan.id === selectedId;
            return (
              <Pressable
                key={plan.id}
                onPress={() => setSelectedId(plan.id)}
                style={({ pressed }) => [styles.planCard, selected && styles.planSelected, pressed && { transform: [{ scale: 0.985 }] }]}
                testID={`plan-${plan.id}`}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.planTitleRow}>
                    <Text style={styles.planTitle}>{plan.title}</Text>
                    {"badge" in plan && plan.badge ? <Text style={styles.badge}>{plan.badge}</Text> : null}
                  </View>
                  <Text style={styles.planSub}>{plan.subtitle}</Text>
                </View>
                <View style={styles.priceWrap}>
                  <Text style={styles.price}>{plan.price}</Text>
                  {selected ? <Check size={16} color="#fff" strokeWidth={3} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {!isConfigured ? <Text style={styles.notice}>RevenueCat keys are not configured in this preview yet.</Text> : null}
        {isPremium ? <Text style={styles.active}>Premium is active on this account.</Text> : null}

        <Pressable
          onPress={onPurchase}
          disabled={isPurchasing || isLoading || !isConfigured}
          style={({ pressed }) => [styles.cta, (pressed || isPurchasing) && { opacity: 0.86 }]}
          testID="purchase-premium"
        >
          {isPurchasing ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>{isPremium ? "Manage Premium" : "Start Premium"}</Text>}
        </Pressable>

        <Pressable onPress={onRestore} disabled={isRestoring || !isConfigured} style={styles.restore} testID="restore-purchases">
          <RotateCcw size={15} color={Colors.sub} strokeWidth={2.4} />
          <Text style={styles.restoreText}>{isRestoring ? "Restoring..." : "Restore purchases"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Benefit({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <View style={styles.benefit}>
      <View style={styles.benefitIcon}>{icon}</View>
      <Text style={styles.benefitText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  content: { paddingHorizontal: 20, paddingTop: 24, gap: 18 },
  hero: { paddingTop: 4, gap: 10 },
  heroArtWrap: { alignItems: "center", justifyContent: "center", marginTop: 4, marginBottom: -8 },
  heroArt: { width: "100%", height: 200 },
  crownWrap: { width: 64, height: 64, alignItems: "center", justifyContent: "center" },
  crownArt: { width: 64, height: 64 },
  loopArt: { position: "absolute", top: -22, right: -14, width: 86, height: 86, opacity: 0.95 },
  eyebrow: { color: Colors.amber, fontWeight: "900", fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase" },
  title: { color: "#fff", fontSize: 36, lineHeight: 39, fontWeight: "900", letterSpacing: -1.2 },
  subtitle: { color: "rgba(255,255,255,0.78)", fontSize: 15, lineHeight: 22, fontWeight: "600" },
  benefitsCard: { backgroundColor: "rgba(255,255,255,0.94)", borderRadius: 26, padding: 14, gap: 6, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 5 },
  benefit: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9 },
  benefitIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFE4DE", alignItems: "center", justifyContent: "center" },
  benefitText: { flex: 1, color: Colors.ink, fontSize: 15, fontWeight: "800" },
  plans: { gap: 10 },
  planCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.surface, borderRadius: 22, padding: 16, borderWidth: 2, borderColor: "transparent" },
  planSelected: { borderColor: Colors.coral, backgroundColor: "#FFF8F4" },
  planTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  planTitle: { color: Colors.ink, fontSize: 18, fontWeight: "900" },
  badge: { overflow: "hidden", color: Colors.coralDark, fontSize: 11, fontWeight: "900", backgroundColor: "#FFE4DE", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  planSub: { color: Colors.sub, fontSize: 13, lineHeight: 18, fontWeight: "600", marginTop: 3 },
  priceWrap: { minWidth: 72, minHeight: 46, borderRadius: 23, backgroundColor: Colors.navy, alignItems: "center", justifyContent: "center", gap: 4 },
  price: { color: "#fff", fontSize: 18, fontWeight: "900" },
  notice: { color: Colors.coralDark, fontSize: 13, fontWeight: "700", textAlign: "center" },
  active: { color: Colors.mint, fontSize: 13, fontWeight: "900", textAlign: "center" },
  cta: { height: 58, borderRadius: 22, backgroundColor: Colors.coral, alignItems: "center", justifyContent: "center", shadowColor: Colors.coralDark, shadowOpacity: 0.32, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 4 },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "900" },
  restore: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 7, padding: 10 },
  restoreText: { color: Colors.sub, fontSize: 13, fontWeight: "800" },
});
