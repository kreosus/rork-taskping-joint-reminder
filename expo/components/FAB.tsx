import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Plus } from "lucide-react-native";
import React, { useCallback } from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";

import { Colors } from "@/constants/colors";

interface Props {
  onPress: () => void;
  label?: string;
  testID?: string;
}

export default function FAB({ onPress, label = "New nudge", testID }: Props) {
  const handle = useCallback(async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  }, [onPress]);

  return (
    <Pressable
      onPress={handle}
      style={({ pressed }) => [
        styles.wrap,
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
      testID={testID ?? "fab"}
    >
      <LinearGradient
        colors={[Colors.coral, Colors.coralDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.grad}
      >
        <Plus size={20} color="#fff" strokeWidth={2.8} />
        <Text style={styles.label}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 20,
    bottom: 24,
    borderRadius: 100,
    shadowColor: Colors.coralDark,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  grad: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 100,
  },
  label: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
