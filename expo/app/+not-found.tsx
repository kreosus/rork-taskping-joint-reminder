import { Link, Stack } from "expo-router";
import { Ghost } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Lost" }} />
      <View style={styles.container}>
        <View style={styles.icon}>
          <Ghost size={36} color={Colors.coral} strokeWidth={2} />
        </View>
        <Text style={styles.title}>This page wandered off.</Text>
        <Text style={styles.sub}>Try heading back home.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to Inbox</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 8,
    backgroundColor: Colors.bg,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFE4DE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  title: { fontSize: 20, fontWeight: "800", color: Colors.ink },
  sub: { fontSize: 14, color: Colors.sub, marginBottom: 8 },
  link: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 22,
    backgroundColor: Colors.ink,
    borderRadius: 100,
  },
  linkText: { fontSize: 14, color: "#fff", fontWeight: "800" },
});
