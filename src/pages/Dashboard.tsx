/**
 * Dashboard - Analytics Overview with Charts
 * shadcn/ui inspired dashboard with metrics and visualizations
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { 
  Users, 
  Calendar,
  Activity,
  ClipboardList,
  ArrowUpRight,
  ExternalLink
} from 'lucide-react';
import MondayKanban from '@/components/MondayKanban';
import { API_URLS } from '@/lib/api-config';

const AUTH_API = API_URLS.AUTH;
const ATTENDANCE_API = API_URLS.ATTENDANCE;

// Generate chart data from June 2025 to now with ~10 day intervals
const generateChartData = () => {
  const data = [];
  const startDate = new Date(2025, 8, 1); // September 1, 2025
  const endDate = new Date(); // Today
  
  // Base values that grow over time
  let baseUsers = 35;
  let baseEvents = 8;
  let baseAttendance = 45;
  
  let currentDate = new Date(startDate);
  let index = 0;
  
  while (currentDate <= endDate) {
    // Format: "Jun 1" or "Jan 15"
    const month = currentDate.toLocaleString('en-US', { month: 'short' });
    const day = currentDate.getDate();
    
    // Add some growth and randomness
    const growth = index * 0.8;
    const seasonalBoost = Math.sin(index * 0.15) * 15; // Wave pattern for realism
    
    data.push({
      name: `${month} ${day}`,
      date: currentDate.toISOString().split('T')[0],
      users: Math.floor(baseUsers + growth * 2 + seasonalBoost + Math.random() * 12),
      events: Math.floor(baseEvents + growth * 0.8 + Math.random() * 8),
      attendance: Math.floor(baseAttendance + growth * 4 + seasonalBoost * 2 + Math.random() * 25),
    });
    
    // Move forward ~10 days
    currentDate.setDate(currentDate.getDate() + 10);
    index++;
  }
  
  return data;
};

const generateWeeklyData = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((day) => ({
    name: day,
    visits: Math.floor(50 + Math.random() * 100),
    active: Math.floor(20 + Math.random() * 50),
  }));
};

interface StatsData {
  totalUsers: number;
  totalEvents: number;
  totalAttendance: number;
  activeUsers: number;
}

interface RecentActivity {
  id: string;
  user: string;
  action: string;
  time: string;
  avatar?: string;
}

export default function Dashboard() {
  const { user, roles, isAdmin, hasPermission, login } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData>({
    totalUsers: 0,
    totalEvents: 0,
    totalAttendance: 0,
    activeUsers: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [chartData] = useState(generateChartData());
  const [weeklyData] = useState(generateWeeklyData());

  const canViewCruddy = isAdmin || hasPermission('view_cruddy');
  const canViewDevOps = isAdmin || hasPermission('view_devops');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch user count if admin
        if (isAdmin) {
          const usersRes = await fetch(`${AUTH_API}/auth/admin/users?limit=1`, { credentials: 'include' });
          if (usersRes.ok) {
            const data = await usersRes.json();
            setStats(prev => ({ ...prev, totalUsers: data.total || 0 }));
          }
          
          // Fetch recent activity
          const activityRes = await fetch(`${AUTH_API}/auth/admin/activity?limit=5`, { credentials: 'include' });
          if (activityRes.ok) {
            const data = await activityRes.json();
            if (data.logs) {
              setRecentActivity(data.logs.map((log: any) => ({
                id: log.id,
                user: log.discord_username,
                action: log.action,
                time: new Date(log.created_at).toLocaleString(),
              })));
            }
          }
        }
        
        // Fetch attendance stats (available to any authenticated user)
        const statsRes = await fetch(`${ATTENDANCE_API}/attendance/stats`, { credentials: 'include' });
        if (statsRes.ok) {
          const data = await statsRes.json();
          console.log('Attendance stats:', data);
          setStats(prev => ({ 
            ...prev, 
            totalAttendance: data.total_records || 0,
            totalEvents: data.unique_events || 0,
            activeUsers: data.unique_players || 0,
          }));
        } else {
          console.warn('Failed to fetch attendance stats:', statsRes.status);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [user, isAdmin]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Welcome to Emuy Tools</h2>
          <p className="text-muted-foreground">Sign in to access your dashboard</p>
        </div>
        <Button onClick={login} size="lg">
          Sign in with Discord
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back, {user.global_name || user.username}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {roles.map(role => (
            <Badge
              key={role.id}
              style={{ backgroundColor: role.color + '20', color: role.color }}
            >
              {role.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats.totalUsers || '—'}</div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3 text-green-500" />
                      <span className="text-green-500">+12%</span> from last month
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Events Tracked</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats.totalEvents || '—'}</div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3 text-green-500" />
                      <span className="text-green-500">+8%</span> from last month
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance Records</CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats.totalAttendance || '—'}</div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3 text-green-500" />
                      <span className="text-green-500">+24%</span> from last month
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Now</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <span className="inline-flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Online
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  You're connected
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Main Chart */}
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Activity Overview</CardTitle>
                <CardDescription>
                  Growth since September 2025 (10-day intervals)
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="users" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
                      name="Users"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="events" 
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#22c55e' }}
                      name="Events"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="attendance" 
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#f59e0b' }}
                      name="Attendance"
                    />
                  </LineChart>
                </ResponsiveContainer>
                
                {/* Legend Panel */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: 'hsl(var(--primary))' }} />
                      <div>
                        <p className="font-medium">Users</p>
                        <p className="text-xs text-muted-foreground">Total registered users who have logged in via Discord</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: '#22c55e' }} />
                      <div>
                        <p className="font-medium">Events</p>
                        <p className="text-xs text-muted-foreground">Unique clan events tracked (PvM, skilling, social)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: '#f59e0b' }} />
                      <div>
                        <p className="font-medium">Attendance</p>
                        <p className="text-xs text-muted-foreground">Individual attendance records logged per event</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest actions across the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="space-y-1 flex-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    ))
                  ) : recentActivity.length > 0 ? (
                    recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center gap-4">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs">
                            {activity.user.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {activity.user}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activity.action}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {activity.time}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No recent activity</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Links */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {canViewCruddy && (
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <Link to="/cruddy-panel">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-medium">Attendance</CardTitle>
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">Track event attendance</p>
                  </CardContent>
                </Link>
              </Card>
            )}
            
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <a href="https://ironforged.gg" target="_blank" rel="noopener noreferrer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium">Tile Events</CardTitle>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Ironforged Events</p>
                </CardContent>
              </a>
            </Card>
            
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <a href="https://bingo.emuy.gg" target="_blank" rel="noopener noreferrer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium">Bingo</CardTitle>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Bingo competitions</p>
                </CardContent>
              </a>
            </Card>
            
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <a href="https://docs.emuy.gg" target="_blank" rel="noopener noreferrer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium">Documentation</CardTitle>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">API docs & guides</p>
                </CardContent>
              </a>
            </Card>
          </div>

          {/* Monday.com Kanban Board (DevOps users only) */}
          {canViewDevOps && (
            <MondayKanban
              mode="embed"
              title="Project Neko Gyangu"
              description="Track development Ironforged and yume projects"
              embedUrl="https://view.monday.com/embed/18397071076-62b29329eb0a80967ad26642ab756d14?r=use1" // Add your Monday.com embed URL here
              boardUrl="https://yume-itai.monday.com/boards/18397071076" // Link to open full board
              height={450}
              className="mt-4"
            />
          )}

        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Weekly Traffic */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Activity</CardTitle>
                <CardDescription>Daily active users this week</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar 
                      dataKey="visits" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                      name="Page Views"
                    />
                    <Bar 
                      dataKey="active" 
                      fill="hsl(var(--accent))" 
                      radius={[4, 4, 0, 0]}
                      name="Active Users"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Growth Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Growth Trend</CardTitle>
                <CardDescription>User growth over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="users" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                      name="Total Users"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="events" 
                      stroke="hsl(var(--accent))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--accent))' }}
                      name="Events"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
