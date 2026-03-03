export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type Topic = 'fundamentals' | 'development' | 'onboarding' | 'defi';

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  type: 'video' | 'read' | 'quiz' | 'code';
  content?: string;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  instructor: string;
  duration: string;
  difficulty: Difficulty;
  topic: Topic;
  xpReward: number;
  lessons: Lesson[];
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const TOPIC_LABELS: Record<Topic, string> = {
  fundamentals: 'Solana Fundamentals',
  development: 'Development',
  onboarding: 'Onboarding',
  defi: 'DeFi',
};

// ============================================================
// IMPORTANT: `onChainCourseId` must match the Course PDA on Devnet.
// The authority (ACAd3USj...) must run `create-frontend-courses.ts`
// for new IDs. Currently only `solana-mock-test` exists on-chain.
// ============================================================
export const courses: Course[] = [
  {
    id: 'solana-mock-test', // ← matches on-chain Course PDA
    slug: 'solana-fundamentals',
    title: 'Solana Fundamentals',
    description:
      'Learn the basics of Solana: accounts, programs, and transactions. Essential for every builder in the ecosystem.',
    image: '/courses/solana-bg.jpg',
    instructor: 'Superteam Brazil',
    duration: '2h',
    difficulty: 'beginner',
    topic: 'fundamentals',
    xpReward: 500, // 5 lessons × 100 XP
    lessons: [
      { id: 'l1', title: 'What is Solana?', duration: '15 min', type: 'video' },
      {
        id: 'l2',
        title: 'Accounts and Programs',
        duration: '20 min',
        type: 'read',
        content: `## Solana Accounts

Solana programs use **accounts** to store state. Each account has:

- **Owner** — the program that can modify it
- **Lamports** — balance in SOL (1 lamport = 10⁻⁹ SOL)
- **Data** — arbitrary bytes

### Key concepts

1. **PDA (Program Derived Address)** — deterministic address derived from seeds; no private key.
2. **Rent** — accounts must hold enough lamports to be rent-exempt, or they can be reclaimed.

\`\`\`typescript
// Derive a PDA in TypeScript
const [pda] = PublicKey.findProgramAddressSync(
  [Buffer.from("seed"), user.toBuffer()],
  programId
);
\`\`\`

Complete this lesson when you're ready to move on.`,
      },
      { id: 'l3', title: 'Transactions and Fees', duration: '15 min', type: 'video' },
      { id: 'l4', title: 'Quiz: Fundamentals', duration: '10 min', type: 'quiz' },
      {
        id: 'l5', title: 'Solana Ecosystem Deep Dive', duration: '20 min', type: 'read',
        content: `## The Solana Ecosystem

Solana hosts a vibrant ecosystem of DeFi, NFTs, gaming, and infrastructure projects.

- **DeFi**: Jupiter, Raydium, Orca
- **NFTs**: Metaplex, Magic Eden
- **Infrastructure**: Helius, QuickNode, Triton

Explore the ecosystem and find your niche!` },
    ],
  },
  {
    id: '2',
    slug: 'building-on-solana',
    title: 'Building on Solana',
    description:
      'Hands-on guide to building dApps: Anchor, frontend integration, and deploying your first program.',
    image: '/courses/build-bg.jpg',
    instructor: 'Superteam Brazil',
    duration: '4h',
    difficulty: 'intermediate',
    topic: 'development',
    xpReward: 400,
    lessons: [
      { id: 'l5b', title: 'Setting up Anchor', duration: '25 min', type: 'video' },
      {
        id: 'l6b',
        title: 'Writing Your First Program',
        duration: '30 min',
        type: 'code',
        content: '## Code challenge\n\nWrite a simple program that prints **Hello, Solana!** to the console.',
      },
      { id: 'l7b', title: 'Wallet Adapter & Frontend', duration: '25 min', type: 'video' },
      { id: 'l8b', title: 'Deploy to Devnet', duration: '20 min', type: 'video' },
      { id: 'l9b', title: 'Quiz: Building', duration: '10 min', type: 'quiz' },
    ],
  },
  {
    id: '3',
    slug: 'superteam-brazil-onboarding',
    title: 'Superteam Brazil Onboarding',
    description:
      'Get to know Superteam Brazil: community, bounties, and how to contribute to the ecosystem.',
    image: '/courses/onboard-bg.jpg',
    instructor: 'Superteam Brazil',
    duration: '1h',
    difficulty: 'beginner',
    topic: 'onboarding',
    xpReward: 100,
    lessons: [
      { id: 'l10b', title: 'Welcome to Superteam Brazil', duration: '10 min', type: 'video' },
      { id: 'l11b', title: 'Earn & Bounties', duration: '15 min', type: 'read' },
      { id: 'l12b', title: 'How to Submit', duration: '10 min', type: 'video' },
    ],
  },
];

export const LEARNING_PATHS = [
  { name: 'Solana Fundamentals', courseSlugs: ['solana-fundamentals'], description: 'Start here' },
  { name: 'DeFi Developer', courseSlugs: ['solana-fundamentals', 'building-on-solana'], description: 'End-to-end builder path' },
];

export function getCourseBySlug(slug: string): Course | undefined {
  return courses.find((c) => c.slug === slug);
}

export function getCourseById(id: string): Course | undefined {
  return courses.find((c) => c.id === id);
}

export function getLesson(courseSlug: string, lessonId: string): { course: Course; lesson: Lesson } | undefined {
  const course = getCourseBySlug(courseSlug);
  if (!course) return undefined;
  const lesson = course.lessons.find((l) => l.id === lessonId);
  if (!lesson) return undefined;
  return { course, lesson };
}
