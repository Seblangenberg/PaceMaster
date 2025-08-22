
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Award, BarChart, Download, FileText } from 'lucide-react';
import type { Team, Division, EventDetails } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { jsPDF } from "jspdf";

interface ResultsTabProps {
  finishedTeams: Team[];
  divisions: Division[];
  eventDetails: EventDetails;
}

function formatDuration(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00:00';
  const sign = totalSeconds < 0 ? "-" : "";
  const absSeconds = Math.abs(totalSeconds);
  const minutes = Math.floor(absSeconds / 60);
  const seconds = Math.floor(absSeconds % 60);
  return `${sign}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const StatCard = ({ title, value }: { title: string; value: string }) => (
  <Card className="text-center">
    <CardHeader className="p-4">
      <CardTitle className="text-2xl">{value}</CardTitle>
    </CardHeader>
    <CardContent className="p-4 pt-0">
      <p className="text-sm text-muted-foreground">{title}</p>
    </CardContent>
  </Card>
);

export default function ResultsTab({ finishedTeams, divisions, eventDetails }: ResultsTabProps) {
  const [selectedDivision, setSelectedDivision] = useState('all');

  const results = useMemo(() => {
    return finishedTeams
      .map(team => {
        const division = divisions.find(d => d.id === team.divisionId);
        const optimalTime = division?.optimalTime ?? 0;
        const difference = (team.elapsedTime ?? 0) - optimalTime;
        return {
          ...team,
          divisionName: division?.name ?? 'N/A',
          optimalTime,
          difference,
          absDifference: Math.abs(difference),
        };
      })
      .sort((a, b) => a.absDifference - b.absDifference);
  }, [finishedTeams, divisions]);

  const filteredResults = useMemo(() => {
    if (selectedDivision === 'all') return results;
    return results.filter(r => r.divisionId === selectedDivision);
  }, [results, selectedDivision]);

  const stats = useMemo(() => {
    const times = filteredResults.map(r => r.elapsedTime ?? 0).filter(t => t > 0);
    if (times.length === 0) return { fastest: 0, slowest: 0, average: 0, median: 0 };

    const sortedTimes = [...times].sort((a, b) => a - b);
    const fastest = sortedTimes[0];
    const slowest = sortedTimes[sortedTimes.length - 1];
    const average = sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length;
    const mid = Math.floor(sortedTimes.length / 2);
    const median = sortedTimes.length % 2 === 0 ? (sortedTimes[mid - 1] + sortedTimes[mid]) / 2 : sortedTimes[mid];

    return { fastest, slowest, average, median };
  }, [filteredResults]);

  const topFinishersByDivision = useMemo(() => {
    const grouped = results.reduce((acc, result) => {
        if (result.divisionId) {
            acc[result.divisionId] = acc[result.divisionId] || [];
            acc[result.divisionId].push(result);
        }
        return acc;
    }, {} as Record<string, typeof results>);

    return Object.entries(grouped).map(([divId, divResults]) => ({
        divisionName: divResults[0].divisionName,
        topTeam: divResults[0]
    }));
  }, [results]);
  
  const handleDownloadCertificate = (team: (typeof results)[0]) => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text("PaceMaster Certificate of Achievement", 105, 20, { align: "center" });
    doc.setFontSize(16);
    doc.text(`Event: ${eventDetails.name}`, 105, 40, { align: "center" });

    doc.setFontSize(12);
    doc.text(`This certificate is awarded to`, 105, 60, { align: "center" });
    
    doc.setFontSize(20).setFont("helvetica", "bold");
    doc.text(`${team.name}`, 105, 75, { align: "center" });

    doc.setFontSize(12).setFont("helvetica", "normal");
    doc.text(`Riders: ${team.riders}`, 105, 85, { align: "center" });
    
    doc.text(`For their outstanding performance in the`, 105, 100, { align: "center" });

    doc.setFontSize(16).setFont("helvetica", "bold");
    doc.text(`${team.divisionName} Division`, 105, 110, { align: "center" });
    
    doc.setFontSize(12).setFont("helvetica", "normal");
    doc.text(`Their final time of ${formatDuration(team.elapsedTime ?? 0)} was just ${formatDuration(team.absDifference)} from the optimal time.`, 105, 125, { align: "center" });

    if (eventDetails.date) {
        doc.text(`Date: ${eventDetails.date.toLocaleDateString()}`, 20, 150);
    }
    doc.text(`Organizer: ${eventDetails.organizer}`, 20, 160);

    doc.save(`${team.name}_Certificate.pdf`);
  }

  const handleExportResults = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Results for ${eventDetails.name}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Division: ${selectedDivision === 'all' ? 'All Divisions' : divisions.find(d => d.id === selectedDivision)?.name}`, 14, 30);
    
    const tableData = filteredResults.map((r, i) => [
        i + 1,
        r.number,
        r.name,
        r.divisionName,
        formatDuration(r.elapsedTime ?? 0),
        formatDuration(r.difference)
    ]);
    
    (doc as any).autoTable({
        head: [['Rank', '#', 'Team', 'Division', 'Time', 'Difference']],
        body: tableData,
        startY: 35,
    });

    doc.save(`Results_${eventDetails.name.replace(/\s/g, '_')}.pdf`);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <CardTitle>Event Results</CardTitle>
                    <CardDescription>Final rankings for all completed teams.</CardDescription>
                </div>
                <div className="flex w-full sm:w-auto items-center gap-2">
                    <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by division" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Divisions</SelectItem>
                            {divisions.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Button variant="outline" onClick={handleExportResults} disabled={finishedTeams.length === 0}>
                        <Download className="mr-2 h-4 w-4" /> Export PDF
                    </Button>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>#</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Difference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.length > 0 ? (
                  filteredResults.map((result, index) => (
                    <TableRow key={result.id}>
                      <TableCell className="font-bold">{index + 1}</TableCell>
                      <TableCell>{result.number}</TableCell>
                      <TableCell>{result.name}</TableCell>
                      <TableCell>{result.divisionName}</TableCell>
                      <TableCell>{formatDuration(result.elapsedTime ?? 0)}</TableCell>
                      <TableCell>
                        <Badge variant={result.difference === 0 ? "default" : "secondary"}>
                          {formatDuration(result.difference)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">No results to display for this division.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><BarChart className="mr-2 h-5 w-5"/> Overall Statistics</CardTitle>
            <CardDescription>Performance metrics for the selected division.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <StatCard title="Fastest Time" value={formatDuration(stats.fastest)} />
            <StatCard title="Slowest Time" value={formatDuration(stats.slowest)} />
            <StatCard title="Average Time" value={formatDuration(stats.average)} />
            <StatCard title="Median Time" value={formatDuration(stats.median)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Award className="mr-2 h-5 w-5"/> Top Finishers</CardTitle>
             <CardDescription>Division winners.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topFinishersByDivision.map(item => (
                <div key={item.divisionName} className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50 group">
                    <div>
                        <p className="font-bold">{item.divisionName}</p>
                        <p className="text-muted-foreground">{item.topTeam.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{formatDuration(item.topTeam.absDifference)}</Badge>
                                               <Button size="sm" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => handleDownloadCertificate(item.topTeam)}>
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
