import api from "@/src/api";
import { useAuth } from "@/src/context/AuthContext";
import storage from "@/src/utils/storage";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface Package {
  id: string | number;
  points: number;
  price: number;
  label?: string;
  recommended?: boolean;
}

interface BuyPointsModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (points: number) => void;
}

type ModalStep = "select" | "confirm" | "success" | "failure";

export default function BuyPointsModal({
  visible,
  onClose,
  onSuccess,
}: BuyPointsModalProps) {
  const { user } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [step, setStep] = useState<ModalStep>("select");
  const [paymentMode, setPaymentMode] = useState<"mobilemoney" | "bank">(
    "mobilemoney",
  );
  const [phone, setPhone] = useState("");
  const [accountName, setAccountName] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | number | null>(null);
  const [txStatus, setTxStatus] = useState<
    "idle" | "pending" | "success" | "failed"
  >("idle");

  const [fetchedClientAddCash, setFetchedClientAddCash] = useState<any>(null);
  const [chargeAmount, setChargeAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedPackage = packages.find(
    (p) => String(p.id) === String(selectedId),
  );

  // Fetch packages
  useEffect(() => {
    if (!visible) return;

    const fetchPackages = async () => {
      try {
        setLoadingPackages(true);
        const collectoId = await storage.getItem("collectoId");
        const clientId = user?.clientId;

        const res = await api.post("/loyaltySettings", {
          collectoId,
          clientId,
        });
        const loyaltySettings = res?.data?.data?.loyaltySettings ?? {};
        const tiers = loyaltySettings.purchase_tiers ?? [];

        const mapped = (tiers || []).map((tier: any, index: number) => ({
          id: tier.id ?? `${tier.name}-${tier.points}-${tier.cost}-${index}`,
          points: tier.points ?? 0,
          price: tier.cost ?? 0,
          recommended: false,
          label: tier.name || `Package ${index + 1}`,
        }));
        setPackages(mapped);
        setFetchedClientAddCash(loyaltySettings?.client_add_cash);
      } catch (err) {
        console.error("Failed to load packages", err);
        setError("Could not load packages. Please try again later.");
      } finally {
        setLoadingPackages(false);
      }
    };

    // Reset state
    setSelectedId(null);
    setPhone("");
    setStep("select");
    setError(null);
    setVerified(false);
    setAccountName(null);
    setPhoneError(null);
    setChargeAmount(0);
    setTotalAmount(0);

    fetchPackages();
  }, [visible]);

  // Verify phone
  const verifyPhoneNumber = async () => {
    const trimmed = String(phone || "").trim();

    if (!trimmed || trimmed.length < 10) {
      setPhoneError("Please enter a valid 10-digit phone number");
      return;
    }

    try {
      setVerifying(true);
      setPhoneError(null);
      const vaultOTPToken = await storage.getItem("vaultOtpToken");
      const collectoId = await storage.getItem("collectoId");
      const clientId = user?.clientId;

      const res = await api.post("/verifyPhoneNumber", {
        vaultOTPToken,
        collectoId,
        clientId,
        phoneNumber: trimmed,
      });

      const payload = res?.data ?? {};
      const nested = payload?.data ?? {};
      const deeper = nested?.data ?? {};

      const name =
        (deeper?.name && String(deeper.name).trim()) ||
        (nested?.name && String(nested.name).trim()) ||
        (payload?.name && String(payload.name).trim()) ||
        null;

      const verifiedFlag = Boolean(
        nested?.verifyPhoneNumber ??
        deeper?.verifyPhoneNumber ??
        String(payload?.status_message ?? "").toLowerCase() === "success",
      );

      if (verifiedFlag) {
        setVerified(true);
        setAccountName(name);
      } else {
        setVerified(false);
        setAccountName(null);
        setPhoneError(nested?.message ?? "Could not verify the phone number");
      }
    } catch (err: any) {
      setAccountName(null);
      setVerified(false);
      setPhoneError(err?.response?.data?.message ?? "Could not verify phone");
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (phone.trim().length === 10 && !verified && !verifying) {
      verifyPhoneNumber();
    }
  }, [phone, verified, verifying]);
  useEffect(() => {
    const numAmount = selectedPackage?.price || 0;
    if (fetchedClientAddCash && fetchedClientAddCash.charge_client === 1) {
      const charge = (numAmount * fetchedClientAddCash.charge) / 100;
      setChargeAmount(charge);
      setTotalAmount(numAmount + charge);
    } else {
      setChargeAmount(0);

      setTotalAmount(numAmount);
    }
  }, [selectedPackage, fetchedClientAddCash]);
  // Auto-navigate to confirm when a package is selected
  useEffect(() => {
    if (selectedId && step === "select") {
      setStep("confirm");
    }
  }, [selectedId, step]);

  // Handle payment
  const handleConfirmPayment = async () => {
    if (!selectedPackage) return;

    if (selectedPackage.price <= 500) {
      Alert.alert(
        "Invalid package",
        "The selected package price must be greater than 500 UGX.",
      );
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const vaultOTPToken = await storage.getItem("vaultOtpToken");
      const collectoId = await storage.getItem("collectoId");
      const clientId = user?.clientId;

      const formattedPhone = phone ? phone.replace(/^0/, "256") : phone;

      let effectiveClientAddCash = fetchedClientAddCash;
      if (effectiveClientAddCash) {
        effectiveClientAddCash = { ...effectiveClientAddCash };
        effectiveClientAddCash.charge =
          effectiveClientAddCash.charge_client === 1
            ? effectiveClientAddCash.charge
            : 0;
      }

      const res = await api.post("/requestToPay", {
        vaultOTPToken,
        collectoId,
        clientId,
        phone: formattedPhone,
        paymentOption: paymentMode,
        amount: selectedPackage.price,
        points: { points_used: selectedPackage.points },
        purchaseTier: {
          cost: selectedPackage.price,
          name: selectedPackage.label,
          points: selectedPackage.points,
        },
        // clientAddCash: effectiveClientAddCash || {
        //   charge: 0,
        //   charge_client: 0,
        // },
        reference: `BUYPOINTS-${Date.now()}`,
      });

      const data = res?.data;
      const apiStatus = String(data?.status || "");
      const transactionId =
        data?.data?.transactionId || data?.transactionId || null;

      if (apiStatus === "200" && transactionId) {
        setTxId(transactionId);
        setTxStatus("pending");
        setStep("confirm");

        // Start polling for status
        setTimeout(() => {
          queryTxStatus(transactionId);
        }, 500);
      } else if (String(data?.status_message).toLowerCase() === "success") {
        setTxStatus("success");
        setStep("success");
        onSuccess?.(selectedPackage.points);
      } else {
        setError("Payment failed. Please try again.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  // Query transaction status
  const queryTxStatus = async (txId: string | number) => {
    try {
      const vaultOTPToken = await storage.getItem("vaultOtpToken");
      const collectoId = await storage.getItem("collectoId");
      const clientId = user?.clientId;

      const res = await api.post("/queryTransactionStatus", {
        vaultOTPToken,
        collectoId,
        clientId,
        transactionId: txId,
      });

      const status = String(res.data?.status ?? "").toLowerCase();
      if (status === "success") {
        setTxStatus("success");
        setStep("success");
        onSuccess?.(selectedPackage?.points || 0);
        // Clear polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      } else if (status === "failed") {
        setTxStatus("failed");
        setStep("failure");
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      }
    } catch (err: any) {
      console.error("Error querying status:", err);
    }
  };

  // Setup polling
  useEffect(() => {
    const queryId = txId;

    if (!queryId || txStatus === "success" || txStatus === "failed") {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    if (!pollIntervalRef.current) {
      pollIntervalRef.current = setInterval(async () => {
        await queryTxStatus(queryId);
      }, 10000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [txId, txStatus]);

  const handleClose = () => {
    // Reset state
    setSelectedId(null);
    setPhone("");
    setStep("select");
    setError(null);
    setVerified(false);
    setAccountName(null);
    setPhoneError(null);
    setTxId(null);
    setTxStatus("idle");
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Buy Points</Text>
            <TouchableOpacity onPress={handleClose}>
              <Feather name="x" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={true}
          >
            {step === "select" && (
              <>
                {loadingPackages ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#d81b60" />
                  </View>
                ) : (
                  <>
                    <Text style={styles.sectionTitle}>Select a Package</Text>
                    <View style={styles.packagesGrid}>
                      {packages.map((pkg) => (
                        <TouchableOpacity
                          key={String(pkg.id)}
                          style={[
                            styles.packageCard,
                            String(selectedId) === String(pkg.id) &&
                              styles.packageCardSelected,
                          ]}
                          onPress={() => setSelectedId(pkg.id)}
                        >
                          {pkg.recommended && (
                            <View style={styles.recommendedBadge} />
                          )}
                          <Text style={styles.packagePoints}>{pkg.points}</Text>
                          <Text style={styles.packagePointsLabel}>Points</Text>
                          <Text style={styles.packagePrice}>
                            UGX {pkg.price.toLocaleString()}
                          </Text>
                          {pkg.label && (
                            <Text style={styles.packageLabel}>{pkg.label}</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </>
            )}

            {step === "confirm" && selectedPackage && (
              <>
                {/* Status feedback - SHOW AT TOP if exists */}
                {txStatus !== "idle" && (
                  <View style={styles.statusFeedback}>
                    <View style={styles.statusHeader}>
                      {txStatus === "success" && (
                        <Feather
                          name="check-circle"
                          size={20}
                          color="#4caf50"
                        />
                      )}
                      {txStatus === "failed" && (
                        <Feather name="x-circle" size={20} color="#f44336" />
                      )}
                      {txStatus === "pending" && (
                        <ActivityIndicator size="small" color="#2196f3" />
                      )}
                      <Text
                        style={[
                          styles.statusText,
                          txStatus === "success" && styles.statusTextSuccess,
                          txStatus === "failed" && styles.statusTextFailed,
                          txStatus === "pending" && styles.statusTextPending,
                        ]}
                      >
                        {txStatus === "success"
                          ? "Payment Confirmed!"
                          : txStatus === "failed"
                            ? "Payment Failed"
                            : "Processing Payment..."}
                      </Text>
                    </View>

                    {txStatus === "success" && (
                      <Text style={styles.statusSubtext}>
                        Points have been added to your account
                      </Text>
                    )}
                    {txStatus === "failed" && (
                      <Text style={styles.statusSubtext}>
                        Your payment was declined. Please try again.
                      </Text>
                    )}
                    {txStatus === "pending" && (
                      <View style={styles.pendingActions}>
                        <Text style={styles.statusSubtext}>
                          Checking status automatically...
                        </Text>
                        <TouchableOpacity
                          style={styles.checkButton}
                          onPress={() => txId && queryTxStatus(txId)}
                          disabled={false}
                        >
                          <Text style={styles.checkButtonText}>Check</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                <Text style={styles.sectionTitle}>Confirm Purchase</Text>

                {/* Package Summary */}
                <View style={styles.summaryBox}>
                  <View>
                    <Text style={styles.summaryLabel}>You will receive</Text>
                    <Text style={styles.summaryValue}>
                      {selectedPackage.points} Points
                    </Text>
                  </View>
                  <View style={styles.divider} />
                  <View>
                    <Text style={styles.summaryLabel}>Payment Amount</Text>
                    <Text style={styles.summaryValue}>
                      UGX {selectedPackage.price.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Phone Verification */}
                {paymentMode === "mobilemoney" && (
                  <>
                    <Text style={styles.sectionTitle}>Phone Number</Text>

                    <View style={styles.phoneInputGroup}>
                      <TextInput
                        style={styles.phoneInput}
                        placeholder="07XXXXXXXX"
                        placeholderTextColor="#ccc"
                        value={phone}
                        onChangeText={(value) => {
                          setPhone(value);
                          setVerified(false);
                          setAccountName(null);
                          setPhoneError(null);
                        }}
                        editable={!verifying}
                        keyboardType="phone-pad"
                        maxLength={10}
                      />
                      <View style={styles.phoneStatusContainer}>
                        {verifying && (
                          <Text style={styles.phoneStatusText}>
                            Verifying...
                          </Text>
                        )}
                        {!verifying && verified}
                      </View>
                    </View>

                    {phoneError && (
                      <Text style={styles.errorText}>{phoneError}</Text>
                    )}

                    {verified && accountName && (
                      <View style={styles.accountBox}>
                        <Feather
                          name="check-circle"
                          size={20}
                          color="#4caf50"
                        />
                        <View style={styles.accountInfo}>
                          {/* <Text style={styles.accountLabel}>Recipient Name</Text> */}
                          <Text style={styles.accountName}>{accountName}</Text>
                        </View>
                      </View>
                    )}
                  </>
                )}

                {error && <Text style={styles.errorText}>{error}</Text>}
              </>
            )}

            {step === "success" && (
              <View style={styles.successContainer}>
                <Feather name="check-circle" size={60} color="#4caf50" />
                <Text style={styles.successTitle}>Payment Successful!</Text>
                <Text style={styles.successSubtitle}>
                  {selectedPackage?.points} points have been added to your
                  account
                </Text>
              </View>
            )}

            {step === "failure" && (
              <View style={styles.failureContainer}>
                <Feather name="x-circle" size={60} color="#f44336" />
                <Text style={styles.failureTitle}>Payment Failed</Text>
                <Text style={styles.failureSubtitle}>
                  Please try again or contact support
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {step === "confirm" && (
              <View style={styles.confirmActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setStep("select")}
                >
                  <Text style={styles.cancelBtnText}>Change details</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.proceedBtn,
                    (processing || txStatus === "pending") &&
                      styles.proceedBtnDisabled,
                  ]}
                  onPress={handleConfirmPayment}
                  disabled={!verified || processing || txStatus === "pending"}
                >
                  <Text style={styles.proceedBtnText}>
                    {processing
                      ? "Processing..."
                      : txStatus === "pending"
                        ? "Payment Sent"
                        : "Confirm Payment"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {(step === "success" || step === "failure") && (
              <TouchableOpacity style={styles.proceedBtn} onPress={handleClose}>
                <Text style={styles.proceedBtnText}>Done</Text>
              </TouchableOpacity>
            )}

            {step === "select" && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleClose}
                disabled={processing}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  body: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  packagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  packageCard: {
    width: 140,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    marginBottom: 12,
  },
  packageCardSelected: {
    backgroundColor: "#fff0f6",
    borderColor: "#d81b60",
  },
  recommendedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ffc107",
  },
  packagePoints: {
    fontSize: 18,
    fontWeight: "700",
    color: "#d81b60",
  },
  packagePointsLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#999",
    marginTop: 2,
  },
  packagePrice: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1a1a1a",
    marginTop: 8,
  },
  packageLabel: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
  },
  summaryBox: {
    backgroundColor: "#fff5f5",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#999",
    textTransform: "uppercase",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#d81b60",
    marginTop: 4,
  },
  chargeLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
  },
  chargeValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#999",
    textTransform: "uppercase",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#d81b60",
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: "#ddd",
  },
  phoneInputGroup: {
    flexDirection: "column",
    gap: 8,
    marginBottom: 12,
  },
  phoneInput: {
    width: "100%",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  phoneStatusContainer: {
    minHeight: 18,
  },
  phoneStatusText: {
    color: "#666",
    fontSize: 12,
  },
  phoneStatusTextSuccess: {
    color: "#2e7d32",
    fontSize: 12,
    fontWeight: "700",
  },
  verifyBtn: {
    backgroundColor: "#d81b60",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  verifyBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  errorText: {
    color: "#f44336",
    fontSize: 12,
    marginTop: 8,
  },
  accountBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e9",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#666",
  },
  accountName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2e7d32",
  },
  successContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginTop: 12,
  },
  successSubtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  failureContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  failureTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginTop: 12,
  },
  failureSubtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 8,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    gap: 8,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  proceedBtn: {
    backgroundColor: "#d81b60",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    flex: 1,
    shadowColor: "#d81b60",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 2,
  },
  cancelBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d81b60",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    flex: 1,
  },
  proceedBtnDisabled: {
    opacity: 0.5,
  },
  proceedBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  cancelBtnText: {
    color: "#d81b60",
    fontWeight: "700",
    fontSize: 14,
  },
  statusFeedback: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "700",
  },
  statusTextSuccess: {
    color: "#4caf50",
  },
  statusTextFailed: {
    color: "#f44336",
  },
  statusTextPending: {
    color: "#2196f3",
  },
  statusSubtext: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  pendingActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  checkButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#2196f3",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  checkButtonText: {
    color: "#2196f3",
    fontSize: 12,
    fontWeight: "600",
  },
});
