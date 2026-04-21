import api from "@/src/api";
import { customerService } from "@/src/api/customer";
import { useAuth } from "@/src/context/AuthContext";
import storage from "@/src/utils/storage";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState, useRef } from "react";
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

interface AddCashModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  clientAddCash?: {
    charge: number;
    charge_client: number;
  };
}

export default function AddCashModal({
  visible,
  onClose,
  onSuccess,
  clientAddCash,
}: AddCashModalProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [fetchedClientAddCash, setFetchedClientAddCash] = useState<any>(null);
  const [chargeAmount, setChargeAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  // Payment result / status tracking
  const [paymentResult, setPaymentResult] = useState<null | {
    transactionId: string | null;
    message?: string;
    status?: string;
  }>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [lastQueriedStatus, setLastQueriedStatus] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      setAmount("");
      setPhone("");
      setLoading(false);
      setVerifying(false);
      setVerified(false);
      setAccountName(null);
      setPhoneError(null);
      setPaymentResult(null);
      setQueryError(null);
      setLastQueriedStatus(null);

      // Fetch clientAddCash if not provided
      if (!clientAddCash && user?.clientId) {
        fetchClientAddCash();
      }
    } else {
      // Clean up polling on close
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  }, [visible, clientAddCash, user?.clientId]);

  // Auto-polling effect
  useEffect(() => {
    const txId = paymentResult?.transactionId ?? null;

    if (!txId) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    if (lastQueriedStatus === "success" || lastQueriedStatus === "failed") {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    if (!pollIntervalRef.current) {
      pollIntervalRef.current = setInterval(async () => {
        await queryTxStatus(txId);
      }, 10000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [paymentResult?.transactionId, lastQueriedStatus]);

  const fetchClientAddCash = async () => {
    try {
      const collectoId = await storage.getItem("collectoId");
      if (!collectoId || !user?.clientId) return;
      const customerRes = await customerService.getCustomerData(
        collectoId,
        user.clientId,
      );
      const loyaltySettings = customerRes.data?.data?.loyaltySettings ?? {};
      setFetchedClientAddCash(loyaltySettings?.client_add_cash);
    } catch (err) {
      console.error("Failed to fetch clientAddCash:", err);
    }
  };

  const handleClose = () => {
    // Clean up polling before closing
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setPaymentResult(null);
    setLastQueriedStatus(null);
    setQueryError(null);
    onClose();
  };

  const verifyPhone = async () => {
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
        setPhoneError(null);
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
      verifyPhone();
    }
  }, [phone, verified, verifying]);

  useEffect(() => {
    const numAmount = Number(amount) || 0;
    const effectiveClientAddCash = clientAddCash || fetchedClientAddCash;
    if (effectiveClientAddCash && effectiveClientAddCash.charge_client === 1) {
      const charge = (numAmount * effectiveClientAddCash.charge) / 100;
      setChargeAmount(charge);
      setTotalAmount(numAmount + charge);
    } else {
      setChargeAmount(0);
      setTotalAmount(numAmount);
    }
  }, [amount, clientAddCash, fetchedClientAddCash]);

  const queryTxStatus = async (txIdParam?: string | null) => {
    const finalTxId = txIdParam ?? paymentResult?.transactionId;

    if (!finalTxId) {
      setQueryError("No transaction ID found to track.");
      return;
    }

    setQueryLoading(true);
    setQueryError(null);

    try {
      const vaultOTPToken = await storage.getItem("vaultOtpToken");
      const collectoId = await storage.getItem("collectoId");
      const clientId = user?.clientId;

      const res = await api.post("/requestToPayStatus", {
        vaultOTPToken,
        collectoId,
        clientId,
        transactionId: String(finalTxId),
        clientAddCash: clientAddCash || fetchedClientAddCash || undefined,
      });

      const data = res?.data ?? {};

      const statusRaw =
        data?.status ??
        data?.payment?.status ??
        data?.paymentStatus ??
        data?.data?.status ??
        data?.data?.paymentStatus ??
        data?.status_message ??
        data?.payment?.status_message ??
        "pending";

      const status = String(statusRaw).toLowerCase().trim();

      const message =
        data?.message ??
        data?.status_message ??
        data?.payment?.message ??
        null;

      if (["confirmed", "success", "paid", "completed", "true", "successful", "successfull"].includes(status)) {
        setLastQueriedStatus("success");
        setQueryError(null);
        setPaymentResult((prev) =>
          prev ? { ...prev, status: "success", message } : prev,
        );
        onSuccess?.();
      } else if (["pending", "processing", "in_progress"].includes(status)) {
        setLastQueriedStatus("pending");
        setQueryError(null);
        setPaymentResult((prev) =>
          prev ? { ...prev, status: "pending", message } : prev,
        );
      } else if (["failed", "false"].includes(status)) {
        setLastQueriedStatus("failed");
        setQueryError(null);
        setPaymentResult((prev) =>
          prev ? { ...prev, status: "failed", message } : prev,
        );
      } else {
        setQueryError(message || "Transaction status unknown.");
      }
    } catch (err: any) {
      console.error("Status Query Error:", err);
      setQueryError(
        err?.response?.data?.message || "Unable to reach payment server.",
      );
    } finally {
      setQueryLoading(false);
    }
  };

  const handleAddCash = async () => {
    if (!verified) {
      Alert.alert(
        "Verify phone",
        "Please verify your phone number before proceeding.",
      );
      return;
    }

    const numAmount = Number(amount);
    if (!amount || numAmount <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid amount to add.");
      return;
    }

    if (numAmount <= 500) {
      Alert.alert("Minimum amount", "The amount must be greater than 500 UGX.");
      return;
    }

    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      Alert.alert("Missing phone", "Please enter your mobile money number.");
      return;
    }

    setLoading(true);
    try {
      const vaultOTPToken = await storage.getItem("vaultOtpToken");
      const collectoId = await storage.getItem("collectoId");

      let effectiveClientAddCash = clientAddCash || fetchedClientAddCash;
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
        clientId: user?.clientId,
        paymentOption: "mobilemoney",
        phone: trimmedPhone.replace(/^0/, "256"),
        amount: Number(amount),
        reference: `ADDCASH-${Date.now()}`,
        clientAddCash: effectiveClientAddCash || {
          charge: 0,
          charge_client: 0,
        },
      });

      console.log("Add Cash Request Payload:", {
        vaultOTPToken,
        collectoId,
        clientId: user?.clientId,
        paymentOption: "mobilemoney",
        phone: trimmedPhone.replace(/^0/, "256"),
        amount: Number(amount),
        reference: `ADDCASH-${Date.now()}`,
        clientAddCash: effectiveClientAddCash || {
          charge: 0,
          charge_client: 0,
        },
      });

      console.log("Add Cash Response:", res.data);

      const responseData = res.data ?? {};
      const innerData = responseData.data ?? responseData;
      const txId = innerData.transactionId ?? innerData.transaction_id ?? innerData.id ?? responseData.transactionId ?? responseData.transaction_id ?? responseData.id ?? null;
      const status = String(responseData?.status ?? "").toLowerCase();

      if (txId && (status === "200" || status === "success" || txId)) {
        // Set payment result to start polling
        setPaymentResult({
          transactionId: txId,
          status: "pending",
          message: innerData?.message ?? responseData?.message ?? "Payment request sent. Waiting for confirmation...",
        });
        setLastQueriedStatus("pending");
        // Start querying immediately
        setTimeout(() => queryTxStatus(txId), 1000);
      } else {
        Alert.alert(
          "Failed",
          innerData?.message ?? responseData?.message ?? "Could not initiate payment",
        );
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Cash</Text>
            <TouchableOpacity onPress={handleClose}>
              <Feather name="x" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={true}
          >
            {!paymentResult ? (
              <>
                <Text style={styles.sectionTitle}>
                  Add funds using mobile money
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Amount (UGX)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 10000 (min 501 UGX)"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                    editable={!loading}
                  />
                  {chargeAmount > 0 && (
                    <View style={styles.chargeBreakdown}>
                      <Text style={styles.chargeText}>
                        Service Charge: UGX {chargeAmount.toLocaleString()}
                      </Text>
                      <Text style={styles.totalText}>
                        Total to Pay: UGX {totalAmount.toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <View style={styles.phoneInputGroup}>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="07XXXXXXXX"
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={(value) => {
                        setPhone(value);
                        setVerified(false);
                        setAccountName(null);
                        setPhoneError(null);
                      }}
                      editable={!loading && !verifying}
                      maxLength={10}
                    />
                    {verifying && (
                      <Text style={styles.statusText}>Verifying...</Text>
                    )}
                  </View>

                  {phoneError ? (
                    <Text style={styles.errorText}>{phoneError}</Text>
                  ) : null}

                  {verified && accountName && (
                    <View style={styles.accountBox}>
                      <Feather name="check-circle" size={20} color="#4caf50" />
                      <View style={styles.accountInfo}>
                        <Text style={styles.accountName}>{accountName}</Text>
                      </View>
                    </View>
                  )}
                </View>

                <Text style={styles.helpText}>
                  After confirming the payment on your phone, your wallet and
                  transaction history will update shortly.
                </Text>
              </>
            ) : (
              <View style={styles.statusContainer}>
                {paymentResult.status === "pending" && (
                  <>
                    <View style={styles.statusIcon}>
                      <ActivityIndicator size="large" color="#1976d2" />
                    </View>
                    <Text style={styles.statusTitle}>Processing</Text>
                    <Text style={styles.statusMessage}>
                      {paymentResult.message || "Verifying your payment..."}
                    </Text>
                  </>
                )}

                {paymentResult.status === "success" && (
                  <>
                    <View style={[styles.statusIcon, { backgroundColor: "#e8f5e9" }]}>
                      <Feather name="check-circle" size={48} color="#4caf50" />
                    </View>
                    <Text style={[styles.statusTitle, { color: "#2e7d32" }]}>Payment Confirmed</Text>
                    <Text style={styles.statusMessage}>
                      {paymentResult.message || "Your cash has been added successfully!"}
                    </Text>
                    <View style={styles.txIdBox}>
                      <Text style={styles.txIdLabel}>Transaction ID</Text>
                      <Text style={styles.txIdValue}>{paymentResult.transactionId}</Text>
                    </View>
                  </>
                )}

                {paymentResult.status === "failed" && (
                  <>
                    <View style={[styles.statusIcon, { backgroundColor: "#ffebee" }]}>
                      <Feather name="alert-circle" size={48} color="#c62828" />
                    </View>
                    <Text style={[styles.statusTitle, { color: "#c62828" }]}>Payment Failed</Text>
                    <Text style={styles.statusMessage}>
                      {paymentResult.message || "Your payment could not be processed."}
                    </Text>
                  </>
                )}

                {queryError && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{queryError}</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {!paymentResult ? (
              <>
                <TouchableOpacity
                  style={[styles.proceedBtn, loading && styles.proceedBtnDisabled]}
                  onPress={handleAddCash}
                  disabled={loading || !verified || !amount}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.proceedBtnText}>Request Payment</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleClose}
                  disabled={loading}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {paymentResult.status === "pending" && (
                  <>
                    <TouchableOpacity
                      style={[styles.proceedBtn, queryLoading && styles.proceedBtnDisabled]}
                      onPress={() => queryTxStatus(paymentResult.transactionId)}
                      disabled={queryLoading}
                    >
                      {queryLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.proceedBtnText}>Check Status</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}

                {paymentResult.status === "success" && (
                  <TouchableOpacity
                    style={styles.proceedBtn}
                    onPress={handleClose}
                  >
                    <Text style={styles.proceedBtnText}>Close</Text>
                  </TouchableOpacity>
                )}

                {paymentResult.status === "failed" && (
                  <>
                    <TouchableOpacity
                      style={styles.proceedBtn}
                      onPress={() => {
                        setPaymentResult(null);
                        setLastQueriedStatus(null);
                        setQueryError(null);
                      }}
                    >
                      <Text style={styles.proceedBtnText}>Try Again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={handleClose}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
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
  sectionTitle: {
    fontSize: 14,
    color: "#555",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1a1a1a",
  },
  phoneInputGroup: {
    flexDirection: "column",
    gap: 8,
  },
  phoneInput: {
    width: "100%",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  statusText: {
    color: "#666",
    fontSize: 12,
  },
  statusTextSuccess: {
    color: "#2e7d32",
    fontSize: 12,
    fontWeight: "700",
  },
  verifyBtn: {
    backgroundColor: "#d81b60",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  verifyBtnDisabled: {
    opacity: 0.7,
    backgroundColor: "#999",
  },
  verifyBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
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
  helpText: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 16,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    gap: 8,
  },
  proceedBtn: {
    flex: 0.7,
    backgroundColor: "#d81b60",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#d81b60",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  proceedBtnDisabled: {
    opacity: 0.6,
  },
  proceedBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  cancelBtn: {
    flex: 0.3,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d81b60",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 14,
  },
  chargeBreakdown: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  chargeText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  totalText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#d81b60",
  },
  statusContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  statusIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#e3f2fd",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1976d2",
    marginBottom: 8,
    textAlign: "center",
  },
  statusMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  txIdBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f1f8e9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#c6e6a8",
    width: "100%",
  },
  txIdLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  txIdValue: {
    fontSize: 13,
    fontFamily: "monospace",
    fontWeight: "700",
    color: "#333",
  },
  errorBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#ffebee",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f8bbd0",
    width: "100%",
  },
});
