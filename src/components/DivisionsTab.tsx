'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import type { Division } from '@/lib/types';

interface DivisionsTabProps {
  divisions: Division[];
  onAddDivision: (name: string, optimalTime: number) => void;
  onUpdateDivision: (division: Division) => void;
  onDeleteDivision: (id: string) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function DivisionDialog({
  trigger,
  title,
  description,
  initialData,
  onSave,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  initialData?: Division;
  onSave: (name: string, optimalTime: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialData?.name || '');
  const [minutes, setMinutes] = useState(initialData ? String(Math.floor(initialData.optimalTime / 60)) : '7');
  const [seconds, setSeconds] = useState(initialData ? String(initialData.optimalTime % 60) : '0');

  const handleSubmit = () => {
    const totalSeconds = parseInt(minutes, 10) * 60 + parseInt(seconds, 10);
    if (name && !isNaN(totalSeconds)) {
      onSave(name, totalSeconds);
      setOpen(false);
      // Reset form for next use if it's an "add" dialog
      if (!initialData) {
        setName('');
        setMinutes('7');
        setSeconds('0');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Optimal Time</Label>
            <div className="col-span-3 grid grid-cols-2 gap-2">
              <Input type="number" value={minutes} onChange={e => setMinutes(e.target.value)} placeholder="Min" />
              <Input type="number" value={seconds} onChange={e => setSeconds(e.target.value)} placeholder="Sec" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DivisionsTab({ divisions, onAddDivision, onUpdateDivision, onDeleteDivision }: DivisionsTabProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Divisions</CardTitle>
          <CardDescription>Manage the divisions for your event.</CardDescription>
        </div>
        <DivisionDialog
          trigger={
            <Button size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Division
            </Button>
          }
          title="Add New Division"
          description="Create a new division with a name and an optimal time."
          onSave={onAddDivision}
        />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Division Name</TableHead>
              <TableHead>Optimal Time (MM:SS)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {divisions.length > 0 ? (
              divisions.map((division) => (
                <TableRow key={division.id}>
                  <TableCell className="font-medium">{division.name}</TableCell>
                  <TableCell>{formatTime(division.optimalTime)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <DivisionDialog
                        trigger={
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        }
                        title="Edit Division"
                        description="Update the details for this division."
                        initialData={division}
                        onSave={(name, optimalTime) => onUpdateDivision({ ...division, name, optimalTime })}
                      />
                      <Button variant="ghost" size="sm" onClick={() => onDeleteDivision(division.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center">No divisions created yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
