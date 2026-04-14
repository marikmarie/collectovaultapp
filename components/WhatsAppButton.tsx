import React, { useEffect, useState } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from "react-native";
import { getBusinessWhatsAppUrl } from "../src/api/feedback";

interface WhatsAppButtonProps {
  label?: string;
  style?: any;
  onPress?: () => void;
}

export default function WhatsAppButton({
  label = "WhatsApp Us",
  style,
  onPress,
}: WhatsAppButtonProps) {
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWhatsappUrl = async () => {
      try {
        const url = await getBusinessWhatsAppUrl();
        setWhatsappUrl(url);
      } catch (error) {
        console.error("Failed to fetch WhatsApp URL:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWhatsappUrl();
  }, []);

  const handlePress = async () => {
    if (onPress) {
      onPress();
    } else if (whatsappUrl) {
      try {
        await Linking.openURL(whatsappUrl);
      } catch (error) {
        console.error("Failed to open WhatsApp:", error);
      }
    }
  };

  if (loading) {
    return (
      <TouchableOpacity style={[styles.button, style]} disabled>
        <ActivityIndicator color="white" size="small" />
      </TouchableOpacity>
    );
  }

  if (!whatsappUrl) {
    return (
      <TouchableOpacity style={[styles.button, styles.disabledButton]} disabled>
        <Text style={styles.buttonText}>WhatsApp not available</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handlePress}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#25D366",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  disabledButton: {
    backgroundColor: "#D1D5DB",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
});
