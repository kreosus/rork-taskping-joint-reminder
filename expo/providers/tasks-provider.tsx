import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  cancelNotifications,
  configureNotifications,
  scheduleMedicationReminders,
  scheduleRepeatingReminder,
  sendImmediateNudge,
} from "@/lib/notifications";
import { useRewards } from "@/providers/rewards-provider";
import type { Medication, MedicationColor, ReminderInterval, Task, TaskPriority } from "@/types/task";

const TASKS_KEY = "nudge.tasks.v1";
const MEDICATIONS_KEY = "nudge.medications.v1";
const PAIR_KEY = "nudge.pair.v1";
const PERSONA_KEY = "nudge.persona.v1";

interface PairState {
  partnerName: string;
  myName: string;
  pairCode: string | null;
}

type Persona = "me" | "partner";

async function loadTasks(): Promise<Task[]> {
  try {
    const raw = await AsyncStorage.getItem(TASKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Task[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.log("[tasks] load error", e);
    return [];
  }
}

async function saveTasks(tasks: Task[]): Promise<void> {
  await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

async function loadMedications(): Promise<Medication[]> {
  try {
    const raw = await AsyncStorage.getItem(MEDICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Medication[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.log("[medications] load error", e);
    return [];
  }
}

async function saveMedications(medications: Medication[]): Promise<void> {
  await AsyncStorage.setItem(MEDICATIONS_KEY, JSON.stringify(medications));
}

async function loadPair(): Promise<PairState> {
  try {
    const raw = await AsyncStorage.getItem(PAIR_KEY);
    if (!raw) return { partnerName: "Partner", myName: "You", pairCode: null };
    return JSON.parse(raw) as PairState;
  } catch {
    return { partnerName: "Partner", myName: "You", pairCode: null };
  }
}

async function loadPersona(): Promise<Persona> {
  try {
    const raw = await AsyncStorage.getItem(PERSONA_KEY);
    return raw === "partner" ? "partner" : "me";
  } catch {
    return "me";
  }
}

export const [TasksProvider, useTasks] = createContextHook(() => {
  const qc = useQueryClient();
  const { recordEvent } = useRewards();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [pair, setPair] = useState<PairState>({ partnerName: "Partner", myName: "You", pairCode: null });
  const [persona, setPersona] = useState<Persona>("me");
  const [hydrated, setHydrated] = useState<boolean>(false);

  useEffect(() => {
    configureNotifications();
  }, []);

  const tasksQuery = useQuery({ queryKey: ["nudge", "tasks"], queryFn: loadTasks, staleTime: Infinity });
  const medicationsQuery = useQuery({ queryKey: ["nudge", "medications"], queryFn: loadMedications, staleTime: Infinity });
  const pairQuery = useQuery({ queryKey: ["nudge", "pair"], queryFn: loadPair, staleTime: Infinity });
  const personaQuery = useQuery({ queryKey: ["nudge", "persona"], queryFn: loadPersona, staleTime: Infinity });

  useEffect(() => { if (tasksQuery.data) setTasks(tasksQuery.data); }, [tasksQuery.data]);
  useEffect(() => { if (medicationsQuery.data) setMedications(medicationsQuery.data); }, [medicationsQuery.data]);
  useEffect(() => { if (pairQuery.data) setPair(pairQuery.data); }, [pairQuery.data]);
  useEffect(() => { if (personaQuery.data) setPersona(personaQuery.data); }, [personaQuery.data]);

  useEffect(() => {
    if (tasksQuery.isSuccess && medicationsQuery.isSuccess && pairQuery.isSuccess && personaQuery.isSuccess && !hydrated) {
      setHydrated(true);
    }
  }, [tasksQuery.isSuccess, medicationsQuery.isSuccess, pairQuery.isSuccess, personaQuery.isSuccess, hydrated]);

  const saveMutation = useMutation({ mutationFn: async (next: Task[]) => { await saveTasks(next); return next; }, onSuccess: (next) => qc.setQueryData(["nudge", "tasks"], next) });
  const saveMedicationsMutation = useMutation({ mutationFn: async (next: Medication[]) => { await saveMedications(next); return next; }, onSuccess: (next) => qc.setQueryData(["nudge", "medications"], next) });

  const persist = useCallback((updater: (prev: Task[]) => Task[]) => {
    setTasks((prev) => { const next = updater(prev); saveMutation.mutate(next); return next; });
  }, [saveMutation]);

  const persistMedications = useCallback((updater: (prev: Medication[]) => Medication[]) => {
    setMedications((prev) => { const next = updater(prev); saveMedicationsMutation.mutate(next); return next; });
  }, [saveMedicationsMutation]);

  const savePairMutation = useMutation({ mutationFn: async (next: PairState) => { await AsyncStorage.setItem(PAIR_KEY, JSON.stringify(next)); return next; }, onSuccess: (next) => qc.setQueryData(["nudge", "pair"], next) });

  const updatePair = useCallback((patch: Partial<PairState>) => {
    setPair((prev) => { const next = { ...prev, ...patch }; savePairMutation.mutate(next); return next; });
  }, [savePairMutation]);

  const switchPersona = useCallback(async () => {
    const next: Persona = persona === "me" ? "partner" : "me";
    setPersona(next);
    try { await AsyncStorage.setItem(PERSONA_KEY, next); } catch (e) { console.log("[persona] save error", e); }
  }, [persona]);

  const addTask = useCallback(async (input: { title: string; note?: string; intervalMinutes: ReminderInterval; priority: TaskPriority; assignedTo: "me" | "partner"; notificationCount?: number; }) => {
    const sentBy: "me" | "partner" = persona;
    const assignedTo = input.assignedTo;
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const count = input.notificationCount ?? 10;
    const notificationIds = assignedTo === persona ? await scheduleRepeatingReminder({ title: `Don't forget: ${input.title}`, body: sentBy === assignedTo ? "Gentle reminder from yourself." : `${pair.partnerName} is counting on you.`, intervalMinutes: input.intervalMinutes, count, startInSeconds: 5 }) : [];
    const task: Task = { id, title: input.title.trim(), note: input.note?.trim() || undefined, createdAt: Date.now(), intervalMinutes: input.intervalMinutes, priority: input.priority, assignedTo, sentBy, nudges: 0, notificationIds };
    persist((prev) => [task, ...prev]);
    return task;
  }, [persist, persona, pair.partnerName]);

  const completeTask = useCallback(async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    await cancelNotifications(task.notificationIds);
    persist((prev) => prev.map((t) => t.id === taskId ? { ...t, completedAt: Date.now(), notificationIds: [] } : t));
    recordEvent({ type: "task", key: taskId });
  }, [tasks, persist, recordEvent]);

  const uncompleteTask = useCallback(async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const notificationIds = task.assignedTo === persona ? await scheduleRepeatingReminder({ title: `Back on: ${task.title}`, body: task.sentBy === task.assignedTo ? "Gentle reminder from yourself." : `${pair.partnerName} is counting on you.`, intervalMinutes: task.intervalMinutes, count: 10, startInSeconds: 5 }) : [];
    persist((prev) => prev.map((t) => t.id === taskId ? { ...t, completedAt: undefined, notificationIds } : t));
  }, [tasks, persist, persona, pair.partnerName]);

  const deleteTask = useCallback(async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) await cancelNotifications(task.notificationIds);
    persist((prev) => prev.filter((t) => t.id !== taskId));
  }, [tasks, persist]);

  const nudgeTask = useCallback(async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.assignedTo === persona) await sendImmediateNudge({ title: `Nudge from ${pair.partnerName}`, body: `${task.title} — don't forget!` });
    persist((prev) => prev.map((t) => t.id === taskId ? { ...t, nudges: t.nudges + 1, lastNudgeAt: Date.now() } : t));
  }, [tasks, persist, persona, pair.partnerName]);

  const addMedication = useCallback(async (input: { name: string; dosage: string; instructions?: string; times: string[]; color: MedicationColor; }) => {
    const cleanTimes = Array.from(new Set(input.times.filter(Boolean))).sort();
    const notificationIds = await scheduleMedicationReminders({ medicationName: input.name.trim(), dosage: input.dosage.trim(), times: cleanTimes });
    const medication: Medication = { id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, name: input.name.trim(), dosage: input.dosage.trim(), instructions: input.instructions?.trim() || undefined, times: cleanTimes, color: input.color, createdAt: Date.now(), doseLogs: [], notificationIds };
    persistMedications((prev) => [medication, ...prev]);
    return medication;
  }, [persistMedications]);

  const markDoseTaken = useCallback((medicationId: string, dateKey: string, time: string) => {
    persistMedications((prev) => prev.map((med) => {
      if (med.id !== medicationId) return med;
      if (med.doseLogs.some((log) => log.dateKey === dateKey && log.time === time)) return med;
      return { ...med, doseLogs: [...med.doseLogs, { dateKey, time, takenAt: Date.now() }] };
    }));
    recordEvent({ type: "dose", key: `${medicationId}:${dateKey}:${time}` });
  }, [persistMedications, recordEvent]);

  const deleteMedication = useCallback(async (medicationId: string) => {
    const medication = medications.find((med) => med.id === medicationId);
    if (medication) await cancelNotifications(medication.notificationIds);
    persistMedications((prev) => prev.filter((med) => med.id !== medicationId));
  }, [medications, persistMedications]);

  const generatePairCode = useCallback(() => { const code = Math.floor(100000 + Math.random() * 900000).toString(); updatePair({ pairCode: code }); return code; }, [updatePair]);
  const unpair = useCallback(() => { updatePair({ pairCode: null, partnerName: "Partner" }); }, [updatePair]);

  const inboxTasks = useMemo(() => tasks.filter((t) => t.assignedTo === persona), [tasks, persona]);
  const sentTasks = useMemo(() => tasks.filter((t) => t.sentBy === persona && t.assignedTo !== persona), [tasks, persona]);
  const activeInbox = useMemo(() => inboxTasks.filter((t) => !t.completedAt), [inboxTasks]);
  const completedInbox = useMemo(() => inboxTasks.filter((t) => t.completedAt).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)), [inboxTasks]);

  return useMemo(() => ({
    tasks, medications, inboxTasks, sentTasks, activeInbox, completedInbox, pair, persona, hydrated,
    addTask, completeTask, uncompleteTask, deleteTask, nudgeTask, addMedication, markDoseTaken, deleteMedication,
    updatePair, switchPersona, generatePairCode, unpair,
  }), [tasks, medications, inboxTasks, sentTasks, activeInbox, completedInbox, pair, persona, hydrated, addTask, completeTask, uncompleteTask, deleteTask, nudgeTask, addMedication, markDoseTaken, deleteMedication, updatePair, switchPersona, generatePairCode, unpair]);
});

export function useTask(taskId: string | undefined) {
  const { tasks } = useTasks();
  return useMemo(() => tasks.find((t) => t.id === taskId), [tasks, taskId]);
}
