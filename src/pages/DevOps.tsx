/**
 * =============================================================================
 * DEVOPS CONTROL PANEL
 * =============================================================================
 * 
 * Centralized DevOps dashboard for monitoring and managing infrastructure.
 * Updated for the microservices architecture.
 * 
 * Features:
 * - Repository status (GitHub commits, workflows)
 * - Microservice health checks
 * - Sesh Calendar Worker sync
 * - Widget heartbeats
 * - Discord Bot status
 * - Error logs viewer
 * - Quick links
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { API_URLS } from '@/lib/api-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { 
  GitBranch, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  Server,
  Globe,
  Bot,
  Calendar,
  Heart,
  AlertTriangle,
  Link as LinkIcon,
  Play,
  ChevronRight,
  Activity,
  Database,
  Shield,
  Users,
  Gamepad2,
  FileText,
  Rocket,
  Settings,
  Trash2
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface RepoStatus {
  name: string;
  displayName: string;
  description: string;
  icon: React.ReactNode;
  type: 'pages' | 'worker' | 'bot';
  url?: string;
  lastCommit?: {
    sha: string;
    message: string;
    date: string;
    author: string;
  };
  workflows?: WorkflowRun[];
  loading: boolean;
  error?: string;
}

interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  html_url: string;
}

interface Workflow {
  id: number;
  name: string;
  path: string;
}

interface ServiceHealth {
  name: string;
  url: string;
  status: 'online' | 'offline' | 'checking';
  latency?: number;
  lastChecked?: string;
}

interface SeshWorkerStatus {
  configured: boolean;
  worker?: string;
  status?: string;
  timestamp?: string;
  error?: string;
}

interface SeshWorkerConfig {
  guildId?: string;
  spreadsheetId?: string;
  sheetName?: string;
  serviceAccountConfigured?: boolean;
  privateKeyConfigured?: boolean;
}

interface SeshSyncResult {
  success: boolean;
  eventsCount?: number;
  duration?: number;
  timestamp?: string;
  error?: string;
}

interface ErrorLog {
  id: number;
  timestamp: string;
  endpoint: string;
  method: string;
  error_type: string;
  error_message: string;
  stack_trace?: string;
  user_id?: string;
  ip_address?: string;
  resolved: number;
  notes?: string;
}

interface ErrorLogSummary {
  error_type: string;
  count: number;
  unresolved: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const GITHUB_ORG = 'y-u-m-e';

// New architecture repos
const REPOS: Omit<RepoStatus, 'loading' | 'lastCommit' | 'workflows' | 'error'>[] = [
  // Frontend Pages
  { 
    name: 'emuy-pages', 
    displayName: 'Emuy Pages',
    description: 'Main dashboard (emuy.gg)',
    icon: <Globe className="h-5 w-5" />,
    type: 'pages',
    url: 'https://emuy.gg'
  },
  { 
    name: 'ironforged-pages', 
    displayName: 'Ironforged Pages',
    description: 'Tile events (ironforged.gg)',
    icon: <Gamepad2 className="h-5 w-5" />,
    type: 'pages',
    url: 'https://ironforged.gg'
  },
  { 
    name: 'bingo-pages', 
    displayName: 'Bingo Pages',
    description: 'Bingo events (bingo.emuy.gg)',
    icon: <Activity className="h-5 w-5" />,
    type: 'pages',
    url: 'https://bingo.emuy.gg'
  },
  { 
    name: 'docs-pages', 
    displayName: 'Docs Pages',
    description: 'Documentation (docs.emuy.gg)',
    icon: <FileText className="h-5 w-5" />,
    type: 'pages',
    url: 'https://docs.emuy.gg'
  },
  // API Workers
  { 
    name: 'auth-api', 
    displayName: 'Auth API',
    description: 'Authentication & RBAC',
    icon: <Shield className="h-5 w-5" />,
    type: 'worker',
    url: 'https://auth.api.emuy.gg'
  },
  { 
    name: 'attendance-api', 
    displayName: 'Attendance API',
    description: 'Cruddy panel & leaderboards',
    icon: <Users className="h-5 w-5" />,
    type: 'worker',
    url: 'https://attendance.api.emuy.gg'
  },
  { 
    name: 'events-api', 
    displayName: 'Events API',
    description: 'Tile events system',
    icon: <Calendar className="h-5 w-5" />,
    type: 'worker',
    url: 'https://events.api.emuy.gg'
  },
  { 
    name: 'bingo-api', 
    displayName: 'Bingo API',
    description: 'Bingo event tracking',
    icon: <Database className="h-5 w-5" />,
    type: 'worker',
    url: 'https://bingo.api.emuy.gg'
  },
  // Bot
  { 
    name: 'yume-bot', 
    displayName: 'Discord Bot',
    description: 'Bot on Railway',
    icon: <Bot className="h-5 w-5" />,
    type: 'bot'
  },
];

const CRON_SCHEDULES = [
  { value: '0 * * * *', label: 'Every hour', description: 'Runs at the top of every hour' },
  { value: '0 */2 * * *', label: 'Every 2 hours', description: 'Runs every 2 hours' },
  { value: '0 */4 * * *', label: 'Every 4 hours', description: 'Runs 6 times a day' },
  { value: '0 */6 * * *', label: 'Every 6 hours', description: 'Runs 4 times a day (default)' },
  { value: '0 */12 * * *', label: 'Every 12 hours', description: 'Runs twice a day' },
  { value: '0 0 * * *', label: 'Daily (midnight)', description: 'Runs once at midnight UTC' },
];

const SERVICES: Omit<ServiceHealth, 'status' | 'latency' | 'lastChecked'>[] = [
  { name: 'Auth API', url: API_URLS.AUTH },
  { name: 'Attendance API', url: API_URLS.ATTENDANCE },
  { name: 'Events API', url: API_URLS.EVENTS },
  { name: 'Bingo API', url: API_URLS.BINGO },
];

// =============================================================================
// COMPONENT
// =============================================================================

export default function DevOps() {
  const { user, loading: authLoading, hasPermission, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const canViewDevOps = isAdmin || hasPermission('view_devops');

  // State
  const [repos, setRepos] = useState<RepoStatus[]>(
    REPOS.map(r => ({ ...r, loading: true }))
  );
  const [githubToken, setGithubToken] = useState('');
  const [tokenSaved, setTokenSaved] = useState(false);
  const [tokenSource, setTokenSource] = useState<'server' | 'local' | null>(null);
  const [loadingSecrets, setLoadingSecrets] = useState(true);
  const [triggeringWorkflow, setTriggeringWorkflow] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<Record<string, Workflow[]>>({});
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(new Set());
  
  // Service health
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth[]>(
    SERVICES.map(s => ({ ...s, status: 'checking' as const }))
  );
  const [checkingHealth, setCheckingHealth] = useState(false);

  // Sesh Calendar Worker
  const [seshWorkerStatus, setSeshWorkerStatus] = useState<SeshWorkerStatus | null>(null);
  const [seshWorkerConfig, setSeshWorkerConfig] = useState<SeshWorkerConfig | null>(null);
  const [seshSyncing, setSeshSyncing] = useState(false);
  const [seshLastSync, setSeshLastSync] = useState<SeshSyncResult | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState('0 */6 * * *');

  // Widget heartbeats
  const [heartbeatStatus, setHeartbeatStatus] = useState<Record<string, { status: string; lastPing: string; source: string }>>({});
  const [pingingCarrd, setPingingCarrd] = useState(false);

  // Error logs
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [errorSummary, setErrorSummary] = useState<ErrorLogSummary[]>([]);
  const [errorLogsTotal, setErrorLogsTotal] = useState(0);
  const [errorLogsPage, setErrorLogsPage] = useState(1);
  const [loadingErrorLogs, setLoadingErrorLogs] = useState(false);
  const [errorTypeFilter, setErrorTypeFilter] = useState<string>('');
  const [showResolvedLogs, setShowResolvedLogs] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  // Load GitHub token
  useEffect(() => {
    const loadToken = async () => {
      setLoadingSecrets(true);
      try {
        const res = await fetch(`${API_URLS.AUTH}/admin/secrets`, {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          if (data.github_pat) {
            setGithubToken(data.github_pat);
            setTokenSaved(true);
            setTokenSource('server');
            setLoadingSecrets(false);
            return;
          }
        }
      } catch {
        // Server token not available
      }
      
      const saved = localStorage.getItem('github_pat');
      if (saved) {
        setGithubToken(saved);
        setTokenSaved(true);
        setTokenSource('local');
      }
      setLoadingSecrets(false);
    };
    
    if (user) loadToken();
    else setLoadingSecrets(false);
  }, [user]);

  // Fetch repo data when token available
  useEffect(() => {
    if (tokenSaved && githubToken) {
      fetchAllRepoData();
      fetchWorkflows();
    }
  }, [tokenSaved, githubToken]);

  // Fetch other data on mount
  useEffect(() => {
    if (user) {
      fetchSeshWorkerStatus();
      fetchErrorLogs(1);
    }
  }, [user]);

  useEffect(() => {
    fetchHeartbeatStatus();
    checkAllServicesHealth();
    const interval = setInterval(() => {
      fetchHeartbeatStatus();
      checkAllServicesHealth();
    }, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  // Re-fetch error logs when filters change
  useEffect(() => {
    if (user) fetchErrorLogs(1);
  }, [showResolvedLogs, errorTypeFilter]);

  // Redirect if not authorized
  useEffect(() => {
    if (!authLoading && (!user || !canViewDevOps)) {
      navigate('/');
    }
  }, [user, authLoading, canViewDevOps, navigate]);

  const fetchAllRepoData = async () => {
    for (const repo of REPOS) {
      await fetchRepoData(repo.name);
    }
  };

  const fetchRepoData = async (repoName: string) => {
    setRepos(prev => prev.map(r => 
      r.name === repoName ? { ...r, loading: true, error: undefined } : r
    ));

    try {
      const commitRes = await fetch(
        `https://api.github.com/repos/${GITHUB_ORG}/${repoName}/commits/main`,
        { headers: { Authorization: `Bearer ${githubToken}` } }
      );
      
      if (!commitRes.ok) throw new Error('Failed to fetch commits');
      const commitData = await commitRes.json();

      const workflowRes = await fetch(
        `https://api.github.com/repos/${GITHUB_ORG}/${repoName}/actions/runs?per_page=5`,
        { headers: { Authorization: `Bearer ${githubToken}` } }
      );
      
      let workflowRuns: WorkflowRun[] = [];
      if (workflowRes.ok) {
        const workflowData = await workflowRes.json();
        workflowRuns = workflowData.workflow_runs || [];
      }

      setRepos(prev => prev.map(r => 
        r.name === repoName ? {
          ...r,
          loading: false,
          lastCommit: {
            sha: commitData.sha.substring(0, 7),
            message: commitData.commit.message.split('\n')[0],
            date: new Date(commitData.commit.author.date).toLocaleString(),
            author: commitData.commit.author.name,
          },
          workflows: workflowRuns,
        } : r
      ));
    } catch {
      setRepos(prev => prev.map(r => 
        r.name === repoName ? { ...r, loading: false, error: 'Failed to fetch' } : r
      ));
    }
  };

  const fetchWorkflows = async () => {
    const allWorkflows: Record<string, Workflow[]> = {};
    
    for (const repo of REPOS) {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${GITHUB_ORG}/${repo.name}/actions/workflows`,
          { headers: { Authorization: `Bearer ${githubToken}` } }
        );
        if (res.ok) {
          const data = await res.json();
          allWorkflows[repo.name] = data.workflows || [];
        }
      } catch {
        // Ignore
      }
    }
    
    setWorkflows(allWorkflows);
  };

  const checkAllServicesHealth = useCallback(async () => {
    setCheckingHealth(true);
    const results = await Promise.all(
      SERVICES.map(async (service) => {
        const startTime = Date.now();
        try {
          const res = await fetch(`${service.url}/health`, {
            signal: AbortSignal.timeout(5000)
          });
          const latency = Date.now() - startTime;
          return {
            ...service,
            status: res.ok ? 'online' : 'offline',
            latency,
            lastChecked: new Date().toISOString()
          } as ServiceHealth;
        } catch {
          return {
            ...service,
            status: 'offline',
            lastChecked: new Date().toISOString()
          } as ServiceHealth;
        }
      })
    );
    setServiceHealth(results);
    setCheckingHealth(false);
  }, []);

  const fetchHeartbeatStatus = async () => {
    try {
      const res = await fetch(`${API_URLS.AUTH}/widget/status`);
      if (res.ok) {
        const data = await res.json();
        setHeartbeatStatus(data.widgets || {});
      }
    } catch {
      // Ignore
    }
  };

  const fetchSeshWorkerStatus = async () => {
    try {
      const [statusRes, configRes] = await Promise.all([
        fetch(`${API_URLS.AUTH}/admin/sesh-worker/status`, { credentials: 'include' }),
        fetch(`${API_URLS.AUTH}/admin/sesh-worker/config`, { credentials: 'include' })
      ]);
      
      if (statusRes.ok) setSeshWorkerStatus(await statusRes.json());
      if (configRes.ok) setSeshWorkerConfig(await configRes.json());
    } catch {
      setSeshWorkerStatus({ configured: false, error: 'Failed to fetch status' });
    }
  };

  const fetchErrorLogs = async (page = 1) => {
    setLoadingErrorLogs(true);
    try {
      const params = new URLSearchParams({
        limit: '20',
        offset: String((page - 1) * 20),
        resolved: showResolvedLogs ? '' : 'false'
      });
      if (errorTypeFilter) params.set('type', errorTypeFilter);
      
      const res = await fetch(`${API_URLS.AUTH}/admin/error-logs?${params}`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setErrorLogs(data.logs || []);
        setErrorLogsTotal(data.total || 0);
        setErrorSummary(data.summary || []);
        setErrorLogsPage(page);
      }
    } catch (err) {
      console.error("Failed to fetch error logs:", err);
    } finally {
      setLoadingErrorLogs(false);
    }
  };

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  const saveToken = () => {
    localStorage.setItem('github_pat', githubToken);
    setTokenSaved(true);
    setTokenSource('local');
  };

  const clearToken = () => {
    localStorage.removeItem('github_pat');
    setGithubToken('');
    setTokenSaved(false);
    setTokenSource(null);
  };

  const triggerWorkflow = async (repoName: string, workflowId: number, inputs?: Record<string, string>) => {
    setTriggeringWorkflow(`${repoName}-${workflowId}`);
    
    try {
      const body: Record<string, unknown> = { ref: 'main' };
      if (inputs) body.inputs = inputs;

      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_ORG}/${repoName}/actions/workflows/${workflowId}/dispatches`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (res.status === 204) {
        setTimeout(() => {
          fetchRepoData(repoName);
          setTriggeringWorkflow(null);
        }, 2000);
      } else {
        throw new Error('Failed to trigger workflow');
      }
    } catch {
      alert('Failed to trigger workflow. Make sure your token has workflow permissions.');
      setTriggeringWorkflow(null);
    }
  };

  const triggerSeshSync = async () => {
    setSeshSyncing(true);
    setSeshLastSync(null);
    
    try {
      const res = await fetch(`${API_URLS.AUTH}/admin/sesh-worker/sync`, {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await res.json();
      setSeshLastSync(data);
      await fetchSeshWorkerStatus();
    } catch {
      setSeshLastSync({ success: false, error: 'Failed to trigger sync' });
    } finally {
      setSeshSyncing(false);
    }
  };

  const pingCarrdWidgets = async () => {
    setPingingCarrd(true);
    try {
      const res = await fetch(`${API_URLS.AUTH}/admin/widget/ping`, {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) await fetchHeartbeatStatus();
    } catch (err) {
      console.error('Ping failed:', err);
    } finally {
      setPingingCarrd(false);
    }
  };

  const markLogResolved = async (logId: number, resolved: boolean) => {
    try {
      const res = await fetch(`${API_URLS.AUTH}/admin/error-logs/${logId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved })
      });
      if (res.ok) fetchErrorLogs(errorLogsPage);
    } catch (err) {
      console.error("Failed to update error log:", err);
    }
  };

  const deleteLog = async (logId: number) => {
    if (!confirm('Delete this error log?')) return;
    try {
      const res = await fetch(`${API_URLS.AUTH}/admin/error-logs/${logId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) fetchErrorLogs(errorLogsPage);
    } catch (err) {
      console.error("Failed to delete error log:", err);
    }
  };

  const clearResolvedLogs = async () => {
    if (!confirm('Clear all resolved error logs?')) return;
    try {
      await fetch(`${API_URLS.AUTH}/admin/error-logs`, {
        method: 'DELETE',
        credentials: 'include'
      });
      fetchErrorLogs(1);
    } catch (err) {
      console.error("Failed to clear logs:", err);
    }
  };

  const toggleRepoExpanded = (repoName: string) => {
    setExpandedRepos(prev => {
      const next = new Set(prev);
      if (next.has(repoName)) next.delete(repoName);
      else next.add(repoName);
      return next;
    });
  };

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  const getStatusIcon = (status: string, conclusion: string | null) => {
    if (status === 'in_progress') return <Loader2 className="h-3 w-3 animate-spin text-yellow-400" />;
    if (status === 'queued') return <Clock className="h-3 w-3 text-yellow-400" />;
    if (conclusion === 'success') return <CheckCircle2 className="h-3 w-3 text-green-400" />;
    if (conclusion === 'failure') return <XCircle className="h-3 w-3 text-red-400" />;
    return <Clock className="h-3 w-3 text-muted-foreground" />;
  };

  const getHeartbeatColor = (status?: string) => {
    if (status === 'online') return 'bg-green-500';
    if (status === 'recent') return 'bg-green-400';
    if (status === 'stale') return 'bg-yellow-400';
    return 'bg-red-400';
  };

  // ==========================================================================
  // LOADING/AUTH STATES
  // ==========================================================================

  if (authLoading || !user || !canViewDevOps) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  const pagesRepos = repos.filter(r => r.type === 'pages');
  const workerRepos = repos.filter(r => r.type === 'worker');
  const botRepos = repos.filter(r => r.type === 'bot');

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Rocket className="h-6 w-6 text-primary" />
              DevOps Control Panel
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Monitor and manage your infrastructure
            </p>
          </div>
          <div className="flex items-center gap-2">
            {tokenSaved && (
              <Badge variant="outline" className="text-green-400 border-green-400/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                GitHub Connected
                <span className="text-muted-foreground ml-1">({tokenSource})</span>
              </Badge>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => { fetchAllRepoData(); checkAllServicesHealth(); fetchSeshWorkerStatus(); }}
                  disabled={!tokenSaved}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh all data</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* GitHub Token Setup */}
        {loadingSecrets ? (
          <Card>
            <CardContent className="py-6 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Loading configuration...</span>
            </CardContent>
          </Card>
        ) : !tokenSaved ? (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5 text-yellow-400" />
                GitHub Token Required
              </CardTitle>
              <CardDescription>
                Enter a GitHub PAT with <code className="text-primary">repo</code> and <code className="text-primary">workflow</code> scopes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="flex-1"
                />
                <Button onClick={saveToken} disabled={!githubToken}>
                  Save Token
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Service Health Overview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" />
                Service Health
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={checkAllServicesHealth}
                disabled={checkingHealth}
              >
                {checkingHealth ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {serviceHealth.map((service) => (
                <div 
                  key={service.name} 
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      service.status === 'online' ? 'bg-green-500 animate-pulse' :
                      service.status === 'offline' ? 'bg-red-500' :
                      'bg-yellow-500 animate-pulse'
                    }`} />
                    <span className="text-sm font-medium">{service.name}</span>
                  </div>
                  {service.latency && (
                    <span className="text-xs text-muted-foreground">{service.latency}ms</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="repos" className="space-y-4">
          <TabsList>
            <TabsTrigger value="repos" className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Repositories
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Tools
            </TabsTrigger>
            <TabsTrigger value="errors" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Errors
              {errorSummary.reduce((acc, s) => acc + s.unresolved, 0) > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {errorSummary.reduce((acc, s) => acc + s.unresolved, 0)}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Repositories Tab */}
          <TabsContent value="repos" className="space-y-6">
            {/* Pages */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Frontend Pages
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {pagesRepos.map((repo) => (
                  <RepoCard 
                    key={repo.name} 
                    repo={repo} 
                    expanded={expandedRepos.has(repo.name)}
                    onToggle={() => toggleRepoExpanded(repo.name)}
                    onRefresh={() => fetchRepoData(repo.name)}
                    getStatusIcon={getStatusIcon}
                  />
                ))}
              </div>
            </div>

            {/* Workers */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Server className="h-4 w-4" />
                API Workers
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {workerRepos.map((repo) => (
                  <RepoCard 
                    key={repo.name} 
                    repo={repo} 
                    expanded={expandedRepos.has(repo.name)}
                    onToggle={() => toggleRepoExpanded(repo.name)}
                    onRefresh={() => fetchRepoData(repo.name)}
                    workflows={workflows[repo.name]}
                    onTriggerWorkflow={(wfId, inputs) => triggerWorkflow(repo.name, wfId, inputs)}
                    triggeringWorkflow={triggeringWorkflow}
                    getStatusIcon={getStatusIcon}
                  />
                ))}
              </div>
            </div>

            {/* Bot */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Discord Bot
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {botRepos.map((repo) => (
                  <RepoCard 
                    key={repo.name} 
                    repo={repo} 
                    expanded={expandedRepos.has(repo.name)}
                    onToggle={() => toggleRepoExpanded(repo.name)}
                    onRefresh={() => fetchRepoData(repo.name)}
                    getStatusIcon={getStatusIcon}
                    isBot
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Sesh Calendar Worker */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-purple-400" />
                      Sesh Calendar
                    </CardTitle>
                    {seshWorkerStatus?.configured ? (
                      <Badge variant="outline" className="text-green-400 border-green-400/30">
                        Online
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">
                        Not configured
                      </Badge>
                    )}
                  </div>
                  <CardDescription>Auto-sync events to Google Sheets</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Schedule */}
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Schedule</label>
                    <Select value={selectedSchedule} onValueChange={setSelectedSchedule}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CRON_SCHEDULES.map(s => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {CRON_SCHEDULES.find(s => s.value === selectedSchedule)?.description}
                    </p>
                  </div>

                  {/* Config Status */}
                  {seshWorkerConfig && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded bg-secondary/50 text-xs">
                        <span className="text-muted-foreground block">Service Account</span>
                        <span className={seshWorkerConfig.serviceAccountConfigured ? 'text-green-400' : 'text-red-400'}>
                          {seshWorkerConfig.serviceAccountConfigured ? '✓ Set' : '✗ Missing'}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-secondary/50 text-xs">
                        <span className="text-muted-foreground block">Private Key</span>
                        <span className={seshWorkerConfig.privateKeyConfigured ? 'text-green-400' : 'text-red-400'}>
                          {seshWorkerConfig.privateKeyConfigured ? '✓ Set' : '✗ Missing'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={triggerSeshSync}
                      disabled={seshSyncing || !seshWorkerStatus?.configured}
                      className="flex-1"
                    >
                      {seshSyncing ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Syncing...</>
                      ) : (
                        <><RefreshCw className="h-4 w-4 mr-2" /> Sync Now</>
                      )}
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" asChild>
                          <a 
                            href="https://docs.google.com/spreadsheets/d/1ME5MvznNQy_F9RYIl8tqFTzw-6dSDyv7EX-Ln_Sq7HI"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Open Google Sheet</TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Last Sync Result */}
                  {seshLastSync && (
                    <div className={`p-2 rounded text-xs ${seshLastSync.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {seshLastSync.success 
                        ? `✅ Synced ${seshLastSync.eventsCount} events (${seshLastSync.duration}ms)`
                        : `❌ ${seshLastSync.error}`
                      }
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Widget Heartbeats */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-400" />
                      Widget Heartbeats
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={pingCarrdWidgets}
                      disabled={pingingCarrd}
                    >
                      {pingingCarrd ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Activity className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <CardDescription>Carrd widget status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { key: 'mention-maker', name: 'Mention Maker', icon: '@' },
                    { key: 'event-parser', name: 'Event Parser', icon: '📋' },
                    { key: 'infographic-maker', name: 'Infographic', icon: '🖼️' },
                  ].map(widget => {
                    const hb = heartbeatStatus[widget.key];
                    return (
                      <div key={widget.key} className="flex items-center justify-between p-3 rounded bg-secondary/50">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{widget.icon}</span>
                          <span className="text-sm font-medium">{widget.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {hb?.lastPing 
                              ? new Date(hb.lastPing.replace(' ', 'T') + 'Z').toLocaleString()
                              : 'No data'}
                          </span>
                          <div className={`w-2 h-2 rounded-full ${getHeartbeatColor(hb?.status)}`} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Quick Links */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-primary" />
                    Quick Links
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {[
                      { href: 'https://dash.cloudflare.com', icon: '☁️', label: 'Cloudflare' },
                      { href: 'https://railway.app/dashboard', icon: '🚂', label: 'Railway' },
                      { href: `https://github.com/${GITHUB_ORG}`, icon: '🐙', label: 'GitHub' },
                      { href: `${API_URLS.AUTH}/health`, icon: '💚', label: 'API Health' },
                      { href: 'https://yumes-tools.itai.gg', icon: '🎴', label: 'Carrd Site' },
                      { href: 'https://discord.com/developers/applications', icon: '🎮', label: 'Discord' },
                    ].map(link => (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                      >
                        <span className="text-xl">{link.icon}</span>
                        <span className="text-xs text-muted-foreground">{link.label}</span>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Error Logs Tab */}
          <TabsContent value="errors" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    Error Logs
                    <Badge variant="outline" className="ml-2">
                      {errorSummary.reduce((acc, s) => acc + s.unresolved, 0)} unresolved
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => fetchErrorLogs(1)}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    {errorSummary.some(s => s.count > 0) && (
                      <Button variant="ghost" size="sm" onClick={clearResolvedLogs} className="text-red-400">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Clear Resolved
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-3 items-center">
                  <Select value={errorTypeFilter} onValueChange={setErrorTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      {errorSummary.map(s => (
                        <SelectItem key={s.error_type} value={s.error_type}>
                          {s.error_type} ({s.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="showResolved"
                      checked={showResolvedLogs}
                      onCheckedChange={(checked) => setShowResolvedLogs(!!checked)}
                    />
                    <label htmlFor="showResolved" className="text-sm text-muted-foreground cursor-pointer">
                      Show resolved
                    </label>
                  </div>
                </div>

                {/* Error List */}
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 pr-4">
                    {loadingErrorLogs ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : errorLogs.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-400" />
                        <p>No errors logged 🎉</p>
                      </div>
                    ) : (
                      errorLogs.map(log => (
                        <div
                          key={log.id}
                          className={`rounded-lg border border-border/50 overflow-hidden ${log.resolved ? 'opacity-60' : ''}`}
                        >
                          <div 
                            className="p-3 bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors"
                            onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <ChevronRight className={`h-4 w-4 transition-transform ${expandedLogId === log.id ? 'rotate-90' : ''}`} />
                                <Badge variant={
                                  log.error_type === 'db' ? 'destructive' :
                                  log.error_type === 'auth' ? 'default' :
                                  'secondary'
                                }>
                                  {log.error_type}
                                </Badge>
                                <span className="text-sm font-mono truncate max-w-[200px]">{log.endpoint}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.timestamp + 'Z').toLocaleString()}
                              </span>
                            </div>
                          </div>
                          
                          {expandedLogId === log.id && (
                            <div className="p-3 border-t border-border/50 space-y-3 bg-background/50">
                              <div className="text-red-400 text-sm font-mono break-all">
                                {log.error_message}
                              </div>
                              {log.stack_trace && (
                                <pre className="text-xs text-muted-foreground overflow-x-auto max-h-32 bg-secondary p-2 rounded">
                                  {log.stack_trace}
                                </pre>
                              )}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>IP: {log.ip_address || 'N/A'}</span>
                                {log.user_id && <span>User: {log.user_id}</span>}
                              </div>
                              <Separator />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant={log.resolved ? 'outline' : 'default'}
                                  onClick={(e) => { e.stopPropagation(); markLogResolved(log.id, !log.resolved); }}
                                >
                                  {log.resolved ? 'Mark Unresolved' : 'Mark Resolved'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={(e) => { e.stopPropagation(); deleteLog(log.id); }}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                {/* Pagination */}
                {errorLogsTotal > 20 && (
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-sm text-muted-foreground">
                      Page {errorLogsPage} of {Math.ceil(errorLogsTotal / 20)}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fetchErrorLogs(errorLogsPage - 1)}
                        disabled={errorLogsPage <= 1}
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fetchErrorLogs(errorLogsPage + 1)}
                        disabled={errorLogsPage >= Math.ceil(errorLogsTotal / 20)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Token Clear Button */}
        {tokenSaved && tokenSource === 'local' && (
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={clearToken} className="text-muted-foreground">
              Clear saved GitHub token
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// =============================================================================
// REPO CARD COMPONENT
// =============================================================================

interface RepoCardProps {
  repo: RepoStatus;
  expanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
  workflows?: Workflow[];
  onTriggerWorkflow?: (workflowId: number, inputs?: Record<string, string>) => void;
  triggeringWorkflow?: string | null;
  getStatusIcon: (status: string, conclusion: string | null) => React.ReactNode;
  isBot?: boolean;
}

function RepoCard({ 
  repo, 
  expanded, 
  onToggle, 
  onRefresh, 
  workflows,
  onTriggerWorkflow,
  triggeringWorkflow,
  getStatusIcon,
  isBot
}: RepoCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-primary">
              {repo.icon}
            </div>
            <div>
              <CardTitle className="text-base">{repo.displayName}</CardTitle>
              <CardDescription className="text-xs">{repo.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {repo.url && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <a href={repo.url} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Visit site</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <a href={`https://github.com/y-u-m-e/${repo.name}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>View on GitHub</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {repo.loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : repo.error ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-red-400">{repo.error}</span>
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <>
            {/* Latest Commit */}
            {repo.lastCommit && (
              <div className="p-2 rounded bg-secondary/50 space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <code className="text-primary font-mono text-xs">{repo.lastCommit.sha}</code>
                  <span className="truncate flex-1 text-foreground">{repo.lastCommit.message}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {repo.lastCommit.author} • {repo.lastCommit.date}
                </p>
              </div>
            )}

            {/* Workflows */}
            {repo.workflows && repo.workflows.length > 0 && (
              <div>
                <button 
                  onClick={onToggle}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
                >
                  <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                  Recent workflows ({repo.workflows.length})
                </button>
                {expanded && (
                  <div className="space-y-1">
                    {repo.workflows.slice(0, 3).map((run) => (
                      <a
                        key={run.id}
                        href={run.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 rounded bg-secondary/30 hover:bg-secondary/50 text-xs"
                      >
                        <span className="flex items-center gap-2">
                          {getStatusIcon(run.status, run.conclusion)}
                          <span>{run.name}</span>
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(run.created_at).toLocaleDateString()}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            {repo.type === 'worker' && workflows && workflows.length > 0 && onTriggerWorkflow && (
              <div className="flex gap-2 pt-1">
                {workflows.find(w => w.name.includes('Deploy')) && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        const wf = workflows.find(w => w.name.includes('Deploy'));
                        if (wf) onTriggerWorkflow(wf.id, { environment: 'staging' });
                      }}
                      disabled={triggeringWorkflow !== null}
                    >
                      <Play className="h-3 w-3 mr-1" /> Staging
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        const wf = workflows.find(w => w.name.includes('Deploy'));
                        if (wf) onTriggerWorkflow(wf.id, { environment: 'production' });
                      }}
                      disabled={triggeringWorkflow !== null}
                    >
                      <Rocket className="h-3 w-3 mr-1" /> Production
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Pages auto-deploy note */}
            {repo.type === 'pages' && (
              <p className="text-xs text-muted-foreground italic">
                Auto-deploys on push via Cloudflare Pages
              </p>
            )}

            {/* Bot specific */}
            {isBot && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400">🚂</span>
                    <span className="text-sm">Railway</span>
                  </div>
                  <Badge variant="outline" className="text-purple-400 border-purple-400/30">
                    Auto-deploy
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {['/ping', '/leaderboard', '/lookup', '/tileevent', '/record', '/help'].map(cmd => (
                    <Badge key={cmd} variant="secondary" className="font-mono text-xs">
                      {cmd}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

