/**
 * Admin Panel - Tasks-style User Management
 * Inspired by shadcn/ui Tasks example
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MoreHorizontal, 
  UserPlus, 
  Shield, 
  Key,
  Activity,
  ArrowUpDown,
  Ban,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.emuy.gg';

// Types
interface DBUser {
  id: number;
  discord_id: string;
  username: string | null;
  global_name: string | null;
  avatar: string | null;
  rsn: string | null;
  is_banned: boolean;
  last_login_at: string | null;
  created_at: string;
  roles?: Role[];
}

interface Role {
  id: number;
  name: string;
  color: string;
  priority: number;
  is_default: boolean;
}

interface Permission {
  id: number;
  name: string;
  description: string;
  category: string;
}

interface ActivityLog {
  id: number;
  discord_id: string;
  discord_username: string;
  action: string;
  details: string;
  created_at: string;
}

export default function Admin() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [users, setUsers] = useState<DBUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog state
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [selectedUser, setSelectedUser] = useState<DBUser | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  // Auth check
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, authLoading, isAdmin, navigate]);

  // Fetch data
  useEffect(() => {
    if (user && isAdmin) {
      fetchUsers();
      fetchRoles();
      fetchPermissions();
      fetchActivityLogs();
    }
  }, [user, isAdmin]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/admin/users?limit=500`, { credentials: 'include' });
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/admin/roles`, { credentials: 'include' });
      const data = await res.json();
      if (data.roles) setRoles(data.roles);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/admin/permissions`, { credentials: 'include' });
      const data = await res.json();
      if (data.permissions) setPermissions(data.permissions);
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/admin/activity?limit=100`, { credentials: 'include' });
      const data = await res.json();
      if (data.logs) setActivityLogs(data.logs);
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    }
  };

  const handleAddUser = async () => {
    if (!newUserId.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/auth/admin/users`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discord_id: newUserId.trim() }),
      });
      if (res.ok) {
        setNewUserId('');
        setAddUserDialogOpen(false);
        fetchUsers();
      }
    } catch (err) {
      console.error('Failed to add user:', err);
    }
  };

  const handleToggleBan = async (userId: string, isBanned: boolean) => {
    try {
      await fetch(`${API_BASE}/auth/admin/users/${userId}/ban`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_banned: !isBanned }),
      });
      fetchUsers();
    } catch (err) {
      console.error('Failed to toggle ban:', err);
    }
  };

  const handleAssignRole = async (userId: string, roleId: number, assign: boolean) => {
    try {
      await fetch(`${API_BASE}/auth/admin/users/${userId}/roles`, {
        method: assign ? 'POST' : 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: roleId }),
      });
      fetchUsers();
    } catch (err) {
      console.error('Failed to assign role:', err);
    }
  };

  // User columns
  const userColumns: ColumnDef<DBUser>[] = [
    {
      accessorKey: 'avatar',
      header: '',
      cell: ({ row }) => {
        const user = row.original;
        const avatarUrl = user.avatar 
          ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png`
          : null;
        return (
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="text-xs">
              {(user.global_name || user.username || '??').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        );
      },
    },
    {
      accessorKey: 'username',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          User
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{user.global_name || user.username}</span>
            <span className="text-xs text-muted-foreground">@{user.username}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'discord_id',
      header: 'Discord ID',
      cell: ({ row }) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
          {row.getValue('discord_id')}
        </code>
      ),
    },
    {
      accessorKey: 'rsn',
      header: 'RSN',
      cell: ({ row }) => row.getValue('rsn') || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: 'roles',
      header: 'Roles',
      cell: ({ row }) => {
        const userRoles = row.original.roles || [];
        return (
          <div className="flex flex-wrap gap-1">
            {userRoles.length > 0 ? (
              userRoles.map((role) => (
                <Badge
                  key={role.id}
                  variant="secondary"
                  style={{ backgroundColor: role.color + '20', color: role.color }}
                  className="text-xs"
                >
                  {role.name}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground text-xs">No roles</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'is_banned',
      header: 'Status',
      cell: ({ row }) => {
        const isBanned = row.getValue('is_banned');
        return isBanned ? (
          <Badge variant="destructive" className="gap-1">
            <Ban className="h-3 w-3" /> Banned
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-500">
            <CheckCircle className="h-3 w-3" /> Active
          </Badge>
        );
      },
    },
    {
      accessorKey: 'last_login_at',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Last Login
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue('last_login_at') as string;
        return date ? (
          <span className="text-sm">{new Date(date).toLocaleDateString()}</span>
        ) : (
          <span className="text-muted-foreground">Never</span>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const user = row.original;
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
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(user.discord_id)}
              >
                Copy Discord ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setSelectedUser(user);
                  setRoleDialogOpen(true);
                }}
              >
                <Shield className="mr-2 h-4 w-4" />
                Manage Roles
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleToggleBan(user.discord_id, user.is_banned)}
                className={user.is_banned ? 'text-green-500' : 'text-destructive'}
              >
                {user.is_banned ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Unban User
                  </>
                ) : (
                  <>
                    <Ban className="mr-2 h-4 w-4" />
                    Ban User
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Role columns
  const roleColumns: ColumnDef<Role>[] = [
    {
      accessorKey: 'name',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.original;
        return (
          <div className="flex items-center gap-2">
            <div 
              className="h-3 w-3 rounded-full" 
              style={{ backgroundColor: role.color }}
            />
            <span className="font-medium">{role.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
    },
    {
      accessorKey: 'is_default',
      header: 'Default',
      cell: ({ row }) => row.getValue('is_default') ? (
        <Badge variant="secondary">Default</Badge>
      ) : null,
    },
  ];

  // Activity log columns
  const activityColumns: ColumnDef<ActivityLog>[] = [
    {
      accessorKey: 'created_at',
      header: 'Time',
      cell: ({ row }) => {
        const date = new Date(row.getValue('created_at'));
        return (
          <span className="text-sm text-muted-foreground">
            {date.toLocaleString()}
          </span>
        );
      },
    },
    {
      accessorKey: 'discord_username',
      header: 'User',
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue('action')}</Badge>
      ),
    },
    {
      accessorKey: 'details',
      header: 'Details',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground max-w-[300px] truncate block">
          {row.getValue('details')}
        </span>
      ),
    },
  ];

  if (authLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and permissions
          </p>
        </div>
        <Button onClick={() => setAddUserDialogOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            Roles ({roles.length})
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Key className="h-4 w-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                View and manage all registered users
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
                  columns={userColumns} 
                  data={users} 
                  searchKey="username"
                  searchPlaceholder="Search users..."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Role Management</CardTitle>
              <CardDescription>
                Configure roles and their permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable 
                columns={roleColumns} 
                data={roles} 
                searchKey="name"
                searchPlaceholder="Search roles..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Permissions</CardTitle>
              <CardDescription>
                Available permissions in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {permissions.map((perm) => (
                  <div 
                    key={perm.id} 
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <code className="text-sm font-medium">{perm.name}</code>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {perm.description}
                    </p>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {perm.category}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle>Activity Logs</CardTitle>
                <CardDescription>
                  Recent system activity
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchActivityLogs}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable 
                columns={activityColumns} 
                data={activityLogs} 
                searchKey="action"
                searchPlaceholder="Search activity..."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add User Dialog */}
      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Add a user by their Discord ID
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="discord_id">Discord ID</Label>
              <Input
                id="discord_id"
                placeholder="Enter Discord ID (e.g., 123456789012345678)"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser}>Add User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Roles Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Roles</DialogTitle>
            <DialogDescription>
              {selectedUser && `Assign roles to ${selectedUser.global_name || selectedUser.username}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {roles.map((role) => {
              const hasRole = selectedUser?.roles?.some(r => r.id === role.id);
              return (
                <div key={role.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role.id}`}
                    checked={hasRole}
                    onCheckedChange={(checked) => {
                      if (selectedUser) {
                        handleAssignRole(selectedUser.discord_id, role.id, !!checked);
                      }
                    }}
                  />
                  <Label
                    htmlFor={`role-${role.id}`}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: role.color }}
                    />
                    {role.name}
                  </Label>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button onClick={() => setRoleDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
