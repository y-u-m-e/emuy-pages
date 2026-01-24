/**
 * =============================================================================
 * CRUDDY PANEL - Clan Event Attendance Tracker
 * =============================================================================
 * 
 * The main attendance tracking system for OSRS clan events.
 * "Cruddy" stands for Create, Read, Update, Delete + Dashboard - CRUD + D!
 * 
 * Features:
 * - RECORDS TAB: View all attendance records with filtering
 * - EVENTS TAB: Group records by event+date, manage hosts, copy ingots
 * - LEADERBOARD TAB: Player rankings with progress bars
 * - ADD RECORD TAB: Single record entry
 * - ADD EVENT TAB: Bulk record entry
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { API_URLS } from '@/lib/api-config';

// shadcn/ui components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { 
  ClipboardList,
  CalendarDays,
  Trophy,
  Plus,
  FileText,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Copy,
  UserPlus,
  Users,
  RefreshCw,
  Search,
  X,
  Check,
  AlertCircle
} from 'lucide-react';

const ATTENDANCE_API = API_URLS.ATTENDANCE;

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

type Tab = 'records' | 'events' | 'leaderboard' | 'add' | 'add-event';

interface AttendanceRecord {
  id: number;
  name: string;
  event: string;
  date: string;
  host?: string;
}

interface LeaderboardEntry {
  name: string;
  count: number;
}

interface EventGroup {
  event: string;
  date: string;
  host: string;
  attendees: { id: number; name: string }[];
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function CruddyPanel() {
  const { user, loading: authLoading, hasPermission, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const canViewCruddy = isAdmin || hasPermission('view_cruddy');
  const canEditCruddy = isAdmin || hasPermission('edit_cruddy');
  
  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================
  
  const [activeTab, setActiveTab] = useState<Tab>('events');
  const [recordsData, setRecordsData] = useState<AttendanceRecord[]>([]);
  const [eventGroups, setEventGroups] = useState<EventGroup[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  
  // Filter state
  const [filterName, setFilterName] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [filterHost, setFilterHost] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [leaderTop, setLeaderTop] = useState(10);
  
  // Add single record form
  const [addName, setAddName] = useState('');
  const [addEvent, setAddEvent] = useState('');
  const [addDate, setAddDate] = useState(new Date().toISOString().split('T')[0]);
  const [addHost, setAddHost] = useState('');
  
  // Add bulk event form
  const [bulkEventName, setBulkEventName] = useState('');
  const [bulkEventDate, setBulkEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkPlayers, setBulkPlayers] = useState('');
  const [bulkHost, setBulkHost] = useState('');
  
  // Edit modal state
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editEvent, setEditEvent] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editHost, setEditHost] = useState('');
  
  // Expanded event groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Event renaming state
  const [renamingEvent, setRenamingEvent] = useState<{event: string; date: string} | null>(null);
  const [newEventName, setNewEventName] = useState('');
  
  // Event host state
  const [settingHostEvent, setSettingHostEvent] = useState<{event: string; date: string; currentHost: string} | null>(null);
  const [newHostName, setNewHostName] = useState('');
  
  // Rename host state (bulk)
  const [renamingHost, setRenamingHost] = useState(false);
  const [oldHostToRename, setOldHostToRename] = useState('');
  const [newHostToRename, setNewHostToRename] = useState('');
  
  // Add player to event
  const [addingToEvent, setAddingToEvent] = useState<{event: string; date: string} | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{id: number; name: string} | null>(null);
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState<EventGroup | null>(null);
  
  const [submitting, setSubmitting] = useState(false);

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  useEffect(() => {
    if (!authLoading && (!user || !canViewCruddy)) {
      navigate('/');
    }
  }, [user, authLoading, canViewCruddy, navigate]);

  // ==========================================================================
  // API HELPERS
  // ==========================================================================

  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${ATTENDANCE_API}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    return response;
  };

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (filterName) params.set('name', filterName);
      if (filterEvent) params.set('event', filterEvent);
      if (filterHost) params.set('host', filterHost);
      if (filterStart) params.set('start', filterStart);
      if (filterEnd) params.set('end', filterEnd);
      
      const res = await apiFetch(`/attendance/records?${params}`);
      const data = await res.json();
      
      if (res.ok) {
        setRecordsData(data.results || []);
        setTotal(data.total || 0);
      } else {
        setError(data.error || 'Failed to load records');
      }
    } catch (err) {
      setError('Failed to load records');
    }
    
    setLoading(false);
  }, [filterName, filterEvent, filterHost, filterStart, filterEnd]);

  const loadEventGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.set('limit', '5000');
      if (filterEvent) params.set('event', filterEvent);
      if (filterHost) params.set('host', filterHost);
      if (filterStart) params.set('start', filterStart);
      if (filterEnd) params.set('end', filterEnd);
      
      const res = await apiFetch(`/attendance/records?${params}`);
      const data = await res.json();
      
      if (res.ok) {
        // Group records by event+date
        const groups: Record<string, EventGroup> = {};
        for (const record of data.results || []) {
          const key = `${record.event}|||${record.date}`;
          if (!groups[key]) {
            groups[key] = { event: record.event, date: record.date, host: record.host || '', attendees: [] };
          }
          if (!groups[key].host && record.host) {
            groups[key].host = record.host;
          }
          groups[key].attendees.push({ id: record.id, name: record.name });
        }
        // Sort by date descending
        const sorted = Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
        setEventGroups(sorted);
      } else {
        setError(data.error || 'Failed to load events');
      }
    } catch (err) {
      setError('Failed to load events');
    }
    
    setLoading(false);
  }, [filterEvent, filterHost, filterStart, filterEnd]);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.set('top', leaderTop.toString());
      if (filterStart) params.set('start', filterStart);
      if (filterEnd) params.set('end', filterEnd);
      
      const res = await apiFetch(`/attendance?${params}`);
      const data = await res.json();
      
      if (res.ok) {
        setLeaderboardData(data.results || []);
      } else {
        setError(data.error || 'Failed to load leaderboard');
      }
    } catch (err) {
      setError('Failed to load leaderboard');
    }
    
    setLoading(false);
  }, [leaderTop, filterStart, filterEnd]);

  useEffect(() => {
    if (!user) return;
    
    if (activeTab === 'records') loadRecords();
    else if (activeTab === 'events') loadEventGroups();
    else if (activeTab === 'leaderboard') loadLeaderboard();
  }, [activeTab, user, loadRecords, loadEventGroups, loadLeaderboard]);

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  const toggleGroup = (key: string) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setExpandedGroups(newSet);
  };

  const clearFilters = () => {
    setFilterName('');
    setFilterEvent('');
    setFilterHost('');
    setFilterStart('');
    setFilterEnd('');
  };

  const countDuplicates = (group: EventGroup): number => {
    const seen = new Set<string>();
    let count = 0;
    for (const attendee of group.attendees) {
      const key = attendee.name.toLowerCase();
      if (seen.has(key)) count++;
      else seen.add(key);
    }
    return count;
  };

  const parsedPlayers = bulkPlayers.split(/[\n,]+/).map(p => p.trim()).filter(p => p.length > 0);

  // ==========================================================================
  // CRUD HANDLERS
  // ==========================================================================

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName || !addEvent || !addDate) {
      setError('All fields are required');
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await apiFetch('/attendance/records', {
        method: 'POST',
        body: JSON.stringify({ name: addName, event: addEvent, date: addDate, host: addHost }),
      });
      
      if (res.ok) {
        setAddName('');
        setAddHost('');
        showSuccess('Record added successfully!');
        setActiveTab('records');
        loadRecords();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to add record');
      }
    } catch (err) {
      setError('Failed to add record');
    }
    setSubmitting(false);
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkEventName || !bulkEventDate || !bulkPlayers.trim()) {
      setError('All fields are required');
      return;
    }
    
    if (parsedPlayers.length === 0) {
      setError('Please enter at least one player');
      return;
    }
    
    setSubmitting(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const player of parsedPlayers) {
      try {
        const res = await apiFetch('/attendance/records', {
          method: 'POST',
          body: JSON.stringify({ name: player, event: bulkEventName, date: bulkEventDate, host: bulkHost }),
        });
        if (res.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }
    
    if (failCount === 0) {
      setBulkHost('');
      setBulkEventName('');
      setBulkPlayers('');
      showSuccess(`Added ${successCount} records!`);
      setActiveTab('events');
      loadEventGroups();
    } else {
      setError(`Added ${successCount}, failed ${failCount}`);
    }
    setSubmitting(false);
  };

  const handleEditRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRecord || !editName || !editEvent || !editDate) return;
    
    setSubmitting(true);
    try {
      const res = await apiFetch(`/attendance/records/${editRecord.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editName, event: editEvent, date: editDate, host: editHost }),
      });
      
      if (res.ok) {
        setEditRecord(null);
        showSuccess('Record updated!');
        if (activeTab === 'records') loadRecords();
        else if (activeTab === 'events') loadEventGroups();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update');
      }
    } catch (err) {
      setError('Failed to update');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await apiFetch(`/attendance/records/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showSuccess('Deleted!');
        if (activeTab === 'records') loadRecords();
        else if (activeTab === 'events') loadEventGroups();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete');
      }
    } catch (err) {
      setError('Failed to delete');
    }
    setDeleteConfirm(null);
  };

  const handleDeleteEventGroup = async (group: EventGroup) => {
    setSubmitting(true);
    for (const attendee of group.attendees) {
      await apiFetch(`/attendance/records/${attendee.id}`, { method: 'DELETE' });
    }
    showSuccess(`Deleted ${group.attendees.length} records`);
    loadEventGroups();
    setSubmitting(false);
    setDeleteGroupConfirm(null);
  };

  const copyIngots = async (group: EventGroup) => {
    const players = group.attendees.map(a => a.name).join(', ');
    const cmd = `/add_remove_ingots players:${players} ingots: 10,000 reason: clan event - ${group.event}`;
    await navigator.clipboard.writeText(cmd);
    showSuccess('Ingots command copied!');
  };

  const handleRenameEvent = async (oldEvent: string, newEvent: string, date: string) => {
    if (!newEvent.trim() || newEvent === oldEvent) {
      setRenamingEvent(null);
      setNewEventName('');
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await apiFetch('/attendance/events/rename', {
        method: 'PUT',
        body: JSON.stringify({ old_event: oldEvent, new_event: newEvent.trim(), date }),
      });
      
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Renamed to "${newEvent.trim()}" (${data.updated} records updated)`);
        loadEventGroups();
      } else {
        setError(data.error || 'Failed to rename event');
      }
    } catch (err) {
      setError('Failed to rename event');
    }
    setRenamingEvent(null);
    setNewEventName('');
    setSubmitting(false);
  };

  const handleSetHost = async (event: string, date: string, host: string) => {
    setSubmitting(true);
    try {
      const res = await apiFetch('/attendance/events/host', {
        method: 'PUT',
        body: JSON.stringify({ event, date, host: host.trim() }),
      });
      
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Host ${host.trim() ? `set to "${host.trim()}"` : 'cleared'} (${data.updated || 0} records updated)`);
        loadEventGroups();
      } else {
        setError(data.error || 'Failed to set host');
      }
    } catch (err) {
      setError('Failed to set host');
    }
    setSettingHostEvent(null);
    setNewHostName('');
    setSubmitting(false);
  };

  const handleRenameHost = async () => {
    if (!oldHostToRename.trim() || !newHostToRename.trim()) {
      setError('Both old and new host names are required');
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await apiFetch('/attendance/hosts/rename', {
        method: 'PUT',
        body: JSON.stringify({ old_host: oldHostToRename.trim(), new_host: newHostToRename.trim() }),
      });
      
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Host renamed (${data.updated || 0} records updated)`);
        loadEventGroups();
        setRenamingHost(false);
        setOldHostToRename('');
        setNewHostToRename('');
      } else {
        setError(data.error || 'Failed to rename host');
      }
    } catch (err) {
      setError('Failed to rename host');
    }
    setSubmitting(false);
  };

  const handleAddPlayerToEvent = async (playerName: string, event: string, date: string) => {
    if (!playerName.trim()) {
      setAddingToEvent(null);
      setNewPlayerName('');
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await apiFetch('/attendance/records', {
        method: 'POST',
        body: JSON.stringify({ name: playerName.trim(), event, date }),
      });
      
      if (res.ok) {
        showSuccess(`Added "${playerName.trim()}" to ${event}`);
        loadEventGroups();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to add player');
      }
    } catch (err) {
      setError('Failed to add player');
    }
    setAddingToEvent(null);
    setNewPlayerName('');
    setSubmitting(false);
  };

  const handleRemoveDuplicates = async (group: EventGroup) => {
    const seen = new Map<string, number[]>();
    for (const attendee of group.attendees) {
      const key = attendee.name.toLowerCase();
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key)!.push(attendee.id);
    }
    
    const idsToDelete: number[] = [];
    for (const ids of seen.values()) {
      if (ids.length > 1) idsToDelete.push(...ids.slice(1));
    }
    
    if (idsToDelete.length === 0) {
      showSuccess('No duplicates found!');
      return;
    }
    
    setSubmitting(true);
    let deleted = 0;
    for (const id of idsToDelete) {
      const res = await apiFetch(`/attendance/records/${id}`, { method: 'DELETE' });
      if (res.ok) deleted++;
    }
    showSuccess(`Removed ${deleted} duplicate(s)`);
    loadEventGroups();
    setSubmitting(false);
  };

  const openEditModal = (record: AttendanceRecord | { id: number; name: string; event: string; date: string; host?: string }) => {
    setEditRecord(record as AttendanceRecord);
    setEditName(record.name);
    setEditEvent(record.event);
    setEditDate(record.date);
    setEditHost((record as AttendanceRecord).host || '');
  };

  // ==========================================================================
  // LOADING STATE
  // ==========================================================================

  if (authLoading || !user || !canViewCruddy) {
    return (
      <div className="flex items-center justify-center py-20">
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          Cruddy Panel
        </h1>
        <p className="text-muted-foreground">Track clan event attendance</p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}
      {success && (
        <Card className="border-green-500 bg-green-500/10">
          <CardContent className="flex items-center gap-2 py-3 text-green-500">
            <Check className="h-4 w-4" />
            {success}
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="records" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Records</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Events</span>
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Leaderboard</span>
          </TabsTrigger>
          <TabsTrigger value="add" className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Record</span>
          </TabsTrigger>
          <TabsTrigger value="add-event" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Add Event</span>
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        {['records', 'events', 'leaderboard'].includes(activeTab) && (
          <Card>
            <CardContent className="pt-4">
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {activeTab === 'records' && (
                  <Input
                    placeholder="Filter by name..."
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                  />
                )}
                {['records', 'events'].includes(activeTab) && (
                  <Input
                    placeholder="Filter by event..."
                    value={filterEvent}
                    onChange={(e) => setFilterEvent(e.target.value)}
                  />
                )}
                {activeTab === 'events' && (
                  <Input
                    placeholder="Filter by host..."
                    value={filterHost}
                    onChange={(e) => setFilterHost(e.target.value)}
                  />
                )}
                {activeTab === 'leaderboard' && (
                  <Select value={leaderTop.toString()} onValueChange={(v) => setLeaderTop(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">Top 5</SelectItem>
                      <SelectItem value="10">Top 10</SelectItem>
                      <SelectItem value="25">Top 25</SelectItem>
                      <SelectItem value="50">Top 50</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Input
                  type="date"
                  value={filterStart}
                  onChange={(e) => setFilterStart(e.target.value)}
                />
                <Input
                  type="date"
                  value={filterEnd}
                  onChange={(e) => setFilterEnd(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button onClick={() => {
                    if (activeTab === 'records') loadRecords();
                    else if (activeTab === 'events') loadEventGroups();
                    else loadLeaderboard();
                  }} className="flex-1">
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                  <Button variant="outline" onClick={clearFilters}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {activeTab === 'events' && canEditCruddy && (
                <div className="mt-3 pt-3 border-t">
                  <Button variant="outline" size="sm" onClick={() => setRenamingHost(true)}>
                    <Pencil className="h-3 w-3 mr-2" />
                    Rename Host
                  </Button>
                  <span className="text-xs text-muted-foreground ml-3">Bulk update host name across all records</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* RECORDS TAB */}
        <TabsContent value="records">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  <span className="font-bold">{total}</span> total records
                  {recordsData.length > 0 && recordsData.length < total && (
                    <span className="text-muted-foreground font-normal ml-2">(showing {recordsData.length})</span>
                  )}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={loadRecords}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : recordsData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No records found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recordsData.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-muted-foreground">{r.id}</TableCell>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{r.event}</TableCell>
                        <TableCell className="text-muted-foreground">{r.host || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{r.date}</TableCell>
                        <TableCell className="text-right space-x-2">
                          {canEditCruddy && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => openEditModal(r)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm({ id: r.id, name: r.name })}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EVENTS TAB */}
        <TabsContent value="events">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <CardTitle className="text-lg">
                    <span className="font-bold">{eventGroups.length}</span> event{eventGroups.length !== 1 ? 's' : ''}
                  </CardTitle>
                  <span className="text-muted-foreground">
                    <span className="font-bold text-foreground">{eventGroups.reduce((sum, g) => sum + g.attendees.length, 0)}</span> total attendees
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={loadEventGroups}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : eventGroups.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No events found</div>
              ) : eventGroups.map((group) => {
                const key = `${group.event}|||${group.date}`;
                const isExpanded = expandedGroups.has(key);
                const dupeCount = countDuplicates(group);
                
                return (
                  <Collapsible key={key} open={isExpanded} onOpenChange={() => toggleGroup(key)}>
                    <Card className="overflow-hidden">
                      <CollapsibleTrigger className="w-full">
                        <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                          <div className="flex-1 text-left">
                            {renamingEvent?.event === group.event && renamingEvent?.date === group.date ? (
                              <form 
                                onSubmit={(e) => { e.preventDefault(); handleRenameEvent(group.event, newEventName, group.date); }}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-2"
                              >
                                <Input
                                  value={newEventName}
                                  onChange={(e) => setNewEventName(e.target.value)}
                                  className="h-8 w-48"
                                  autoFocus
                                  placeholder="New event name"
                                />
                                <Button type="submit" size="sm" variant="ghost" disabled={submitting}>
                                  <Check className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => { setRenamingEvent(null); setNewEventName(''); }}>
                                  <X className="h-4 w-4 text-destructive" />
                                </Button>
                              </form>
                            ) : (
                              <>
                                <div className="font-semibold">{group.event}</div>
                                <div className="text-sm text-muted-foreground">
                                  {group.date}
                                  {group.host && <span className="ml-3 text-primary">👤 {group.host}</span>}
                                </div>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{group.attendees.length} players</Badge>
                            {dupeCount > 0 && canEditCruddy && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleRemoveDuplicates(group); }}
                                className="text-orange-500 border-orange-500/50"
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                {dupeCount} dupe{dupeCount > 1 ? 's' : ''}
                              </Button>
                            )}
                            {canEditCruddy && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); setAddingToEvent({ event: group.event, date: group.date }); setNewPlayerName(''); }}
                                >
                                  <UserPlus className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); setRenamingEvent({ event: group.event, date: group.date }); setNewEventName(group.event); }}
                                >
                                  <Pencil className="h-4 w-4 text-purple-500" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); setSettingHostEvent({ event: group.event, date: group.date, currentHost: group.host }); setNewHostName(group.host); }}
                                >
                                  <Users className="h-4 w-4 text-cyan-500" />
                                </Button>
                              </>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); copyIngots(group); }}
                            >
                              <Copy className="h-4 w-4 text-blue-500" />
                            </Button>
                            {canEditCruddy && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); setDeleteGroupConfirm(group); }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      
                      {/* Add player form */}
                      {addingToEvent?.event === group.event && addingToEvent?.date === group.date && (
                        <div className="p-4 border-t bg-green-500/5">
                          <form 
                            onSubmit={(e) => { e.preventDefault(); handleAddPlayerToEvent(newPlayerName, group.event, group.date); }}
                            className="flex items-center gap-3"
                          >
                            <span className="text-sm text-muted-foreground">Add player:</span>
                            <Input
                              value={newPlayerName}
                              onChange={(e) => setNewPlayerName(e.target.value)}
                              className="flex-1 max-w-xs h-8"
                              autoFocus
                              placeholder="Player name (RSN)"
                            />
                            <Button type="submit" size="sm" disabled={submitting || !newPlayerName.trim()}>Add</Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => { setAddingToEvent(null); setNewPlayerName(''); }}>Cancel</Button>
                          </form>
                        </div>
                      )}
                      
                      {/* Set host form */}
                      {settingHostEvent?.event === group.event && settingHostEvent?.date === group.date && (
                        <div className="p-4 border-t bg-cyan-500/5">
                          <form 
                            onSubmit={(e) => { e.preventDefault(); handleSetHost(group.event, group.date, newHostName); }}
                            className="flex items-center gap-3"
                          >
                            <span className="text-sm text-muted-foreground">Event host:</span>
                            <Input
                              value={newHostName}
                              onChange={(e) => setNewHostName(e.target.value)}
                              className="flex-1 max-w-xs h-8"
                              autoFocus
                              placeholder="Host name (RSN)"
                            />
                            <Button type="submit" size="sm" disabled={submitting}>Set</Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => { setSettingHostEvent(null); setNewHostName(''); }}>Cancel</Button>
                          </form>
                        </div>
                      )}
                      
                      <CollapsibleContent>
                        <div className="p-4 border-t">
                          <div className="flex flex-wrap gap-2">
                            {group.attendees.map((a) => (
                              <div key={a.id} className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">
                                <span className="text-sm">{a.name}</span>
                                {canEditCruddy && (
                                  <>
                                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => openEditModal({ ...a, event: group.event, date: group.date })}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setDeleteConfirm({ id: a.id, name: a.name })}>
                                      <X className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LEADERBOARD TAB */}
        <TabsContent value="leaderboard">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Player Rankings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : leaderboardData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No data</div>
              ) : (
                <>
                  {leaderboardData.map((entry, i) => {
                    const maxCount = leaderboardData[0]?.count || 1;
                    const percentage = (entry.count / maxCount) * 100;
                    
                    return (
                      <div 
                        key={entry.name} 
                        className={`flex items-center gap-4 p-4 rounded-xl ${
                          i === 0 ? 'bg-yellow-500/10 border border-yellow-500/30' :
                          i === 1 ? 'bg-gray-400/10 border border-gray-400/20' :
                          i === 2 ? 'bg-amber-600/10 border border-amber-600/20' :
                          'bg-muted/50'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          i === 0 ? 'bg-yellow-500 text-yellow-950' :
                          i === 1 ? 'bg-gray-400 text-gray-900' :
                          i === 2 ? 'bg-amber-600 text-white' :
                          'bg-muted text-muted-foreground'
                        }`}>{i + 1}</span>
                        <span className="font-medium flex-1">{entry.name}</span>
                        <div className="w-32">
                          <Progress value={percentage} className="h-2" />
                        </div>
                        <Badge variant="secondary" className="font-bold">{entry.count}</Badge>
                      </div>
                    );
                  })}
                  
                  {/* Statistics */}
                  <div className="grid grid-cols-3 gap-4 mt-6 p-4 bg-muted/50 rounded-xl">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{leaderboardData.reduce((s, e) => s + e.count, 0)}</div>
                      <div className="text-xs text-muted-foreground">Total Events</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{leaderboardData.length}</div>
                      <div className="text-xs text-muted-foreground">Participants</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {(leaderboardData.reduce((s, e) => s + e.count, 0) / leaderboardData.length || 0).toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">Avg/Person</div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ADD SINGLE RECORD TAB */}
        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle>Add Single Record</CardTitle>
              <CardDescription>Add attendance for one player</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddRecord} className="max-w-md space-y-4">
                <div>
                  <Label>Player Name</Label>
                  <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g. y u m e" required />
                </div>
                <div>
                  <Label>Event Name</Label>
                  <Input value={addEvent} onChange={(e) => setAddEvent(e.target.value)} placeholder="e.g. Wildy Wednesday" required />
                </div>
                <div>
                  <Label>Host (optional)</Label>
                  <Input value={addHost} onChange={(e) => setAddHost(e.target.value)} placeholder="e.g. Event host RSN" />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} required />
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? 'Adding...' : 'Add Record'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ADD BULK EVENT TAB */}
        <TabsContent value="add-event">
          <Card>
            <CardHeader>
              <CardTitle>Add Event</CardTitle>
              <CardDescription>Add attendance for multiple players at once</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddEvent} className="max-w-lg space-y-4">
                <div>
                  <Label>Event Name</Label>
                  <Input value={bulkEventName} onChange={(e) => setBulkEventName(e.target.value)} placeholder="e.g. Wildy Wednesday" required />
                </div>
                <div>
                  <Label>Host (optional)</Label>
                  <Input value={bulkHost} onChange={(e) => setBulkHost(e.target.value)} placeholder="e.g. Event host RSN" />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={bulkEventDate} onChange={(e) => setBulkEventDate(e.target.value)} required />
                </div>
                <div>
                  <Label>Attendees (one per line or comma-separated)</Label>
                  <Textarea
                    value={bulkPlayers}
                    onChange={(e) => setBulkPlayers(e.target.value)}
                    className="min-h-[150px]"
                    placeholder="Player1&#10;Player2&#10;Player3"
                  />
                </div>
                {parsedPlayers.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    📝 {parsedPlayers.length} attendee{parsedPlayers.length !== 1 ? 's' : ''} will be added
                  </div>
                )}
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? 'Adding...' : 'Add Event'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* EDIT RECORD DIALOG */}
      <Dialog open={!!editRecord} onOpenChange={() => setEditRecord(null)}>
        <DialogContent>
          <form onSubmit={handleEditRecord}>
            <DialogHeader>
              <DialogTitle>Edit Record #{editRecord?.id}</DialogTitle>
              <DialogDescription>Update the attendance record details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Player Name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>
              <div>
                <Label>Event</Label>
                <Input value={editEvent} onChange={(e) => setEditEvent(e.target.value)} required />
              </div>
              <div>
                <Label>Host (optional)</Label>
                <Input value={editHost} onChange={(e) => setEditHost(e.target.value)} placeholder="Event host RSN" />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditRecord(null)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* RENAME HOST DIALOG */}
      <Dialog open={renamingHost} onOpenChange={setRenamingHost}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Host</DialogTitle>
            <DialogDescription>
              This will update the host name across all attendance records. Use this when a host changes their name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Current Host Name</Label>
              <Input
                value={oldHostToRename}
                onChange={(e) => setOldHostToRename(e.target.value)}
                placeholder="Enter current host name..."
              />
            </div>
            <div>
              <Label>New Host Name</Label>
              <Input
                value={newHostToRename}
                onChange={(e) => setNewHostToRename(e.target.value)}
                placeholder="Enter new host name..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRenamingHost(false); setOldHostToRename(''); setNewHostToRename(''); }}>
              Cancel
            </Button>
            <Button onClick={handleRenameHost} disabled={submitting || !oldHostToRename.trim() || !newHostToRename.trim()}>
              {submitting ? 'Renaming...' : 'Rename Host'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE RECORD CONFIRMATION */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the record for "{deleteConfirm?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DELETE EVENT GROUP CONFIRMATION */}
      <AlertDialog open={!!deleteGroupConfirm} onOpenChange={() => setDeleteGroupConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all {deleteGroupConfirm?.attendees.length} records for "{deleteGroupConfirm?.event}" on {deleteGroupConfirm?.date}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteGroupConfirm && handleDeleteEventGroup(deleteGroupConfirm)}>Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
