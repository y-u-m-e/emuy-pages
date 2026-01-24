/**
 * =============================================================================
 * CRUDDY PANEL - Clan Event Attendance Tracker
 * =============================================================================
 * 
 * The main attendance tracking system for OSRS clan events.
 * "Cruddy" stands for Create, Read, Update, Delete + Dashboard - CRUD + D!
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
  AlertCircle,
  Hash,
  User,
  Calendar,
  BarChart3
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

  // Stats for header
  const totalAttendees = eventGroups.reduce((sum, g) => sum + g.attendees.length, 0);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            Attendance Tracker
          </h1>
          <p className="text-muted-foreground mt-1">Track clan event attendance and manage records</p>
        </div>
        
        {/* Quick Stats */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{eventGroups.length}</div>
            <div className="text-muted-foreground">Events</div>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-right">
            <div className="text-2xl font-bold">{totalAttendees}</div>
            <div className="text-muted-foreground">Attendees</div>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setError(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20 text-primary">
          <Check className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)} className="space-y-6">
        <TabsList className="bg-secondary/50 p-1">
          <TabsTrigger value="events" className="gap-2 data-[state=active]:bg-background">
            <CalendarDays className="h-4 w-4" />
            Events
          </TabsTrigger>
          <TabsTrigger value="records" className="gap-2 data-[state=active]:bg-background">
            <ClipboardList className="h-4 w-4" />
            Records
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-2 data-[state=active]:bg-background">
            <Trophy className="h-4 w-4" />
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="add" className="gap-2 data-[state=active]:bg-background">
            <Plus className="h-4 w-4" />
            Add Record
          </TabsTrigger>
          <TabsTrigger value="add-event" className="gap-2 data-[state=active]:bg-background">
            <FileText className="h-4 w-4" />
            Add Event
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        {['records', 'events', 'leaderboard'].includes(activeTab) && (
          <Card className="border-border/50">
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-3">
                {activeTab === 'records' && (
                  <div className="relative flex-1 min-w-[180px]">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Filter by name..."
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      className="pl-9 bg-secondary/30"
                    />
                  </div>
                )}
                {['records', 'events'].includes(activeTab) && (
                  <div className="relative flex-1 min-w-[180px]">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Filter by event..."
                      value={filterEvent}
                      onChange={(e) => setFilterEvent(e.target.value)}
                      className="pl-9 bg-secondary/30"
                    />
                  </div>
                )}
                {activeTab === 'events' && (
                  <div className="relative flex-1 min-w-[180px]">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Filter by host..."
                      value={filterHost}
                      onChange={(e) => setFilterHost(e.target.value)}
                      className="pl-9 bg-secondary/30"
                    />
                  </div>
                )}
                {activeTab === 'leaderboard' && (
                  <Select value={leaderTop.toString()} onValueChange={(v) => setLeaderTop(Number(v))}>
                    <SelectTrigger className="w-[130px] bg-secondary/30">
                      <BarChart3 className="h-4 w-4 mr-2 text-muted-foreground" />
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
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={filterStart}
                    onChange={(e) => setFilterStart(e.target.value)}
                    className="pl-9 w-[160px] bg-secondary/30"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={filterEnd}
                    onChange={(e) => setFilterEnd(e.target.value)}
                    className="pl-9 w-[160px] bg-secondary/30"
                  />
                </div>
                <Button onClick={() => {
                  if (activeTab === 'records') loadRecords();
                  else if (activeTab === 'events') loadEventGroups();
                  else loadLeaderboard();
                }} className="gap-2">
                  <Search className="h-4 w-4" />
                  Search
                </Button>
                <Button variant="ghost" onClick={clearFilters} className="px-3">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {activeTab === 'events' && canEditCruddy && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <Button variant="outline" size="sm" onClick={() => setRenamingHost(true)} className="gap-2">
                    <Pencil className="h-3 w-3" />
                    Rename Host
                  </Button>
                  <span className="text-xs text-muted-foreground ml-3">Bulk update host name across all records</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* EVENTS TAB */}
        <TabsContent value="events" className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
            </div>
          ) : eventGroups.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CalendarDays className="h-12 w-12 mb-4 opacity-50" />
                <p>No events found</p>
              </CardContent>
            </Card>
          ) : eventGroups.map((group) => {
            const key = `${group.event}|||${group.date}`;
            const isExpanded = expandedGroups.has(key);
            const dupeCount = countDuplicates(group);
            
            return (
              <Collapsible key={key} open={isExpanded} onOpenChange={() => toggleGroup(key)}>
                <div className="rounded-lg border border-border/50 bg-card/50 overflow-hidden hover:border-border transition-colors">
                  <CollapsibleTrigger className="w-full">
                    <div className="p-4 flex items-center gap-4">
                      <div className="p-2 rounded-md bg-secondary/50">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>
                      
                      <div className="flex-1 text-left min-w-0">
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
                              <Check className="h-4 w-4 text-primary" />
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => { setRenamingEvent(null); setNewEventName(''); }}>
                              <X className="h-4 w-4" />
                            </Button>
                          </form>
                        ) : (
                          <>
                            <div className="font-medium truncate">{group.event}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-3">
                              <span>{group.date}</span>
                              {group.host && (
                                <span className="flex items-center gap-1 text-accent">
                                  <User className="h-3 w-3" />
                                  {group.host}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="font-mono">
                          {group.attendees.length}
                        </Badge>
                        
                        {dupeCount > 0 && canEditCruddy && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleRemoveDuplicates(group); }}
                            className="h-7 text-xs text-orange-400 border-orange-400/30 hover:bg-orange-400/10"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            {dupeCount}
                          </Button>
                        )}
                        
                        {canEditCruddy && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => { e.stopPropagation(); setAddingToEvent({ event: group.event, date: group.date }); setNewPlayerName(''); }}
                            >
                              <UserPlus className="h-4 w-4 text-primary" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => { e.stopPropagation(); setRenamingEvent({ event: group.event, date: group.date }); setNewEventName(group.event); }}
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => { e.stopPropagation(); setSettingHostEvent({ event: group.event, date: group.date, currentHost: group.host }); setNewHostName(group.host); }}
                            >
                              <Users className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </>
                        )}
                        
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); copyIngots(group); }}
                        >
                          <Copy className="h-4 w-4 text-accent" />
                        </Button>
                        
                        {canEditCruddy && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); setDeleteGroupConfirm(group); }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  {/* Add player form */}
                  {addingToEvent?.event === group.event && addingToEvent?.date === group.date && (
                    <div className="px-4 pb-4 border-t border-border/50 pt-4 bg-primary/5">
                      <form 
                        onSubmit={(e) => { e.preventDefault(); handleAddPlayerToEvent(newPlayerName, group.event, group.date); }}
                        className="flex items-center gap-3"
                      >
                        <Label className="text-sm text-muted-foreground whitespace-nowrap">Add player:</Label>
                        <Input
                          value={newPlayerName}
                          onChange={(e) => setNewPlayerName(e.target.value)}
                          className="flex-1 max-w-xs h-8 bg-background"
                          autoFocus
                          placeholder="Player name (RSN)"
                        />
                        <Button type="submit" size="sm" disabled={submitting || !newPlayerName.trim()}>Add</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => { setAddingToEvent(null); setNewPlayerName(''); }}>Cancel</Button>
                      </form>
                    </div>
                  )}
                  
                  {/* Set host form */}
                  {settingHostEvent?.event === group.event && settingHostEvent?.date === group.date && (
                    <div className="px-4 pb-4 border-t border-border/50 pt-4 bg-accent/5">
                      <form 
                        onSubmit={(e) => { e.preventDefault(); handleSetHost(group.event, group.date, newHostName); }}
                        className="flex items-center gap-3"
                      >
                        <Label className="text-sm text-muted-foreground whitespace-nowrap">Event host:</Label>
                        <Input
                          value={newHostName}
                          onChange={(e) => setNewHostName(e.target.value)}
                          className="flex-1 max-w-xs h-8 bg-background"
                          autoFocus
                          placeholder="Host name (RSN)"
                        />
                        <Button type="submit" size="sm" disabled={submitting}>Set</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => { setSettingHostEvent(null); setNewHostName(''); }}>Cancel</Button>
                      </form>
                    </div>
                  )}
                  
                  <CollapsibleContent>
                    <div className="px-4 pb-4 border-t border-border/50 pt-4">
                      <div className="flex flex-wrap gap-2">
                        {group.attendees.map((a) => (
                          <div 
                            key={a.id} 
                            className="group flex items-center gap-1.5 bg-secondary/50 hover:bg-secondary px-2.5 py-1.5 rounded-md text-sm transition-colors"
                          >
                            <span>{a.name}</span>
                            {canEditCruddy && (
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openEditModal({ ...a, event: group.event, date: group.date })}>
                                  <Pencil className="h-2.5 w-2.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setDeleteConfirm({ id: a.id, name: a.name })}>
                                  <X className="h-2.5 w-2.5 text-destructive" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </TabsContent>

        {/* RECORDS TAB */}
        <TabsContent value="records">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">
                  {total.toLocaleString()} records
                  {recordsData.length > 0 && recordsData.length < total && (
                    <span className="text-muted-foreground font-normal ml-2">(showing {recordsData.length})</span>
                  )}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={loadRecords}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : recordsData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mb-4 opacity-50" />
                  <p>No records found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[80px]">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Hash className="h-3 w-3" /> ID
                        </div>
                      </TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead>Date</TableHead>
                      {canEditCruddy && <TableHead className="w-[100px]" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recordsData.map((r) => (
                      <TableRow key={r.id} className="group">
                        <TableCell className="text-muted-foreground font-mono text-xs">{r.id}</TableCell>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="text-muted-foreground">{r.event}</TableCell>
                        <TableCell className="text-muted-foreground">{r.host || '—'}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">{r.date}</TableCell>
                        {canEditCruddy && (
                          <TableCell>
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditModal(r)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteConfirm({ id: r.id, name: r.name })}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LEADERBOARD TAB */}
        <TabsContent value="leaderboard">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Leaderboard List */}
            <div className="lg:col-span-2 space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                </div>
              ) : leaderboardData.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Trophy className="h-12 w-12 mb-4 opacity-50" />
                    <p>No data available</p>
                  </CardContent>
                </Card>
              ) : leaderboardData.map((entry, i) => {
                const maxCount = leaderboardData[0]?.count || 1;
                const percentage = (entry.count / maxCount) * 100;
                
                const isTop3 = i < 3;
                const medalColors = ['text-yellow-400', 'text-gray-400', 'text-amber-600'];
                const bgColors = ['bg-yellow-400/5 border-yellow-400/20', 'bg-gray-400/5 border-gray-400/20', 'bg-amber-600/5 border-amber-600/20'];
                
                return (
                  <div 
                    key={entry.name} 
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                      isTop3 ? bgColors[i] : 'border-border/50 hover:bg-secondary/30'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      isTop3 
                        ? `${medalColors[i]} bg-current/10` 
                        : 'bg-secondary text-muted-foreground'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{entry.name}</div>
                      <div className="mt-1.5">
                        <Progress value={percentage} className="h-1.5" />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">{entry.count}</div>
                      <div className="text-xs text-muted-foreground">events</div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Stats Panel */}
            <div className="space-y-4">
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Attendance</span>
                    <span className="text-2xl font-bold text-primary">
                      {leaderboardData.reduce((s, e) => s + e.count, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Participants</span>
                    <span className="text-2xl font-bold">
                      {leaderboardData.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Average</span>
                    <span className="text-2xl font-bold">
                      {(leaderboardData.reduce((s, e) => s + e.count, 0) / leaderboardData.length || 0).toFixed(1)}
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              {leaderboardData.length > 0 && (
                <Card className="border-border/50 bg-primary/5">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <Trophy className="h-8 w-8 text-yellow-400" />
                      <div>
                        <div className="text-sm text-muted-foreground">Top Attendee</div>
                        <div className="font-bold text-lg">{leaderboardData[0]?.name}</div>
                        <div className="text-sm text-primary">{leaderboardData[0]?.count} events</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ADD SINGLE RECORD TAB */}
        <TabsContent value="add">
          <Card className="border-border/50 max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Add Single Record
              </CardTitle>
              <CardDescription>Add attendance for one player</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddRecord} className="space-y-4">
                <div className="space-y-2">
                  <Label>Player Name</Label>
                  <Input 
                    value={addName} 
                    onChange={(e) => setAddName(e.target.value)} 
                    placeholder="e.g. y u m e" 
                    className="bg-secondary/30"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Event Name</Label>
                  <Input 
                    value={addEvent} 
                    onChange={(e) => setAddEvent(e.target.value)} 
                    placeholder="e.g. Wildy Wednesday" 
                    className="bg-secondary/30"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Host <span className="text-muted-foreground">(optional)</span></Label>
                  <Input 
                    value={addHost} 
                    onChange={(e) => setAddHost(e.target.value)} 
                    placeholder="e.g. Event host RSN" 
                    className="bg-secondary/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input 
                    type="date" 
                    value={addDate} 
                    onChange={(e) => setAddDate(e.target.value)} 
                    className="bg-secondary/30"
                    required 
                  />
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
          <Card className="border-border/50 max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Add Event
              </CardTitle>
              <CardDescription>Add attendance for multiple players at once</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddEvent} className="space-y-4">
                <div className="space-y-2">
                  <Label>Event Name</Label>
                  <Input 
                    value={bulkEventName} 
                    onChange={(e) => setBulkEventName(e.target.value)} 
                    placeholder="e.g. Wildy Wednesday" 
                    className="bg-secondary/30"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Host <span className="text-muted-foreground">(optional)</span></Label>
                  <Input 
                    value={bulkHost} 
                    onChange={(e) => setBulkHost(e.target.value)} 
                    placeholder="e.g. Event host RSN" 
                    className="bg-secondary/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input 
                    type="date" 
                    value={bulkEventDate} 
                    onChange={(e) => setBulkEventDate(e.target.value)} 
                    className="bg-secondary/30"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Attendees <span className="text-muted-foreground">(one per line or comma-separated)</span></Label>
                  <Textarea
                    value={bulkPlayers}
                    onChange={(e) => setBulkPlayers(e.target.value)}
                    className="min-h-[150px] bg-secondary/30 font-mono text-sm"
                    placeholder="Player1&#10;Player2&#10;Player3"
                  />
                </div>
                {parsedPlayers.length > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-primary text-sm">
                    <Users className="h-4 w-4" />
                    {parsedPlayers.length} attendee{parsedPlayers.length !== 1 ? 's' : ''} will be added
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
              <div className="space-y-2">
                <Label>Player Name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Event</Label>
                <Input value={editEvent} onChange={(e) => setEditEvent(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Host <span className="text-muted-foreground">(optional)</span></Label>
                <Input value={editHost} onChange={(e) => setEditHost(e.target.value)} placeholder="Event host RSN" />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditRecord(null)}>Cancel</Button>
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
            <div className="space-y-2">
              <Label>Current Host Name</Label>
              <Input
                value={oldHostToRename}
                onChange={(e) => setOldHostToRename(e.target.value)}
                placeholder="Enter current host name..."
              />
            </div>
            <div className="space-y-2">
              <Label>New Host Name</Label>
              <Input
                value={newHostToRename}
                onChange={(e) => setNewHostToRename(e.target.value)}
                placeholder="Enter new host name..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setRenamingHost(false); setOldHostToRename(''); setNewHostToRename(''); }}>
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
            <AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm.id)} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
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
            <AlertDialogAction onClick={() => deleteGroupConfirm && handleDeleteEventGroup(deleteGroupConfirm)} className="bg-destructive hover:bg-destructive/90">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
