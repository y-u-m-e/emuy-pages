/**
 * =============================================================================
 * CRUDDY PANEL - Clan Event Attendance Tracker
 * =============================================================================
 * 
 * The main attendance tracking system for OSRS clan events.
 * "Cruddy" stands for Create, Read, Update, Delete + Dashboard - CRUD + D!
 * 
 * Access Control:
 * - Requires authentication (redirect to home if not logged in)
 * - Requires 'view_cruddy' permission from RBAC
 * 
 * @module CruddyPanel
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { records, AttendanceRecord, LeaderboardEntry } from '@/lib/api';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.emuy.gg';

type Tab = 'records' | 'events' | 'leaderboard' | 'add' | 'add-event';

interface EventGroup {
  event: string;
  date: string;
  host: string;
  attendees: { id: number; name: string }[];
}

export default function CruddyPanel() {
  const { user, loading: authLoading, hasPermission, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const canViewCruddy = isAdmin || hasPermission('view_cruddy');
  
  // State
  const [activeTab, setActiveTab] = useState<Tab>('events');
  const [recordsData, setRecordsData] = useState<AttendanceRecord[]>([]);
  const [eventGroups, setEventGroups] = useState<EventGroup[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  
  // Filters
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
  
  // Edit modal
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editEvent, setEditEvent] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editHost, setEditHost] = useState('');
  
  // UI state
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [renamingEvent, setRenamingEvent] = useState<{event: string; date: string} | null>(null);
  const [newEventName, setNewEventName] = useState('');
  const [settingHostEvent, setSettingHostEvent] = useState<{event: string; date: string; currentHost: string} | null>(null);
  const [newHostName, setNewHostName] = useState('');
  const [renamingHost, setRenamingHost] = useState(false);
  const [oldHostToRename, setOldHostToRename] = useState('');
  const [newHostToRename, setNewHostToRename] = useState('');
  const [addingToEvent, setAddingToEvent] = useState<{event: string; date: string} | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect if not authorized
  useEffect(() => {
    if (!authLoading && (!user || !canViewCruddy)) {
      navigate('/');
    }
  }, [user, authLoading, canViewCruddy, navigate]);

  // Data loading
  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const result = await records.getAll({
      limit: 50,
      name: filterName || undefined,
      event: filterEvent || undefined,
      host: filterHost || undefined,
      start: filterStart || undefined,
      end: filterEnd || undefined,
    });
    
    if (result.success && result.data) {
      setRecordsData(result.data.results || []);
      setTotal(result.data.total || 0);
    } else {
      setError(result.error || 'Failed to load records');
    }
    
    setLoading(false);
  }, [filterName, filterEvent, filterHost, filterStart, filterEnd]);

  const loadEventGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const result = await records.getAll({
      limit: 5000,
      event: filterEvent || undefined,
      host: filterHost || undefined,
      start: filterStart || undefined,
      end: filterEnd || undefined,
    });
    
    if (result.success && result.data) {
      const groups: Record<string, EventGroup> = {};
      for (const record of result.data.results || []) {
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
      setError(result.error || 'Failed to load events');
    }
    
    setLoading(false);
  }, [filterEvent, filterHost, filterStart, filterEnd]);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const result = await records.getLeaderboard({
      top: leaderTop,
      start: filterStart || undefined,
      end: filterEnd || undefined,
    });
    
    if (result.success && result.data) {
      setLeaderboardData(Array.isArray(result.data) ? result.data : []);
    } else {
      setLeaderboardData([]);
      setError(result.error || 'Failed to load leaderboard');
    }
    
    setLoading(false);
  }, [leaderTop, filterStart, filterEnd]);

  useEffect(() => {
    if (!user) return;
    
    if (activeTab === 'records') loadRecords();
    else if (activeTab === 'events') loadEventGroups();
    else if (activeTab === 'leaderboard') loadLeaderboard();
  }, [activeTab, user, loadRecords, loadEventGroups, loadLeaderboard]);

  // Helpers
  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  // CRUD handlers
  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName || !addEvent || !addDate) {
      setError('All fields are required');
      return;
    }
    
    setSubmitting(true);
    const result = await records.add({ name: addName, event: addEvent, date: addDate, host: addHost });
    
    if (result.success) {
      setAddName('');
      setAddHost('');
      showSuccess('Record added successfully!');
      setActiveTab('records');
      loadRecords();
    } else {
      setError(result.error || 'Failed to add record');
    }
    setSubmitting(false);
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkEventName || !bulkEventDate || !bulkPlayers.trim()) {
      setError('All fields are required');
      return;
    }
    
    const players = bulkPlayers
      .split(/[\n,]+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    if (players.length === 0) {
      setError('Please enter at least one player');
      return;
    }
    
    setSubmitting(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const player of players) {
      const result = await records.add({ name: player, event: bulkEventName, date: bulkEventDate, host: bulkHost });
      if (result.success) successCount++;
      else failCount++;
    }
    
    if (failCount === 0) {
      setBulkHost('');
      showSuccess(`Added ${successCount} records!`);
      setBulkEventName('');
      setBulkPlayers('');
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
    const result = await records.update(editRecord.id, { name: editName, event: editEvent, date: editDate, host: editHost });
    
    if (result.success) {
      setEditRecord(null);
      showSuccess('Record updated!');
      if (activeTab === 'records') loadRecords();
      else if (activeTab === 'events') loadEventGroups();
    } else {
      setError(result.error || 'Failed to update');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete record for "${name}"?`)) return;
    
    const result = await records.delete(id);
    if (result.success) {
      showSuccess('Deleted!');
      if (activeTab === 'records') loadRecords();
      else if (activeTab === 'events') loadEventGroups();
    } else {
      setError(result.error || 'Failed to delete');
    }
  };

  const handleDeleteEventGroup = async (group: EventGroup) => {
    if (!confirm(`Delete all ${group.attendees.length} records for "${group.event}" on ${group.date}?`)) return;
    
    setSubmitting(true);
    for (const attendee of group.attendees) {
      await records.delete(attendee.id);
    }
    showSuccess(`Deleted ${group.attendees.length} records`);
    loadEventGroups();
    setSubmitting(false);
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
      const res = await fetch(`${API_BASE}/attendance/events/rename`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          old_event: oldEvent, 
          new_event: newEvent.trim(),
          date: date 
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Renamed to "${newEvent.trim()}" (${data.updated} records updated)`);
        loadEventGroups();
      } else {
        setError(data.error || 'Failed to rename event');
      }
    } catch {
      setError('Failed to rename event');
    } finally {
      setRenamingEvent(null);
      setNewEventName('');
      setSubmitting(false);
    }
  };

  const handleSetHost = async (event: string, date: string, host: string) => {
    setSubmitting(true);
    try {
      const result = await records.setEventHost(event, date, host.trim());
      if (result.success) {
        showSuccess(`Host ${host.trim() ? `set to "${host.trim()}"` : 'cleared'} (${result.data?.updated || 0} records updated)`);
        loadEventGroups();
      } else {
        setError(result.error || 'Failed to set host');
      }
    } catch {
      setError('Failed to set host');
    } finally {
      setSettingHostEvent(null);
      setNewHostName('');
      setSubmitting(false);
    }
  };

  const handleRenameHost = async () => {
    if (!oldHostToRename.trim() || !newHostToRename.trim()) {
      setError('Both old and new host names are required');
      return;
    }
    
    setSubmitting(true);
    try {
      const result = await records.renameHost(oldHostToRename.trim(), newHostToRename.trim());
      if (result.success) {
        showSuccess(`Host renamed from "${oldHostToRename.trim()}" to "${newHostToRename.trim()}" (${result.data?.updated || 0} records updated)`);
        loadEventGroups();
        setRenamingHost(false);
        setOldHostToRename('');
        setNewHostToRename('');
      } else {
        setError(result.error || 'Failed to rename host');
      }
    } catch {
      setError('Failed to rename host');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPlayerToEvent = async (playerName: string, event: string, date: string) => {
    if (!playerName.trim()) {
      setAddingToEvent(null);
      setNewPlayerName('');
      return;
    }
    
    setSubmitting(true);
    try {
      const result = await records.add({ name: playerName.trim(), event, date });
      if (result.success) {
        showSuccess(`Added "${playerName.trim()}" to ${event}`);
        loadEventGroups();
      } else {
        setError(result.error || 'Failed to add player');
      }
    } catch {
      setError('Failed to add player');
    } finally {
      setAddingToEvent(null);
      setNewPlayerName('');
      setSubmitting(false);
    }
  };

  const handleRemoveDuplicates = async (group: EventGroup) => {
    const seen = new Map<string, number[]>();
    for (const attendee of group.attendees) {
      const key = attendee.name.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, []);
      }
      seen.get(key)!.push(attendee.id);
    }
    
    const idsToDelete: number[] = [];
    for (const ids of seen.values()) {
      if (ids.length > 1) {
        idsToDelete.push(...ids.slice(1));
      }
    }
    
    if (idsToDelete.length === 0) {
      showSuccess('No duplicates found!');
      return;
    }
    
    if (!confirm(`Found ${idsToDelete.length} duplicate(s). Remove them?`)) return;
    
    setSubmitting(true);
    let deleted = 0;
    for (const id of idsToDelete) {
      const result = await records.delete(id);
      if (result.success) deleted++;
    }
    showSuccess(`Removed ${deleted} duplicate(s)`);
    loadEventGroups();
    setSubmitting(false);
  };

  const countDuplicates = (group: EventGroup): number => {
    const seen = new Set<string>();
    let count = 0;
    for (const attendee of group.attendees) {
      const key = attendee.name.toLowerCase();
      if (seen.has(key)) {
        count++;
      } else {
        seen.add(key);
      }
    }
    return count;
  };

  const openEditModal = (record: AttendanceRecord | { id: number; name: string; event: string; date: string; host?: string }) => {
    setEditRecord(record as AttendanceRecord);
    setEditName(record.name);
    setEditEvent(record.event);
    setEditDate(record.date);
    setEditHost((record as AttendanceRecord).host || '');
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

  // Loading state
  if (authLoading || !user || !canViewCruddy) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'records', label: 'Records', icon: '📋' },
    { id: 'events', label: 'Events', icon: '📅' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
    { id: 'add', label: 'Add Record', icon: '➕' },
    { id: 'add-event', label: 'Add Event', icon: '📝' },
  ];

  const parsedPlayers = bulkPlayers.split(/[\n,]+/).map(p => p.trim()).filter(p => p.length > 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">
          <span className="text-blue-400">◉</span> Cruddy Panel
        </h1>
        <p className="text-gray-400">Track clan event attendance</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 flex justify-between">
          {error}
          <button onClick={() => setError(null)} className="hover:text-red-200">×</button>
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-emerald-400">
          {success}
        </div>
      )}

      {/* Filters */}
      {['records', 'events', 'leaderboard'].includes(activeTab) && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {activeTab === 'records' && (
              <input
                type="text"
                placeholder="Filter by name..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            )}
            {['records', 'events'].includes(activeTab) && (
              <input
                type="text"
                placeholder="Filter by event..."
                value={filterEvent}
                onChange={(e) => setFilterEvent(e.target.value)}
                className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            )}
            {activeTab === 'events' && (
              <input
                type="text"
                placeholder="Filter by host..."
                value={filterHost}
                onChange={(e) => setFilterHost(e.target.value)}
                className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            )}
            {activeTab === 'leaderboard' && (
              <select
                value={leaderTop}
                onChange={(e) => setLeaderTop(Number(e.target.value))}
                className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={25}>Top 25</option>
                <option value={50}>Top 50</option>
              </select>
            )}
            <input
              type="date"
              value={filterStart}
              onChange={(e) => setFilterStart(e.target.value)}
              className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
            <input
              type="date"
              value={filterEnd}
              onChange={(e) => setFilterEnd(e.target.value)}
              className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
            <div className="flex gap-2">
              <button onClick={() => {
                if (activeTab === 'records') loadRecords();
                else if (activeTab === 'events') loadEventGroups();
                else loadLeaderboard();
              }} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">Search</button>
              <button onClick={clearFilters} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">Clear</button>
            </div>
          </div>
          {activeTab === 'events' && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <button 
                onClick={() => setRenamingHost(true)} 
                className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm"
              >
                ✏️ Rename Host
              </button>
              <span className="text-xs text-gray-500 ml-3">Bulk update host name across all records</span>
            </div>
          )}
        </div>
      )}

      {/* Rename Host Modal */}
      {renamingHost && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Rename Host</h3>
            <p className="text-sm text-gray-400 mb-4">
              This will update the host name across all attendance records.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Current Host Name</label>
                <input
                  type="text"
                  value={oldHostToRename}
                  onChange={(e) => setOldHostToRename(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter current host name..."
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">New Host Name</label>
                <input
                  type="text"
                  value={newHostToRename}
                  onChange={(e) => setNewHostToRename(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter new host name..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleRenameHost}
                disabled={submitting || !oldHostToRename.trim() || !newHostToRename.trim()}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {submitting ? 'Renaming...' : 'Rename Host'}
              </button>
              <button
                onClick={() => {
                  setRenamingHost(false);
                  setOldHostToRename('');
                  setNewHostToRename('');
                }}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === 'records' ? (
          /* Records Table */
          <div className="overflow-x-auto">
            <div className="flex items-center justify-between bg-gray-900 border-b border-gray-700 px-6 py-3">
              <span className="text-gray-400">
                <span className="text-white font-semibold">{total}</span> total records
                {recordsData.length > 0 && recordsData.length < total && (
                  <span className="text-gray-500 ml-2">(showing {recordsData.length})</span>
                )}
              </span>
            </div>
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="text-left text-sm font-medium text-gray-400 px-6 py-4">ID</th>
                  <th className="text-left text-sm font-medium text-gray-400 px-6 py-4">Player</th>
                  <th className="text-left text-sm font-medium text-gray-400 px-6 py-4">Event</th>
                  <th className="text-left text-sm font-medium text-gray-400 px-6 py-4">Host</th>
                  <th className="text-left text-sm font-medium text-gray-400 px-6 py-4">Date</th>
                  <th className="text-right text-sm font-medium text-gray-400 px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {recordsData.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No records found</td></tr>
                ) : recordsData.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-gray-500">{r.id}</td>
                    <td className="px-6 py-4 text-white font-medium">{r.name}</td>
                    <td className="px-6 py-4 text-gray-300">{r.event}</td>
                    <td className="px-6 py-4 text-gray-400">{r.host || <span className="text-gray-600 italic">—</span>}</td>
                    <td className="px-6 py-4 text-gray-400">{r.date}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => openEditModal(r)} className="text-blue-400 hover:underline text-sm">Edit</button>
                      <button onClick={() => handleDelete(r.id, r.name)} className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'events' ? (
          /* Events View */
          <div className="p-4 space-y-3">
            {eventGroups.length > 0 && (
              <div className="flex items-center justify-between bg-gray-900 rounded-xl border border-gray-700 p-3 mb-2">
                <div className="flex items-center gap-6">
                  <span className="text-gray-400">
                    <span className="text-white font-semibold text-lg">{eventGroups.length}</span> event{eventGroups.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-gray-400">
                    <span className="text-white font-semibold text-lg">{eventGroups.reduce((sum, g) => sum + g.attendees.length, 0)}</span> total attendees
                  </span>
                </div>
              </div>
            )}
            {eventGroups.length === 0 ? (
              <div className="text-center text-gray-500 py-12">No events found</div>
            ) : eventGroups.map((group) => {
              const key = `${group.event}|||${group.date}`;
              const isExpanded = expandedGroups.has(key);
              return (
                <div key={key} className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-800"
                    onClick={() => toggleGroup(key)}
                  >
                    <div className="flex-1">
                      {renamingEvent?.event === group.event && renamingEvent?.date === group.date ? (
                        <form 
                          onSubmit={(e) => { e.preventDefault(); handleRenameEvent(group.event, newEventName, group.date); }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="text"
                            value={newEventName}
                            onChange={(e) => setNewEventName(e.target.value)}
                            className="px-2 py-1 rounded bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:border-blue-500"
                            autoFocus
                          />
                          <button type="submit" disabled={submitting} className="text-xs text-emerald-400 hover:text-emerald-300">✓</button>
                          <button type="button" onClick={() => { setRenamingEvent(null); setNewEventName(''); }} className="text-xs text-red-400 hover:text-red-300">✕</button>
                        </form>
                      ) : (
                        <>
                          <div className="text-white font-semibold">{group.event}</div>
                          <div className="text-sm text-gray-500">
                            {group.date}
                            {group.host && <span className="ml-3 text-blue-400">👤 {group.host}</span>}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">{group.attendees.length} players</span>
                      {countDuplicates(group) > 0 && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleRemoveDuplicates(group); }} 
                          className="text-sm text-orange-400 hover:underline"
                        >
                          🔄 {countDuplicates(group)} dupe{countDuplicates(group) > 1 ? 's' : ''}
                        </button>
                      )}
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setAddingToEvent({ event: group.event, date: group.date }); 
                        }} 
                        className="text-sm text-emerald-400 hover:underline"
                      >
                        + Add
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setRenamingEvent({ event: group.event, date: group.date }); 
                          setNewEventName(group.event); 
                        }} 
                        className="text-sm text-purple-400 hover:underline"
                      >
                        ✎ Rename
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setSettingHostEvent({ event: group.event, date: group.date, currentHost: group.host }); 
                          setNewHostName(group.host); 
                        }} 
                        className="text-sm text-cyan-400 hover:underline"
                      >
                        👤 Host
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); copyIngots(group); }} className="text-sm text-blue-400 hover:underline">📋 Copy</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteEventGroup(group); }} className="text-sm text-red-400 hover:underline">🗑</button>
                      <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                    </div>
                  </div>
                  {addingToEvent?.event === group.event && addingToEvent?.date === group.date && (
                    <div className="p-4 border-t border-gray-700 bg-emerald-500/5">
                      <form 
                        onSubmit={(e) => { e.preventDefault(); handleAddPlayerToEvent(newPlayerName, group.event, group.date); }}
                        className="flex items-center gap-3"
                      >
                        <span className="text-sm text-gray-400">Add player:</span>
                        <input
                          type="text"
                          value={newPlayerName}
                          onChange={(e) => setNewPlayerName(e.target.value)}
                          className="flex-1 max-w-xs px-3 py-1.5 rounded bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:border-emerald-400"
                          autoFocus
                        />
                        <button type="submit" disabled={submitting || !newPlayerName.trim()} className="px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30 disabled:opacity-50">Add</button>
                        <button type="button" onClick={() => { setAddingToEvent(null); setNewPlayerName(''); }} className="px-3 py-1.5 rounded bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30">Cancel</button>
                      </form>
                    </div>
                  )}
                  {settingHostEvent?.event === group.event && settingHostEvent?.date === group.date && (
                    <div className="p-4 border-t border-gray-700 bg-cyan-500/5">
                      <form 
                        onSubmit={(e) => { e.preventDefault(); handleSetHost(group.event, group.date, newHostName); }}
                        className="flex items-center gap-3"
                      >
                        <span className="text-sm text-gray-400">Event host:</span>
                        <input
                          type="text"
                          value={newHostName}
                          onChange={(e) => setNewHostName(e.target.value)}
                          className="flex-1 max-w-xs px-3 py-1.5 rounded bg-gray-800 border border-gray-600 text-white text-sm focus:outline-none focus:border-cyan-400"
                          autoFocus
                        />
                        <button type="submit" disabled={submitting} className="px-3 py-1.5 rounded bg-cyan-500/20 text-cyan-400 text-sm hover:bg-cyan-500/30 disabled:opacity-50">Set</button>
                        <button type="button" onClick={() => { setSettingHostEvent(null); setNewHostName(''); }} className="px-3 py-1.5 rounded bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30">Cancel</button>
                      </form>
                    </div>
                  )}
                  {isExpanded && (
                    <div className="p-4 pt-0 border-t border-gray-700">
                      <div className="flex flex-wrap gap-2 pt-4">
                        {group.attendees.map((a) => (
                          <div key={a.id} className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-lg border border-gray-700">
                            <span className="text-white text-sm">{a.name}</span>
                            <button onClick={() => openEditModal({ ...a, event: group.event, date: group.date })} className="text-xs text-blue-400">✎</button>
                            <button onClick={() => handleDelete(a.id, a.name)} className="text-xs text-red-400">✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : activeTab === 'leaderboard' ? (
          /* Leaderboard */
          <div className="p-6 space-y-3">
            {leaderboardData.length === 0 ? (
              <div className="text-center text-gray-500 py-12">No data</div>
            ) : (
              <>
                {leaderboardData.map((entry, i) => {
                  const maxCount = leaderboardData[0]?.count || 1;
                  return (
                    <div key={entry.name} className={`flex items-center gap-4 p-4 rounded-xl ${
                      i === 0 ? 'bg-blue-500/20 border border-blue-500/30' :
                      i === 1 ? 'bg-gray-400/10 border border-gray-400/20' :
                      i === 2 ? 'bg-amber-600/10 border border-amber-600/20' :
                      'bg-gray-900'
                    }`}>
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        i === 0 ? 'bg-blue-500 text-white' :
                        i === 1 ? 'bg-gray-400 text-gray-900' :
                        i === 2 ? 'bg-amber-600 text-white' :
                        'bg-gray-800 text-gray-400'
                      }`}>{i + 1}</span>
                      <span className="font-medium text-white flex-1">{entry.name}</span>
                      <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${(entry.count / maxCount) * 100}%` }} />
                      </div>
                      <span className="text-blue-400 font-semibold">{entry.count}</span>
                    </div>
                  );
                })}
                <div className="grid grid-cols-3 gap-4 mt-6 p-4 bg-gray-900 rounded-xl">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{leaderboardData.reduce((s, e) => s + e.count, 0)}</div>
                    <div className="text-xs text-gray-500">Total Events</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{leaderboardData.length}</div>
                    <div className="text-xs text-gray-500">Participants</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {(leaderboardData.reduce((s, e) => s + e.count, 0) / leaderboardData.length || 0).toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">Avg/Person</div>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : activeTab === 'add' ? (
          /* Add Single Record */
          <form onSubmit={handleAddRecord} className="p-6 max-w-md space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Player Name</label>
              <input type="text" value={addName} onChange={(e) => setAddName(e.target.value)} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500" placeholder="e.g. y u m e" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Event Name</label>
              <input type="text" value={addEvent} onChange={(e) => setAddEvent(e.target.value)} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500" placeholder="e.g. Wildy Wednesday" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Host <span className="text-gray-600">(optional)</span></label>
              <input type="text" value={addHost} onChange={(e) => setAddHost(e.target.value)} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500" placeholder="e.g. Event host RSN" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Date</label>
              <input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500" required />
            </div>
            <button type="submit" disabled={submitting} className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
              {submitting ? 'Adding...' : 'Add Record'}
            </button>
          </form>
        ) : (
          /* Add Bulk Event */
          <form onSubmit={handleAddEvent} className="p-6 max-w-lg space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Event Name</label>
              <input type="text" value={bulkEventName} onChange={(e) => setBulkEventName(e.target.value)} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500" placeholder="e.g. Wildy Wednesday" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Host <span className="text-gray-600">(optional)</span></label>
              <input type="text" value={bulkHost} onChange={(e) => setBulkHost(e.target.value)} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500" placeholder="e.g. Event host RSN" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Date</label>
              <input type="date" value={bulkEventDate} onChange={(e) => setBulkEventDate(e.target.value)} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Attendees <span className="text-gray-600">(one per line or comma-separated)</span></label>
              <textarea
                value={bulkPlayers}
                onChange={(e) => setBulkPlayers(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 min-h-[150px]"
                placeholder="Player1&#10;Player2&#10;Player3"
              />
            </div>
            {parsedPlayers.length > 0 && (
              <div className="text-sm text-gray-500">📝 {parsedPlayers.length} attendee{parsedPlayers.length !== 1 ? 's' : ''} will be added</div>
            )}
            <button type="submit" disabled={submitting} className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
              {submitting ? 'Adding...' : 'Add Event'}
            </button>
          </form>
        )}
      </div>

      {/* Edit Modal */}
      {editRecord && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setEditRecord(null)}>
          <form onSubmit={handleEditRecord} onClick={(e) => e.stopPropagation()} className="bg-gray-800 rounded-2xl border border-gray-700 p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold text-white">Edit Record #{editRecord.id}</h3>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Player Name</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Event</label>
              <input type="text" value={editEvent} onChange={(e) => setEditEvent(e.target.value)} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Host <span className="text-gray-600">(optional)</span></label>
              <input type="text" value={editHost} onChange={(e) => setEditHost(e.target.value)} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Date</label>
              <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500" required />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditRecord(null)} className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600">Cancel</button>
              <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

