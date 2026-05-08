'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  doc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit as fbLimit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Eye, Clock, Users } from 'lucide-react';

interface AnalyticsTabProps {
  eventId: string;
  publicSlug?: string;
}

interface StatsDoc {
  totalViews?: number;
  lastViewAt?: any;
}

interface SessionDoc {
  id: string;
  firstSeen?: any;
  lastSeen?: any;
}

const safeMillis = (d: any): number => {
  if (!d) return 0;
  if (d?.toDate) return d.toDate().getTime();
  const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
  return Number.isFinite(t) ? t : 0;
};

const formatRelative = (ms: number, nowMs: number): string => {
  if (!ms) return 'never';
  const diff = Math.max(0, Math.floor((nowMs - ms) / 1000));
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const LIVE_WINDOW_MS = 60_000; // session counts as "live" if lastSeen ≤ 60s ago

export default function AnalyticsTab({ eventId, publicSlug }: AnalyticsTabProps) {
  const [stats, setStats] = useState<StatsDoc | null>(null);
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [now, setNow] = useState<number>(() => Date.now());
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // 1Hz tick so the "live viewers" count and "Xs ago" labels stay fresh.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Subscribe to aggregate stats.
  useEffect(() => {
    if (!eventId) return;
    const ref = doc(db, 'eventStats', eventId);
    const unsub = onSnapshot(
      ref,
      snap => {
        setStats(snap.exists() ? (snap.data() as StatsDoc) : { totalViews: 0 });
        setPermissionError(null);
      },
      err => {
        console.warn('Stats subscription failed:', err);
        setPermissionError(err.message);
      }
    );
    return () => unsub();
  }, [eventId]);

  // Subscribe to recent sessions (most-recently active first).
  useEffect(() => {
    if (!eventId) return;
    const q = query(
      collection(db, 'eventStats', eventId, 'sessions'),
      orderBy('lastSeen', 'desc'),
      fbLimit(100)
    );
    const unsub = onSnapshot(
      q,
      snap => {
        setSessions(
          snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<SessionDoc, 'id'>) }))
        );
      },
      err => {
        console.warn('Sessions subscription failed:', err);
      }
    );
    return () => unsub();
  }, [eventId]);

  const liveViewers = useMemo(
    () =>
      sessions.filter(s => {
        const t = safeMillis(s.lastSeen);
        return t > 0 && now - t <= LIVE_WINDOW_MS;
      }).length,
    [sessions, now]
  );

  const lastViewMs = safeMillis(stats?.lastViewAt);
  const totalViews = stats?.totalViews ?? 0;

  // Bucket recent activity into 5-minute buckets for the last hour for a tiny
  // sparkline. Each bucket counts session firstSeen timestamps in that window.
  const sparkline = useMemo(() => {
    const buckets = 12; // 12 × 5min = 60min
    const bucketMs = 5 * 60_000;
    const start = now - buckets * bucketMs;
    const counts = new Array(buckets).fill(0);
    for (const s of sessions) {
      const t = safeMillis(s.firstSeen);
      if (!t || t < start) continue;
      const idx = Math.min(buckets - 1, Math.floor((t - start) / bucketMs));
      counts[idx]++;
    }
    return counts;
  }, [sessions, now]);

  const sparkMax = Math.max(1, ...sparkline);

  if (!publicSlug) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" /> Live Page Analytics
          </CardTitle>
          <CardDescription>
            Enable the public live link in Event Setup first. Once it's live, you'll see
            current viewers, total views, and recent activity here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Live viewers"
          value={String(liveViewers)}
          sub={liveViewers === 0 ? 'No one watching right now' : 'Active in the last 60s'}
          accent={liveViewers > 0}
        />
        <StatCard
          icon={<Eye className="h-5 w-5" />}
          label="Total views"
          value={totalViews.toLocaleString()}
          sub="Lifetime page loads"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Last view"
          value={formatRelative(lastViewMs, now)}
          sub={lastViewMs ? new Date(lastViewMs).toLocaleString() : '—'}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Activity (last hour)</CardTitle>
          <CardDescription>New viewer sessions, in 5-minute buckets.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-24">
            {sparkline.map((c, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-emerald-500/70"
                style={{ height: `${(c / sparkMax) * 100}%`, minHeight: c > 0 ? 4 : 1 }}
                title={`${c} new viewer${c === 1 ? '' : 's'}`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>−60m</span>
            <span>now</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent sessions</CardTitle>
          <CardDescription>
            Each row is one viewer session. Sessions disappear ~60s after the viewer leaves the page.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {sessions.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">No sessions yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">First seen</th>
                  <th className="px-4 py-2">Last seen</th>
                  <th className="px-4 py-2 hidden sm:table-cell">Session</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 25).map(s => {
                  const lastMs = safeMillis(s.lastSeen);
                  const live = lastMs > 0 && now - lastMs <= LIVE_WINDOW_MS;
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="px-4 py-2">
                        {live ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Idle</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {formatRelative(safeMillis(s.firstSeen), now)}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {formatRelative(lastMs, now)}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground hidden sm:table-cell">
                        {s.id.slice(0, 8)}…
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {permissionError && (
        <p className="text-xs text-muted-foreground">
          (Couldn't load stats: {permissionError}. Make sure you're signed in as the event organizer.)
        </p>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? 'border-emerald-300 bg-emerald-50/40' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          {icon}
          <span>{label}</span>
        </div>
        <div className={`mt-1 text-3xl font-bold ${accent ? 'text-emerald-700' : ''}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}
