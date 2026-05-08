export type ReminderInterval = 15 | 30 | 60 | 180 | 360;

export type TaskPriority = "low" | "normal" | "high";

export interface Task {
  id: string;
  title: string;
  note?: string;
  createdAt: number;
  dueAt?: number;
  completedAt?: number;
  intervalMinutes: ReminderInterval;
  priority: TaskPriority;
  assignedTo: "me" | "partner";
  sentBy: "me" | "partner";
  nudges: number;
  lastNudgeAt?: number;
  notificationIds: string[];
}

export const INTERVAL_OPTIONS: { value: ReminderInterval; label: string }[] = [
  { value: 15, label: "Every 15 min" },
  { value: 30, label: "Every 30 min" },
  { value: 60, label: "Every hour" },
  { value: 180, label: "Every 3 hours" },
  { value: 360, label: "Every 6 hours" },
];

export const PRIORITY_OPTIONS: { value: TaskPriority; label: string; emoji: string }[] = [
  { value: "low", label: "Low", emoji: "·" },
  { value: "normal", label: "Normal", emoji: "•" },
  { value: "high", label: "High", emoji: "!" },
];

export type MedicationColor = "coral" | "mint" | "sky" | "amber" | "navy";

export interface MedicationDoseLog {
  dateKey: string;
  time: string;
  takenAt: number;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  instructions?: string;
  times: string[];
  color: MedicationColor;
  createdAt: number;
  doseLogs: MedicationDoseLog[];
  notificationIds: string[];
}

export const MEDICATION_COLOR_OPTIONS: { value: MedicationColor; label: string }[] = [
  { value: "coral", label: "Coral" },
  { value: "mint", label: "Mint" },
  { value: "sky", label: "Sky" },
  { value: "amber", label: "Amber" },
  { value: "navy", label: "Navy" },
];
