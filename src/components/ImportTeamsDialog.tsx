'use client';

import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Division, Team } from '@/lib/types';

interface ImportTeamsDialogProps {
  trigger: React.ReactNode;
  divisions: Division[];
  existingTeams: Team[];
  onImport: (rows: ImportedTeamRow[]) => void;
}

export interface ImportedTeamRow {
  number: number;
  name?: string;
  riders: string;
  divisionId?: string;
}

interface ParsedRow {
  rowIndex: number;
  raw: Record<string, string>;
  result:
    | { ok: true; team: ImportedTeamRow; warnings: string[] }
    | { ok: false; error: string };
}

const SAMPLE_CSV = `Number,Team Name,Riders,Division
15,The Eagles,"John D., Jane S.",Junior
16,Silver Spurs,"Alice P., Bob R.",Open
17,Trail Blazers,"Carol M.",Senior`;

const HEADER_ALIASES: Record<string, string> = {
  '#': 'number',
  number: 'number',
  'team number': 'number',
  'team #': 'number',
  no: 'number',
  num: 'number',
  name: 'name',
  'team name': 'name',
  team: 'name',
  riders: 'riders',
  rider: 'riders',
  'rider names': 'riders',
  members: 'riders',
  division: 'division',
  'division name': 'division',
  class: 'division',
  category: 'division',
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += c;
      i++;
      continue;
    }
    if (c === '"' && cell.length === 0) {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ',') {
      row.push(cell);
      cell = '';
      i++;
      continue;
    }
    if (c === '\r' || c === '\n') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some(v => v.length > 0)) rows.push(row);
      row = [];
      cell = '';
      i++;
      continue;
    }
    cell += c;
    i++;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some(v => v.length > 0)) rows.push(row);
  }
  return rows;
}

function normalizeHeader(h: string): string | null {
  const key = h.trim().toLowerCase().replace(/[_\-]/g, ' ').replace(/\s+/g, ' ');
  return HEADER_ALIASES[key] ?? null;
}

function parseRows(
  text: string,
  divisions: Division[],
  existingTeams: Team[]
): { headerError?: string; rows: ParsedRow[] } {
  const grid = parseCsv(text);
  if (grid.length === 0) return { headerError: 'CSV is empty.', rows: [] };

  const header = grid[0].map(normalizeHeader);
  const required = ['number', 'riders'];
  for (const r of required) {
    if (!header.includes(r)) {
      return {
        headerError: `Missing required column "${r}". Expected columns: Number, Riders, and optionally Team Name and Division.`,
        rows: [],
      };
    }
  }

  const numberIdx = header.indexOf('number');
  const nameIdx = header.indexOf('name'); // -1 if absent — name column is optional
  const ridersIdx = header.indexOf('riders');
  const divisionIdx = header.indexOf('division');

  const divisionByName = new Map(
    divisions.map(d => [d.name.trim().toLowerCase(), d.id])
  );

  const seenNumbersInFile = new Map<number, number>();
  const existingNumbers = new Set(existingTeams.map(t => t.number));

  const out: ParsedRow[] = [];
  for (let i = 1; i < grid.length; i++) {
    const cells = grid[i];
    const raw: Record<string, string> = {
      number: cells[numberIdx]?.trim() ?? '',
      name: nameIdx >= 0 ? cells[nameIdx]?.trim() ?? '' : '',
      riders: cells[ridersIdx]?.trim() ?? '',
      division: divisionIdx >= 0 ? cells[divisionIdx]?.trim() ?? '' : '',
    };

    const warnings: string[] = [];

    const numStr = raw.number;
    const num = Number.parseInt(numStr, 10);
    if (!numStr) {
      out.push({ rowIndex: i, raw, result: { ok: false, error: 'Missing team number.' } });
      continue;
    }
    if (!Number.isFinite(num) || num <= 0 || String(num) !== numStr.replace(/^0+(?=\d)/, '')) {
      out.push({
        rowIndex: i,
        raw,
        result: { ok: false, error: `Team number "${numStr}" must be a positive integer.` },
      });
      continue;
    }
    if (existingNumbers.has(num)) {
      out.push({
        rowIndex: i,
        raw,
        result: { ok: false, error: `Team #${num} already exists in this event.` },
      });
      continue;
    }
    if (seenNumbersInFile.has(num)) {
      out.push({
        rowIndex: i,
        raw,
        result: {
          ok: false,
          error: `Duplicate team #${num} in CSV (also on row ${seenNumbersInFile.get(num)}).`,
        },
      });
      continue;
    }
    seenNumbersInFile.set(num, i);

    // Team name is optional — no validation required.
    if (!raw.riders) {
      out.push({ rowIndex: i, raw, result: { ok: false, error: 'Missing riders.' } });
      continue;
    }

    let divisionId: string | undefined;
    if (raw.division) {
      const matched = divisionByName.get(raw.division.toLowerCase());
      if (matched) {
        divisionId = matched;
      } else {
        warnings.push(`Division "${raw.division}" not found — team will be unassigned.`);
      }
    } else {
      warnings.push('No division specified — team will be unassigned.');
    }

    out.push({
      rowIndex: i,
      raw,
      result: {
        ok: true,
        team: {
          number: num,
          name: raw.name ? raw.name : undefined,
          riders: raw.riders,
          divisionId,
        },
        warnings,
      },
    });
  }

  return { rows: out };
}

export default function ImportTeamsDialog({
  trigger,
  divisions,
  existingTeams,
  onImport,
}: ImportTeamsDialogProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => {
    if (!text.trim()) return null;
    return parseRows(text, divisions, existingTeams);
  }, [text, divisions, existingTeams]);

  const validRows = parsed?.rows.filter(r => r.result.ok) ?? [];
  const invalidRows = parsed?.rows.filter(r => !r.result.ok) ?? [];

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') setText(result);
    };
    reader.onerror = () => {
      setText('');
      setFileName(null);
    };
    reader.readAsText(file);
  };

  const handleConfirm = () => {
    if (validRows.length === 0) return;
    const rows = validRows
      .map(r => (r.result.ok ? r.result.team : null))
      .filter((t): t is ImportedTeamRow => t !== null);
    onImport(rows);
    setOpen(false);
    setText('');
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setText('');
      setFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pacemaster-teams-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Teams from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV with columns <strong>Number</strong> and <strong>Riders</strong>{' '}
            required, plus optional <strong>Team Name</strong> and <strong>Division</strong>.
            Division names are matched to your existing divisions.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Choose CSV file
            </Button>
            <Button type="button" variant="ghost" onClick={downloadTemplate}>
              <FileText className="mr-2 h-4 w-4" />
              Download template
            </Button>
            {fileName && (
              <span className="text-sm text-muted-foreground truncate">{fileName}</span>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="csv-paste">Or paste CSV content</Label>
            <Textarea
              id="csv-paste"
              value={text}
              onChange={e => {
                setText(e.target.value);
                setFileName(null);
              }}
              placeholder={SAMPLE_CSV}
              className="font-mono text-xs h-32"
            />
          </div>

          {parsed?.headerError && (
            <div className="flex items-start gap-2 rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{parsed.headerError}</span>
            </div>
          )}

          {parsed && !parsed.headerError && parsed.rows.length > 0 && (
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {validRows.length} ready to import
                </span>
                {invalidRows.length > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {invalidRows.length} skipped
                  </span>
                )}
              </div>

              <ScrollArea className="h-56 rounded border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr className="text-left">
                      <th className="px-2 py-1 w-10">Row</th>
                      <th className="px-2 py-1 w-14">#</th>
                      <th className="px-2 py-1">Name</th>
                      <th className="px-2 py-1">Riders</th>
                      <th className="px-2 py-1">Division</th>
                      <th className="px-2 py-1">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.map(r => {
                      const ok = r.result.ok;
                      const status = ok
                        ? r.result.warnings.length > 0
                          ? r.result.warnings.join(' ')
                          : 'OK'
                        : r.result.error;
                      return (
                        <tr
                          key={r.rowIndex}
                          className={!ok ? 'bg-destructive/10' : ''}
                        >
                          <td className="px-2 py-1 text-muted-foreground">{r.rowIndex + 1}</td>
                          <td className="px-2 py-1 font-mono">{r.raw.number}</td>
                          <td className="px-2 py-1">{r.raw.name || <span className="text-muted-foreground">—</span>}</td>
                          <td className="px-2 py-1">{r.raw.riders}</td>
                          <td className="px-2 py-1">{r.raw.division || '—'}</td>
                          <td
                            className={
                              ok
                                ? 'px-2 py-1 text-xs text-muted-foreground'
                                : 'px-2 py-1 text-xs text-destructive'
                            }
                          >
                            {status}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={validRows.length === 0}>
            Import {validRows.length > 0 ? `${validRows.length} team${validRows.length === 1 ? '' : 's'}` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
