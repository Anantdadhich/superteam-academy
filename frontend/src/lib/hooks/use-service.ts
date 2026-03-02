"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { Transaction } from "@solana/web3.js";
import { getProgram } from "@/lib/solana/program";
import { fetchLearnerProfile, fetchConfig } from "@/lib/solana/readers";
import {
  buildInitLearnerTx,
  buildEnrollTx,
  buildUnenrollTx,
  buildCloseEnrollmentTx,
  buildRegisterReferralTx,
  ensureATAInstruction,
} from "@/lib/solana/transactions";
import { getLearnerTokenAccount } from "@/lib/solana/pda";

export function useXP() {
  const { publicKey } = useWallet();
  const userId = publicKey?.toBase58() ?? "guest";

  return useQuery({
    queryKey: ["xp", userId],
    queryFn: async () => {
      if (userId === "guest" || !publicKey) return 0;
      const config = await fetchConfig();
      if (!config) return 0;
      const { fetchXPBalance } = await import("@/lib/solana/readers");
      return await fetchXPBalance(publicKey, config.xpMint);
    },
    staleTime: 30_000,
  });
}

export function useLevel() {
  const { publicKey } = useWallet();
  const userId = publicKey?.toBase58() ?? "guest";

  return useQuery({
    queryKey: ["level", userId],
    queryFn: async () => {
      if (!publicKey) return 1;
      const { fetchLearnerProfile } = await import("@/lib/solana/readers");
      const profile = await fetchLearnerProfile(publicKey);
      return profile ? profile.level : 1;
    },
    staleTime: 30_000,
  });
}

export function useStreak() {
  const { publicKey } = useWallet();
  const userId = publicKey?.toBase58() ?? "guest";

  return useQuery({
    queryKey: ["streak", userId],
    queryFn: async () => {
      if (!publicKey) return { current: 0, longest: 0, lastDay: 0, history: [] };
      const { fetchLearnerProfile } = await import("@/lib/solana/readers");
      const profile = await fetchLearnerProfile(publicKey);
      // Fallback response based on on-chain initialization state
      if (!profile) return { current: 0, longest: 0, lastDay: 0, history: [] };

      return {
        current: profile.xpBalance > 0 ? 1 : 0,
        longest: profile.xpBalance > 0 ? 1 : 0,
        lastDay: profile.initializedAt,
        history: [],
      };
    },
    staleTime: 30_000,
  });
}

export function useProgress(courseId: string) {
  const { publicKey } = useWallet();
  const userId = publicKey?.toBase58() ?? "guest";

  return useQuery({
    queryKey: ["progress", userId, courseId],
    queryFn: async (): Promise<any | null> => {
      if (!publicKey) return null;
      const { fetchEnrollment, fetchCourse, popcountBitmap } = await import("@/lib/solana/readers");
      const enrollment = await fetchEnrollment(courseId, publicKey);
      if (!enrollment) return null;

      const course = await fetchCourse(courseId);
      const totalLessons = course ? course.lessonCount : 0;
      const completedCount = popcountBitmap(enrollment.lessonFlags);

      return {
        completed: completedCount === totalLessons,
        percentComplete: totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0,
        completedCount,
        // Since it's a raw bitmask on chain, we deduce index completion on-the-fly when rendering
        enrollmentDate: enrollment.initializedAt,
      };
    },
    staleTime: 10_000,
  });
}

// Temporary fallback for useAllProgress since we need mapping
export function useAllProgress() {
  const { publicKey } = useWallet();
  const userId = publicKey?.toBase58() ?? "guest";

  return useQuery({
    queryKey: ["allProgress", userId],
    queryFn: async () => {
      // Return an empty array placeholder for MVP compatibility
      return [];
    },
    staleTime: 10_000,
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => [], // MVP placeholder
    staleTime: 60_000,
  });
}

export function useCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: async () => [], // Loaded via sanity-courses later
    staleTime: 60_000,
  });
}

export function useCourse() {
  return useQuery({
    queryKey: ["course"],
    queryFn: async () => null, // Loaded via sanity-courses
    staleTime: 60_000,
  });
}

export function useAchievements() {
  return useQuery({
    queryKey: ["achievements"],
    queryFn: async () => [], // MVP placeholder
    staleTime: 30_000,
  });
}

export function useProfile() {
  const { publicKey } = useWallet();
  const userId = publicKey?.toBase58() ?? "guest";
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!publicKey) return null;
      const { fetchLearnerProfile } = await import("@/lib/solana/readers");
      const onChain = await fetchLearnerProfile(publicKey);
      if (!onChain) return null;
      return { wallet: userId, xp: onChain.xpBalance, level: onChain.level, isInitialized: true };
    },
    enabled: !!publicKey,
    staleTime: 30_000,
  });
}

export function useCredentials() { return useQuery({ queryKey: ["credentials"], queryFn: async () => [] }); }
export function useDisplayName() { return useQuery({ queryKey: ["displayName"], queryFn: async () => "Superteam Learner" }); }
export function useSetDisplayName() { return useMutation({ mutationFn: async () => { } }); }
export function useBio() { return useQuery({ queryKey: ["bio"], queryFn: async () => "Learning on Solana" }); }
export function useSetBio() { return useMutation({ mutationFn: async () => { } }); }
export function useAvatar() { return useQuery({ queryKey: ["avatar"], queryFn: async () => null }); }
export function useSetAvatar() { return useMutation({ mutationFn: async () => { } }); }

export function useUnenroll() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const userId = publicKey?.toBase58() ?? "guest";
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      courseId: string,
    ): Promise<{ txSignature: string | null }> => {
      if (!publicKey || !signTransaction) {
        throw new Error("Wallet not connected");
      }

      let txSignature: string | null = null;

      // Only attempt on-chain if program is initialized
      const config = await fetchConfig();
      if (config) {
        try {
          const provider = new AnchorProvider(
            connection,
            {
              publicKey,
              signTransaction,
              signAllTransactions: async (txs: any[]) => txs,
            } as any,
            { commitment: "confirmed" },
          );
          const program = getProgram(provider);
          const tx = await buildUnenrollTx(program, publicKey, courseId);
          tx.feePayer = publicKey;
          tx.recentBlockhash = (
            await connection.getLatestBlockhash()
          ).blockhash;
          const signed = await signTransaction(tx);
          txSignature = await connection.sendRawTransaction(signed.serialize());
        } catch (err: any) {
          const msg = err?.message ?? "";
          if (
            msg.includes("User rejected") ||
            msg.includes("rejected the request")
          ) {
            throw err;
          }
          console.warn(
            "[unenroll] on-chain tx failed, falling back to MongoDB:",
            msg,
          );
        }
        // We only care about the on-chain unenrollment

        return { txSignature };
      }
      return { txSignature }; // Fallback if no config
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allProgress", userId] });
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

export function useCloseEnrollment() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const userId = publicKey?.toBase58() ?? "guest";
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      courseId: string,
    ): Promise<{ txSignature: string | null }> => {
      if (!publicKey || !signTransaction) {
        throw new Error("Wallet not connected");
      }

      let txSignature: string | null = null;

      const config = await fetchConfig();
      if (config) {
        const provider = new AnchorProvider(
          connection,
          {
            publicKey,
            signTransaction,
            signAllTransactions: async (txs: any[]) => txs,
          } as any,
          { commitment: "confirmed" },
        );
        const program = getProgram(provider);
        const tx = await buildCloseEnrollmentTx(program, publicKey, courseId);
        tx.feePayer = publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        const signed = await signTransaction(tx);
        txSignature = await connection.sendRawTransaction(signed.serialize());
      }

      return { txSignature };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allProgress", userId] });
      queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
  });
}

export function useRegisterReferral() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      referrerWallet: string,
    ): Promise<{ txSignature: string | null }> => {
      if (!publicKey || !signTransaction) {
        throw new Error("Wallet not connected");
      }

      const { PublicKey: PK } = await import("@solana/web3.js");
      const referrer = new PK(referrerWallet);
      let txSignature: string | null = null;

      const config = await fetchConfig();
      if (config) {
        const provider = new AnchorProvider(
          connection,
          {
            publicKey,
            signTransaction,
            signAllTransactions: async (txs: any[]) => txs,
          } as any,
          { commitment: "confirmed" },
        );
        const program = getProgram(provider);
        const tx = await buildRegisterReferralTx(program, publicKey, referrer);
        tx.feePayer = publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        const signed = await signTransaction(tx);
        txSignature = await connection.sendRawTransaction(signed.serialize());
      }

      // MongoDB backup
      await fetch("/api/learning/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refereeId: publicKey.toBase58(),
          referrerId: referrerWallet,
          txSignature,
        }),
      });

      return { txSignature };
    },
    onSuccess: () => {
      const userId = publicKey?.toBase58() ?? "guest";
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
  });
}

export function useClaimAchievement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => { return { ok: true, txSignature: "mock_tx" } },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
    },
  });
}

export function useEnroll() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const userId = publicKey?.toBase58() ?? "guest";
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      courseId: string,
    ): Promise<{ txSignature: string | null }> => {
      if (!publicKey || !signTransaction) {
        throw new Error("Wallet not connected");
      }

      let txSignature: string | null = null;

      // Check if program is initialized before prompting wallet
      const config = await fetchConfig();
      if (!config) {
        throw new Error("Smart contract not initialized on Devnet. Please run the initialization script.");
      }

      try {
        const provider = new AnchorProvider(
          connection,
          {
            publicKey,
            signTransaction,
            signAllTransactions: async (txs: any[]) => txs,
          } as any,
          { commitment: "confirmed" },
        );
        const program = getProgram(provider);

        const tx = new Transaction();

        // Check if LearnerProfile exists; if not, prepend init_learner
        const profile = await fetchLearnerProfile(publicKey);
        if (!profile) {
          const initTx = await buildInitLearnerTx(program, publicKey);
          tx.add(...initTx.instructions);
        }

        // Ensure Token-2022 ATA exists for XP mint
        const ataIx = await ensureATAInstruction(
          publicKey,
          publicKey,
          config.xpMint,
        );
        if (ataIx) tx.add(ataIx);

        // Add enroll instruction
        const enrollTx = await buildEnrollTx(program, publicKey, courseId);
        tx.add(...enrollTx.instructions);

        tx.feePayer = publicKey;
        tx.recentBlockhash = (
          await connection.getLatestBlockhash()
        ).blockhash;
        const signed = await signTransaction(tx);
        txSignature = await connection.sendRawTransaction(signed.serialize());
      } catch (err: any) {
        console.error("[enroll] on-chain tx failed:", err);
        throw err;
      }

      // Trigger pass-through API to log the TX signature if needed
      await fetch("/api/learning/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, courseId, txSignature }),
      }).catch(console.warn);

      return { txSignature };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allProgress", userId] });
      queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
  });
}

export function useCompleteLesson() {
  const { publicKey } = useWallet();
  const userId = publicKey?.toBase58() ?? "guest";
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, lessonIndex }: { courseId: string; lessonIndex: number; }) => {
      const res = await fetch("/api/learning/complete-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, courseId, lessonIndex }),
      });
      if (!res.ok) throw new Error("Failed to complete lesson on-chain");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["allProgress"] });
      queryClient.invalidateQueries({ queryKey: ["xp"] });
      queryClient.invalidateQueries({ queryKey: ["streak"] });
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

export function useCertificates(trackId: number) {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? "";

  return useQuery({
    queryKey: ["certificates", wallet, trackId],
    queryFn: () =>
      fetch(`/api/learning/certificates/${trackId}?wallet=${wallet}`).then(
        (r) => r.json(),
      ) as Promise<
        {
          wallet: string;
          courseId: string;
          courseTitle: string;
          trackId: number;
          xpEarned: number;
          txHash: string;
          issuedAt: string;
          nftMetadata: {
            name: string;
            uri: string;
            attributes: { trait_type: string; value: string }[];
          } | null;
        }[]
      >,
    enabled: !!publicKey,
    staleTime: 30_000,
  });
}

export function usePracticeProgress() { return { data: null, completed: [], txHashes: {}, claimedMilestones: [], milestoneTxHashes: {} }; }
export function useCompletePracticeChallenge() { return useMutation({ mutationFn: async () => { } }); }
export function useDailyChallenge() { return useQuery({ queryKey: ["daily"], queryFn: async () => null }); }
export function useCompleteDailyChallenge() { return useMutation({ mutationFn: async () => { } }); }
export function useDailyStreak() { return useQuery({ queryKey: ["dailyStreak"], queryFn: async () => null }); }
export function useDailyArchive() { return useQuery({ queryKey: ["dailyArchive"], queryFn: async () => [] }); }
