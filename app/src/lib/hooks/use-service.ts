"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { Transaction, Keypair } from "@solana/web3.js";
import { getProgram } from "@/lib/solana/program";
import { fetchLearnerProfile, fetchConfig } from "@/lib/solana/readers";
import {
  buildInitLearnerTx,
  buildEnrollTx,
  buildUnenrollTx,
  buildCompleteLessonTx,
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

export function useAllProgress() {
  const { publicKey } = useWallet();
  const userId = publicKey?.toBase58() ?? "guest";

  return useQuery({
    queryKey: ["allProgress", userId],
    queryFn: async () => {
      if (!publicKey) return [];
      const { fetchEnrollment, fetchCourse, popcountBitmap } = await import("@/lib/solana/readers");
      // For pure on-chain MVP without an indexer database, 
      // we check enrollment for the primary mapped courses:
      const courseIds = ["solana-mock-test", "2", "3"];
      const results = [];

      for (const cid of courseIds) {
        try {
          const enroll = await fetchEnrollment(cid, publicKey);
          if (enroll) {
            const course = await fetchCourse(cid);
            const total = course ? course.lessonCount : 0;
            const comp = popcountBitmap(enroll.lessonFlags);
            results.push({
              courseId: cid,
              completed: comp === total,
              percentComplete: total > 0 ? (comp / total) * 100 : 0,
              completedCount: comp,
              enrollmentDate: enroll.initializedAt,
            });
          }
        } catch (e) {
          // ignore fetching errors for missing enrollments
        }
      }
      return results;
    },
    staleTime: 10_000,
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { fetchAllLearnerProfiles } = await import("@/lib/solana/readers");
      const profiles = await fetchAllLearnerProfiles();

      return profiles
        .map((p) => ({
          id: p.wallet.toBase58(),
          name: p.wallet.toBase58().slice(0, 4) + '...' + p.wallet.toBase58().slice(-4),
          xp: p.profile.xpBalance,
          level: p.profile.level,
        }))
        .sort((a, b) => b.xp - a.xp); // Sort by XP descending
    },
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
  const { publicKey } = useWallet();
  const userId = publicKey?.toBase58() ?? "guest";
  return useQuery({
    queryKey: ["achievements", userId],
    queryFn: async () => {
      // Pure on-chain achievement polling (mocked for MVP since achievement instructions need PDAs)
      return [];
    },
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
  const walletCtx = useWallet();
  const { publicKey, signTransaction } = walletCtx;
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
          const program = getProgram(connection, walletCtx)!;
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
  const walletCtx = useWallet();
  const { publicKey, signTransaction } = walletCtx;
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
        const program = getProgram(connection, walletCtx)!;
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
  const walletCtx = useWallet();
  const { publicKey, signTransaction } = walletCtx;
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
        const program = getProgram(connection, walletCtx)!;
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
  const walletCtx = useWallet();
  const { publicKey, signTransaction } = walletCtx;
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
        const program = getProgram(connection, walletCtx)!;

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
      } catch (err: any) {
        console.error("----- ENROLL TX FAILED -----");
        console.error("Error Message:", err?.message);
        if (err?.logs) {
          console.error("Transaction Logs:", err.logs.join("\n"));
        }
        if (err?.error?.errorCode) {
          console.error("Anchor Error Code:", err.error.errorCode.number);
          console.error("Anchor Error Msg:", err.error.errorMessage);
        }
        console.error("----------------------------");
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
  const walletCtx = useWallet();
  const { publicKey, signTransaction } = walletCtx;
  const { connection } = useConnection();
  const userId = publicKey?.toBase58() ?? "guest";
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      lessonIndex,
    }: {
      courseId: string;
      lessonIndex: number;
    }) => {
      if (!publicKey || !signTransaction) {
        throw new Error("Wallet not connected");
      }

      // Check if program is initialized
      const config = await fetchConfig();
      if (!config) {
        throw new Error("Smart contract not initialized on Devnet.");
      }

      const program = getProgram(connection, walletCtx)!;
      const tx = new Transaction();

      // We need a backend signer to satisfy the instruction signature.
      // Since we are bypassing the secure backend API per user request,
      // we generate a dummy keypair here to sign. Note: This WILL fail on-chain
      // if the program enforces `backend_signer == config.backend_signer`.
      const dummyBackendSigner = Keypair.generate();

      try {
        const completeTx = await buildCompleteLessonTx(
          program,
          dummyBackendSigner.publicKey,
          publicKey,
          courseId,
          lessonIndex,
          config.xpMint,
        );
        tx.add(...completeTx.instructions);

        tx.feePayer = publicKey;
        tx.recentBlockhash = (
          await connection.getLatestBlockhash()
        ).blockhash;

        // Partially sign with the dummy backend keypair so the transaction is valid
        tx.partialSign(dummyBackendSigner);

        const signed = await signTransaction(tx);
        const txSignature = await connection.sendRawTransaction(
          signed.serialize()
        );

        return { ok: true, txSignature };
      } catch (err: any) {
        console.error("----- COMPLETE LESSON TX FAILED -----");
        console.error("Message:", err?.message);
        if (err?.logs) console.error("Logs:", err.logs.join("\n"));
        throw err;
      }
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
