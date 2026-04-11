import { hasVaultOtpToken } from "@/src/api/index";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { authService } from "../api/authService";

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: {
    clientId: string;
    collectoId: string | null;
    userName?: string | null;
  } | null;
  login: (username: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthContextType["user"]>(null);
  const tokenCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  // Boot up: check if user is already logged in
  useEffect(() => {
    bootstrapAsync();
  }, []);

  // Periodically check token validity and force logout when expired
  useEffect(() => {
    if (!user) {
      // Not logged in, no need to check
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
        tokenCheckIntervalRef.current = null;
      }
      return;
    }

    // Check token every 30 seconds
    if (!tokenCheckIntervalRef.current) {
      tokenCheckIntervalRef.current = setInterval(async () => {
        const hasValid = await hasVaultOtpToken();
        if (!hasValid && user) {
          // Token expired, force logout
          console.warn("[AuthContext] Token expired, logging out user");
          await logout();
        }
      }, 40000);
    }

    return () => {
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
        tokenCheckIntervalRef.current = null;
      }
    };
  }, [user]);

  const bootstrapAsync = async () => {
    try {
      // IMPORTANT: Clear all stored auth data to prevent reuse of old sessions
      console.log("[AuthContext] Starting bootstrap - clearing all auth data");

      // Use authService logout to remove specific auth keys
      await authService.logout();
      console.log("[AuthContext] Auth service logout complete");

      // On web, we need to be extra thorough - dynamically import and clear all storage
      try {
        const storageModule = await import("@/src/utils/storage");
        if (storageModule.clearStorage) {
          console.log(
            "[AuthContext] Calling complete storage clear for web safety",
          );
          await storageModule.clearStorage();
        }
      } catch (storageErr) {
        console.warn(
          "[AuthContext] Could not perform full storage clear:",
          storageErr,
        );
      }

      // VERIFY storage is actually empty
      try {
        const verify = await import("@/src/utils/storage");
        const testVal = await verify.getItem("vaultOtpToken");
        if (testVal) {
          console.error(
            "[AuthContext] CRITICAL: vaultOtpToken still found after clear!",
            testVal,
          );
          // Try manual localStorage clear as final resort
          if (typeof window !== "undefined" && window.localStorage) {
            console.error("[AuthContext] Forcing manual localStorage.clear()");
            window.localStorage.clear();
          }
        } else {
          console.log(
            "[AuthContext] Storage verification passed - vaultOtpToken is null",
          );
        }
      } catch (verifyErr) {
        console.warn(
          "[AuthContext] Could not verify storage clear:",
          verifyErr,
        );
      }

      setUser(null);
      console.log("[AuthContext] Bootstrap complete - user cleared");
    } catch (err) {
      console.error("Failed to bootstrap:", err);
      setUser(null); // Ensure user is null even if logout fails
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string) => {
    setIsLoading(true);
    try {
      const result = await authService.loginByUsername({
        username,
        type: "client",
      });
      // After login, refresh user data
      await refreshUser();
    } catch (err) {
      console.error("Login failed:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Clean up token check interval
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
        tokenCheckIntervalRef.current = null;
      }
      await authService.logout();
      setUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    console.log(
      "[AuthContext] refreshUser called - attempting to fetch current user",
    );
    try {
      const currentUser = await authService.getCurrentUser();
      console.log(
        "[AuthContext] getCurrentUser result:",
        currentUser ? `user found: ${currentUser?.clientId}` : "no user",
      );
      setUser(currentUser);
    } catch (err) {
      console.error("Failed to refresh user:", err);
      setUser(null);
    }
  };

  const value: AuthContextType = {
    isLoggedIn: user !== null,
    isLoading,
    user,
    login,
    logout,
    refreshUser,
  };

  // After bootstrap, verify auth is truly cleared
  useEffect(() => {
    if (!isLoading && user === null) {
      // Verify that no tokens exist in storage right after bootstrap
      (async () => {
        try {
          const hasToken = await hasVaultOtpToken();
          if (hasToken) {
            console.warn(
              "[AuthContext] WARNING: Token found in storage after bootstrap! Clearing...",
            );
            // Token shouldn't exist - clear it
            const { clearVaultOtpToken } = await import("@/src/api/index");
            await clearVaultOtpToken();
          }
        } catch (err) {
          console.debug("[AuthContext] Token verification skipped:", err);
        }
      })();
    }
  }, [isLoading, user]);

  // Log all login state changes
  useEffect(() => {
    console.log(
      "[AuthContext] isLoggedIn changed:",
      user !== null,
      "- user:",
      user?.clientId || "null",
    );
  }, [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
