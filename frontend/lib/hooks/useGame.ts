"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import ImageGuessingContract from "../contracts/ImageGuessing";
import { getContractAddress, getStudioUrl } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";
import knownUsernames from "@/data/usernames.json";
import type {
  Room,
  Player,
  Leaderboard,
  RoundResult,
  RoomPlayer,
  TeamInfo,
} from "../contracts/types";

const KNOWN_USERNAMES = knownUsernames as Record<string, string>;

// ------------------------------------------------------------------ //
//  Contract Instance
// ------------------------------------------------------------------ //

export function useGameContract(): ImageGuessingContract | null {
  const { address } = useWallet();
  const contractAddress = getContractAddress();
  const studioUrl = getStudioUrl();

  return useMemo(() => {
    if (!contractAddress) return null;
    return new ImageGuessingContract(contractAddress, address, studioUrl);
  }, [contractAddress, address, studioUrl]);
}

// ------------------------------------------------------------------ //
//  READ HOOKS
// ------------------------------------------------------------------ //

export function useRooms() {
  const contract = useGameContract();
  return useQuery<Room[], Error>({
    queryKey: ["rooms"],
    queryFn: () => (contract ? contract.getRooms() : Promise.resolve([])),
    refetchOnWindowFocus: true,
    staleTime: 3000,
    enabled: !!contract,
  });
}

export function useRoom(roomId: string | null) {
  const contract = useGameContract();
  return useQuery<Room | null, Error>({
    queryKey: ["room", roomId],
    queryFn: () =>
      contract && roomId ? contract.getRoom(roomId) : Promise.resolve(null),
    refetchOnWindowFocus: true,
    refetchInterval: 3000,
    staleTime: 2000,
    enabled: !!contract && !!roomId,
  });
}

export function useRoomPlayers(roomId: string | null) {
  const contract = useGameContract();
  return useQuery<Record<string, RoomPlayer>, Error>({
    queryKey: ["roomPlayers", roomId],
    queryFn: () =>
      contract && roomId
        ? contract.getRoomPlayers(roomId)
        : Promise.resolve({}),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract && !!roomId,
  });
}

export function useCurrentImage(roomId: string | null) {
  const contract = useGameContract();
  return useQuery<string, Error>({
    queryKey: ["currentImage", roomId],
    queryFn: () =>
      contract && roomId
        ? contract.getCurrentImage(roomId)
        : Promise.resolve(""),
    staleTime: 2000,
    enabled: !!contract && !!roomId,
  });
}

export function useRoundResults(roomId: string | null, roundNum: number) {
  const contract = useGameContract();
  return useQuery<RoundResult, Error>({
    queryKey: ["roundResults", roomId, roundNum],
    queryFn: () =>
      contract && roomId
        ? contract.getRoundResults(roomId, roundNum)
        : Promise.resolve({}),
    staleTime: 5000,
    enabled: !!contract && !!roomId && roundNum > 0,
  });
}

export function useLeaderboard(roomId: string | null) {
  const contract = useGameContract();
  return useQuery<Leaderboard, Error>({
    queryKey: ["leaderboard", roomId],
    queryFn: () =>
      contract && roomId
        ? contract.getLeaderboard(roomId)
        : Promise.resolve({}),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract && !!roomId,
  });
}

export function useGlobalLeaderboard() {
  const contract = useGameContract();
  return useQuery<Record<string, Player>, Error>({
    queryKey: ["globalLeaderboard"],
    queryFn: () =>
      contract ? contract.getGlobalLeaderboard() : Promise.resolve({}),
    refetchOnWindowFocus: true,
    staleTime: 5000,
    enabled: !!contract,
  });
}

export function usePlayerStats(address: string | null) {
  const contract = useGameContract();
  return useQuery<Player | null, Error>({
    queryKey: ["player", address],
    queryFn: () =>
      contract && address ? contract.getPlayer(address) : Promise.resolve(null),
    staleTime: 5000,
    enabled: !!contract && !!address,
  });
}

export function useTeams(roomId: string | null) {
  const contract = useGameContract();
  return useQuery<Record<string, TeamInfo>, Error>({
    queryKey: ["teams", roomId],
    queryFn: () =>
      contract && roomId ? contract.getTeams(roomId) : Promise.resolve({}),
    refetchOnWindowFocus: true,
    staleTime: 3000,
    enabled: !!contract && !!roomId,
  });
}

// ------------------------------------------------------------------ //
//  WRITE HOOKS (MUTATIONS)
// ------------------------------------------------------------------ //

export function useCreateRoom() {
  const contract = useGameContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({
      name,
      maxPlayers,
      numTeams,
      totalRounds,
      imageUrls,
    }: {
      name: string;
      maxPlayers: number;
      numTeams: number;
      totalRounds: number;
      imageUrls: string[];
    }) => {
      if (!contract) throw new Error("Contract not configured");
      if (!address) throw new Error("Wallet not connected");
      setIsCreating(true);
      return contract.createRoom(name, maxPlayers, numTeams, totalRounds, imageUrls);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setIsCreating(false);
    },
    onError: (err: any) => {
      console.error("Error creating room:", err);
      setIsCreating(false);
    },
  });

  return { ...mutation, isCreating, createRoom: mutation.mutate };
}

export function useJoinRoom() {
  const contract = useGameContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isJoining, setIsJoining] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({
      roomId,
      username,
      teamId,
    }: {
      roomId: string;
      username: string;
      teamId?: string;
    }) => {
      if (!contract) throw new Error("Contract not configured");
      if (!address) throw new Error("Wallet not connected");
      setIsJoining(true);
      return contract.joinRoom(roomId, username, teamId || "");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["room", variables.roomId] });
      queryClient.invalidateQueries({ queryKey: ["roomPlayers", variables.roomId] });
      queryClient.invalidateQueries({ queryKey: ["teams", variables.roomId] });
      setIsJoining(false);
    },
    onError: (err: any) => {
      console.error("Error joining room:", err);
      setIsJoining(false);
    },
  });

  return { ...mutation, isJoining, joinRoom: mutation.mutate };
}

export function useStartGame() {
  const contract = useGameContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isStarting, setIsStarting] = useState(false);

  const mutation = useMutation({
    mutationFn: async (roomId: string) => {
      if (!contract) throw new Error("Contract not configured");
      if (!address) throw new Error("Wallet not connected");
      setIsStarting(true);
      return contract.startGame(roomId);
    },
    onSuccess: (_, roomId) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["room", roomId] });
      queryClient.invalidateQueries({ queryKey: ["currentImage", roomId] });
      setIsStarting(false);
    },
    onError: (err: any) => {
      console.error("Error starting game:", err);
      setIsStarting(false);
    },
  });

  return { ...mutation, isStarting, startGame: mutation.mutate };
}

export function useSubmitGuess() {
  const contract = useGameContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({
      roomId,
      guessText,
    }: {
      roomId: string;
      guessText: string;
    }) => {
      if (!contract) throw new Error("Contract not configured");
      if (!address) throw new Error("Wallet not connected");
      setIsSubmitting(true);
      return contract.submitGuess(roomId, guessText);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["room", variables.roomId] });
      setIsSubmitting(false);
    },
    onError: (err: any) => {
      console.error("Error submitting guess:", err);
      setIsSubmitting(false);
    },
  });

  return { ...mutation, isSubmitting, submitGuess: mutation.mutate };
}

export function useEvaluateRound() {
  const contract = useGameContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isEvaluating, setIsEvaluating] = useState(false);

  const mutation = useMutation({
    mutationFn: async (roomId: string) => {
      if (!contract) throw new Error("Contract not configured");
      if (!address) throw new Error("Wallet not connected");
      setIsEvaluating(true);
      return contract.evaluateRound(roomId);
    },
    onSuccess: (_, roomId) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["room", roomId] });
      queryClient.invalidateQueries({ queryKey: ["currentImage", roomId] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard", roomId] });
      queryClient.invalidateQueries({ queryKey: ["globalLeaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["teams", roomId] });
      setIsEvaluating(false);
    },
    onError: (err: any) => {
      console.error("Error evaluating round:", err);
      setIsEvaluating(false);
    },
  });

  return { ...mutation, isEvaluating, evaluateRound: mutation.mutate };
}

export function useDbUsernames(addresses: string[]) {
  const normalizedAddresses = Array.from(
    new Set(
      addresses
        .map((address) => address.trim().toLowerCase())
        .filter((address) => address.startsWith("0x"))
    )
  );

  return useQuery({
    queryKey: ["dbUsernames", [...normalizedAddresses].sort().join(",")],
    queryFn: async () => {
      if (!normalizedAddresses.length) return KNOWN_USERNAMES;
      
      const chunked = normalizedAddresses.slice(0, 20); // API caps at 20
      const params = new URLSearchParams({ addresses: chunked.join(",") });
      try {
        const res = await fetch(`/api/username?${params}`);
        if (!res.ok) return KNOWN_USERNAMES;

        const dbUsernames = await res.json() as Record<string, string>;
        return { ...KNOWN_USERNAMES, ...dbUsernames };
      } catch {
        return KNOWN_USERNAMES;
      }
    },
    enabled: normalizedAddresses.length > 0,
    initialData: KNOWN_USERNAMES,
    staleTime: 60000, // cache for 1 min
  });
}
