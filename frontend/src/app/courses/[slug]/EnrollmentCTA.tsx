'use client';

import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import type { Course } from '@/lib/data/courses';
import { useProgress, useEnroll } from '@/lib/hooks/use-service';
import { track } from '@/lib/analytics';

interface Props {
  course: Course;
}

export function EnrollmentCTA({ course }: Props) {
  const { publicKey } = useWallet();
  const { data: progress } = useProgress(course.id);
  const { mutateAsync: enrollInCourse, isPending: loading } = useEnroll();

  const enrolled = !!progress;

  const handleEnroll = async () => {
    if (!publicKey) return;
    try {
      await enrollInCourse(course.id);
      track({ name: 'enroll', courseId: course.id, wallet: publicKey.toBase58() });
    } catch (e) {
      console.warn("Enrollment failed", e);
    }
  };

  const firstLesson = course.lessons[0];

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      {!publicKey ? (
        <p className="text-caption text-[rgb(var(--text-muted))]">
          Connect your wallet to enroll and earn {course.xpReward} XP on completion.
        </p>
      ) : enrolled ? (
        <Link
          href={firstLesson ? `/courses/${course.slug}/lessons/${firstLesson.id}` : `/courses/${course.slug}`}
          className="inline-flex rounded-lg bg-accent px-5 py-2.5 text-body font-semibold text-[rgb(3_7_18)] transition hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bg-page))] focus-visible:outline-none"
        >
          Start course · Earn {course.xpReward} XP
        </Link>
      ) : (
        <>
          <button
            type="button"
            onClick={handleEnroll}
            disabled={loading}
            aria-busy={loading}
            aria-live="polite"
            className="inline-flex rounded-lg bg-accent px-5 py-2.5 text-body font-semibold text-[rgb(3_7_18)] transition hover:bg-accent-hover disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bg-page))] focus-visible:outline-none"
          >
            {loading ? 'Enrolling…' : 'Enroll in course'}
          </button>
          <span className="text-caption text-[rgb(var(--text-subtle))]">
            Learner signs enroll tx · Stub: no on-chain tx yet
          </span>
        </>
      )}
      {enrolled && firstLesson && (
        <Link
          href={`/courses/${course.slug}/lessons/${firstLesson.id}`}
          className="text-body font-medium text-accent hover:underline focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bg-page))] focus-visible:outline-none rounded"
        >
          Go to first lesson →
        </Link>
      )}
    </div>
  );
}
