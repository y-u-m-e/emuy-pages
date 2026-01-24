/**
 * Monday.com Kanban Board Widget
 * 
 * Supports three modes:
 * 1. embed - Shows an iframe with Monday's shareable view
 * 2. api - Fetches data via Monday API (requires API token)
 * 3. link - Shows a card with a link to open Monday.com
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ExternalLink, 
  RefreshCw, 
  Loader2, 
  CheckCircle2, 
  Circle, 
  Clock,
  AlertCircle,
  LayoutGrid,
  Maximize2,
  Minimize2
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface MondayItem {
  id: string;
  name: string;
  column_values: {
    id: string;
    text: string;
    value?: string;
  }[];
}

interface MondayGroup {
  id: string;
  title: string;
  color: string;
  items: MondayItem[];
}

interface MondayBoard {
  id: string;
  name: string;
  groups: MondayGroup[];
}

interface MondayKanbanProps {
  mode: 'embed' | 'api' | 'link';
  // For embed mode
  embedUrl?: string;
  // For API mode
  apiToken?: string;
  boardId?: string;
  // For link mode
  boardUrl?: string;
  // Common
  title?: string;
  description?: string;
  className?: string;
  height?: number;
}

// =============================================================================
// STATUS HELPERS
// =============================================================================

const getStatusIcon = (status: string) => {
  const lower = status.toLowerCase();
  if (lower.includes('done') || lower.includes('complete')) {
    return <CheckCircle2 className="h-3 w-3 text-green-500" />;
  }
  if (lower.includes('progress') || lower.includes('working')) {
    return <Clock className="h-3 w-3 text-blue-500" />;
  }
  if (lower.includes('stuck') || lower.includes('blocked')) {
    return <AlertCircle className="h-3 w-3 text-red-500" />;
  }
  return <Circle className="h-3 w-3 text-muted-foreground" />;
};

const getStatusColor = (status: string) => {
  const lower = status.toLowerCase();
  if (lower.includes('done') || lower.includes('complete')) return 'bg-green-500/10 text-green-500 border-green-500/30';
  if (lower.includes('progress') || lower.includes('working')) return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
  if (lower.includes('stuck') || lower.includes('blocked')) return 'bg-red-500/10 text-red-500 border-red-500/30';
  if (lower.includes('review')) return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
  return 'bg-muted text-muted-foreground';
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function MondayKanban({
  mode,
  embedUrl,
  apiToken,
  boardId,
  boardUrl,
  title = 'Project Tasks',
  description = 'Monday.com Kanban Board',
  className = '',
  height = 400,
}: MondayKanbanProps) {
  const [board, setBoard] = useState<MondayBoard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // ==========================================================================
  // API MODE - Fetch board data
  // ==========================================================================

  const fetchBoardData = async () => {
    if (mode !== 'api' || !apiToken || !boardId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const query = `
        query {
          boards(ids: [${boardId}]) {
            id
            name
            groups {
              id
              title
              color
            }
            items_page(limit: 50) {
              items {
                id
                name
                group {
                  id
                }
                column_values {
                  id
                  text
                  value
                }
              }
            }
          }
        }
      `;

      const response = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiToken,
          'API-Version': '2024-01',
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(data.errors[0]?.message || 'API Error');
      }

      const boardData = data.data?.boards?.[0];
      if (!boardData) {
        throw new Error('Board not found');
      }

      // Organize items by group
      const groupsMap = new Map<string, MondayGroup>();
      boardData.groups.forEach((g: { id: string; title: string; color: string }) => {
        groupsMap.set(g.id, { ...g, items: [] });
      });

      boardData.items_page.items.forEach((item: MondayItem & { group: { id: string } }) => {
        const group = groupsMap.get(item.group.id);
        if (group) {
          group.items.push(item);
        }
      });

      setBoard({
        id: boardData.id,
        name: boardData.name,
        groups: Array.from(groupsMap.values()),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch board');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'api') {
      fetchBoardData();
    }
  }, [mode, apiToken, boardId]);

  // ==========================================================================
  // RENDER - EMBED MODE
  // ==========================================================================

  if (mode === 'embed') {
    if (!embedUrl) {
      return (
        <Card className={className}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LayoutGrid className="h-5 w-5 text-primary" />
              {title}
            </CardTitle>
            <CardDescription>No embed URL configured</CardDescription>
          </CardHeader>
        </Card>
      );
    }

    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <LayoutGrid className="h-5 w-5 text-primary" />
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={boardUrl || embedUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Monday
                </a>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <iframe
            src={embedUrl}
            width="100%"
            height={expanded ? 600 : height}
            style={{ border: 'none', borderRadius: '0 0 0.5rem 0.5rem' }}
            title="Monday.com Board"
          />
        </CardContent>
      </Card>
    );
  }

  // ==========================================================================
  // RENDER - API MODE
  // ==========================================================================

  if (mode === 'api') {
    if (!apiToken || !boardId) {
      return (
        <Card className={className}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LayoutGrid className="h-5 w-5 text-primary" />
              {title}
            </CardTitle>
            <CardDescription>API token or board ID not configured</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              To use API mode, you need to configure a Monday.com API token and board ID.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <LayoutGrid className="h-5 w-5 text-primary" />
                {board?.name || title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBoardData}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              {boardUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={boardUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && !board ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={fetchBoardData}>
                Retry
              </Button>
            </div>
          ) : board ? (
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {board.groups.map((group) => (
                  <div key={group.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                      <h4 className="font-medium text-sm">{group.title}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {group.items.length}
                      </Badge>
                    </div>
                    <div className="space-y-2 pl-4">
                      {group.items.slice(0, 5).map((item) => {
                        const status = item.column_values.find(
                          (cv) => cv.id === 'status' || cv.id.includes('status')
                        )?.text || '';
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {getStatusIcon(status)}
                              <span className="text-sm truncate">{item.name}</span>
                            </div>
                            {status && (
                              <Badge variant="outline" className={`text-xs ${getStatusColor(status)}`}>
                                {status}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                      {group.items.length > 5 && (
                        <p className="text-xs text-muted-foreground pl-2">
                          +{group.items.length - 5} more items
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  // ==========================================================================
  // RENDER - LINK MODE (Default)
  // ==========================================================================

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <LayoutGrid className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
            <LayoutGrid className="h-8 w-8 text-white" />
          </div>
          <h3 className="font-semibold mb-2">Monday.com Kanban</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs">
            View and manage your project tasks in Monday.com
          </p>
          {boardUrl ? (
            <Button asChild>
              <a href={boardUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Board
              </a>
            </Button>
          ) : (
            <Button variant="outline" disabled>
              No board URL configured
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

