import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { CalendarDays, Check, Clock, Pill, Plus, Trash2 } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Header from "@/components/Header";
import { Colors } from "@/constants/colors";
import { useTasks } from "@/providers/tasks-provider";
import { Medication, MedicationColor, MEDICATION_COLOR_OPTIONS } from "@/types/task";

const COLOR_MAP: Record<MedicationColor, string> = {
  coral: Colors.coral,
  mint: Colors.mint,
  sky: Colors.sky,
  amber: Colors.amber,
  navy: Colors.navy,
};

const QUICK_TIMES: string[] = ["08:00", "12:00", "18:00", "21:00"];

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatTime(time: string): string {
  const [hourRaw, minute] = time.split(":");
  const hour = Number(hourRaw);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${suffix}`;
}

function buildWeek(): Date[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() + index);
    return day;
  });
}

export default function MedsScreen() {
  const insets = useSafeAreaInsets();
  const { medications, addMedication, markDoseTaken, deleteMedication } = useTasks();
  const [selectedKey, setSelectedKey] = useState<string>(dateKey(new Date()));
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [dosage, setDosage] = useState<string>("");
  const [instructions, setInstructions] = useState<string>("");
  const [times, setTimes] = useState<string[]>(["08:00"]);
  const [customTime, setCustomTime] = useState<string>("");
  const [color, setColor] = useState<MedicationColor>("mint");

  const week = useMemo(buildWeek, []);
  const todaysDoses = useMemo(() => {
    return medications
      .flatMap((med) => med.times.map((time) => ({ med, time })))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [medications]);

  const takenCount = todaysDoses.filter(({ med, time }) => med.doseLogs.some((log) => log.dateKey === selectedKey && log.time === time)).length;
  const adherence = todaysDoses.length === 0 ? 0 : Math.round((takenCount / todaysDoses.length) * 100);

  const toggleQuickTime = useCallback((time: string) => {
    setTimes((prev) => prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time].sort());
  }, []);

  const addCustomTime = useCallback(() => {
    const normalized = customTime.trim();
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
      Alert.alert("Use 24-hour time", "Enter time like 07:30 or 21:00.");
      return;
    }
    setTimes((prev) => Array.from(new Set([...prev, normalized])).sort());
    setCustomTime("");
  }, [customTime]);

  const resetForm = useCallback(() => {
    setName("");
    setDosage("");
    setInstructions("");
    setTimes(["08:00"]);
    setCustomTime("");
    setColor("mint");
  }, []);

  const saveMedication = useCallback(async () => {
    if (!name.trim() || !dosage.trim() || times.length === 0) {
      Alert.alert("Missing details", "Add a pill name, dosage, and at least one reminder time.");
      return;
    }
    await addMedication({ name, dosage, instructions, times, color });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetForm();
    setModalVisible(false);
  }, [addMedication, color, dosage, instructions, name, resetForm, times]);

  const onTaken = useCallback(async (medicationId: string, time: string) => {
    markDoseTaken(medicationId, selectedKey, time);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [markDoseTaken, selectedKey]);

  const confirmDelete = useCallback((med: Medication) => {
    Alert.alert("Remove medication?", `Delete ${med.name} and cancel its reminders.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMedication(med.id) },
    ]);
  }, [deleteMedication]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}> 
      <Header eyebrow="Pill calendar" title="Today’s meds" subtitle={`${takenCount}/${todaysDoses.length} doses taken · ${adherence}% complete`} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 130 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={["#173A36", "#0F1730"]} style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}><Pill color="#FFFFFF" size={24} /></View>
            <Text style={styles.heroTitle}>{todaysDoses.length === 0 ? "Build your med rhythm" : "Medication runway"}</Text>
          </View>
          <Text style={styles.heroSubtitle}>Track multiple pills, exact dose times, and mark each dose as taken before the day gets noisy.</Text>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${adherence}%` }]} /></View>
        </LinearGradient>

        <View style={styles.weekRow}>
          {week.map((day) => {
            const key = dateKey(day);
            const active = key === selectedKey;
            return (
              <Pressable key={key} onPress={() => setSelectedKey(key)} style={[styles.dayPill, active && styles.dayPillActive]}>
                <Text style={[styles.dayName, active && styles.dayTextActive]}>{day.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)}</Text>
                <Text style={[styles.dayNum, active && styles.dayTextActive]}>{day.getDate()}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHeader}><CalendarDays size={18} color={Colors.sub} /><Text style={styles.sectionTitle}>Dose schedule</Text></View>
        {todaysDoses.length === 0 ? (
          <View style={styles.emptyCard}><Pill size={28} color={Colors.muted} /><Text style={styles.emptyTitle}>No meds added yet</Text><Text style={styles.emptyText}>Add prescriptions, vitamins, or supplements with daily reminder times.</Text></View>
        ) : todaysDoses.map(({ med, time }) => {
          const isTaken = med.doseLogs.some((log) => log.dateKey === selectedKey && log.time === time);
          return (
            <View key={`${med.id}-${time}`} style={styles.doseCard}>
              <View style={[styles.medStripe, { backgroundColor: COLOR_MAP[med.color] }]} />
              <View style={styles.doseContent}>
                <View style={styles.doseTop}>
                  <View><Text style={styles.medName}>{med.name}</Text><Text style={styles.medDose}>{med.dosage}{med.instructions ? ` · ${med.instructions}` : ""}</Text></View>
                  <Pressable onPress={() => confirmDelete(med)} hitSlop={10}><Trash2 size={18} color={Colors.muted} /></Pressable>
                </View>
                <View style={styles.doseBottom}><View style={styles.timeBadge}><Clock size={15} color={Colors.sub} /><Text style={styles.timeText}>{formatTime(time)}</Text></View><Pressable disabled={isTaken} onPress={() => onTaken(med.id, time)} style={[styles.takenButton, isTaken && styles.takenButtonDone]}><Check size={16} color={isTaken ? "#FFFFFF" : Colors.ink} /><Text style={[styles.takenText, isTaken && styles.takenTextDone]}>{isTaken ? "Taken" : "Mark taken"}</Text></Pressable></View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Pressable style={[styles.addButton, { bottom: 28 + insets.bottom }]} onPress={() => setModalVisible(true)}><Plus color="#FFFFFF" size={24} /><Text style={styles.addButtonText}>Add med</Text></Pressable>

      <Modal animationType="slide" visible={modalVisible} presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modal}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 28 }}>
            <Text style={styles.modalTitle}>Add medication</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Medication name" placeholderTextColor={Colors.muted} style={styles.input} />
            <TextInput value={dosage} onChangeText={setDosage} placeholder="Dosage, e.g. 10mg / 1 tablet" placeholderTextColor={Colors.muted} style={styles.input} />
            <TextInput value={instructions} onChangeText={setInstructions} placeholder="Instructions, e.g. with food" placeholderTextColor={Colors.muted} style={styles.input} />
            <Text style={styles.formLabel}>Reminder times</Text>
            <View style={styles.chipRow}>{QUICK_TIMES.map((time) => <Pressable key={time} onPress={() => toggleQuickTime(time)} style={[styles.timeChip, times.includes(time) && styles.timeChipActive]}><Text style={[styles.timeChipText, times.includes(time) && styles.timeChipTextActive]}>{formatTime(time)}</Text></Pressable>)}</View>
            <View style={styles.customRow}><TextInput value={customTime} onChangeText={setCustomTime} placeholder="14:30" placeholderTextColor={Colors.muted} style={[styles.input, styles.customInput]} /><Pressable onPress={addCustomTime} style={styles.smallButton}><Text style={styles.smallButtonText}>Add time</Text></Pressable></View>
            <Text style={styles.formLabel}>Color</Text>
            <View style={styles.chipRow}>{MEDICATION_COLOR_OPTIONS.map((option) => <Pressable key={option.value} onPress={() => setColor(option.value)} style={[styles.colorDot, { backgroundColor: COLOR_MAP[option.value] }, color === option.value && styles.colorDotActive]} />)}</View>
            <Pressable onPress={saveMedication} style={styles.saveButton}><Text style={styles.saveButtonText}>Save reminders</Text></Pressable>
            <Pressable onPress={() => setModalVisible(false)} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  hero: { borderRadius: 30, padding: 22, gap: 16, shadowColor: "#0F1730", shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroIcon: { width: 46, height: 46, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.16)" },
  heroTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  heroSubtitle: { color: "rgba(255,255,255,0.78)", fontSize: 14, lineHeight: 20 },
  progressTrack: { height: 10, borderRadius: 999, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.18)" },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: Colors.mint },
  weekRow: { flexDirection: "row", gap: 8, marginVertical: 18 },
  dayPill: { flex: 1, borderRadius: 18, backgroundColor: Colors.surface, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: Colors.line },
  dayPillActive: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  dayName: { color: Colors.sub, fontSize: 11, fontWeight: "800" },
  dayNum: { color: Colors.ink, fontSize: 16, fontWeight: "900", marginTop: 2 },
  dayTextActive: { color: "#FFFFFF" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionTitle: { color: Colors.ink, fontSize: 17, fontWeight: "900" },
  emptyCard: { alignItems: "center", gap: 8, backgroundColor: Colors.surface, borderRadius: 26, padding: 28, borderWidth: 1, borderColor: Colors.line },
  emptyTitle: { color: Colors.ink, fontSize: 18, fontWeight: "900" },
  emptyText: { color: Colors.sub, textAlign: "center", lineHeight: 20 },
  doseCard: { flexDirection: "row", backgroundColor: Colors.surface, borderRadius: 24, marginBottom: 12, overflow: "hidden", borderWidth: 1, borderColor: Colors.line },
  medStripe: { width: 8 },
  doseContent: { flex: 1, padding: 16, gap: 14 },
  doseTop: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  medName: { color: Colors.ink, fontSize: 18, fontWeight: "900" },
  medDose: { color: Colors.sub, marginTop: 3, lineHeight: 18 },
  doseBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  timeBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.chipBg, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999 },
  timeText: { color: Colors.ink, fontWeight: "800" },
  takenButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: "#F1F1ED" },
  takenButtonDone: { backgroundColor: Colors.mint },
  takenText: { color: Colors.ink, fontWeight: "900" },
  takenTextDone: { color: "#FFFFFF" },
  addButton: { position: "absolute", right: 18, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.coral, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 16, shadowColor: Colors.coral, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  addButtonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
  modal: { flex: 1, backgroundColor: Colors.bg },
  modalTitle: { color: Colors.ink, fontSize: 28, fontWeight: "900", marginBottom: 18 },
  input: { backgroundColor: Colors.surface, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, color: Colors.ink, borderWidth: 1, borderColor: Colors.line, marginBottom: 12 },
  formLabel: { color: Colors.sub, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5, fontSize: 12, marginTop: 8, marginBottom: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  timeChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.line },
  timeChipActive: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  timeChipText: { color: Colors.ink, fontWeight: "800" },
  timeChipTextActive: { color: "#FFFFFF" },
  customRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  customInput: { flex: 1 },
  smallButton: { backgroundColor: Colors.navy, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 15, marginBottom: 12 },
  smallButtonText: { color: "#FFFFFF", fontWeight: "900" },
  colorDot: { width: 38, height: 38, borderRadius: 19, borderWidth: 3, borderColor: "transparent" },
  colorDotActive: { borderColor: Colors.ink },
  saveButton: { backgroundColor: Colors.coral, borderRadius: 20, padding: 17, alignItems: "center", marginTop: 12 },
  saveButtonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
  cancelButton: { alignItems: "center", padding: 16 },
  cancelText: { color: Colors.sub, fontWeight: "800" },
});
