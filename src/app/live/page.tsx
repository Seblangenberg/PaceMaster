'use client';

import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp, increment, deleteDoc } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { db } from '@/lib/firebase';
import type { SavedEvent, Team, Division } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Users, Activity } from 'lucide-react';

const teamDisplayName = (team: { number: number; name?: string }): string =>
  team.name?.trim() ? team.name : `Team #${team.number}`;

const safeTime = (d: any): number => {
  if (!d) return 0;
  if (d?.toDate) return d.toDate().getTime();
  const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
  return Number.isFinite(t) ? t : 0;
};

const formatDuration = (totalSeconds: number): string => {
  if (!Number.isFinite(totalSeconds)) return '00:00';
  const sign = totalSeconds < 0 ? '-' : '';
  const abs = Math.abs(totalSeconds);
  const m = Math.floor(abs / 60);
  const s = Math.floor(abs % 60);
  return `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const formatDifference = (diffSeconds: number): string => {
  if (!Number.isFinite(diffSeconds)) return '—';
  if (diffSeconds === 0) return 'on target';
  const sign = diffSeconds > 0 ? '+' : '-';
  const abs = Math.abs(diffSeconds);
  const m = Math.floor(abs / 60);
  const s = Math.floor(abs % 60);
  return `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// Strip private fields from teams before rendering. Public viewers must
// never see contact / emergency information.
const sanitizeTeam = (t: any): Team => ({
  id: t.id,
  number: t.number,
  name: t.name,
  riders: t.riders,
  divisionId: t.divisionId,
  status: t.status,
  startTime: t.startTime?.toDate ? t.startTime.toDate() : t.startTime,
  finishTime: t.finishTime?.toDate ? t.finishTime.toDate() : t.finishTime,
  elapsedTime: t.elapsedTime,
  penalties: t.penalties,
});

type LoadState =
  | { status: 'loading' }
  | { status: 'not_found'; reason: string }
  | { status: 'ready'; event: SavedEvent };

// Per-tab session id. Heartbeats every 30s while the tab is visible so the
// organizer's analytics tab can show "live viewers".
function startAnalyticsTracking(eventId: string): () => void {
  const sessionId = nanoid();
  const statsRef = doc(db, 'eventStats', eventId);
  const sessionRef = doc(db, 'eventStats', eventId, 'sessions', sessionId);
  const HEARTBEAT_MS = 30_000;
  let interval: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  const beat = async () => {
    if (stopped) return;
    try {
      await setDoc(
        sessionRef,
        { lastSeen: serverTimestamp() },
        { merge: true }
      );
    } catch (err) {
      // Network errors are fine — Firestore SDK will retry from offline cache.
      console.warn('Analytics heartbeat failed:', err);
    }
  };

  const startHeartbeat = () => {
    if (interval !== null) return;
    interval = setInterval(beat, HEARTBEAT_MS);
  };
  const stopHeartbeat = () => {
    if (interval !== null) {
      clearInterval(interval);
      interval = null;
    }
  };

  // Initial: increment total views + write session opener.
  (async () => {
    try {
      await Promise.all([
        setDoc(
          statsRef,
          { totalViews: increment(1), lastViewAt: serverTimestamp() },
          { merge: true }
        ),
        setDoc(sessionRef, {
          firstSeen: serverTimestamp(),
          lastSeen: serverTimestamp(),
        }),
      ]);
    } catch (err) {
      console.warn('Analytics open failed:', err);
    }
  })();

  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    startHeartbeat();
  }

  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      beat();
      startHeartbeat();
    } else {
      stopHeartbeat();
    }
  };

  // Best-effort cleanup when the tab closes — drops the session doc so the
  // viewer disappears from the live-count immediately instead of after the
  // 60s lastSeen window expires.
  const onPagehide = () => {
    stopped = true;
    stopHeartbeat();
    deleteDoc(sessionRef).catch(() => {});
  };

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPagehide);

  return () => {
    stopped = true;
    stopHeartbeat();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPagehide);
    deleteDoc(sessionRef).catch(() => {});
  };
}

function PublicLiveContent({ slug }: { slug: string }) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [now, setNow] = useState<number>(() => Date.now());
  const [lastUpdate, setLastUpdate] = useState<number>(() => Date.now());
  const [selectedDivision, setSelectedDivision] = useState<string>('all');

  // Tick the running-clock display every second.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    const onVis = () => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // Resolve slug → eventId, then subscribe to the event live.
  // Once we have the eventId, also start the analytics ping (view count +
  // presence heartbeat) so the organizer can see live viewers.
  useEffect(() => {
    let unsub: (() => void) | null = null;
    let stopAnalytics: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      try {
        const slugDoc = await getDoc(doc(db, 'publicSlugs', slug));
        if (cancelled) return;
        if (!slugDoc.exists()) {
          setLoad({ status: 'not_found', reason: 'This live link does not exist.' });
          return;
        }
        const eventId = slugDoc.data().eventId as string;
        if (!eventId) {
          setLoad({ status: 'not_found', reason: 'Live link is misconfigured.' });
          return;
        }

        // Fire-and-forget analytics tracking. Errors here must not break the page.
        stopAnalytics = startAnalyticsTracking(eventId);

        unsub = onSnapshot(
          doc(db, 'events', eventId),
          snap => {
            if (cancelled) return;
            if (!snap.exists()) {
              setLoad({ status: 'not_found', reason: 'Event not found.' });
              return;
            }
            const data = snap.data() as any;
            const event: SavedEvent = {
              id: snap.id,
              lastModified: data.lastModified?.toDate?.() ?? new Date(),
              eventDetails: {
                ...data.eventDetails,
                date: data.eventDetails?.date?.toDate?.() ?? data.eventDetails?.date,
              },
              divisions: (data.divisions ?? []) as Division[],
              teams: ((data.teams ?? []) as any[]).map(sanitizeTeam),
              publicSlug: data.publicSlug,
            };
            setLoad({ status: 'ready', event });
            setLastUpdate(Date.now());
          },
          err => {
            console.error('Live subscription failed:', err);
            if (!cancelled) setLoad({ status: 'not_found', reason: 'Could not load event.' });
          }
        );
      } catch (err) {
        console.error('Failed to resolve public slug:', err);
        if (!cancelled) setLoad({ status: 'not_found', reason: 'Could not load this link.' });
      }
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
      if (stopAnalytics) stopAnalytics();
    };
  }, [slug]);

  if (load.status === 'loading') {
    return <CenteredMessage title="Loading live results…" />;
  }
  if (load.status === 'not_found') {
    return <CenteredMessage title="Not available" subtitle={load.reason} />;
  }

  return (
    <ReadyView
      event={load.event}
      now={now}
      lastUpdate={lastUpdate}
      selectedDivision={selectedDivision}
      onSelectDivision={setSelectedDivision}
    />
  );
}

function ReadyView({
  event,
  now,
  lastUpdate,
  selectedDivision,
  onSelectDivision,
}: {
  event: SavedEvent;
  now: number;
  lastUpdate: number;
  selectedDivision: string;
  onSelectDivision: (s: string) => void;
}) {
  const allTeams = event.teams;
  const divisionFilter = selectedDivision === 'all' ? null : selectedDivision;
  const teamsInScope = divisionFilter
    ? allTeams.filter(t => t.divisionId === divisionFilter)
    : allTeams;

  const finished = useResults(teamsInScope, event.divisions);
  const running = useMemo(
    () =>
      teamsInScope
        .filter(t => t.status === 'running' && t.startTime)
        .sort((a, b) => safeTime(a.startTime) - safeTime(b.startTime)),
    [teamsInScope]
  );
  const waiting = useMemo(
    () => teamsInScope.filter(t => t.status === 'waiting'),
    [teamsInScope]
  );

  const lastUpdateAgo = Math.max(0, Math.round((now - lastUpdate) / 1000));

  return (
    <div className="min-h-screen bg-stone-50">
      <BrandedHero event={event} lastUpdateAgo={Math.max(0, Math.round((now - lastUpdate) / 1000))} />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {event.divisions && event.divisions.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onSelectDivision('all')}
              className={`px-3 py-1 rounded-full text-sm border ${
                selectedDivision === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted'
              }`}
            >
              All divisions
            </button>
            {event.divisions.map(d => (
              <button
                key={d.id}
                onClick={() => onSelectDivision(d.id)}
                className={`px-3 py-1 rounded-full text-sm border ${
                  selectedDivision === d.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted'
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>
        )}

        <Tabs defaultValue="results" className="w-full">
          <TabsList>
            <TabsTrigger value="results">
              <Trophy className="mr-2 h-4 w-4" /> Results ({finished.length})
            </TabsTrigger>
            <TabsTrigger value="course">
              <Activity className="mr-2 h-4 w-4" /> On course ({running.length})
            </TabsTrigger>
            <TabsTrigger value="waiting">
              <Users className="mr-2 h-4 w-4" /> Waiting ({waiting.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="mt-4">
            <ResultsList finished={finished} divisions={event.divisions ?? []} />
          </TabsContent>
          <TabsContent value="course" className="mt-4">
            <RunningList running={running} divisions={event.divisions ?? []} now={now} />
          </TabsContent>
          <TabsContent value="waiting" className="mt-4">
            <WaitingList teams={waiting} divisions={event.divisions ?? []} />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="mt-12">
        <div className="relative">
          <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-stone-300 to-transparent" />
          <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live · updated {lastUpdateAgo}s ago
            </span>
            <span className="font-display tracking-wide">
              Software by{' '}
              <a
                href="https://stableware.pro"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-emerald-800 hover:text-emerald-900 hover:underline underline-offset-4"
              >
                PaceMaster
              </a>
              <span className="mx-2 text-amber-600/70">◆</span>
              <a
                href="https://stableware.pro"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-slate-800 hover:text-slate-950 hover:underline underline-offset-4"
              >
                StableWare
              </a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function useResults(teams: Team[], divisions: Division[]) {
  return useMemo(() => {
    const finished = teams.filter(t => t.status === 'finished' && t.elapsedTime !== undefined);
    return finished
      .map(t => {
        const division = divisions.find(d => d.id === t.divisionId);
        const optimal = division?.optimalTime ?? 0;
        const diff = (t.elapsedTime ?? 0) - optimal;
        return {
          ...t,
          divisionName: division?.name ?? '—',
          optimalTime: optimal,
          difference: diff,
          absDifference: Math.abs(diff),
        };
      })
      .sort((a, b) => a.absDifference - b.absDifference);
  }, [teams, divisions]);
}

function ResultsList({
  finished,
  divisions,
}: {
  finished: ReturnType<typeof useResults>;
  divisions: Division[];
}) {
  if (finished.length === 0) {
    return <EmptyState title="No finishers yet" subtitle="Results appear here as teams complete the course." />;
  }
  // Group by division so each has its own ranks
  const byDivision = new Map<string, typeof finished>();
  for (const r of finished) {
    const list = byDivision.get(r.divisionId ?? '') ?? [];
    list.push(r);
    byDivision.set(r.divisionId ?? '', list);
  }

  return (
    <div className="space-y-6">
      {Array.from(byDivision.entries()).map(([divId, list]) => {
        const div = divisions.find(d => d.id === divId);
        return (
          <Card key={divId || 'no-division'}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{div?.name ?? 'Unassigned'}</span>
                {div?.optimalTime ? (
                  <span className="text-xs font-normal text-muted-foreground">
                    Optimal: {formatDuration(div.optimalTime)}
                  </span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-2 w-12">Rank</th>
                    <th className="px-4 py-2 w-12">#</th>
                    <th className="px-4 py-2">Team</th>
                    <th className="px-4 py-2 hidden sm:table-cell">Riders</th>
                    <th className="px-4 py-2 text-right">Time</th>
                    <th className="px-4 py-2 text-right">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r, i) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-4 py-2 font-bold">
                        {i === 0 && <span className="text-amber-500 mr-1">🥇</span>}
                        {i === 1 && <span className="text-slate-400 mr-1">🥈</span>}
                        {i === 2 && <span className="text-amber-700 mr-1">🥉</span>}
                        {i + 1}
                      </td>
                      <td className="px-4 py-2 font-mono">{r.number}</td>
                      <td className={`px-4 py-2 ${r.name?.trim() ? '' : 'italic text-muted-foreground'}`}>
                        {teamDisplayName(r)}
                      </td>
                      <td className="px-4 py-2 hidden sm:table-cell text-muted-foreground">{r.riders}</td>
                      <td className="px-4 py-2 text-right font-mono">{formatDuration(r.elapsedTime ?? 0)}</td>
                      <td className="px-4 py-2 text-right">
                        <Badge variant={r.difference === 0 ? 'default' : 'secondary'}>
                          {formatDifference(r.difference)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function RunningList({
  running,
  divisions,
  now,
}: {
  running: Team[];
  divisions: Division[];
  now: number;
}) {
  if (running.length === 0) {
    return <EmptyState title="No teams on course" subtitle="Teams currently riding will show up here." />;
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {running.map(t => {
        const startMs = safeTime(t.startTime);
        const elapsed = startMs ? Math.max(0, Math.floor((now - startMs) / 1000)) : 0;
        const div = divisions.find(d => d.id === t.divisionId);
        return (
          <Card key={t.id} className="border-emerald-300">
            <CardContent className="p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">#{t.number}</span>
                <span className="font-mono text-2xl font-bold text-emerald-700">
                  {formatDuration(elapsed)}
                </span>
              </div>
              <p className={`font-semibold ${t.name?.trim() ? '' : 'italic text-muted-foreground'}`}>
                {teamDisplayName(t)}
              </p>
              <p className="text-xs text-muted-foreground truncate">{t.riders}</p>
              {div && <p className="text-xs text-muted-foreground mt-1">{div.name}</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function WaitingList({ teams, divisions }: { teams: Team[]; divisions: Division[] }) {
  if (teams.length === 0) {
    return <EmptyState title="No teams waiting" subtitle="All teams are either on course or finished." />;
  }
  const sorted = [...teams].sort((a, b) => a.number - b.number);
  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-4 py-2 w-12">#</th>
              <th className="px-4 py-2">Team</th>
              <th className="px-4 py-2 hidden sm:table-cell">Riders</th>
              <th className="px-4 py-2">Division</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(t => {
              const div = divisions.find(d => d.id === t.divisionId);
              return (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-2 font-mono">{t.number}</td>
                  <td className={`px-4 py-2 ${t.name?.trim() ? '' : 'italic text-muted-foreground'}`}>
                    {teamDisplayName(t)}
                  </td>
                  <td className="px-4 py-2 hidden sm:table-cell text-muted-foreground">{t.riders}</td>
                  <td className="px-4 py-2 text-muted-foreground">{div?.name ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function SponsorMark({
  src,
  alt,
  size = 'sm',
}: {
  src: string;
  alt: string;
  size?: 'sm' | 'lg';
}) {
  const sizeClass =
    size === 'lg'
      ? 'h-24 w-44 sm:h-28 sm:w-52 px-2 py-1.5'
      : 'h-14 w-28 sm:h-16 sm:w-32 px-1.5 py-1';
  return (
    <a
      href="https://stableware.pro"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${alt} · Visit StableWare`}
      className="group inline-flex focus:outline-none"
    >
      <span
        className={`
          inline-flex items-center justify-center
          ${sizeClass}
          rounded-lg bg-stone-50/95
          shadow-[0_2px_10px_-2px_rgba(0,0,0,0.35)]
          ring-1 ring-stone-200/60
          transition-all duration-300
          group-hover:bg-white group-hover:shadow-[0_4px_18px_-2px_rgba(0,0,0,0.45)] group-hover:-translate-y-0.5
        `}
      >
        <img
          src={src}
          alt={alt}
          className="max-h-full max-w-full w-auto h-auto object-contain"
        />
      </span>
    </a>
  );
}

function BrandedHero({ event, lastUpdateAgo }: { event: SavedEvent; lastUpdateAgo: number }) {
  const eventName = event.eventDetails?.name || 'Hunter Pace Event';
  const date = event.eventDetails?.date
    ? event.eventDetails.date instanceof Date
      ? event.eventDetails.date
      : new Date(event.eventDetails.date as any)
    : null;
  const dateValid = date && !Number.isNaN(date.getTime());

  return (
    <header className="relative overflow-hidden text-stone-50">
      {/* Background gradient locks to the PaceMaster logo's exact teal-green
         (#165452) so the PaceMaster card sits seamlessly on the page. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 80% at 50% 30%, #1F6B68 0%, #165452 45%, #0D3937 100%)',
        }}
      />
      {/* Faint paper-grain texture via SVG noise */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
      {/* Top gold hairline */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />

      <div className="relative container mx-auto px-4 pt-6 pb-10 sm:pt-8 sm:pb-12">
        {/* Host: MOC Beagles — front and center, large */}
        <div className="flex justify-center">
          <SponsorMark src="/moc-beagles-logo.png" alt="MOC Beagles" size="lg" />
        </div>

        {/* Software credit — smaller, secondary */}
        <div className="mt-3 flex flex-col items-center gap-2">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.4em] text-amber-200/90 font-medium">
            Software by
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <SponsorMark src="/pacemaster-logo.png" alt="PaceMaster" />
            <SponsorMark src="/stableware-logo.png" alt="StableWare" />
          </div>
        </div>

        {/* Gold rule with center diamond — echoes the certificate */}
        <div className="mt-6 flex items-center justify-center gap-2 text-amber-300/70" aria-hidden>
          <span className="block h-px w-16 sm:w-28 bg-gradient-to-r from-transparent to-amber-300/70" />
          <span className="inline-block h-1.5 w-1.5 rotate-45 bg-amber-300/80" />
          <span className="block h-px w-16 sm:w-28 bg-gradient-to-l from-transparent to-amber-300/70" />
        </div>

        {/* Title block */}
        <div className="mt-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.5em] text-amber-200/90">Live Results</p>
          <h1
            className="mt-3 font-display font-bold leading-[1.05] text-stone-50 text-4xl sm:text-5xl md:text-6xl"
            style={{ textShadow: '0 1px 0 rgba(0,0,0,0.35)' }}
          >
            {eventName}
          </h1>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm sm:text-[15px] text-emerald-100/85">
            {dateValid && (
              <span className="font-display italic text-stone-100/95">
                {date.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
            {event.eventDetails?.location && (
              <>
                <span aria-hidden className="text-amber-300/60">·</span>
                <span>{event.eventDetails.location}</span>
              </>
            )}
            {event.eventDetails?.organizer && (
              <>
                <span aria-hidden className="text-amber-300/60">·</span>
                <span>{event.eventDetails.organizer}</span>
              </>
            )}
          </div>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-950/40 px-3 py-1 text-xs text-emerald-100 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Live · updated {lastUpdateAgo}s ago
          </div>
        </div>
      </div>

      {/* Bottom gold hairline */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
    </header>
  );
}

function CenteredMessage({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <header className="relative overflow-hidden text-stone-50">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 80% at 50% 30%, #1F6B68 0%, #165452 45%, #0D3937 100%)',
          }}
        />
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
        <div className="relative container mx-auto px-4 py-6 flex flex-col items-center gap-3">
          <SponsorMark src="/moc-beagles-logo.png" alt="MOC Beagles" size="lg" />
          <p className="text-[10px] uppercase tracking-[0.4em] text-amber-200/90 font-medium">
            Software by
          </p>
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <SponsorMark src="/pacemaster-logo.png" alt="PaceMaster" />
            <SponsorMark src="/stableware-logo.png" alt="StableWare" />
          </div>
        </div>
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
      </header>
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-2">
        <h1 className="font-display text-2xl font-semibold text-stone-800">{title}</h1>
        {subtitle && <p className="text-muted-foreground max-w-md">{subtitle}</p>}
      </div>
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="rounded-md border border-dashed p-8 text-center text-sm">
      <p className="font-medium">{title}</p>
      {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

export default function LivePage() {
  const [slug, setSlug] = useState<string | null | undefined>(undefined);

  // Read ?e=<slug> from the URL on the client. Static-export safe.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('e') ?? params.get('event') ?? '';
    const normalized = raw.trim().toLowerCase();
    setSlug(normalized || null);
  }, []);

  if (slug === undefined) return <CenteredMessage title="Loading…" />;
  if (!slug) {
    return (
      <CenteredMessage
        title="Live results"
        subtitle="Add ?e=your-event-slug to the URL to view a public live results page."
      />
    );
  }
  return <PublicLiveContent slug={slug} />;
}
