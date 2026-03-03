"use client";

import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import type { Idl } from "@coral-xyz/anchor";

import idl from "./onchain_academy.json";

const PROGRAM_ID = new PublicKey(
  (idl as { address: string }).address
);

export { PROGRAM_ID };

export function getConfigPda(programId: PublicKey = PROGRAM_ID): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programId
  );
  return pda;
}

export function getCoursePda(
  courseId: string,
  programId: PublicKey = PROGRAM_ID
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("course"), Buffer.from(courseId)],
    programId
  );
  return pda;
}

export function getEnrollmentPda(
  courseId: string,
  learner: PublicKey,
  programId: PublicKey = PROGRAM_ID
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("enrollment"), Buffer.from(courseId), learner.toBuffer()],
    programId
  );
  return pda;
}

export function getMinterRolePda(
  minter: PublicKey,
  programId: PublicKey = PROGRAM_ID
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("minter"), minter.toBuffer()],
    programId
  );
  return pda;
}

export function getAchievementTypePda(
  achievementId: string,
  programId: PublicKey = PROGRAM_ID
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("achievement"), Buffer.from(achievementId)],
    programId
  );
  return pda;
}

export function getAchievementReceiptPda(
  achievementId: string,
  recipient: PublicKey,
  programId: PublicKey = PROGRAM_ID
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("achievement_receipt"),
      Buffer.from(achievementId),
      recipient.toBuffer(),
    ],
    programId
  );
  return pda;
}

export function getProgram(
  connection: Connection,
  wallet: WalletContextState
): Program | null {
  if (!wallet.publicKey) return null;
  const provider = new AnchorProvider(connection, {
    signTransaction: wallet.signTransaction!.bind(wallet),
    signAllTransactions: wallet.signAllTransactions!.bind(wallet),
    publicKey: wallet.publicKey,
  });
  return new Program(idl as Idl, provider);
}

/** Read-only program for fetching accounts (e.g. Config) without a connected wallet. */
export function getProgramReadOnly(connection: Connection): Program {
  const dummyKey = new PublicKey("11111111111111111111111111111111");
  const provider = new AnchorProvider(connection, {
    publicKey: dummyKey,
    signTransaction: async (tx) => tx,
    signAllTransactions: async (txs) => txs,
  });
  return new Program(idl as Idl, provider);
}

/** Backend program for node backend using a Keypair */
import { Keypair } from "@solana/web3.js";
export function getBackendProgram(connection: Connection, keypair: Keypair): Program {
  // We can construct a simple wallet adapter
  const wallet = {
    publicKey: keypair.publicKey,
    signTransaction: async (tx: any) => {
      tx.partialSign(keypair);
      return tx;
    },
    signAllTransactions: async (txs: any[]) => {
      txs.forEach((tx) => tx.partialSign(keypair));
      return txs;
    },
  };
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  return new Program(idl as Idl, provider);
}

export type AcademyProgram = Program;
