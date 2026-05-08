import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

let configured = false;

export async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    if (Platform.OS === "web") {
      console.log("[notifications] web platform — skipping native permissions");
      return;
    }

    const settings = await Notifications.getPermissionsAsync();
    if (settings.status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      console.log("[notifications] permission:", req.status);
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("nudge-default", {
        name: "Nudges",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF5E4C",
      });
    }
  } catch (e) {
    console.log("[notifications] configure error", e);
  }
}

export async function scheduleRepeatingReminder(params: {
  title: string;
  body: string;
  intervalMinutes: number;
  count?: number;
  startInSeconds?: number;
}): Promise<string[]> {
  const { title, body, intervalMinutes, count = 8, startInSeconds = 5 } = params;
  if (Platform.OS === "web") {
    console.log("[notifications] web — not scheduling", title);
    return [];
  }
  const ids: string[] = [];
  try {
    for (let i = 0; i < count; i++) {
      const seconds = startInSeconds + i * intervalMinutes * 60;
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: "default",
          data: { kind: "reminder" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
          repeats: false,
          channelId: Platform.OS === "android" ? "nudge-default" : undefined,
        },
      });
      ids.push(id);
    }
  } catch (e) {
    console.log("[notifications] schedule error", e);
  }
  return ids;
}

export async function sendImmediateNudge(params: {
  title: string;
  body: string;
}): Promise<string | null> {
  if (Platform.OS === "web") {
    console.log("[notifications] web — immediate nudge skipped");
    return null;
  }
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        sound: "default",
        data: { kind: "nudge" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        repeats: false,
        channelId: Platform.OS === "android" ? "nudge-default" : undefined,
      },
    });
    return id;
  } catch (e) {
    console.log("[notifications] immediate error", e);
    return null;
  }
}

export async function scheduleMedicationReminders(params: {
  medicationName: string;
  dosage: string;
  times: string[];
  days?: number;
}): Promise<string[]> {
  const { medicationName, dosage, times, days = 14 } = params;
  if (Platform.OS === "web") {
    console.log("[notifications] web — medication reminders not scheduled", medicationName);
    return [];
  }

  const ids: string[] = [];
  const now = new Date();

  try {
    for (let dayOffset = 0; dayOffset < days; dayOffset++) {
      for (const time of times) {
        const [hourRaw, minuteRaw] = time.split(":");
        const hour = Number(hourRaw);
        const minute = Number(minuteRaw);
        if (!Number.isFinite(hour) || !Number.isFinite(minute)) continue;

        const target = new Date(now);
        target.setDate(now.getDate() + dayOffset);
        target.setHours(hour, minute, 0, 0);
        if (target.getTime() <= now.getTime() + 1000) continue;

        const seconds = Math.max(1, Math.round((target.getTime() - now.getTime()) / 1000));
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `Time for ${medicationName}`,
            body: `${dosage} is due now. Tap when taken.`,
            sound: "default",
            data: { kind: "medication", medicationName, time },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds,
            repeats: false,
            channelId: Platform.OS === "android" ? "nudge-default" : undefined,
          },
        });
        ids.push(id);
      }
    }
  } catch (e) {
    console.log("[notifications] medication schedule error", e);
  }

  return ids;
}

export async function cancelNotifications(ids: string[]): Promise<void> {
  if (Platform.OS === "web") return;
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (e) {
      console.log("[notifications] cancel error", id, e);
    }
  }
}
