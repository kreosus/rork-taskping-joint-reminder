import {
  Calendar,
  CheckCircle2,
  Flame,
  Heart,
  type LucideIcon,
  Pill,
  Rocket,
  Star,
  Trophy,
  Zap,
} from "lucide-react-native";

import { Colors } from "@/constants/colors";

export const TASK_POINTS = 10;
export const DOSE_POINTS = 5;

/** Stats that achievements and levels are derived from. */
export interface RewardStats {
  points: number;
  taskCompletions: number;
  doseCompletions: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tint: string;
  goal: number;
  metric: (s: RewardStats) => number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_task", title: "Getting Started", description: "Complete your first nudge", icon: CheckCircle2, tint: Colors.coral, goal: 1, metric: (s) => s.taskCompletions },
  { id: "ten_tasks", title: "On a Roll", description: "Complete 10 nudges", icon: Zap, tint: Colors.amber, goal: 10, metric: (s) => s.taskCompletions },
  { id: "fifty_tasks", title: "Unstoppable", description: "Complete 50 nudges", icon: Rocket, tint: Colors.sky, goal: 50, metric: (s) => s.taskCompletions },
  { id: "streak_3", title: "Three in a Row", description: "Keep a 3-day streak", icon: Flame, tint: Colors.coral, goal: 3, metric: (s) => s.longestStreak },
  { id: "streak_7", title: "Week Warrior", description: "Keep a 7-day streak", icon: Flame, tint: Colors.coralDark, goal: 7, metric: (s) => s.longestStreak },
  { id: "streak_30", title: "Monthly Master", description: "Keep a 30-day streak", icon: Calendar, tint: Colors.navy, goal: 30, metric: (s) => s.longestStreak },
  { id: "meds_first", title: "Med Minder", description: "Log your first dose", icon: Pill, tint: Colors.mint, goal: 1, metric: (s) => s.doseCompletions },
  { id: "meds_25", title: "Health Hero", description: "Log 25 doses", icon: Heart, tint: Colors.mint, goal: 25, metric: (s) => s.doseCompletions },
  { id: "level_5", title: "High Five", description: "Reach level 5", icon: Star, tint: Colors.amber, goal: 5, metric: (s) => s.level },
  { id: "points_500", title: "Point Collector", description: "Earn 500 points", icon: Trophy, tint: Colors.amber, goal: 500, metric: (s) => s.points },
];

const LEVEL_TITLES = ["Sprout", "Starter", "Steady", "Achiever", "Champion", "Hero", "Legend", "Mythic"] as const;

/** Cumulative points required to reach a given level (level 1 = 0). */
export function pointsForLevel(level: number): number {
  return 25 * (level - 1) * level;
}

export function levelFromPoints(points: number): number {
  let level = 1;
  while (pointsForLevel(level + 1) <= points) level += 1;
  return level;
}

export function levelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
}

export interface LevelProgress {
  level: number;
  title: string;
  floor: number;
  next: number;
  into: number;
  span: number;
  ratio: number;
}

export function levelProgress(points: number): LevelProgress {
  const level = levelFromPoints(points);
  const floor = pointsForLevel(level);
  const next = pointsForLevel(level + 1);
  const span = next - floor;
  const into = points - floor;
  return { level, title: levelTitle(level), floor, next, into, span, ratio: span > 0 ? into / span : 1 };
}
