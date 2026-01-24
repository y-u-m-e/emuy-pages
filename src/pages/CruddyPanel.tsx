/**
 * Cruddy Panel - Attendance Tracking
 * Tasks-style interface for managing event attendance
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MoreHorizontal, 
  Plus,
  ClipboardList,
  Trophy,
  Calendar,
  ArrowUpDown,
  Pencil,
  Trash2,
  Users
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.emuy.gg';

// Types
interface AttendanceRecord {
  id: number;
  name: string;
  event: string;
  date: string;
}

interface LeaderboardEntry {
  name: string;
  count: number;
  rank: number;
}

export default function CruddyPanel() {
  const { user, loading: authLoading, hasPermission, isAdmin } = useAuth();
  const navigate = useNavigate();

  const canViewCruddy = isAdmin || hasPermission('view_cruddy');

  // State
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, uniqueNames: 0, uniqueEvents: 0 });

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formEvent, setFormEvent] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  // Auth check
  useEffect(() => {
    if (!authLoading && (!user || !canViewCruddy)) {
      navigate('/');
    }
  }, [user, authLoading, canViewCruddy, navigate]);

  // Fetch data
  const fetchRecords = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/attendance/records?limit=1000`, { credentials: 'include' });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
        console.error('API Error:', res.status, errorData);
        return;
      }
      
      const data = await res.json();
      console.log('Attendance data:', data); // Debug log
      
      if (data.results) {
        setRecords(data.results);
        
        // Calculate stats
        const uniqueNames = new Set(data.results.map((r: AttendanceRecord) => r.name));
        const uniqueEvents = new Set(data.results.map((r: AttendanceRecord) => r.event));
        setStats({
          total: data.results.length,
          uniqueNames: uniqueNames.size,
          uniqueEvents: uniqueEvents.size,
        });
        
        // Get unique events for dropdown
        setEvents(Array.from(uniqueEvents) as string[]);
      } else {
        setError('No data returned from API');
        console.error('Unexpected API response:', data);
      }
    } catch (err) {
      console.error('Failed to fetch records:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch records');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/attendance/leaderboard?limit=20`, { credentials: 'include' });
      const data = await res.json();
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard.map((entry: LeaderboardEntry, idx: number) => ({
          ...entry,
          rank: idx + 1,
        })));
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    }
  }, []);

  useEffect(() => {
    if (user && canViewCruddy) {
      fetchRecords();
      fetchLeaderboard();
    }
  }, [user, canViewCruddy, fetchRecords, fetchLeaderboard]);

  // CRUD operations
  const handleAdd = async () => {
    if (!formName.trim() || !formEvent.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/attendance/records`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName.trim(), event: formEvent.trim(), date: formDate }),
      });
      if (res.ok) {
        resetForm();
        setAddDialogOpen(false);
        fetchRecords();
        fetchLeaderboard();
      }
    } catch (err) {
      console.error('Failed to add record:', err);
    }
  };

  const handleEdit = async () => {
    if (!selectedRecord || !formName.trim() || !formEvent.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/attendance/records/${selectedRecord.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName.trim(), event: formEvent.trim(), date: formDate }),
      });
      if (res.ok) {
        resetForm();
        setEditDialogOpen(false);
        setSelectedRecord(null);
        fetchRecords();
        fetchLeaderboard();
      }
    } catch (err) {
      console.error('Failed to edit record:', err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/attendance/records/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        fetchRecords();
        fetchLeaderboard();
      }
    } catch (err) {
      console.error('Failed to delete record:', err);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormEvent('');
    setFormDate(new Date().toISOString().split('T')[0]);
  };

  const openEditDialog = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setFormName(record.name);
    setFormEvent(record.event);
    setFormDate(record.date);
    setEditDialogOpen(true);
  };

  // Columns
  const recordColumns: ColumnDef<AttendanceRecord>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue('name')}</span>
      ),
    },
    {
      accessorKey: 'event',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Event
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Badge variant="secondary">{row.getValue('event')}</Badge>
      ),
    },
    {
      accessorKey: 'date',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue('date') as string;
        return <span className="text-muted-foreground">{new Date(date).toLocaleDateString()}</span>;
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const record = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => openEditDialog(record)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDelete(record.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const leaderboardColumns: ColumnDef<LeaderboardEntry>[] = [
    {
      accessorKey: 'rank',
      header: '#',
      cell: ({ row }) => {
        const rank = row.getValue('rank') as number;
        return (
          <span className={`font-bold ${rank <= 3 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
            {rank}
          </span>
        );
      },
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue('name')}</span>
      ),
    },
    {
      accessorKey: 'count',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Attendance
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue('count')} events</Badge>
      ),
    },
  ];

  if (authLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!user || !canViewCruddy) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance Tracker</h1>
          <p className="text-muted-foreground">
            Track and manage event attendance records
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Record
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Error loading data</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              attendance entries
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueNames}</div>
            <p className="text-xs text-muted-foreground">
              active participants
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events Tracked</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueEvents}</div>
            <p className="text-xs text-muted-foreground">
              unique events
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="records" className="space-y-4">
        <TabsList>
          <TabsTrigger value="records" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Records
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-2">
            <Trophy className="h-4 w-4" />
            Leaderboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Attendance Records</CardTitle>
              <CardDescription>
                All recorded event attendance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <DataTable 
                  columns={recordColumns} 
                  data={records} 
                  searchKey="name"
                  searchPlaceholder="Search by name..."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <CardTitle>Attendance Leaderboard</CardTitle>
              </div>
              <CardDescription>
                Top participants by event attendance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable 
                columns={leaderboardColumns} 
                data={leaderboard} 
                searchKey="name"
                searchPlaceholder="Search leaderboard..."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Record Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Attendance Record</DialogTitle>
            <DialogDescription>
              Record a new event attendance entry
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Enter participant name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event">Event</Label>
              <Select value={formEvent} onValueChange={setFormEvent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select or type event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event} value={event}>
                      {event}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or type a new event name"
                value={formEvent}
                onChange={(e) => setFormEvent(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setAddDialogOpen(false); }}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>Add Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Record Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Attendance Record</DialogTitle>
            <DialogDescription>
              Update this attendance entry
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-event">Event</Label>
              <Input
                id="edit-event"
                value={formEvent}
                onChange={(e) => setFormEvent(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setEditDialogOpen(false); setSelectedRecord(null); }}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
