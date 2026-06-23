import * as Haptics from "expo-haptics";
import { PartyPopper, Sparkles, Trophy } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { ACHIEVEMENTS } from "@/constants/achievements";
import { Colors } from "@/constants/colors";
import { useRewards } from "@/providers/rewards-provider";

export default function RewardCelebration() {
  const { celebrations, dismissCelebration } = useRewards();
  const current = celebrations[0];
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!current) return;
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    scale.setValue(0.8);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 90 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [current, scale, opacity]);

  if (!current) return null;

  const achievement = current.kind === "achievement" ? ACHIEVEMENTS.find((a) => a.id === current.achievementId) : undefined;
  const Icon = current.kind === "level" ? Trophy : achievement?.icon ?? PartyPopper;
  const tint = current.kind === "level" ? Colors.amber : achievement?.tint ?? Colors.coral;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={dismissCelebration}>
      <Pressable style={styles.backdrop} onPress={dismissCelebration}>
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <View style={styles.sparkleRow}>
            <Sparkles size={18} color={Colors.amber} strokeWidth={2.4} />
            <Text style={styles.eyebrow}>{current.kind === "level" ? "Level Up" : "Achievement Unlocked"}</Text>
            <Sparkles size={18} color={Colors.amber} strokeWidth={2.4} />
          </View>
          <View style={[styles.badge, { backgroundColor: `${tint}1A`, borderColor: `${tint}33` }]}>
            <Icon size={42} color={tint} strokeWidth={2.2} />
          </View>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.message}>{current.message}</Text>
          <Pressable style={styles.button} onPress={dismissCelebration} testID="celebration-dismiss">
            <Text style={styles.buttonText}>Nice!</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,48,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: Colors.surface,
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  sparkleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.amber,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  badge: {
    width: 96,
    height: 96,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.ink,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: Colors.sub,
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "500",
  },
  button: {
    marginTop: 8,
    backgroundColor: Colors.coral,
    paddingHorizontal: 36,
    paddingVertical: 13,
    borderRadius: 100,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
