import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

export function formatXP(xp: number): string {
    if (xp >= 1_000_000) return `${(xp / 1_000_000).toFixed(1)}M`;
    if (xp >= 1_000) return `${(xp / 1_000).toFixed(1)}K`;
    return xp.toString();
}

export function getLevel(xp: number): number {
    return Math.floor(Math.sqrt(xp / 100));
}

export function getLevelProgress(xp: number): number {
    const currentLevel = getLevel(xp);
    const currentLevelXP = currentLevel * currentLevel * 100;
    const nextLevelXP = (currentLevel + 1) * (currentLevel + 1) * 100;
    return ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
}

export function getXPForLevel(level: number): number {
    return level * level * 100;
}

export function truncateAddress(address: string, chars = 4): string {
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatDate(date: Date | string | number): string {
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(date));
}

export function getDifficultyLabel(difficulty: number): string {
    switch (difficulty) {
        case 1: return "Beginner";
        case 2: return "Intermediate";
        case 3: return "Advanced";
        default: return "Unknown";
    }
}

export function getDifficultyColor(difficulty: number): string {
    switch (difficulty) {
        case 1: return "text-emerald-400";
        case 2: return "text-amber-400";
        case 3: return "text-red-400";
        default: return "text-zinc-400";
    }
}

export function estimateDuration(lessonCount: number): string {
    const hours = Math.ceil(lessonCount * 0.5);
    if (hours < 1) return "< 1 hour";
    if (hours === 1) return "1 hour";
    return `${hours} hours`;
}
