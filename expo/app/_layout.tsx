import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import RewardCelebration from "@/components/RewardCelebration";
import { TasksProvider } from "@/providers/tasks-provider";
import { PurchasesProvider } from "@/providers/purchases-provider";
import { RewardsProvider } from "@/providers/rewards-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { Colors } from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: Colors.bg },
        headerTitleStyle: { color: Colors.ink, fontWeight: "700" },
        headerTintColor: Colors.ink,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="new-task"
        options={{
          presentation: "modal",
          title: "New Nudge",
          headerStyle: { backgroundColor: Colors.bg },
        }}
      />
      <Stack.Screen
        name="task/[id]"
        options={{
          title: "",
          headerTransparent: true,
        }}
      />
      <Stack.Screen
        name="premium"
        options={{
          presentation: "modal",
          title: "Nudge Premium",
          headerStyle: { backgroundColor: Colors.navy },
          headerTitleStyle: { color: "#FFFFFF", fontWeight: "800" },
          headerTintColor: "#FFFFFF",
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.bg }}>
          <AuthProvider>
            <PurchasesProvider>
              <RewardsProvider>
                <TasksProvider>
                  <StatusBar style="dark" />
                  <RootLayoutNav />
                  <RewardCelebration />
                </TasksProvider>
              </RewardsProvider>
            </PurchasesProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
