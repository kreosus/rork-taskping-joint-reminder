import { timeAgo, intervalLabel } from "../../lib/taskUtils";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("timeAgo", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-06-01T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns 'just now' for timestamps less than 1 minute ago", () => {
    expect(timeAgo(Date.now() - 30_000)).toBe("just now");
    expect(timeAgo(Date.now())).toBe("just now");
    expect(timeAgo(Date.now() - 59_999)).toBe("just now");
  });

  it("returns minutes for timestamps 1–59 minutes ago", () => {
    expect(timeAgo(Date.now() - MINUTE)).toBe("1m ago");
    expect(timeAgo(Date.now() - 5 * MINUTE)).toBe("5m ago");
    expect(timeAgo(Date.now() - 59 * MINUTE)).toBe("59m ago");
  });

  it("returns hours for timestamps 1–23 hours ago", () => {
    expect(timeAgo(Date.now() - HOUR)).toBe("1h ago");
    expect(timeAgo(Date.now() - 2 * HOUR)).toBe("2h ago");
    expect(timeAgo(Date.now() - 23 * HOUR)).toBe("23h ago");
  });

  it("returns days for timestamps 24+ hours ago", () => {
    expect(timeAgo(Date.now() - DAY)).toBe("1d ago");
    expect(timeAgo(Date.now() - 3 * DAY)).toBe("3d ago");
    expect(timeAgo(Date.now() - 30 * DAY)).toBe("30d ago");
  });

  it("handles the boundary between minutes and hours (60 minutes)", () => {
    expect(timeAgo(Date.now() - 60 * MINUTE)).toBe("1h ago");
  });

  it("handles the boundary between hours and days (24 hours)", () => {
    expect(timeAgo(Date.now() - 24 * HOUR)).toBe("1d ago");
  });
});

describe("intervalLabel", () => {
  it("returns minutes label for values under 60", () => {
    expect(intervalLabel(15)).toBe("15m");
    expect(intervalLabel(30)).toBe("30m");
    expect(intervalLabel(1)).toBe("1m");
    expect(intervalLabel(59)).toBe("59m");
  });

  it("returns hours label for values 60 and above", () => {
    expect(intervalLabel(60)).toBe("1h");
    expect(intervalLabel(180)).toBe("3h");
    expect(intervalLabel(360)).toBe("6h");
    expect(intervalLabel(120)).toBe("2h");
  });

  it("floors fractional hours", () => {
    expect(intervalLabel(90)).toBe("1h");
    expect(intervalLabel(119)).toBe("1h");
  });
});
