import { Check, Flame, Lock, Pill, Sparkles, Zap } from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Header from "@/components/Header";
import { Colors } from "@/constants/colors";
import { useRewards } from "@/providers/rewards-provider";

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const { points, progress, currentStreak, longestStreak, taskCompletions, doseCompletions, achievements, unlockedCount, totalAchievements } = useRewards();

  const toNext = Math.max(progress.next - points, 0);
  const subtitle = unlockedCount === 0 ? "Complete nudges and log doses to earn points." : `${unlockedCount} of ${totalAchievements} badges earned.`;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Header eyebrow="Rewards" title="Your progress" subtitle={subtitle} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 + insets.bottom, gap: 14 }} showsVerticalScrollIndicator={false}>
        <View style={styles.levelCard}>
          <View style={styles.levelTop}>
            <View>
              <Text style={styles.levelEyebrow}>Level {progress.level}</Text>
              <Text style={styles.levelTitle}>{progress.title}</Text>
            </View>
            <View style={styles.pointsPill}>
              <Sparkles size={14} color={Colors.amber} strokeWidth={2.6} />
              <Text style={styles.pointsText}>{points} pts</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress.ratio * 100)}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{toNext > 0 ? `${toNext} pts to level ${progress.level + 1}` : "Max level reached"}</Text>
        </View>

        <View style={styles.statRow}>
          <Stat icon={<Flame size={20} color={Colors.coral} strokeWidth={2.4} />} value={currentStreak} label="day streak" accent={Colors.coral} />
          <Stat icon={<Zap size={20} color={Colors.amber} strokeWidth={2.4} />} value={taskCompletions} label="nudges done" accent={Colors.amber} />
          <Stat icon={<Pill size={20} color={Colors.mint} strokeWidth={2.4} />} value={doseCompletions} label="doses logged" accent={Colors.mint} />
        </View>

        {longestStreak > currentStreak ? (
          <Text style={styles.bestStreak}>Best streak: {longestStreak} days 🔥</Text>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{unlockedCount}/{totalAchievements}</Text>
          </View>
        </View>

        <View style={styles.grid}>
          {achievements.map((a) => {
            const Icon = a.icon;
            return (
              <View key={a.id} style={[styles.badgeCard, !a.unlocked && styles.badgeCardLocked]}>
                <View style={[styles.badgeIcon, { backgroundColor: a.unlocked ? `${a.tint}1A` : Colors.chipBg }]}>
                  {a.unlocked ? <Icon size={26} color={a.tint} strokeWidth={2.2} /> : <Lock size={22} color={Colors.muted} strokeWidth={2.2} />}
                </View>
                <Text style={[styles.badgeTitle, !a.unlocked && styles.lockedText]} numberOfLines={1}>{a.title}</Text>
                <Text style={styles.badgeDesc} numberOfLines={2}>{a.description}</Text>
                {a.unlocked ? (
                  <View style={styles.unlockedRow}>
                    <Check size={13} color={Colors.mint} strokeWidth={3} />
                    <Text style={styles.unlockedText}>Unlocked</Text>
                  </View>
                ) : (
                  <View style={styles.miniTrack}>
                    <View style={[styles.miniFill, { width: `${Math.round(a.ratio * 100)}%`, backgroundColor: a.tint }]} />
                  </View>
                )}
                {!a.unlocked ? <Text style={styles.badgeProgress}>{a.value}/{a.goal}</Text> : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ icon, value, label, accent }: { icon: React.ReactNode; value: number; label: string; accent: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${accent}1A` }]}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  levelCard: {
    backgroundColor: Colors.navy,
    borderRadius: 24,
    padding: 20,
    gap: 14,
  },
  levelTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  levelEyebrow: { color: "#9FB0D8", fontSize: 12, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  levelTitle: { color: "#FFFFFF", fontSize: 26, fontWeight: "800", letterSpacing: -0.5, marginTop: 2 },
  pointsPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100 },
  pointsText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  progressTrack: { height: 10, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.15)", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 100, backgroundColor: Colors.amber },
  progressLabel: { color: "#C7D2EC", fontSize: 12, fontWeight: "600" },
  statRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 8, alignItems: "center", gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 22, fontWeight: "800", color: Colors.ink, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: "600", color: Colors.sub, textAlign: "center" },
  bestStreak: { fontSize: 13, fontWeight: "600", color: Colors.sub, textAlign: "center", marginTop: -4 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 6, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.sub, letterSpacing: 0.3, textTransform: "uppercase" },
  countPill: { backgroundColor: Colors.chipBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  countText: { fontSize: 11, fontWeight: "800", color: Colors.sub },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  badgeCard: { width: "48%", backgroundColor: Colors.surface, borderRadius: 18, padding: 14, gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.line },
  badgeCardLocked: { backgroundColor: "#FCFAF5" },
  badgeIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  badgeTitle: { fontSize: 14, fontWeight: "800", color: Colors.ink },
  lockedText: { color: Colors.sub },
  badgeDesc: { fontSize: 12, color: Colors.sub, lineHeight: 16, minHeight: 32 },
  unlockedRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  unlockedText: { fontSize: 12, fontWeight: "700", color: Colors.mint },
  miniTrack: { height: 6, borderRadius: 100, backgroundColor: Colors.chipBg, overflow: "hidden", marginTop: 4 },
  miniFill: { height: "100%", borderRadius: 100 },
  badgeProgress: { fontSize: 11, fontWeight: "700", color: Colors.muted },
});
