import { router } from "expo-router";
import { BellOff } from "lucide-react-native";
import React, { useCallback } from "react";
import {
  FlatList,
  ListRenderItem,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EmptyState from "@/components/EmptyState";
import FAB from "@/components/FAB";
import Header from "@/components/Header";
import PersonaSwitch from "@/components/PersonaSwitch";
import TaskCard from "@/components/TaskCard";
import { Colors } from "@/constants/colors";
import { useTasks } from "@/providers/tasks-provider";
import type { Task } from "@/types/task";

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const { activeInbox, completedInbox, pair, persona } = useTasks();

  const renderItem: ListRenderItem<Task> = useCallback(
    ({ item }) => <TaskCard task={item} variant="inbox" />,
    [],
  );

  const onCreate = useCallback(() => router.push("/new-task"), []);

  const totalActive = activeInbox.length;
  const subtitle =
    persona === "me"
      ? totalActive === 0
        ? `All clear${pair.pairCode ? `, ${pair.partnerName} sees it too` : ""}.`
        : `${totalActive} thing${totalActive === 1 ? "" : "s"} nudging you.`
      : totalActive === 0
        ? "No reminders waiting."
        : `${totalActive} waiting for ${pair.partnerName}.`;

  const sections: { key: string; data: Task[] }[] = [
    { key: "active", data: activeInbox },
    { key: "done", data: completedInbox.slice(0, 8) },
  ];

  const flatData: (
    | { type: "header"; title: string; count: number }
    | { type: "task"; task: Task }
    | { type: "empty" }
  )[] = [];
  if (sections[0].data.length === 0) {
    flatData.push({ type: "empty" });
  } else {
    flatData.push({ type: "header", title: "Active", count: sections[0].data.length });
    for (const t of sections[0].data) flatData.push({ type: "task", task: t });
  }
  if (sections[1].data.length > 0) {
    flatData.push({
      type: "header",
      title: "Recently completed",
      count: sections[1].data.length,
    });
    for (const t of sections[1].data) flatData.push({ type: "task", task: t });
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Header
        eyebrow="Inbox"
        title="Your nudges"
        subtitle={subtitle}
        right={<PersonaSwitch />}
      />
      <FlatList
        data={flatData}
        keyExtractor={(item, i) =>
          item.type === "task" ? item.task.id : `${item.type}-${i}`
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 140 + insets.bottom,
          gap: 10,
        }}
        renderItem={({ item }) => {
          if (item.type === "empty") {
            return (
              <EmptyState
                icon={<BellOff size={26} color={Colors.sub} strokeWidth={2} />}
                title="No nudges right now"
                subtitle={`Tap + to remind yourself — or ask ${pair.partnerName} to send you one.`}
              />
            );
          }
          if (item.type === "header") {
            return (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{item.title}</Text>
                <View style={styles.countPill}>
                  <Text style={styles.countText}>{item.count}</Text>
                </View>
              </View>
            );
          }
          return renderItem({ item: item.task, index: 0, separators: {} as never });
        }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} tintColor={Colors.coral} />}
        showsVerticalScrollIndicator={false}
      />
      <FAB onPress={onCreate} testID="fab-new-task" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 10,
    paddingBottom: 4,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.sub,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  countPill: {
    backgroundColor: Colors.chipBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  countText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.sub,
  },
});
