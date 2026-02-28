"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Enrollment, StreakData, UserProfile, LearnerStats } from "@/types";
import { getLevel, getLevelProgress } from "@/lib/utils";

interface AppState {
    locale: string;
    setLocale: (locale: string) => void;

    profile: UserProfile;
    updateProfile: (updates: Partial<UserProfile>) => void;

    enrollments: Record<string, Enrollment>;
    enrollInCourse: (courseId: string, totalLessons: number) => void;
    completeLesson: (courseId: string, lessonIndex: number, xp: number) => void;
    completeCourse: (courseId: string) => void;
    getEnrollment: (courseId: string) => Enrollment | null;

    xp: number;
    addXP: (amount: number) => void;
    setXP: (amount: number) => void;

    streak: StreakData;
    recordActivity: () => void;

    getStats: () => LearnerStats;
}

const today = () => new Date().toISOString().split("T")[0];

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            locale: "en",
            setLocale: (locale) => set({ locale }),

            profile: {
                wallet: null,
                name: "Learner",
                username: "learner",
                bio: "",
                avatar: "",
                joinedAt: new Date().toISOString(),
                socialLinks: {},
                isPublic: true,
                preferredLanguage: "en",
                theme: "dark",
            },
            updateProfile: (updates) =>
                set((s) => ({ profile: { ...s.profile, ...updates } })),

            enrollments: {},
            enrollInCourse: (courseId, totalLessons) =>
                set((s) => ({
                    enrollments: {
                        ...s.enrollments,
                        [courseId]: {
                            courseId,
                            lessonFlags: new Array(Math.ceil(totalLessons / 32)).fill(0),
                            completedLessons: 0,
                            totalLessons,
                            enrolledAt: Date.now(),
                            completedAt: null,
                            credentialAsset: null,
                            progress: 0,
                        },
                    },
                })),
            completeLesson: (courseId, lessonIndex, xp) =>
                set((s) => {
                    const enrollment = s.enrollments[courseId];
                    if (!enrollment) return s;
                    const wordIndex = Math.floor(lessonIndex / 32);
                    const bitIndex = lessonIndex % 32;
                    const newFlags = [...enrollment.lessonFlags];
                    if (newFlags[wordIndex] & (1 << bitIndex)) return s;
                    newFlags[wordIndex] |= 1 << bitIndex;
                    const completedLessons = enrollment.completedLessons + 1;
                    const progress = Math.round((completedLessons / enrollment.totalLessons) * 100);
                    return {
                        xp: s.xp + xp,
                        enrollments: {
                            ...s.enrollments,
                            [courseId]: {
                                ...enrollment,
                                lessonFlags: newFlags,
                                completedLessons,
                                progress,
                                completedAt: completedLessons >= enrollment.totalLessons ? Date.now() : null,
                            },
                        },
                    };
                }),
            completeCourse: (courseId) =>
                set((s) => {
                    const enrollment = s.enrollments[courseId];
                    if (!enrollment) return s;
                    return {
                        enrollments: {
                            ...s.enrollments,
                            [courseId]: { ...enrollment, completedAt: Date.now(), progress: 100 },
                        },
                    };
                }),
            getEnrollment: (courseId) => get().enrollments[courseId] || null,

            xp: 0,
            addXP: (amount) => set((s) => ({ xp: s.xp + amount })),
            setXP: (amount) => set(() => ({ xp: amount })),

            streak: {
                currentStreak: 0,
                longestStreak: 0,
                lastActivityDate: "",
                streakHistory: {},
                milestones: [
                    { days: 7, label: "Week Warrior", xpReward: 100, isEarned: false },
                    { days: 30, label: "Monthly Master", xpReward: 500, isEarned: false },
                    { days: 100, label: "Consistency King", xpReward: 2000, isEarned: false },
                ],
                streakFreezes: 0,
            },
            recordActivity: () =>
                set((s) => {
                    const todayStr = today();
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split("T")[0];

                    if (s.streak.streakHistory[todayStr]) return s;

                    const isConsecutive = s.streak.lastActivityDate === yesterdayStr;
                    const newStreak = isConsecutive ? s.streak.currentStreak + 1 : 1;

                    return {
                        streak: {
                            ...s.streak,
                            currentStreak: newStreak,
                            longestStreak: Math.max(s.streak.longestStreak, newStreak),
                            lastActivityDate: todayStr,
                            streakHistory: { ...s.streak.streakHistory, [todayStr]: true },
                        },
                    };
                }),

            getStats: () => {
                const state = get();
                const enrollmentList = Object.values(state.enrollments);
                return {
                    totalXP: state.xp,
                    level: getLevel(state.xp),
                    levelProgress: getLevelProgress(state.xp),
                    coursesEnrolled: enrollmentList.length,
                    coursesCompleted: enrollmentList.filter((e) => e.completedAt).length,
                    lessonsCompleted: enrollmentList.reduce((s, e) => s + e.completedLessons, 0),
                    currentStreak: state.streak.currentStreak,
                    achievementsEarned: 0,
                    rank: 0,
                };
            },
        }),
        {
            name: "superteam-academy-store",
            partialize: (state) => ({
                locale: state.locale,
                profile: state.profile,
                enrollments: state.enrollments,
                xp: state.xp,
                streak: state.streak,
            }),
        }
    )
);
