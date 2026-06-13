import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { BellRing, Crown, Flame, Lock, Send, User } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { FREE_LIMITS } from "@/providers/purchases-provider";
import { usePurchases } from "@/providers/purchases-provider";
import { useTasks } from "@/providers/tasks-provider";
import {
  INTERVAL_OPTIONS,
  PRIORITY_OPTIONS,
  type ReminderInterval,
  type TaskPriority,
} from "@/types/task";

export default function NewTaskScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ to?: string }>();
  const { addTask, pair, persona, activeInbox, sentTasks } = useTasks();
  const { isPremium } = usePurchases();

  const defaultTo: "me" | "partner" =
    params?.to === "partner" ? "partner" : "me";
  const [title, setTitle] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [interval, setInterval] = useState<ReminderInterval>(30);
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [assignedTo, setAssignedTo] = useState<"me" | "partner">(defaultTo);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const activeSelfCount = useMemo(
    () => activeInbox.filter((t) => t.sentBy === persona && t.assignedTo === persona).length,
    [activeInbox, persona],
  );
  const activePartnerCount = useMemo(
    () => sentTasks.filter((t) => !t.completedAt).length,
    [sentTasks],
  );

  const visibleIntervals = useMemo(
    () => isPremium ? INTERVAL_OPTIONS : INTERVAL_OPTIONS.filter((o) => o.value !== 15),
    [isPremium],
  );

  const meLabel = persona === "me" ? pair.myName : pair.partnerName;
  const themLabel = persona === "me" ? pair.partnerName : pair.myName;

  const canSave = useMemo(() => title.trim().length >= 2, [title]);

  const handleSave = useCallback(async () => {
    if (!canSave || submitting) return;

    if (!isPremium) {
      if (assignedTo === "me" && activeSelfCount >= FREE_LIMITS.selfTasks) {
        Alert.alert(
          "Free limit reached",
          `You can have up to ${FREE_LIMITS.selfTasks} active nudges on the free plan. Upgrade to Premium for unlimited.`,
          [
            { text: "Not now", style: "cancel" },
            { text: "Upgrade", onPress: () => router.push("/premium") },
          ],
        );
        return;
      }
      if (assignedTo === "partner" && activePartnerCount >= FREE_LIMITS.partnerTasks) {
        Alert.alert(
          "Free limit reached",
          `You can send up to ${FREE_LIMITS.partnerTasks} active partner nudges on the free plan. Upgrade to Premium for unlimited.`,
          [
            { text: "Not now", style: "cancel" },
            { text: "Upgrade", onPress: () => router.push("/premium") },
          ],
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }
      await addTask({
        title,
        note,
        intervalMinutes: interval,
        priority,
        assignedTo,
        notificationCount: isPremium ? 10 : FREE_LIMITS.notificationRepeats,
      });
      router.back();
    } catch (e) {
      console.log("[new-task] save error", e);
      setSubmitting(false);
    }
  }, [addTask, title, note, interval, priority, assignedTo, canSave, submitting, isPremium, activeSelfCount, activePartnerCount]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 40 + insets.bottom,
          gap: 20,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputWrap}>
          <Text style={styles.label}>What needs doing?</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Take out the trash"
            placeholderTextColor={Colors.muted}
            style={styles.titleInput}
            autoFocus
            returnKeyType="next"
            testID="input-title"
          />
        </View>

        <View style={styles.inputWrap}>
          <Text style={styles.label}>Add a note (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Say it with love ✨"
            placeholderTextColor={Colors.muted}
            style={styles.noteInput}
            multiline
            testID="input-note"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <User size={13} color={Colors.sub} /> {"  "}For whom
          </Text>
          <View style={styles.pillRow}>
            <OptionPill
              active={assignedTo === "me"}
              onPress={() => setAssignedTo("me")}
              label={`${meLabel} (me)`}
              testID="assign-me"
            />
            <OptionPill
              active={assignedTo === "partner"}
              onPress={() => setAssignedTo("partner")}
              label={themLabel}
              testID="assign-partner"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <BellRing size={13} color={Colors.sub} /> {"  "}Nag me
          </Text>
          <View style={styles.pillRow}>
            {visibleIntervals.map((opt) => (
              <OptionPill
                key={opt.value}
                active={interval === opt.value}
                onPress={() => setInterval(opt.value)}
                label={opt.label}
                testID={`interval-${opt.value}`}
              />
            ))}
            {!isPremium && (
              <Pressable
                onPress={() => router.push("/premium")}
                style={styles.lockedPill}
                testID="interval-15-locked"
              >
                <Lock size={11} color={Colors.amber} strokeWidth={2.6} />
                <Text style={styles.lockedPillText}>Every 15 min</Text>
                <Crown size={11} color={Colors.amber} fill={Colors.amber} strokeWidth={1.4} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Flame size={13} color={Colors.sub} /> {"  "}Priority
          </Text>
          <View style={styles.pillRow}>
            {PRIORITY_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.value}
                active={priority === opt.value}
                onPress={() => setPriority(opt.value)}
                label={opt.label}
                testID={`priority-${opt.value}`}
              />
            ))}
          </View>
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>Preview</Text>
          <Text style={styles.previewTitle}>
            {title.trim() ? `“${title.trim()}”` : "Your nudge will look like this"}
          </Text>
          <Text style={styles.previewSub}>
            {assignedTo === "me"
              ? `You'll be nudged every ${labelFor(interval)} until marked done.`
              : `${themLabel} will be nudged every ${labelFor(interval)} until marked done.`}
          </Text>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 14) },
        ]}
      >
        <Pressable
          onPress={handleSave}
          disabled={!canSave || submitting}
          style={({ pressed }) => [
            styles.saveBtn,
            (!canSave || submitting) && { opacity: 0.5 },
            pressed && canSave && { transform: [{ scale: 0.98 }] },
          ]}
          testID="save-task"
        >
          <LinearGradient
            colors={[Colors.coral, Colors.coralDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveGrad}
          >
            <Send size={16} color="#fff" strokeWidth={2.6} />
            <Text style={styles.saveText}>
              {assignedTo === "me" ? "Nudge me" : `Send to ${themLabel}`}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function labelFor(v: ReminderInterval): string {
  return INTERVAL_OPTIONS.find((o) => o.value === v)?.label.toLowerCase().replace("every ", "") ?? "";
}

interface PillProps {
  active: boolean;
  onPress: () => void;
  label: string;
  testID?: string;
}
function OptionPill({ active, onPress, label, testID }: PillProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        active && styles.pillActive,
        pressed && { opacity: 0.85 },
      ]}
      testID={testID}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bg },
  inputWrap: { gap: 8 },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.sub,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginLeft: 4,
  },
  titleInput: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    fontSize: 20,
    fontWeight: "700",
    color: Colors.ink,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
  },
  noteInput: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    fontSize: 15,
    fontWeight: "500",
    color: Colors.ink,
    minHeight: 72,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
    textAlignVertical: "top",
  },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.sub,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginLeft: 4,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 100,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.line,
  },
  pillActive: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.sub,
  },
  pillTextActive: {
    color: "#fff",
  },
  lockedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 100,
    backgroundColor: "rgba(255,176,32,0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.amber,
  },
  lockedPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.amber,
  },
  previewCard: {
    backgroundColor: "#FFE4DE",
    borderRadius: 18,
    padding: 16,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#FFD2C8",
  },
  previewLabel: {
    fontSize: 11,
    color: Colors.coralDark,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.ink,
  },
  previewSub: {
    fontSize: 13,
    color: Colors.coralDark,
    fontWeight: "500",
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: Colors.bg,
    borderTopColor: Colors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    borderRadius: 100,
    overflow: "hidden",
    shadowColor: Colors.coralDark,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  saveGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  saveText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.2,
  },
});
