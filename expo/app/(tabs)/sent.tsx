import { router } from "expo-router";
import { Send as SendIcon } from "lucide-react-native";
import React, { useCallback, useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EmptyState from "@/components/EmptyState";
import FAB from "@/components/FAB";
import Header from "@/components/Header";
import PersonaSwitch from "@/components/PersonaSwitch";
import TaskCard from "@/components/TaskCard";
import { Colors } from "@/constants/colors";
import { useTasks } from "@/providers/tasks-provider";
import type { Task } from "@/types/task";

export default function SentScreen() {
  const insets = useSafeAreaInsets();
  const { sentTasks, pair, persona } = useTasks();

  const { open, closed } = useMemo(() => {
    const o: Task[] = [];
    const c: Task[] = [];
    for (const t of sentTasks) (t.completedAt ? c : o).push(t);
    c.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
    return { open: o, closed: c };
  }, [sentTasks]);

  const onCreate = useCallback(() => router.push("/new-task?to=partner"), []);

  const receiver = persona === "me" ? pair.partnerName : pair.myName;
  const totalNudges = useMemo(
    () => open.reduce((sum, t) => sum + t.nudges, 0),
    [open],
  );

  const data: (
    | { type: "header"; title: string; count: number }
    | { type: "task"; task: Task }
    | { type: "empty" }
  )[] = [];
  if (open.length === 0 && closed.length === 0) {
    data.push({ type: "empty" });
  } else {
    if (open.length > 0) {
      data.push({ type: "header", title: "Waiting", count: open.length });
      for (const t of open) data.push({ type: "task", task: t });
    }
    if (closed.length > 0) {
      data.push({ type: "header", title: "Done", count: closed.length });
      for (const t of closed.slice(0, 8)) data.push({ type: "task", task: t });
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Header
        eyebrow="Sent"
        title={`For ${receiver}`}
        subtitle={
          open.length === 0
            ? "Nothing pending — send a gentle reminder."
            : `${open.length} waiting · ${totalNudges} total poke${totalNudges === 1 ? "" : "s"}`
        }
        right={<PersonaSwitch />}
      />
      <FlatList
        data={data}
        keyExtractor={(item, i) =>
          item.type === "task" ? `s-${item.task.id}` : `${item.type}-${i}`
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
                icon={<SendIcon size={26} color={Colors.sub} strokeWidth={2} />}
                title={`Nudge ${receiver}`}
                subtitle="Send them a sweet reminder that repeats until it's done."
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
          return <TaskCard task={item.task} variant="sent" />;
        }}
        showsVerticalScrollIndicator={false}
      />
      <FAB onPress={onCreate} label={`Nudge ${receiver}`} testID="fab-sent" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
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
