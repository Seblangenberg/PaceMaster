'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Team, Division } from '@/lib/types';
import { format } from 'date-fns';
import { Play, Square, Flag, Users, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimingTabProps {
  teams: Team[];
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
  divisions: Division[];
}

function formatDuration(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function TeamCard({ team, divisionName, onStart, onFinish, runningTime }: {
  team: Team;
  divisionName: string;
  onStart: () => void;
  onFinish: () => void;
  runningTime?: number;
}) {
  const cardStatusStyles = {
    waiting: 'bg-muted/50 border-dashed',
    running: 'bg-primary/10 border-primary ring-2 ring-primary/50',
    finished: 'bg-green-500/10 border-green-500',
    disqualified: 'bg-red-500/10 border-red-500',
    withdrawn: 'bg-gray-500/10 border-gray-500',
  } as const;

  return (
    <Card className={cn("transition-all", cardStatusStyles[team.status])}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-bold text-lg">
              #{team.number}
              {team.name?.trim() ? ` - ${team.name}` : ''}
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4"/> {team.riders}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-2"><Info className="h-4 w-4"/> {divisionName}</p>
          </div>
          <div className="text-right">
            {team.status === 'running' && runningTime !== undefined && (
              <p className="text-2xl font-mono font-bold text-primary">{formatDuration(runningTime)}</p>
            )}
            {team.status === 'finished' && team.elapsedTime !== undefined && (
              <>
                <p className="text-lg font-mono font-bold text-green-600">{formatDuration(team.elapsedTime)}</p>
                <p className="text-xs text-muted-foreground">Finished</p>
              </>
            )}
          </div>
        </div>
        <div className="mt-4 flex justify-between items-center text-xs text-muted-foreground">
          <div>
            {team.startTime && <p>Start: {format(team.startTime, 'HH:mm:ss')}</p>}
            {team.finishTime && <p>Finish: {format(team.finishTime, 'HH:mm:ss')}</p>}
          </div>
          <div className="flex gap-2">
            {team.status === 'waiting' && <Button size="sm" onClick={onStart}><Play className="mr-2 h-4 w-4" /> Start</Button>}
            {team.status === 'running' && <Button size="sm" variant="danger" onClick={onFinish}><Square className="mr-2 h-4 w-4" /> Finish</Button>}
            {team.status === 'finished' && <Button size="sm" variant="ghost" disabled><Flag className="mr-2 h-4 w-4" />Done</Button>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TimingTab({ teams, setTeams, divisions }: TimingTabProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStartTeam = (id: string) => {
    setTeams(currentTeams => currentTeams.map(t =>
      t.id === id ? { ...t, status: 'running', startTime: new Date() } : t
    ));
  };

  const handleFinishTeam = (id: string) => {
    setTeams(currentTeams => currentTeams.map(t => {
      if (t.id === id && t.startTime) {
        const finishTime = new Date();
        const elapsedTime = (finishTime.getTime() - t.startTime.getTime()) / 1000;
        return { ...t, status: 'finished', finishTime, elapsedTime };
      }
      return t;
    }));
  };

  const { waitingTeams, runningTeams, recentlyFinishedTeams } = useMemo(() => {
    const waiting = teams.filter(t => t.status === 'waiting').sort((a,b) => a.number - b.number);
    const running = teams.filter(t => t.status === 'running').sort((a,b) => a.number - b.number);
    const finished = teams.filter(t => t.status === 'finished').sort((a, b) => (b.finishTime?.getTime() || 0) - (a.finishTime?.getTime() || 0));
    return {
      waitingTeams: waiting,
      runningTeams: running,
      recentlyFinishedTeams: finished.slice(0, 10),
    };
  }, [teams]);

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Waiting to Start ({waitingTeams.length})</CardTitle>
          <CardDescription>Teams ready to begin.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-4 pr-4">
              {waitingTeams.length > 0 ? waitingTeams.map(team => (
                <TeamCard
                  key={team.id}
                  team={team}
                  divisionName={divisions.find(d => d.id === team.divisionId)?.name || 'N/A'}
                  onStart={() => handleStartTeam(team.id)}
                  onFinish={() => handleFinishTeam(team.id)}
                />
              )) : <p className="text-muted-foreground text-center py-10">No teams waiting.</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>On Course ({runningTeams.length})</CardTitle>
          <CardDescription>Teams currently running.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-4 pr-4">
              {runningTeams.length > 0 ? runningTeams.map(team => {
                  const runningTime = team.startTime ? (now.getTime() - team.startTime.getTime()) / 1000 : 0;
                  return (
                    <TeamCard
                      key={team.id}
                      team={team}
                      divisionName={divisions.find(d => d.id === team.divisionId)?.name || 'N/A'}
                      onStart={() => handleStartTeam(team.id)}
                      onFinish={() => handleFinishTeam(team.id)}
                      runningTime={runningTime}
                    />
                  )
                }) : <p className="text-muted-foreground text-center py-10">No teams on course.</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Recently Finished</CardTitle>
          <CardDescription>Last teams to complete the course.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-4 pr-4">
              {recentlyFinishedTeams.length > 0 ? recentlyFinishedTeams.map(team => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    divisionName={divisions.find(d => d.id === team.divisionId)?.name || 'N/A'}
                    onStart={() => handleStartTeam(team.id)}
                    onFinish={() => handleFinishTeam(team.id)}
                  />
                )) : <p className="text-muted-foreground text-center py-10">No teams have finished.</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
