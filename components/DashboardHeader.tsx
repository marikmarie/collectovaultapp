import storage from "@/src/utils/storage";
import React, { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const logo = require("../assets/images/logo.jpeg");

interface DashboardHeaderProps {
  name?: string;
  onProfilePress?: () => void;
}

export default function DashboardHeader({
  name,
  onProfilePress,
}: DashboardHeaderProps) {
  const [displayName, setDisplayName] = useState(name ?? "");

  useEffect(() => {
    const loadName = async () => {
      if (name) {
        const normalized = name.trim();
        if (
          normalized.toLowerCase() !== "user" &&
          normalized.toLowerCase() !== "guest"
        ) {
          setDisplayName(normalized);
          return;
        }
      }
      try {
        const stored = await storage.getItem("userName");
        if (stored) {
          const normalized = stored.trim();
          if (
            normalized.toLowerCase() !== "user" &&
            normalized.toLowerCase() !== "guest"
          ) {
            setDisplayName(normalized);
          }
        }
      } catch {}
    };
    loadName();
  }, [name]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerTopRow}>
        {/* Logo with Collecto Vault text */}
        <View style={styles.logoTextContainer}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <Text style={styles.vaultText}>Collecto Vault</Text>
        </View>

        {/* Avatar with initial */}
        <TouchableOpacity style={styles.avatarButton} onPress={onProfilePress}>
          <Text style={styles.avatarText}>{initial}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.greetingText}>
        {`${greeting}, ${displayName.split(" ")[0]} 👋`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 12,
    paddingHorizontal: 16, // matches walletCard margin
    paddingBottom: 14,
    backgroundColor: "#fff",
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  logoTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  logo: {
    width: 40,
    height: 40,
  },
  vaultText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#d81b60",
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fce4ec",
    borderWidth: 1.5,
    borderColor: "#d81b60",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#d81b60",
  },
  greetingText: {
    fontSize: 18,
    color: "#d81b60",
    fontWeight: "600",
  },
});
