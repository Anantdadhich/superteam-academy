import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import type { OnchainAcademy } from "./onchain_academy";
import IDL_JSON from "./onchain_academy.json";

export const IDL = IDL_JSON as OnchainAcademy;

export const PROGRAM_ID = new PublicKey("ACADBRCB3zGvo1KSCbkztS33ZNzeBv2d7bqGceti3ucf");
export const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
export const MPL_CORE_PROGRAM_ID = new PublicKey("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d");

export function getProgram(connection: Connection, wallet?: any) {
    const provider = new AnchorProvider(
        connection,
        wallet || ({
            publicKey: PublicKey.default,
            signTransaction: async () => { throw new Error("Wallet not connected"); },
            signAllTransactions: async () => { throw new Error("Wallet not connected"); },
        } as any),
        AnchorProvider.defaultOptions()
    );
    return new Program<OnchainAcademy>(IDL, provider);
}

// PDA derivations
export const getConfigPda = () => PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID)[0];

export const getCoursePda = (courseId: string) => PublicKey.findProgramAddressSync([Buffer.from("course"), Buffer.from(courseId)], PROGRAM_ID)[0];

export const getEnrollmentPda = (courseId: string, learner: PublicKey) =>
    PublicKey.findProgramAddressSync([Buffer.from("enrollment"), Buffer.from(courseId), learner.toBuffer()], PROGRAM_ID)[0];

export const getAchievementTypePda = (achievementId: string) =>
    PublicKey.findProgramAddressSync([Buffer.from("achievement"), Buffer.from(achievementId)], PROGRAM_ID)[0];

export const getAchievementReceiptPda = (achievementId: string, recipient: PublicKey) =>
    PublicKey.findProgramAddressSync([Buffer.from("achievement_receipt"), Buffer.from(achievementId), recipient.toBuffer()], PROGRAM_ID)[0];
