import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  BellRing,
  Check,
  ChevronRight,
  Zap,
} from "lucide-react-native";
import React, { useCallback } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import { timeAgo, intervalLabel } from "@/lib/taskUtils";
import { useTasks } from "@/providers/tasks-provider";
import type { Task } from "@/types/task";

interface Props {
  task: Task;
  variant: "inbox" | "sent";
}

export default function TaskCard({ task, variant }: Props) {
  const { completeTask, uncompleteTask, nudgeTask, pair } = useTasks();
  const done = !!task.completedAt;

  const handleToggle = useCallback(async () => {
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(
        done
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success,
      );
    }
    if (done) {
      await uncompleteTask(task.id);
    } else {
      await completeTask(task.id);
    }
  }, [done, task.id, completeTask, uncompleteTask]);

  const handleNudge = useCallback(async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await nudgeTask(task.id);
  }, [nudgeTask, task.id]);

  const handleOpen = useCallback(() => {
    router.push(`/task/${task.id}`);
  }, [task.id]);

  const fromLabel =
    task.sentBy === task.assignedTo
      ? "From you"
      : variant === "inbox"
        ? `From ${pair.partnerName}`
        : `For ${pair.partnerName}`;

  return (
    <Pressable
      onPress={handleOpen}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        done && styles.cardDone,
      ]}
      testID={`task-card-${task.id}`}
    >
      <Pressable
        onPress={handleToggle}
        hitSlop={10}
        style={styles.checkWrap}
        testID={`task-toggle-${task.id}`}
      >
        {done ? (
          <LinearGradient
            colors={[Colors.mint, "#36A673"]}
            style={styles.checkOn}
          >
            <Check color="#fff" size={16} strokeWidth={3} />
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.checkOff,
              task.priority === "high" && { borderColor: Colors.coral },
            ]}
          />
        )}
      </Pressable>

      <View style={styles.body}>
        <Text
          style={[styles.title, done && styles.titleDone]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.chip}>
            <BellRing size={11} color={Colors.sub} strokeWidth={2.3} />
            <Text style={styles.chipText}>
              {intervalLabel(task.intervalMinutes)}
            </Text>
          </View>
          {task.nudges > 0 ? (
            <View style={[styles.chip, styles.chipAmber]}>
              <Zap size={11} color={Colors.coralDark} strokeWidth={2.5} />
              <Text style={[styles.chipText, { color: Colors.coralDark }]}>
                {task.nudges} nudge{task.nudges === 1 ? "" : "s"}
              </Text>
            </View>
          ) : null}
          <Text style={styles.dot}>·</Text>
          <Text style={styles.metaText}>{fromLabel}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.metaText}>{timeAgo(task.createdAt)}</Text>
        </View>
      </View>

      {variant === "sent" && !done ? (
        <Pressable
          onPress={handleNudge}
          style={({ pressed }) => [
            styles.nudgeBtn,
            pressed && { transform: [{ scale: 0.96 }] },
          ]}
          testID={`task-nudge-${task.id}`}
        >
          <LinearGradient
            colors={[Colors.coral, Colors.coralDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.nudgeGrad}
          >
            <Zap size={14} color="#fff" strokeWidth={2.6} fill="#fff" />
            <Text style={styles.nudgeText}>Poke</Text>
          </LinearGradient>
        </Pressable>
      ) : (
        <ChevronRight size={18} color={Colors.muted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    shadowColor: "#1A1407",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.995 }],
  },
  cardDone: {
    backgroundColor: "#F6F1E4",
  },
  checkWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOff: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.muted,
    backgroundColor: "transparent",
  },
  checkOn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.ink,
    letterSpacing: -0.2,
  },
  titleDone: {
    textDecorationLine: "line-through",
    color: Colors.sub,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.chipBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  chipAmber: {
    backgroundColor: "#FFE4DE",
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.sub,
  },
  dot: { color: Colors.muted, fontSize: 12 },
  metaText: {
    fontSize: 12,
    color: Colors.sub,
    fontWeight: "500",
  },
  nudgeBtn: {
    borderRadius: 100,
    overflow: "hidden",
  },
  nudgeGrad: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  nudgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
