import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ACHIEVEMENTS,
  type Achievement,
  DOSE_POINTS,
  levelFromPoints,
  levelProgress,
  type RewardStats,
  TASK_POINTS,
} from "@/constants/achievements";

const REWARDS_KEY = "nudge.rewards.v1";
const MAX_SEEN_KEYS = 1000;

export type RewardEvent = { type: "task" | "dose"; key: string };

export type Celebration =
  | { id: string; kind: "achievement"; title: string; message: string; achievementId: string }
  | { id: string; kind: "level"; title: string; message: string; level: number };

interface RewardsState {
  points: number;
  taskCompletions: number;
  doseCompletions: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDateKey: string | null;
  unlocked: Record<string, number>;
  seenKeys: string[];
}

const DEFAULT_STATE: RewardsState = {
  points: 0,
  taskCompletions: 0,
  doseCompletions: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDateKey: null,
  unlocked: {},
  seenKeys: [],
};

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function previousDateKey(key: string): string {
  const [y, m, d] = key.split("-").map((n) => parseInt(n, 10));
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return dateKey(date);
}

function toStats(state: RewardsState): RewardStats {
  return {
    points: state.points,
    taskCompletions: state.taskCompletions,
    doseCompletions: state.doseCompletions,
    currentStreak: state.currentStreak,
    longestStreak: state.longestStreak,
    level: levelFromPoints(state.points),
  };
}

async function loadRewards(): Promise<RewardsState> {
  try {
    const raw = await AsyncStorage.getItem(REWARDS_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<RewardsState>;
    return { ...DEFAULT_STATE, ...parsed, unlocked: parsed.unlocked ?? {}, seenKeys: parsed.seenKeys ?? [] };
  } catch (e) {
    console.log("[rewards] load error", e);
    return DEFAULT_STATE;
  }
}

export const [RewardsProvider, useRewards] = createContextHook(() => {
  const qc = useQueryClient();
  const [state, setState] = useState<RewardsState>(DEFAULT_STATE);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const stateRef = useRef<RewardsState>(state);
  stateRef.current = state;

  const rewardsQuery = useQuery({ queryKey: ["nudge", "rewards"], queryFn: loadRewards, staleTime: Infinity });

  useEffect(() => {
    if (rewardsQuery.data) setState(rewardsQuery.data);
  }, [rewardsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (next: RewardsState) => {
      await AsyncStorage.setItem(REWARDS_KEY, JSON.stringify(next));
      return next;
    },
    onSuccess: (next) => qc.setQueryData(["nudge", "rewards"], next),
  });

  const recordEvent = useCallback(
    (evt: RewardEvent) => {
      const prev = stateRef.current;
      if (prev.seenKeys.includes(evt.key)) return;

      const today = dateKey(new Date());
      let currentStreak: number;
      if (prev.lastActiveDateKey === today) currentStreak = prev.currentStreak || 1;
      else if (prev.lastActiveDateKey && previousDateKey(today) === prev.lastActiveDateKey) currentStreak = prev.currentStreak + 1;
      else currentStreak = 1;

      const gained = evt.type === "task" ? TASK_POINTS : DOSE_POINTS;
      const next: RewardsState = {
        points: prev.points + gained,
        taskCompletions: prev.taskCompletions + (evt.type === "task" ? 1 : 0),
        doseCompletions: prev.doseCompletions + (evt.type === "dose" ? 1 : 0),
        currentStreak,
        longestStreak: Math.max(prev.longestStreak, currentStreak),
        lastActiveDateKey: today,
        unlocked: { ...prev.unlocked },
        seenKeys: [...prev.seenKeys, evt.key].slice(-MAX_SEEN_KEYS),
      };

      const stats = toStats(next);
      const queued: Celebration[] = [];
      const prevLevel = levelFromPoints(prev.points);
      const newLevel = stats.level;
      if (newLevel > prevLevel) {
        queued.push({ id: `lvl_${newLevel}_${Date.now()}`, kind: "level", level: newLevel, title: `Level ${newLevel}!`, message: `You reached ${levelProgress(next.points).title}. Keep the momentum going.` });
      }
      for (const a of ACHIEVEMENTS) {
        if (!next.unlocked[a.id] && a.metric(stats) >= a.goal) {
          next.unlocked[a.id] = Date.now();
          queued.push({ id: `ach_${a.id}_${Date.now()}`, kind: "achievement", achievementId: a.id, title: a.title, message: a.description });
        }
      }

      stateRef.current = next;
      setState(next);
      saveMutation.mutate(next);
      if (queued.length > 0) setCelebrations((c) => [...c, ...queued]);
    },
    [saveMutation],
  );

  const dismissCelebration = useCallback(() => {
    setCelebrations((c) => c.slice(1));
  }, []);

  const stats = useMemo(() => toStats(state), [state]);
  const progress = useMemo(() => levelProgress(state.points), [state.points]);
  const achievements = useMemo(
    () =>
      ACHIEVEMENTS.map((a: Achievement) => {
        const value = a.metric(stats);
        const unlockedAt = state.unlocked[a.id];
        return {
          ...a,
          value: Math.min(value, a.goal),
          ratio: Math.min(value / a.goal, 1),
          unlocked: Boolean(unlockedAt),
          unlockedAt,
        };
      }),
    [stats, state.unlocked],
  );
  const unlockedCount = useMemo(() => achievements.filter((a) => a.unlocked).length, [achievements]);

  return useMemo(
    () => ({
      points: state.points,
      currentStreak: state.currentStreak,
      longestStreak: state.longestStreak,
      taskCompletions: state.taskCompletions,
      doseCompletions: state.doseCompletions,
      stats,
      progress,
      achievements,
      unlockedCount,
      totalAchievements: ACHIEVEMENTS.length,
      celebrations,
      recordEvent,
      dismissCelebration,
    }),
    [state, stats, progress, achievements, unlockedCount, celebrations, recordEvent, dismissCelebration],
  );
});
