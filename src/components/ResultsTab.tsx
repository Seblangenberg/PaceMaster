
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
import autoTable from "jspdf-autotable";

interface ResultsTabProps {
  finishedTeams: Team[];
  divisions: Division[];
  eventDetails: EventDetails;
}

function formatDuration(totalSeconds: number): string {
  if (isNaN(totalSeconds)) return '00:00';
  const sign = totalSeconds < 0 ? "-" : "";
  const absSeconds = Math.abs(totalSeconds);
  const minutes = Math.floor(absSeconds / 60);
  const seconds = Math.floor(absSeconds % 60);
  return `${sign}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatDifference(diffSeconds: number): string {
  if (isNaN(diffSeconds)) return '—';
  if (diffSeconds === 0) return 'on target';
  const sign = diffSeconds > 0 ? '+' : '-';
  const abs = Math.abs(diffSeconds);
  const m = Math.floor(abs / 60);
  const s = Math.floor(abs % 60);
  return `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
  
  const handleDownloadCertificate = async (team: (typeof results)[0]) => {
    try {
      // Landscape A4: 297 × 210 mm
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = 297;
      const H = 210;

      const FOREST: [number, number, number] = [21, 71, 52];   // deep hunt green
      const GOLD: [number, number, number] = [184, 134, 11];   // antique gold
      const INK: [number, number, number] = [40, 40, 40];      // body text
      const MUTED: [number, number, number] = [110, 110, 110]; // labels

      // Cream background
      doc.setFillColor(252, 248, 240);
      doc.rect(0, 0, W, H, 'F');

      // Outer decorative double border
      doc.setDrawColor(...FOREST);
      doc.setLineWidth(1.2);
      doc.rect(8, 8, W - 16, H - 16);
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.5);
      doc.rect(11, 11, W - 22, H - 22);

      // Corner flourishes (small filled diamonds in gold)
      const diamond = (cx: number, cy: number, s: number) => {
        doc.setFillColor(...GOLD);
        doc.triangle(cx - s, cy, cx, cy - s, cx + s, cy, 'F');
        doc.triangle(cx - s, cy, cx, cy + s, cx + s, cy, 'F');
      };
      diamond(11, 11, 2);
      diamond(W - 11, 11, 2);
      diamond(11, H - 11, 2);
      diamond(W - 11, H - 11, 2);

      // Logos — load both as data URLs in parallel
      const fetchAsDataUrl = async (url: string): Promise<string | null> => {
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          const blob = await res.blob();
          return await new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch {
          return null;
        }
      };

      const [mocLogo, pmLogo] = await Promise.all([
        fetchAsDataUrl('/moc-beagles-logo.png'),
        fetchAsDataUrl('/pacemaster-logo.png'),
      ]);

      const LOGO_H = 28;
      if (mocLogo) {
        // MOC Beagles is wider than tall (oval). Aspect ~2.6:1.
        doc.addImage(mocLogo, 'PNG', 22, 20, LOGO_H * 1.6, LOGO_H);
      }
      if (pmLogo) {
        // PaceMaster is square.
        doc.addImage(pmLogo, 'PNG', W - 22 - LOGO_H, 20, LOGO_H, LOGO_H);
      }

      // Title block
      doc.setTextColor(...FOREST);
      doc.setFont('times', 'italic');
      doc.setFontSize(14);
      doc.text('Certificate of', W / 2, 64, { align: 'center' });

      doc.setFont('times', 'bold');
      doc.setFontSize(38);
      doc.text('Achievement', W / 2, 80, { align: 'center' });

      // Decorative gold rule under title
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.8);
      doc.line(W / 2 - 60, 86, W / 2 - 5, 86);
      doc.line(W / 2 + 5, 86, W / 2 + 60, 86);
      diamond(W / 2, 86, 1.6);

      // Event name
      doc.setTextColor(...INK);
      doc.setFont('times', 'normal');
      doc.setFontSize(13);
      doc.text(eventDetails.name || 'Hunter Pace Event', W / 2, 95, { align: 'center' });

      // "presented to"
      doc.setFont('times', 'italic');
      doc.setFontSize(12);
      doc.setTextColor(...MUTED);
      doc.text('presented to', W / 2, 108, { align: 'center' });

      // Team name — the hero of the page
      doc.setFont('times', 'bold');
      doc.setFontSize(34);
      doc.setTextColor(...FOREST);
      doc.text(team.name, W / 2, 124, { align: 'center' });

      // Riders
      doc.setFont('times', 'italic');
      doc.setFontSize(13);
      doc.setTextColor(...INK);
      const ridersText = team.riders ? `with riders ${team.riders}` : '';
      if (ridersText) {
        doc.text(ridersText, W / 2, 134, { align: 'center', maxWidth: W - 60 });
      }

      // Performance line
      const place = ['1st', '2nd', '3rd'][results.findIndex(r => r.id === team.id)] ?? `${results.findIndex(r => r.id === team.id) + 1}th`;
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(...INK);
      doc.text(
        `for their ${place}-place finish in the ${team.divisionName} division`,
        W / 2,
        142,
        { align: 'center' }
      );

      // Stats box (centered, three columns) — sized to leave clear space
      // above the signature footer below.
      const boxY = 148;
      const boxH = 22;
      const boxW = 180;
      const boxX = (W - boxW) / 2;
      doc.setDrawColor(...FOREST);
      doc.setLineWidth(0.4);
      doc.setFillColor(247, 240, 225);
      doc.rect(boxX, boxY, boxW, boxH, 'FD');

      const colCenters = [boxX + boxW / 6, boxX + boxW / 2, boxX + (5 * boxW) / 6];
      const labels = ['Course Time', 'Distance from Optimal', 'Optimal Time'];
      const values = [
        formatDuration(team.elapsedTime ?? 0),
        formatDifference(team.difference),
        formatDuration(team.optimalTime),
      ];

      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      labels.forEach((lbl, i) => doc.text(lbl, colCenters[i], boxY + 7, { align: 'center' }));

      doc.setFont('times', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(...FOREST);
      values.forEach((v, i) => doc.text(v, colCenters[i], boxY + 16, { align: 'center' }));

      // Footer — date + organizer signature lines, well below the stats box
      const footerY = 192;
      doc.setDrawColor(...MUTED);
      doc.setLineWidth(0.3);
      doc.line(40, footerY, 110, footerY);
      doc.line(W - 110, footerY, W - 40, footerY);

      // Names go ABOVE the signature line; field labels go BELOW.
      doc.setFont('times', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(...INK);
      if (eventDetails.date) {
        const d = eventDetails.date instanceof Date ? eventDetails.date : new Date(eventDetails.date);
        if (!isNaN(d.getTime())) {
          doc.text(
            d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
            75,
            footerY - 3,
            { align: 'center' }
          );
        }
      }
      if (eventDetails.organizer) {
        doc.text(eventDetails.organizer, W - 75, footerY - 3, { align: 'center' });
      }

      doc.setFont('times', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(...MUTED);
      doc.text('Date', 75, footerY + 5, { align: 'center' });
      doc.text('Organizer', W - 75, footerY + 5, { align: 'center' });

      const safeName = (team.name || 'team').replace(/[^\w\-]+/g, '_');
      doc.save(`${safeName}_Certificate.pdf`);
    } catch (err) {
      console.error('Failed to generate certificate:', err);
    }
  };

  const handleExportResults = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`Results for ${eventDetails.name}`, 14, 22);
      doc.setFontSize(11);
      doc.text(
        `Division: ${selectedDivision === 'all' ? 'All Divisions' : divisions.find(d => d.id === selectedDivision)?.name}`,
        14,
        30
      );

      const tableData = filteredResults.map((r, i) => [
        i + 1,
        r.number,
        r.name,
        r.divisionName,
        formatDuration(r.elapsedTime ?? 0),
        formatDifference(r.difference),
      ]);

      autoTable(doc, {
        head: [['Rank', '#', 'Team', 'Division', 'Time', 'Difference']],
        body: tableData,
        startY: 35,
      });

      const safeName = (eventDetails.name || 'event').replace(/[^\w\-]+/g, '_');
      doc.save(`Results_${safeName}.pdf`);
    } catch (err) {
      console.error('Failed to export results PDF:', err);
    }
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
                          {formatDifference(result.difference)}
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
