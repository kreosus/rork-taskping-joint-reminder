import { Tabs } from "expo-router";
import { Heart, Inbox, Pill, Send, Trophy } from "lucide-react-native";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

import { Colors } from "@/constants/colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.coral,
        tabBarInactiveTintColor: Colors.muted,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.line,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === "ios" ? 84 : 64,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          letterSpacing: 0.3,
        },
        tabBarBackground: () => (
          <View style={{ flex: 1, backgroundColor: Colors.surface }} />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color, size }) => (
            <Inbox color={color} size={size ?? 22} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="sent"
        options={{
          title: "Sent",
          tabBarIcon: ({ color, size }) => (
            <Send color={color} size={size ?? 22} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="meds"
        options={{
          title: "Meds",
          tabBarIcon: ({ color, size }) => (
            <Pill color={color} size={size ?? 22} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: "Rewards",
          tabBarIcon: ({ color, size }) => (
            <Trophy color={color} size={size ?? 22} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="pair"
        options={{
          title: "Pair",
          tabBarIcon: ({ color, size }) => (
            <Heart color={color} size={size ?? 22} strokeWidth={2.2} />
          ),
        }}
      />
    </Tabs>
  );
}
