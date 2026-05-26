"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { getEthereumProvider } from "@/lib/genlayer/client";
import { useWallet } from "@/lib/genlayer/wallet";

interface SessionContextValue {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsUsername: boolean;
  signIn: (addr?: string) => Promise<void>;
  saveUsername: (name: string) => Promise<void>;
  dismissUsernamePrompt: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

const TOKEN_KEY = "picguess_session";

export function SessionProvider({ children }: { children: ReactNode }) {
  const { address, isLoading: isWalletLoading } = useWallet();
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [needsUsername, setNeedsUsername] = useState(false);
  // Track the last address we attempted restore for, to avoid re-running
  const lastRestoredAddr = useRef<string | null>(null);

  // On wallet connect/reconnect: only RESTORE an existing session, never auto-sign-in.
  // This prevents the personal_sign popup from appearing on every refresh.
  useEffect(() => {
    if (isWalletLoading) return;

    if (!address) {
      setToken(null);
      setUsername(null);
      setNeedsUsername(false);
      lastRestoredAddr.current = null;
      return;
    }

    // Don't re-run for the same address
    if (lastRestoredAddr.current === address.toLowerCase()) return;
    lastRestoredAddr.current = address.toLowerCase();

    // Try to restore existing session from storage
    const stored = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.address === address.toLowerCase()) {
          localStorage.setItem(TOKEN_KEY, stored);
          sessionStorage.removeItem(TOKEN_KEY);
          setToken(parsed.token);
          fetchUsername(parsed.token, address);
          return;
        }
      } catch {}
    }

    // No valid stored session — remain unauthenticated.
    // signIn() must be called explicitly (e.g. after user clicks "Connect Wallet").
  }, [address, isWalletLoading]);

  const doSignIn = async (addr: string) => {
    setIsLoading(true);
    try {
      const provider = getEthereumProvider();
      if (!provider) throw new Error("No Web3 wallet found");

      const challengeRes = await fetch(`/api/auth?address=${addr.toLowerCase()}`);
      if (!challengeRes.ok) {
        console.error("Failed to create auth challenge");
        setIsLoading(false);
        return;
      }

      const { message, nonce } = await challengeRes.json();
      const signature = await provider.request({
        method: "personal_sign",
        params: [message, addr],
      });

      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr.toLowerCase(), signature, nonce }),
      });

      if (!res.ok) {
        console.error("Auth failed");
        setIsLoading(false);
        return;
      }

      const { token: newToken } = await res.json();
      setToken(newToken);
      localStorage.setItem(TOKEN_KEY, JSON.stringify({ token: newToken, address: addr.toLowerCase() }));
      sessionStorage.removeItem(TOKEN_KEY);

      // Now fetch username
      await fetchUsername(newToken, addr);
    } catch (err) {
      console.error("Sign-in failed:", err);
    }
    setIsLoading(false);
  };

  // Public signIn — uses the provided address or current wallet address
  const signIn = useCallback(async (addr?: string) => {
    const target = addr || address;
    if (!target) return;
    await doSignIn(target);
  }, [address]);

  const fetchUsername = async (sessionToken: string, addr: string) => {
    try {
      const res = await fetch(`/api/username?address=${addr.toLowerCase()}`, {
        headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.username) {
          setUsername(data.username);
          setNeedsUsername(false);
        } else {
          setNeedsUsername(true);
        }
      }
    } catch (err) {
      console.error("Failed to fetch username:", err);
    }
  };

  const saveUsername = useCallback(async (name: string) => {
    if (!address || !token) return;
    try {
      const provider = getEthereumProvider();
      if (!provider) throw new Error("No Web3 wallet found");

      const message = `Set Pixora username to: ${name}`;
      const signature = await provider.request({
        method: "personal_sign",
        params: [message, address],
      });

      const res = await fetch("/api/username", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          address: address.toLowerCase(),
          username: name,
          signature,
        }),
      });

      if (res.ok) {
        setUsername(name);
        setNeedsUsername(false);
      } else {
        const err = await res.json();
        console.error("Failed to save username:", err);
      }
    } catch (err) {
      console.error("Save username failed:", err);
    }
  }, [address, token]);

  const dismissUsernamePrompt = useCallback(() => {
    setNeedsUsername(false);
  }, []);

  return (
    <SessionContext.Provider
      value={{
        token,
        username,
        isAuthenticated: !!token,
        isLoading,
        needsUsername,
        signIn,
        saveUsername,
        dismissUsernamePrompt,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
