import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey("ACADBRCB3zGvo1KSCbkztS33ZNzeBv2d7bqGceti3ucf");
export const XP_MINT = new PublicKey("xpXPUjkfk7t4AJF1tYUoyAYxzuM5DhinZWS1WjfjAu3");
export const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
export const MPL_CORE_PROGRAM_ID = new PublicKey("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d");

export const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
export const HELIUS_RPC_URL = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || "";

export const TRACKS = [
    { id: 1, name: "Solana Fundamentals", color: "#9945FF" },
    { id: 2, name: "Anchor Development", color: "#14F195" },
    { id: 3, name: "DeFi Developer", color: "#00D1FF" },
    { id: 4, name: "NFT & Metaplex", color: "#F087FF" },
    { id: 5, name: "Security & Auditing", color: "#FF6B6B" },
] as const;

export const DIFFICULTY_MAP = {
    1: { label: "Beginner", color: "#14F195", bgColor: "bg-emerald-500/10" },
    2: { label: "Intermediate", color: "#FFD93D", bgColor: "bg-amber-500/10" },
    3: { label: "Advanced", color: "#FF6B6B", bgColor: "bg-red-500/10" },
} as const;

export const XP_REWARDS = {
    LESSON_MIN: 10,
    LESSON_MAX: 50,
    CHALLENGE_MIN: 25,
    CHALLENGE_MAX: 100,
    COURSE_MIN: 500,
    COURSE_MAX: 2000,
    DAILY_STREAK: 10,
    FIRST_COMPLETION: 25,
} as const;

export const STREAK_MILESTONES = [
    { days: 7, label: "Week Warrior", xpReward: 100 },
    { days: 30, label: "Monthly Master", xpReward: 500 },
    { days: 100, label: "Consistency King", xpReward: 2000 },
] as const;

export const ACHIEVEMENT_CATEGORIES = {
    progress: { label: "Progress", icon: "🏆" },
    streak: { label: "Streaks", icon: "🔥" },
    skill: { label: "Skills", icon: "⚡" },
    community: { label: "Community", icon: "👥" },
    special: { label: "Special", icon: "⭐" },
} as const;

export const NAV_LINKS = [
    { href: "/courses", label: "Courses" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/dashboard", label: "Dashboard" },
] as const;
