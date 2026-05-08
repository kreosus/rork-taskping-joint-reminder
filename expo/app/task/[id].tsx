import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import {
  BellRing,
  Check,
  ChevronLeft,
  RotateCcw,
  Trash2,
  Zap,
} from "lucide-react-native";
import React, { useCallback } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { useTask, useTasks } from "@/providers/tasks-provider";

function when(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today at ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} at ${time}`;
}

export default function TaskDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useTask(id);
  const { completeTask, uncompleteTask, deleteTask, nudgeTask, pair, persona } =
    useTasks();

  const back = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, []);

  const onToggle = useCallback(async () => {
    if (!task) return;
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(
        task.completedAt
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success,
      );
    }
    if (task.completedAt) await uncompleteTask(task.id);
    else await completeTask(task.id);
  }, [task, completeTask, uncompleteTask]);

  const onNudge = useCallback(async () => {
    if (!task) return;
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await nudgeTask(task.id);
  }, [task, nudgeTask]);

  const onDelete = useCallback(() => {
    if (!task) return;
    const run = async () => {
      await deleteTask(task.id);
      back();
    };
    if (Platform.OS === "web") {
      run();
      return;
    }
    Alert.alert("Delete nudge?", "This will cancel all its reminders.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: run },
    ]);
  }, [task, deleteTask, back]);

  if (!task) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 80 }]}>
        <Text style={styles.notFound}>Nudge not found.</Text>
      </View>
    );
  }

  const done = !!task.completedAt;
  const forCurrent = task.assignedTo === persona;
  const fromLabel =
    task.sentBy === task.assignedTo
      ? "from yourself"
      : forCurrent
        ? `from ${pair.partnerName}`
        : `for ${pair.partnerName}`;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={
          done
            ? ["#EFFBF3", Colors.bg]
            : task.priority === "high"
              ? ["#FFE4DE", Colors.bg]
              : ["#FFF2E6", Colors.bg]
        }
        style={[styles.hero, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.heroTopRow}>
          <Pressable
            onPress={back}
            style={styles.iconCircle}
            hitSlop={10}
            testID="back"
          >
            <ChevronLeft size={20} color={Colors.ink} strokeWidth={2.4} />
          </Pressable>
          <Pressable
            onPress={onDelete}
            style={styles.iconCircle}
            hitSlop={10}
            testID="delete"
          >
            <Trash2 size={18} color={Colors.coralDark} strokeWidth={2.2} />
          </Pressable>
        </View>

        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>
              {done ? "Completed" : task.priority === "high" ? "High priority" : "Nudging"}
            </Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{fromLabel}</Text>
          </View>
        </View>

        <Text style={styles.title}>{task.title}</Text>
        {task.note ? <Text style={styles.note}>{task.note}</Text> : null}
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 40 + insets.bottom,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRow}>
          <Stat
            icon={<BellRing size={18} color={Colors.coral} strokeWidth={2.4} />}
            label="Nag cadence"
            value={formatInterval(task.intervalMinutes)}
          />
          <Stat
            icon={<Zap size={18} color={Colors.coral} strokeWidth={2.4} />}
            label="Pokes"
            value={String(task.nudges)}
          />
        </View>

        <View style={styles.timelineCard}>
          <TimelineRow label="Created" value={when(task.createdAt)} />
          {task.lastNudgeAt ? (
            <TimelineRow label="Last poke" value={when(task.lastNudgeAt)} />
          ) : null}
          {task.completedAt ? (
            <TimelineRow
              label="Completed"
              value={when(task.completedAt)}
              positive
            />
          ) : (
            <TimelineRow
              label="Next reminder"
              value={`about every ${formatInterval(task.intervalMinutes)}`}
            />
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 14) },
        ]}
      >
        {!done && !forCurrent ? (
          <Pressable
            onPress={onNudge}
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && { opacity: 0.85 },
            ]}
            testID="detail-poke"
          >
            <Zap size={16} color={Colors.coralDark} strokeWidth={2.4} fill={Colors.coralDark} />
            <Text style={styles.secondaryText}>Poke</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={onToggle}
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
          testID="detail-toggle"
        >
          <LinearGradient
            colors={
              done
                ? [Colors.sub, "#4A4A4E"]
                : [Colors.mint, "#36A673"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryGrad}
          >
            {done ? (
              <RotateCcw size={18} color="#fff" strokeWidth={2.6} />
            ) : (
              <Check size={18} color="#fff" strokeWidth={2.8} />
            )}
            <Text style={styles.primaryText}>
              {done ? "Reopen" : "Mark done"}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

function formatInterval(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return `${h} hour${h === 1 ? "" : "s"}`;
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.stat}>
      <View style={styles.statIcon}>{icon}</View>
      <View>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

function TimelineRow({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <View style={styles.timelineRow}>
      <View
        style={[
          styles.timelineDot,
          positive && { backgroundColor: Colors.mint },
        ]}
      />
      <Text style={styles.timelineLabel}>{label}</Text>
      <Text style={styles.timelineValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  notFound: {
    textAlign: "center",
    color: Colors.sub,
    fontSize: 16,
    fontWeight: "600",
  },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 14,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
  },
  tagRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 4,
  },
  tag: {
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.ink,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: Colors.ink,
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  note: {
    fontSize: 15,
    color: Colors.sub,
    fontWeight: "500",
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  stat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFE4DE",
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.sub,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.ink,
  },
  timelineCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.coral,
  },
  timelineLabel: {
    fontSize: 13,
    color: Colors.sub,
    fontWeight: "700",
    flex: 1,
  },
  timelineValue: {
    fontSize: 13,
    color: Colors.ink,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: Colors.bg,
    borderTopColor: Colors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 100,
    backgroundColor: "#FFE4DE",
  },
  secondaryText: {
    color: Colors.coralDark,
    fontWeight: "800",
    fontSize: 15,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 100,
    overflow: "hidden",
    shadowColor: "#1A1407",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  primaryGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  primaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.2,
  },
});
