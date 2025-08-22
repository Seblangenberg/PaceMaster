'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit, Trash2, Search } from 'lucide-react';
import type { Team, Division } from '@/lib/types';

interface TeamsTabProps {
  teams: Team[];
  divisions: Division[];
  onAddTeam: (name: string, riders: string, divisionId?: string, number?: number) => void;
  onUpdateTeam: (team: Team) => void;
  onDeleteTeam: (id: string) => void;
}

function TeamDialog({
  trigger,
  title,
  description,
  divisions,
  initialData,
  onSave,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  divisions: Division[];
  initialData?: Team;
  onSave: (name: string, riders: string, divisionId?: string, number?: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialData?.name || '');
  const [riders, setRiders] = useState(initialData?.riders || '');
  const [divisionId, setDivisionId] = useState(initialData?.divisionId || undefined);
  const [number, setNumber] = useState(initialData?.number || '');

  const handleSubmit = () => {
    if (name && riders && divisionId && number) {
      const teamNumber = parseInt(number.toString(), 10);
      if (!isNaN(teamNumber) && teamNumber > 0) {
        onSave(name, riders, divisionId, teamNumber);
        setOpen(false);
        if (!initialData) {
          setName('');
          setRiders('');
          setDivisionId(undefined);
          setNumber('');
        }
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
            <Label htmlFor="team-number" className="text-right">Team #</Label>
            <Input 
              id="team-number" 
              type="number" 
              min="1" 
              value={number} 
              onChange={e => setNumber(e.target.value)} 
              className="col-span-3" 
              placeholder="e.g., 15"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="team-name" className="text-right">Team Name</Label>
            <Input id="team-name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="riders" className="text-right">Riders</Label>
            <Input id="riders" value={riders} onChange={e => setRiders(e.target.value)} className="col-span-3" placeholder="e.g., John D., Jane S." />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="division" className="text-right">Division</Label>
            <Select onValueChange={setDivisionId} value={divisionId || undefined}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a division" />
              </SelectTrigger>
              <SelectContent>
                {divisions.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TeamsTab({ teams, divisions, onAddTeam, onUpdateTeam, onDeleteTeam }: TeamsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(team.number).includes(searchTerm)
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <CardTitle>Team Registration</CardTitle>
                <CardDescription>Manage and register teams for the event.</CardDescription>
            </div>
            <div className="flex w-full sm:w-auto items-center gap-2">
                <div className="relative flex-grow sm:flex-grow-0">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        type="search" 
                        placeholder="Search by name or #" 
                        className="pl-8 w-full"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <TeamDialog
                    trigger={
                        <Button size="sm">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Team
                        </Button>
                    }
                    title="Add New Team"
                    description="Register a new team for the event."
                    divisions={divisions}
                    onSave={onAddTeam}
                />
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Team Name</TableHead>
              <TableHead>Riders</TableHead>
              <TableHead>Division</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTeams.length > 0 ? (
              filteredTeams.sort((a,b) => a.number - b.number).map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-semibold">{team.number}</TableCell>
                  <TableCell>{team.name}</TableCell>
                  <TableCell>{team.riders}</TableCell>
                  <TableCell>{divisions.find(d => d.id === team.divisionId)?.name || 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                       <TeamDialog
                        trigger={
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        }
                        title="Edit Team"
                        description="Update the details for this team."
                        divisions={divisions}
                        initialData={team}
                        onSave={(name, riders, divisionId, number) => onUpdateTeam({ ...team, name, riders, divisionId, number: number || team.number })}
                      />
                      <Button variant="ghost" size="sm" onClick={() => onDeleteTeam(team.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">No teams match your search or no teams registered.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
