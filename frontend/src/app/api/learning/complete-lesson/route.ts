import { NextRequest, NextResponse } from "next/server";
import { PublicKey, Keypair, sendAndConfirmTransaction } from "@solana/web3.js";
import { getConnection } from "@/lib/solana/connection";
import { getBackendSigner } from "@/lib/solana/backend-signer";
import { getBackendProgram } from "@/lib/solana/program";
import {
  fetchConfig,
  fetchCourse as fetchOnChainCourse,
  fetchEnrollment,
  popcountBitmap,
} from "@/lib/solana/readers";
import { TRACKS } from "@/lib/solana/constants";
import {
  buildCompleteLessonTx,
  buildFinalizeCourseTx,
  buildIssueCredentialTx,
  buildUpgradeCredentialTx,
} from "@/lib/solana/transactions";
// Optional: import { uploadJson } from "@/lib/arweave"; (omitted as pure on-chain for demo without Irys)

export async function POST(req: NextRequest) {
  const { userId, courseId, lessonIndex } = await req.json();
  if (!userId || !courseId || lessonIndex === undefined) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const wallet = new PublicKey(userId);
  let txSignature: string | null = null;
  let finalizeTxSignature: string | null = null;
  let credentialTxSignature: string | null = null;

  // On-chain: try full program instructions first
  try {
    const connection = getConnection();
    const backendKeypair = getBackendSigner();
    const program = getBackendProgram(backendKeypair);
    const config = await fetchConfig();
    if (config && !config.seasonClosed) {
      const xpMint = config.xpMint;

      const onChainCourse = await fetchOnChainCourse(courseId);
      if (onChainCourse) {
        const tx = await buildCompleteLessonTx(
          program,
          backendKeypair.publicKey,
          wallet,
          courseId,
          lessonIndex,
          xpMint,
        );
        tx.feePayer = backendKeypair.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        txSignature = await sendAndConfirmTransaction(connection, tx, [
          backendKeypair,
        ]);

        const enrollment = await fetchEnrollment(courseId, wallet);
        if (enrollment && !enrollment.completedAt) {
          const completedCount = popcountBitmap(enrollment.lessonFlags);
          if (completedCount >= onChainCourse.lessonCount) {
            const finalizeTx = await buildFinalizeCourseTx(
              program,
              backendKeypair.publicKey,
              wallet,
              courseId,
              xpMint,
              onChainCourse.creator,
            );
            finalizeTx.feePayer = backendKeypair.publicKey;
            finalizeTx.recentBlockhash = (
              await connection.getLatestBlockhash()
            ).blockhash;
            finalizeTxSignature = await sendAndConfirmTransaction(
              connection,
              finalizeTx,
              [backendKeypair],
            );

            try {
              const trackId = onChainCourse.trackId;
              const trackInfo = TRACKS[trackId];
              // Count completed courses in this track using only on-chain profiles
              let trackCompletedCount = 0;
              let trackTotalXp = 0;
              let existingCredentialAsset: PublicKey | null = null;

              const allCourses = await (await import("@/lib/solana/readers")).fetchAllCourses();
              const trackCourses = allCourses.filter((c) => c.course.trackId === trackId);

              for (const tc of trackCourses) {
                // courseId is stored as a string buffer in the PDA, but the helper uses the ID
                const tcIdString = tc.course.courseId;
                const tcEnrollment = await fetchEnrollment(tcIdString, wallet);
                if (tcEnrollment?.completedAt) {
                  trackCompletedCount++;
                  trackTotalXp += Number(tc.course.xpPerLesson) * tc.course.lessonCount;

                  if (
                    tcEnrollment.credentialAsset &&
                    !new PublicKey(tcEnrollment.credentialAsset).equals(
                      PublicKey.default,
                    )
                  ) {
                    existingCredentialAsset = new PublicKey(
                      tcEnrollment.credentialAsset,
                    );
                  }
                }
              }

              const credentialName = `${trackInfo?.display ?? "Superteam"} - Level ${onChainCourse.trackLevel}`;

              // Skip off-chain metadata upload per user request (pure on-chain)
              let metadataUri = "https://superteam.fun/credential.json";

              if (existingCredentialAsset) {
                // Upgrade existing credential
                const credentialTx = await buildUpgradeCredentialTx(
                  program,
                  backendKeypair.publicKey,
                  wallet,
                  courseId,
                  existingCredentialAsset,
                  PublicKey.default,
                  credentialName,
                  metadataUri,
                  trackCompletedCount,
                  trackTotalXp,
                );
                credentialTx.feePayer = backendKeypair.publicKey;
                credentialTx.recentBlockhash = (
                  await connection.getLatestBlockhash()
                ).blockhash;
                credentialTxSignature = await sendAndConfirmTransaction(
                  connection,
                  credentialTx,
                  [backendKeypair],
                );
              } else {
                // Issue new credential
                const credentialAssetKeypair = Keypair.generate();
                const { tx: credentialTx, credentialAssetKeypair: assetKp } =
                  await buildIssueCredentialTx(
                    program,
                    backendKeypair.publicKey,
                    wallet,
                    courseId,
                    credentialAssetKeypair,
                    PublicKey.default,
                    credentialName,
                    metadataUri,
                    trackCompletedCount,
                    trackTotalXp,
                  );
                credentialTx.feePayer = backendKeypair.publicKey;
                credentialTx.recentBlockhash = (
                  await connection.getLatestBlockhash()
                ).blockhash;
                credentialTxSignature = await sendAndConfirmTransaction(
                  connection,
                  credentialTx,
                  [backendKeypair, assetKp],
                );
              }
            } catch {
              // credential issuance is non-critical
            }
          }
        }
      }
    }
  } catch (err: any) {
    const errMsg = err?.message ?? "";
    if (errMsg.includes("LessonAlreadyCompleted") || errMsg.includes("6003")) {
      // Already completed on-chain
    } else {
      console.error("[complete-lesson] program tx failed:", errMsg);
      return NextResponse.json({ error: errMsg }, { status: 500 });
    }
  }

  // All progress is tracked purely on-chain.

  return NextResponse.json({
    ok: true,
    txSignature,
    finalizeTxSignature,
    credentialTxSignature,
  });
}
