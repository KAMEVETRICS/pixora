"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useWallet } from "@/lib/genlayer/wallet";

interface SessionContextValue {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsUsername: boolean;
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

  // Sign in when wallet connects
  useEffect(() => {
    if (isWalletLoading) return;

    if (!address) {
      setToken(null);
      setUsername(null);
      setNeedsUsername(false);
      sessionStorage.removeItem(TOKEN_KEY);
      return;
    }

    // Check for existing session
    const stored = sessionStorage.getItem(TOKEN_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.address === address.toLowerCase()) {
          setToken(parsed.token);
          // Fetch username with existing token
          fetchUsername(parsed.token, address);
          return;
        }
      } catch {}
    }

    // No valid session — sign in
    signIn(address);
  }, [address, isWalletLoading]);

  const signIn = async (addr: string) => {
    setIsLoading(true);
    try {
      const provider = (window as any).ethereum;
      const message = "Sign in to PicGuess";
      const signature = await provider.request({
        method: "personal_sign",
        params: [message, addr],
      });

      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr.toLowerCase(), signature }),
      });

      if (!res.ok) {
        console.error("Auth failed");
        setIsLoading(false);
        return;
      }

      const { token: newToken } = await res.json();
      setToken(newToken);
      sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token: newToken, address: addr.toLowerCase() }));

      // Now fetch username
      await fetchUsername(newToken, addr);
    } catch (err) {
      console.error("Sign-in failed:", err);
    }
    setIsLoading(false);
  };

  const fetchUsername = async (sessionToken: string, addr: string) => {
    try {
      const res = await fetch(`/api/username?address=${addr.toLowerCase()}`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
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
      const provider = (window as any).ethereum;
      const message = `Set PicGuess username to: ${name}`;
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
