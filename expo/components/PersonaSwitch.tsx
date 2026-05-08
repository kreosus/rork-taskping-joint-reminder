import * as Haptics from "expo-haptics";
import { ArrowLeftRight } from "lucide-react-native";
import React, { useCallback } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import { useTasks } from "@/providers/tasks-provider";

export default function PersonaSwitch() {
  const { persona, pair, switchPersona } = useTasks();

  const handlePress = useCallback(async () => {
    if (Platform.OS !== "web") {
      await Haptics.selectionAsync();
    }
    await switchPersona();
  }, [switchPersona]);

  const name = persona === "me" ? pair.myName : pair.partnerName;
  const initial = (name || "?").slice(0, 1).toUpperCase();

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.75 }]}
      testID="persona-switch"
    >
      <View
        style={[
          styles.avatar,
          { backgroundColor: persona === "me" ? Colors.coral : Colors.sky },
        ]}
      >
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>Viewing as</Text>
        <Text style={styles.name}>{name}</Text>
      </View>
      <View style={styles.swap}>
        <ArrowLeftRight size={14} color={Colors.sub} strokeWidth={2.3} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    alignSelf: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
  label: {
    fontSize: 10,
    color: Colors.sub,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  name: {
    fontSize: 14,
    color: Colors.ink,
    fontWeight: "700",
  },
  swap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.chipBg,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
});
