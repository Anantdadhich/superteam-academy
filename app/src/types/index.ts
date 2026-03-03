export interface Course {
    id: string;
    slug: string;
    title: string;
    description: string;
    shortDescription: string;
    thumbnail: string;
    creator: string;
    creatorAvatar: string;
    difficulty: 1 | 2 | 3;
    trackId: number;
    trackLevel: number;
    trackName: string;
    lessonCount: number;
    xpPerLesson: number;
    totalXP: number;
    duration: string;
    tags: string[];
    prerequisiteId: string | null;
    isActive: boolean;
    modules: Module[];
    completions: number;
    rating: number;
    createdAt: string;
}

export interface Module {
    id: string;
    title: string;
    description: string;
    order: number;
    lessons: Lesson[];
}

export interface Lesson {
    id: string;
    moduleId: string;
    title: string;
    description: string;
    type: "content" | "challenge";
    order: number;
    xp: number;
    content?: string;
    challenge?: Challenge;
    estimatedMinutes: number;
}

export interface Challenge {
    prompt: string;
    objectives: string[];
    starterCode: string;
    language: "rust" | "typescript" | "json";
    testCases: TestCase[];
    solution: string;
    hints: string[];
}

export interface TestCase {
    id: string;
    name: string;
    input: string;
    expectedOutput: string;
    isHidden: boolean;
}

export interface Enrollment {
    courseId: string;
    lessonFlags: number[];
    completedLessons: number;
    totalLessons: number;
    enrolledAt: number;
    completedAt: number | null;
    credentialAsset: string | null;
    progress: number;
}

export interface UserProfile {
    wallet: string | null;
    name: string;
    username: string;
    bio: string;
    avatar: string;
    joinedAt: string;
    socialLinks: {
        twitter?: string;
        github?: string;
        discord?: string;
        website?: string;
    };
    isPublic: boolean;
    preferredLanguage: string;
    theme: "dark" | "light" | "system";
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: "progress" | "streak" | "skill" | "community" | "special";
    xpReward: number;
    isEarned: boolean;
    earnedAt?: string;
    rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
}

export interface Credential {
    id: string;
    mintAddress: string;
    trackId: number;
    trackName: string;
    level: number;
    coursesCompleted: number;
    totalXP: number;
    metadataUri: string;
    imageUrl: string;
    issuedAt: string;
}

export interface LeaderboardEntry {
    rank: number;
    wallet: string;
    name: string;
    avatar: string;
    xp: number;
    level: number;
    streak: number;
    coursesCompleted: number;
}

export interface StreakData {
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string;
    streakHistory: Record<string, boolean>;
    milestones: StreakMilestone[];
    streakFreezes: number;
}

export interface StreakMilestone {
    days: number;
    label: string;
    xpReward: number;
    isEarned: boolean;
}

export type TimeFrame = "weekly" | "monthly" | "all-time";
export type CourseFilter = {
    difficulty?: number[];
    trackId?: number[];
    tags?: string[];
    search?: string;
};

export interface LearnerStats {
    totalXP: number;
    level: number;
    levelProgress: number;
    coursesEnrolled: number;
    coursesCompleted: number;
    lessonsCompleted: number;
    currentStreak: number;
    achievementsEarned: number;
    rank: number;
}
