export type LeaderboardTimeframe = 'weekly' | 'monthly' | 'all-time';

export interface LeaderboardEntry {
  rank: number;
  wallet: string;
  displayName: string;
  avatar: string | null;
  xp: number;
  level: number;
}

export interface StreakData {
  current: number;
  longest: number;
  lastDay: any;
  history: any[];
}
