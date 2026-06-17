jest.mock("expo-notifications", () => ({
  SchedulableTriggerInputTypes: { TIME_INTERVAL: "timeInterval" },
  AndroidImportance: { HIGH: 5 },
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
}));

// The factory must be self-contained (no outer const refs) because jest.mock is hoisted.
// We mutate Platform.OS via jest.requireMock() in individual tests.
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));

import * as Notifications from "expo-notifications";
import {
  scheduleRepeatingReminder,
  scheduleMedicationReminders,
  cancelNotifications,
} from "../../lib/notifications";

const scheduleNotificationAsync = Notifications.scheduleNotificationAsync as jest.Mock;
const cancelScheduledNotificationAsync =
  Notifications.cancelScheduledNotificationAsync as jest.Mock;

// Helper to change the Platform.OS seen by notifications.ts at runtime
function setPlatformOS(os: string) {
  (jest.requireMock("react-native") as { Platform: { OS: string } }).Platform.OS = os;
}

beforeEach(() => {
  jest.clearAllMocks();
  setPlatformOS("ios");
  let counter = 0;
  scheduleNotificationAsync.mockImplementation(() =>
    Promise.resolve(`notif-${counter++}`)
  );
  cancelScheduledNotificationAsync.mockResolvedValue(undefined);
});

// ─── scheduleRepeatingReminder ────────────────────────────────────────────────

describe("scheduleRepeatingReminder", () => {
  it("returns [] and skips scheduling on web", async () => {
    setPlatformOS("web");
    const ids = await scheduleRepeatingReminder({
      title: "Reminder",
      body: "Do the thing",
      intervalMinutes: 30,
    });
    expect(ids).toEqual([]);
    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("schedules the default count of 8 notifications", async () => {
    await scheduleRepeatingReminder({ title: "T", body: "B", intervalMinutes: 60 });
    expect(scheduleNotificationAsync).toHaveBeenCalledTimes(8);
  });

  it("schedules a custom count of notifications", async () => {
    await scheduleRepeatingReminder({
      title: "T",
      body: "B",
      intervalMinutes: 30,
      count: 3,
    });
    expect(scheduleNotificationAsync).toHaveBeenCalledTimes(3);
  });

  it("calculates trigger seconds as startInSeconds + i * intervalMinutes * 60", async () => {
    await scheduleRepeatingReminder({
      title: "T",
      body: "B",
      intervalMinutes: 30,
      count: 3,
      startInSeconds: 5,
    });

    const calls = scheduleNotificationAsync.mock.calls;
    expect(calls[0][0].trigger.seconds).toBe(5);           // 5 + 0*30*60
    expect(calls[1][0].trigger.seconds).toBe(1805);        // 5 + 1*30*60
    expect(calls[2][0].trigger.seconds).toBe(3605);        // 5 + 2*30*60
  });

  it("returns the IDs returned by the native scheduler", async () => {
    const ids = await scheduleRepeatingReminder({
      title: "T",
      body: "B",
      intervalMinutes: 15,
      count: 3,
      startInSeconds: 5,
    });
    expect(ids).toEqual(["notif-0", "notif-1", "notif-2"]);
  });

  it("sets notification content title, body and kind", async () => {
    await scheduleRepeatingReminder({
      title: "Don't forget",
      body: "Take your meds",
      intervalMinutes: 60,
      count: 1,
    });
    expect(scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: "Don't forget",
          body: "Take your meds",
          data: { kind: "reminder" },
        }),
      })
    );
  });
});

// ─── scheduleMedicationReminders ─────────────────────────────────────────────

describe("scheduleMedicationReminders", () => {
  const NOW = new Date("2024-01-15T12:00:00.000Z"); // Monday 12:00 UTC

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns [] and skips scheduling on web", async () => {
    setPlatformOS("web");
    const ids = await scheduleMedicationReminders({
      medicationName: "Aspirin",
      dosage: "100mg",
      times: ["14:00"],
    });
    expect(ids).toEqual([]);
    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("skips times that are already in the past for today", async () => {
    // 11:00 is 1 hour before NOW (12:00 UTC)
    await scheduleMedicationReminders({
      medicationName: "Aspirin",
      dosage: "100mg",
      times: ["11:00"],
      days: 1,
    });
    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("schedules a future time on the same day", async () => {
    // 14:00 is 2 hours after NOW (12:00 UTC) → 7200 seconds
    await scheduleMedicationReminders({
      medicationName: "Aspirin",
      dosage: "100mg",
      times: ["14:00"],
      days: 1,
    });
    expect(scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({ seconds: 7200 }),
      })
    );
  });

  it("schedules future times across multiple days", async () => {
    // day 0: 11:00 → past, 14:00 → future (+7200s)
    // day 1: 11:00 → +82800s (23h from 12:00), 14:00 → +93600s (26h from 12:00)
    await scheduleMedicationReminders({
      medicationName: "Aspirin",
      dosage: "100mg",
      times: ["11:00", "14:00"],
      days: 2,
    });
    // day 0 past + day 0 future + 2 from day 1 = 3 total
    expect(scheduleNotificationAsync).toHaveBeenCalledTimes(3);
  });

  it("uses the default of 14 days", async () => {
    await scheduleMedicationReminders({
      medicationName: "Aspirin",
      dosage: "100mg",
      times: ["14:00"],
    });
    // 14:00 is future on all 14 days
    expect(scheduleNotificationAsync).toHaveBeenCalledTimes(14);
  });

  it("sets medication notification content correctly", async () => {
    await scheduleMedicationReminders({
      medicationName: "Lisinopril",
      dosage: "10mg",
      times: ["14:00"],
      days: 1,
    });
    expect(scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: "Time for Lisinopril",
          body: "10mg is due now. Tap when taken.",
          data: expect.objectContaining({ kind: "medication", medicationName: "Lisinopril" }),
        }),
      })
    );
  });

  it("skips entries where hour or minute parse to NaN", async () => {
    // "not-a-time" has no colon → minuteRaw is undefined → minute = NaN → skip
    // "14:abc" → minute = NaN → skip
    // "14:00" → valid future time → scheduled
    await scheduleMedicationReminders({
      medicationName: "Aspirin",
      dosage: "100mg",
      times: ["not-a-time", "14:abc", "14:00"],
      days: 1,
    });
    expect(scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });
});

// ─── cancelNotifications ──────────────────────────────────────────────────────

describe("cancelNotifications", () => {
  it("cancels each notification ID", async () => {
    await cancelNotifications(["id-1", "id-2", "id-3"]);
    expect(cancelScheduledNotificationAsync).toHaveBeenCalledTimes(3);
    expect(cancelScheduledNotificationAsync).toHaveBeenCalledWith("id-1");
    expect(cancelScheduledNotificationAsync).toHaveBeenCalledWith("id-2");
    expect(cancelScheduledNotificationAsync).toHaveBeenCalledWith("id-3");
  });

  it("does nothing for an empty array", async () => {
    await cancelNotifications([]);
    expect(cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });

  it("is a no-op on web", async () => {
    setPlatformOS("web");
    await cancelNotifications(["id-1"]);
    expect(cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
});
