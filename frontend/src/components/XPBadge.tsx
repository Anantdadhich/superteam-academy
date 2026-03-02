'use client';

import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProfile } from '@/lib/hooks/use-service';

export function XPBadge() {
  const { publicKey } = useWallet();
  const { data: profile } = useProfile();

  if (!publicKey || profile == null) return null;

  const xp = profile.xp;
  const level = profile.level;

  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2 rounded-lg border border-border/50 bg-surface px-3 py-1.5 text-caption font-medium text-[rgb(var(--text))] transition hover:border-accent/40"
      title="View dashboard"
    >
      <span className="font-semibold text-accent">{xp} XP</span>
      <span className="text-[rgb(var(--text-subtle))]">Lv.{level}</span>
    </Link>
  );
}
