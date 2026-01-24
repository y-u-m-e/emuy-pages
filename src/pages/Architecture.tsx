/**
 * =============================================================================
 * ARCHITECTURE PAGE - System Architecture with React Flow
 * =============================================================================
 * 
 * Interactive React Flow diagrams showing the new microservices architecture.
 * Updated for the split API workers and multi-repo frontend structure.
 * 
 * @module Architecture
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  Handle,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// =============================================================================
// NODE DETAILS DATABASE - Updated for Microservices Architecture
// =============================================================================

interface NodeDetails {
  title: string;
  description: string;
  tech?: string[];
  url?: string;
  features?: string[];
  status?: 'active' | 'development' | 'planned';
}

const nodeDetailsMap: Record<string, NodeDetails> = {
  // Users
  'discord': {
    title: 'Discord Server',
    description: 'The Iron Forged Discord server where clan members interact with the bot.',
    tech: ['Discord', 'Slash Commands', 'Webhooks'],
    status: 'active',
  },
  'browser': {
    title: 'Web Browser',
    description: 'Users access the web applications through any modern browser.',
    tech: ['Chrome', 'Firefox', 'Safari', 'Edge'],
    status: 'active',
  },

  // Frontend Pages (Multi-repo)
  'emuy-pages': {
    title: 'emuy-pages',
    description: 'Main dashboard and admin tools hosted on Cloudflare Pages.',
    tech: ['React 18', 'TypeScript', 'Vite', 'Tailwind CSS', 'shadcn/ui'],
    url: 'https://emuy.gg',
    features: ['Dashboard', 'Cruddy Panel', 'Admin Panel', 'DevOps', 'Profile'],
    status: 'active',
  },
  'ironforged-pages': {
    title: 'ironforged-pages',
    description: 'Dedicated tile events portal for Iron Forged clan.',
    tech: ['React 18', 'TypeScript', 'Vite', 'Tailwind CSS'],
    url: 'https://ironforged.gg',
    features: ['Tile Events', 'Screenshot Submissions', 'Progress Tracking'],
    status: 'development',
  },
  'bingo-pages': {
    title: 'bingo-pages',
    description: 'Bingo competition tracker with RuneLite plugin integration.',
    tech: ['React 18', 'TypeScript', 'Vite', 'Tailwind CSS'],
    url: 'https://bingo.emuy.gg',
    features: ['Bingo Boards', 'Achievement Tracking', 'RuneLite Integration'],
    status: 'development',
  },
  'docs-pages': {
    title: 'docs-pages',
    description: 'Documentation site using Docsify.',
    tech: ['Docsify', 'Markdown'],
    url: 'https://docs.emuy.gg',
    features: ['API Reference', 'Quick Start Guides', 'Integration Details'],
    status: 'development',
  },

  // API Workers (Microservices)
  'auth-api': {
    title: 'auth-api',
    description: 'Central authentication service handling Discord OAuth2, sessions, and RBAC.',
    tech: ['Cloudflare Workers', 'D1 Database', 'JWT'],
    url: 'https://auth.api.emuy.gg',
    features: ['Discord OAuth2', 'Session Management', 'Role-Based Access Control', 'User Management'],
    status: 'active',
  },
  'attendance-api': {
    title: 'attendance-api',
    description: 'Attendance tracking and leaderboard service.',
    tech: ['Cloudflare Workers', 'D1 Database'],
    url: 'https://attendance.api.emuy.gg',
    features: ['Event Records', 'Leaderboards', 'Batch Operations', 'Stats'],
    status: 'active',
  },
  'events-api': {
    title: 'events-api',
    description: 'Tile events management with screenshot OCR verification.',
    tech: ['Cloudflare Workers', 'D1 Database', 'R2 Storage', 'Workers AI'],
    url: 'https://events.api.emuy.gg',
    features: ['Tile Events', 'Screenshot Upload', 'OCR Verification', 'Progress Tracking'],
    status: 'active',
  },
  'bingo-api': {
    title: 'bingo-api',
    description: 'Bingo event management and RuneLite plugin backend.',
    tech: ['Cloudflare Workers', 'D1 Database'],
    url: 'https://bingo.api.emuy.gg',
    features: ['Bingo Boards', 'Achievement Tracking', 'Plugin Webhooks'],
    status: 'development',
  },

  // Discord Bot
  'yume-bot': {
    title: 'yume-bot',
    description: 'Discord bot providing slash commands for clan interactions.',
    tech: ['Node.js 20', 'Discord.js v14', 'Railway'],
    features: ['/leaderboard', '/lookup', '/record', '/ping'],
    status: 'active',
  },

  // Sesh Worker
  'sesh-worker': {
    title: 'sesh-calendar-worker',
    description: 'Cron worker that syncs Discord events to Google Sheets.',
    tech: ['Cloudflare Workers', 'Google Sheets API'],
    features: ['Event Sync', 'Auto-scheduling', 'Google Sheets Integration'],
    status: 'active',
  },

  // Databases
  'auth-db': {
    title: 'auth-db (D1)',
    description: 'Stores users, sessions, roles, permissions, and activity logs.',
    tech: ['Cloudflare D1', 'SQLite'],
    status: 'active',
  },
  'attendance-db': {
    title: 'attendance-db (D1)',
    description: 'Stores attendance records and event data.',
    tech: ['Cloudflare D1', 'SQLite'],
    status: 'active',
  },
  'events-db': {
    title: 'events-db (D1)',
    description: 'Stores tile events, participants, and submissions.',
    tech: ['Cloudflare D1', 'SQLite'],
    status: 'active',
  },
  'bingo-db': {
    title: 'bingo-db (D1)',
    description: 'Stores bingo boards, tiles, and completions.',
    tech: ['Cloudflare D1', 'SQLite'],
    status: 'development',
  },

  // Storage
  'r2': {
    title: 'Cloudflare R2',
    description: 'Object storage for screenshots and images.',
    tech: ['Cloudflare R2', 'S3-compatible'],
    status: 'active',
  },

  // External Services
  'discord-api': {
    title: 'Discord API',
    description: 'Official Discord API for OAuth2 and bot operations.',
    tech: ['Discord API v10', 'OAuth2'],
    status: 'active',
  },
  'gsheets': {
    title: 'Google Sheets',
    description: 'Calendar sync and data export.',
    tech: ['Google Sheets API'],
    status: 'active',
  },
  'sesh': {
    title: 'Sesh Calendar',
    description: 'Discord calendar bot for event fetching.',
    tech: ['Sesh API'],
    url: 'https://sesh.fyi',
    status: 'active',
  },
  'runelite': {
    title: 'RuneLite Plugin',
    description: 'Custom RuneLite plugin for automatic bingo tracking.',
    tech: ['Java', 'RuneLite API'],
    features: ['Drop Tracking', 'Achievement Detection', 'KC Monitoring'],
    status: 'planned',
  },
};

// =============================================================================
// CUSTOM NODE COMPONENTS
// =============================================================================

interface CustomNodeData {
  label: string;
  sublabel?: string;
  icon?: string;
}

function StyledNode({ 
  data, 
  bgColor = 'bg-card',
  borderColor = 'border-border',
  textColor = 'text-foreground',
  iconBg = 'bg-muted'
}: { 
  data: CustomNodeData; 
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
  iconBg?: string;
}) {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 ${bgColor} ${borderColor} shadow-lg min-w-[140px] cursor-pointer hover:scale-105 hover:shadow-xl transition-all duration-200 group`}>
      <Handle type="target" position={Position.Top} className="!bg-primary !w-2 !h-2" />
      <div className="flex items-center gap-3">
        {data.icon && (
          <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center text-lg`}>
            {data.icon}
          </div>
        )}
        <div>
          <div className={`font-semibold text-sm ${textColor}`}>{data.label}</div>
          {data.sublabel && (
            <div className="text-xs text-muted-foreground">{data.sublabel}</div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2 !h-2" />
    </div>
  );
}

function FrontendNode({ data }: { data: CustomNodeData }) {
  return (
    <StyledNode 
      data={data} 
      bgColor="bg-emerald-500/20" 
      borderColor="border-emerald-500" 
      textColor="text-emerald-300"
      iconBg="bg-emerald-500/30"
    />
  );
}

function BackendNode({ data }: { data: CustomNodeData }) {
  return (
    <StyledNode 
      data={data} 
      bgColor="bg-orange-500/20" 
      borderColor="border-orange-500" 
      textColor="text-orange-300"
      iconBg="bg-orange-500/30"
    />
  );
}

function DatabaseNode({ data }: { data: CustomNodeData }) {
  return (
    <div className="px-4 py-3 rounded-xl border-2 bg-cyan-500/20 border-cyan-500 shadow-lg min-w-[120px] cursor-pointer hover:scale-105 hover:shadow-xl transition-all duration-200">
      <Handle type="target" position={Position.Top} className="!bg-cyan-400 !w-2 !h-2" />
      <div className="flex items-center gap-3">
        {data.icon && (
          <div className="w-8 h-8 rounded-lg bg-cyan-500/30 flex items-center justify-center text-lg">
            {data.icon}
          </div>
        )}
        <div>
          <div className="font-semibold text-sm text-cyan-300">{data.label}</div>
          {data.sublabel && (
            <div className="text-xs text-cyan-500/70">{data.sublabel}</div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-400 !w-2 !h-2" />
    </div>
  );
}

function ExternalNode({ data }: { data: CustomNodeData }) {
  return (
    <StyledNode 
      data={data} 
      bgColor="bg-purple-500/20" 
      borderColor="border-purple-500" 
      textColor="text-purple-300"
      iconBg="bg-purple-500/30"
    />
  );
}

function UserNode({ data }: { data: CustomNodeData }) {
  return (
    <StyledNode 
      data={data} 
      bgColor="bg-blue-500/20" 
      borderColor="border-blue-500" 
      textColor="text-blue-300"
      iconBg="bg-blue-500/30"
    />
  );
}

function StepNode({ data }: { data: CustomNodeData }) {
  return (
    <div className="px-3 py-2 rounded-lg border bg-card border-border shadow-md min-w-[100px] cursor-pointer hover:scale-105 hover:shadow-lg transition-all duration-200">
      <Handle type="target" position={Position.Left} className="!bg-primary !w-2 !h-2" />
      <div className="text-xs text-foreground text-center">{data.label}</div>
      <Handle type="source" position={Position.Right} className="!bg-primary !w-2 !h-2" />
    </div>
  );
}

function SuccessNode({ data }: { data: CustomNodeData }) {
  return (
    <div className="px-4 py-3 rounded-xl border-2 bg-green-500/20 border-green-500 shadow-lg cursor-pointer hover:scale-105 hover:shadow-xl transition-all duration-200">
      <Handle type="target" position={Position.Top} className="!bg-green-500 !w-2 !h-2" />
      <div className="flex items-center gap-2">
        <span className="text-lg">✅</span>
        <div className="font-semibold text-sm text-green-400">{data.label}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = {
  frontend: FrontendNode,
  backend: BackendNode,
  database: DatabaseNode,
  external: ExternalNode,
  user: UserNode,
  step: StepNode,
  success: SuccessNode,
  default: StyledNode,
};

// =============================================================================
// DIAGRAM DEFINITIONS - Updated for Microservices
// =============================================================================

// System Overview - Microservices Architecture
const systemOverviewNodes: Node[] = [
  // Users (Row 1)
  { id: 'discord', type: 'user', position: { x: 50, y: 0 }, data: { label: 'Discord', sublabel: 'Users', icon: '💬' } },
  { id: 'browser', type: 'user', position: { x: 750, y: 0 }, data: { label: 'Browser', sublabel: 'Web App', icon: '🌐' } },
  
  // Frontend Pages (Row 2 - Multi-repo)
  { id: 'emuy-pages', type: 'frontend', position: { x: 400, y: 120 }, data: { label: 'emuy-pages', sublabel: 'emuy.gg', icon: '⚛️' } },
  { id: 'ironforged-pages', type: 'frontend', position: { x: 620, y: 120 }, data: { label: 'ironforged', sublabel: 'ironforged.gg', icon: '⚔️' } },
  { id: 'bingo-pages', type: 'frontend', position: { x: 840, y: 120 }, data: { label: 'bingo', sublabel: 'bingo.emuy.gg', icon: '🎲' } },
  { id: 'docs-pages', type: 'frontend', position: { x: 1060, y: 120 }, data: { label: 'docs', sublabel: 'docs.emuy.gg', icon: '📚' } },
  
  // Discord Bot (Left side)
  { id: 'yume-bot', type: 'backend', position: { x: 50, y: 200 }, data: { label: 'yume-bot', sublabel: 'Railway', icon: '🤖' } },
  
  // API Workers (Row 3 - Microservices)
  { id: 'auth-api', type: 'backend', position: { x: 300, y: 280 }, data: { label: 'auth-api', sublabel: 'auth.api.emuy.gg', icon: '🔐' } },
  { id: 'attendance-api', type: 'backend', position: { x: 540, y: 280 }, data: { label: 'attendance-api', sublabel: 'attendance.api', icon: '📋' } },
  { id: 'events-api', type: 'backend', position: { x: 780, y: 280 }, data: { label: 'events-api', sublabel: 'events.api', icon: '🎮' } },
  { id: 'bingo-api', type: 'backend', position: { x: 1020, y: 280 }, data: { label: 'bingo-api', sublabel: 'bingo.api', icon: '🎯' } },
  
  // Sesh Worker (Left side)
  { id: 'sesh-worker', type: 'backend', position: { x: 50, y: 400 }, data: { label: 'sesh-worker', sublabel: 'Cron Job', icon: '📅' } },
  
  // Databases (Row 4)
  { id: 'auth-db', type: 'database', position: { x: 300, y: 440 }, data: { label: 'auth-db', icon: '💾' } },
  { id: 'attendance-db', type: 'database', position: { x: 540, y: 440 }, data: { label: 'attendance-db', icon: '💾' } },
  { id: 'events-db', type: 'database', position: { x: 780, y: 440 }, data: { label: 'events-db', icon: '💾' } },
  { id: 'bingo-db', type: 'database', position: { x: 1020, y: 440 }, data: { label: 'bingo-db', icon: '💾' } },
  
  // Storage & External (Row 5)
  { id: 'r2', type: 'database', position: { x: 880, y: 560 }, data: { label: 'R2 Storage', sublabel: 'Images', icon: '🖼️' } },
  { id: 'discord-api', type: 'external', position: { x: 50, y: 560 }, data: { label: 'Discord API', icon: '🔗' } },
  { id: 'gsheets', type: 'external', position: { x: 250, y: 560 }, data: { label: 'Google Sheets', icon: '📊' } },
  { id: 'sesh', type: 'external', position: { x: 50, y: 500 }, data: { label: 'Sesh API', icon: '📅' } },
  { id: 'runelite', type: 'external', position: { x: 1120, y: 380 }, data: { label: 'RuneLite Plugin', sublabel: 'Planned', icon: '🎮' } },
];

const systemOverviewEdges: Edge[] = [
  // Browser to pages
  { id: 'e1', source: 'browser', target: 'emuy-pages', animated: true, style: { stroke: '#10b981' } },
  { id: 'e2', source: 'browser', target: 'ironforged-pages', animated: true, style: { stroke: '#10b981' } },
  { id: 'e3', source: 'browser', target: 'bingo-pages', animated: true, style: { stroke: '#10b981' } },
  { id: 'e4', source: 'browser', target: 'docs-pages', style: { stroke: '#10b981' } },
  
  // Discord to bot
  { id: 'e5', source: 'discord', target: 'yume-bot', animated: true, style: { stroke: '#5865F2' } },
  
  // Pages to APIs
  { id: 'e6', source: 'emuy-pages', target: 'auth-api', animated: true, style: { stroke: '#f38020' } },
  { id: 'e7', source: 'emuy-pages', target: 'attendance-api', animated: true, style: { stroke: '#f38020' } },
  { id: 'e8', source: 'ironforged-pages', target: 'auth-api', style: { stroke: '#f38020' } },
  { id: 'e9', source: 'ironforged-pages', target: 'events-api', animated: true, style: { stroke: '#f38020' } },
  { id: 'e10', source: 'bingo-pages', target: 'auth-api', style: { stroke: '#f38020' } },
  { id: 'e11', source: 'bingo-pages', target: 'bingo-api', animated: true, style: { stroke: '#f38020' } },
  
  // Bot to APIs
  { id: 'e12', source: 'yume-bot', target: 'auth-api', style: { stroke: '#f38020' } },
  { id: 'e13', source: 'yume-bot', target: 'attendance-api', animated: true, style: { stroke: '#f38020' } },
  { id: 'e14', source: 'yume-bot', target: 'discord-api', style: { stroke: '#5865F2' } },
  
  // APIs to databases
  { id: 'e15', source: 'auth-api', target: 'auth-db', animated: true, style: { stroke: '#22d3ee' } },
  { id: 'e16', source: 'attendance-api', target: 'attendance-db', animated: true, style: { stroke: '#22d3ee' } },
  { id: 'e17', source: 'events-api', target: 'events-db', animated: true, style: { stroke: '#22d3ee' } },
  { id: 'e18', source: 'bingo-api', target: 'bingo-db', animated: true, style: { stroke: '#22d3ee' } },
  
  // Events API to R2
  { id: 'e19', source: 'events-api', target: 'r2', style: { stroke: '#22d3ee' } },
  
  // Auth to Discord
  { id: 'e20', source: 'auth-api', target: 'discord-api', style: { stroke: '#5865F2' } },
  
  // Sesh worker
  { id: 'e21', source: 'sesh-worker', target: 'sesh', style: { stroke: '#9747FF' } },
  { id: 'e22', source: 'sesh-worker', target: 'gsheets', style: { stroke: '#9747FF' } },
  
  // RuneLite to bingo
  { id: 'e23', source: 'runelite', target: 'bingo-api', style: { stroke: '#9747FF', strokeDasharray: '5,5' } },
];

// Auth Flow Diagram
const authFlowNodes: Node[] = [
  { id: 'a1', type: 'step', position: { x: 0, y: 100 }, data: { label: 'Click Login' } },
  { id: 'a2', type: 'step', position: { x: 180, y: 100 }, data: { label: 'Redirect to Discord' } },
  { id: 'a3', type: 'step', position: { x: 400, y: 100 }, data: { label: 'User Authorizes' } },
  { id: 'a4', type: 'step', position: { x: 600, y: 100 }, data: { label: 'Callback to auth-api' } },
  { id: 'a5', type: 'step', position: { x: 820, y: 100 }, data: { label: 'Create JWT + Session' } },
  { id: 'a6', type: 'success', position: { x: 1040, y: 93 }, data: { label: 'Logged In!' } },
];

const authFlowEdges: Edge[] = [
  { id: 'ae1', source: 'a1', target: 'a2', animated: true, style: { stroke: '#10b981' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' } },
  { id: 'ae2', source: 'a2', target: 'a3', animated: true, style: { stroke: '#5865F2' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#5865F2' } },
  { id: 'ae3', source: 'a3', target: 'a4', animated: true, style: { stroke: '#5865F2' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#5865F2' } },
  { id: 'ae4', source: 'a4', target: 'a5', animated: true, style: { stroke: '#f38020' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#f38020' } },
  { id: 'ae5', source: 'a5', target: 'a6', animated: true, style: { stroke: '#22c55e' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' } },
];

// Deployment Pipeline
const deploymentNodes: Node[] = [
  { id: 'd-code', type: 'user', position: { x: 400, y: 0 }, data: { label: 'Write Code', icon: '💻' } },
  { id: 'd-commit', type: 'step', position: { x: 400, y: 100 }, data: { label: 'Git Commit' } },
  { id: 'd-push', type: 'step', position: { x: 400, y: 180 }, data: { label: 'Git Push' } },
  
  // Branches
  { id: 'd-dev', type: 'external', position: { x: 150, y: 280 }, data: { label: 'dev branch', sublabel: 'Staging', icon: '🔧' } },
  { id: 'd-main', type: 'external', position: { x: 650, y: 280 }, data: { label: 'main branch', sublabel: 'Production', icon: '🚀' } },
  
  // Pages Deployments (staging)
  { id: 'd-pages-dev', type: 'backend', position: { x: 50, y: 400 }, data: { label: 'Pages Preview', sublabel: 'dev.*.pages.dev', icon: '☁️' } },
  
  // Pages Deployments (prod)
  { id: 'd-emuy', type: 'success', position: { x: 400, y: 400 }, data: { label: 'emuy.gg' } },
  { id: 'd-ironforged', type: 'success', position: { x: 580, y: 400 }, data: { label: 'ironforged.gg' } },
  { id: 'd-bingo', type: 'success', position: { x: 760, y: 400 }, data: { label: 'bingo.emuy.gg' } },
  { id: 'd-docs', type: 'success', position: { x: 940, y: 400 }, data: { label: 'docs.emuy.gg' } },
  
  // Workers
  { id: 'd-workers', type: 'backend', position: { x: 750, y: 500 }, data: { label: 'Wrangler Deploy', sublabel: 'API Workers', icon: '⚡' } },
  { id: 'd-railway', type: 'external', position: { x: 1000, y: 280 }, data: { label: 'Railway', sublabel: 'yume-bot', icon: '🚂' } },
];

const deploymentEdges: Edge[] = [
  { id: 'de1', source: 'd-code', target: 'd-commit', animated: true, style: { stroke: '#666' } },
  { id: 'de2', source: 'd-commit', target: 'd-push', animated: true, style: { stroke: '#666' } },
  { id: 'de3', source: 'd-push', target: 'd-dev', animated: true, style: { stroke: '#f59e0b' } },
  { id: 'de4', source: 'd-push', target: 'd-main', animated: true, style: { stroke: '#22c55e' } },
  { id: 'de5', source: 'd-dev', target: 'd-pages-dev', animated: true, style: { stroke: '#f59e0b' } },
  { id: 'de6', source: 'd-main', target: 'd-emuy', animated: true, style: { stroke: '#22c55e' } },
  { id: 'de7', source: 'd-main', target: 'd-ironforged', animated: true, style: { stroke: '#22c55e' } },
  { id: 'de8', source: 'd-main', target: 'd-bingo', animated: true, style: { stroke: '#22c55e' } },
  { id: 'de9', source: 'd-main', target: 'd-docs', animated: true, style: { stroke: '#22c55e' } },
  { id: 'de10', source: 'd-main', target: 'd-workers', animated: true, style: { stroke: '#f38020' } },
  { id: 'de11', source: 'd-main', target: 'd-railway', animated: true, style: { stroke: '#9747FF' } },
];

// Bingo Flow (planned)
const bingoFlowNodes: Node[] = [
  { id: 'b-player', type: 'user', position: { x: 50, y: 50 }, data: { label: 'OSRS Player', icon: '🎮' } },
  { id: 'b-runelite', type: 'external', position: { x: 50, y: 180 }, data: { label: 'RuneLite Plugin', sublabel: 'Java', icon: '📱' } },
  { id: 'b-detect', type: 'step', position: { x: 280, y: 180 }, data: { label: 'Detect Achievement' } },
  { id: 'b-webhook', type: 'step', position: { x: 500, y: 180 }, data: { label: 'Send to API' } },
  { id: 'b-api', type: 'backend', position: { x: 720, y: 170 }, data: { label: 'bingo-api', icon: '⚡' } },
  { id: 'b-verify', type: 'step', position: { x: 940, y: 180 }, data: { label: 'Verify & Record' } },
  { id: 'b-db', type: 'database', position: { x: 720, y: 320 }, data: { label: 'bingo-db', icon: '💾' } },
  { id: 'b-discord', type: 'external', position: { x: 940, y: 320 }, data: { label: 'Discord Webhook', icon: '📢' } },
  { id: 'b-site', type: 'frontend', position: { x: 500, y: 320 }, data: { label: 'bingo-pages', sublabel: 'Live Board', icon: '⚛️' } },
  { id: 'b-complete', type: 'success', position: { x: 720, y: 450 }, data: { label: 'Tile Complete!' } },
];

const bingoFlowEdges: Edge[] = [
  { id: 'be1', source: 'b-player', target: 'b-runelite', animated: true, style: { stroke: '#3b82f6' } },
  { id: 'be2', source: 'b-runelite', target: 'b-detect', animated: true, style: { stroke: '#9747FF' } },
  { id: 'be3', source: 'b-detect', target: 'b-webhook', animated: true, style: { stroke: '#f38020' } },
  { id: 'be4', source: 'b-webhook', target: 'b-api', animated: true, style: { stroke: '#f38020' } },
  { id: 'be5', source: 'b-api', target: 'b-verify', animated: true, style: { stroke: '#f38020' } },
  { id: 'be6', source: 'b-api', target: 'b-db', animated: true, style: { stroke: '#22d3ee' } },
  { id: 'be7', source: 'b-api', target: 'b-discord', style: { stroke: '#5865F2' } },
  { id: 'be8', source: 'b-api', target: 'b-site', style: { stroke: '#10b981' } },
  { id: 'be9', source: 'b-verify', target: 'b-complete', animated: true, style: { stroke: '#22c55e' } },
];

// =============================================================================
// DIAGRAM CONFIGURATION
// =============================================================================

const diagrams = {
  systemOverview: {
    title: '🏗️ System Overview',
    description: 'High-level view of the microservices architecture - multi-repo frontends and split API workers.',
    nodes: systemOverviewNodes,
    edges: systemOverviewEdges,
    defaultZoom: 0.6,
  },
  authFlow: {
    title: '🔐 Authentication Flow',
    description: 'How users authenticate via Discord OAuth2 through the central auth-api.',
    nodes: authFlowNodes,
    edges: authFlowEdges,
    defaultZoom: 0.8,
  },
  deployment: {
    title: '🚀 Deployment Pipeline',
    description: 'Git-based deployments with dev (staging) and main (production) branches.',
    nodes: deploymentNodes,
    edges: deploymentEdges,
    defaultZoom: 0.7,
  },
  bingoFlow: {
    title: '🎲 Bingo System (Planned)',
    description: 'How the RuneLite plugin will track achievements and update the bingo board.',
    nodes: bingoFlowNodes,
    edges: bingoFlowEdges,
    defaultZoom: 0.7,
  },
};

type DiagramKey = keyof typeof diagrams;

// =============================================================================
// NODE DETAILS MODAL
// =============================================================================

function NodeDetailsModal({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const details = nodeDetailsMap[nodeId];
  if (!details) return null;

  const statusColors = {
    active: 'bg-green-500/20 text-green-400 border-green-500',
    development: 'bg-amber-500/20 text-amber-400 border-amber-500',
    planned: 'bg-gray-500/20 text-gray-400 border-gray-500',
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold">{details.title}</h3>
            {details.status && (
              <span className={`inline-block mt-2 px-2 py-0.5 text-xs rounded-full border ${statusColors[details.status]}`}>
                {details.status === 'active' ? '✅ Active' : details.status === 'development' ? '🚧 In Development' : '📋 Planned'}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-muted-foreground text-sm mb-4">{details.description}</p>

        {details.tech && details.tech.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Technologies</h4>
            <div className="flex flex-wrap gap-2">
              {details.tech.map((t) => (
                <Badge key={t} variant="secondary">{t}</Badge>
              ))}
            </div>
          </div>
        )}

        {details.features && details.features.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Features</h4>
            <ul className="space-y-1">
              {details.features.map((f) => (
                <li key={f} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="text-primary">•</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {details.url && (
          <a href={details.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            {details.url}
          </a>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// REACT FLOW WRAPPER
// =============================================================================

function DiagramView({ nodes: initialNodes, edges: initialEdges, defaultZoom = 1, onNodeClick }: {
  nodes: Node[];
  edges: Edge[];
  defaultZoom?: number;
  onNodeClick?: (nodeId: string) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (onNodeClick && nodeDetailsMap[node.id]) {
      onNodeClick(node.id);
    }
  }, [onNodeClick]);

  return (
    <div className="h-[600px] bg-background rounded-xl overflow-hidden border border-border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: defaultZoom }}
        minZoom={0.3}
        maxZoom={2}
        defaultEdgeOptions={{ type: 'smoothstep', style: { strokeWidth: 2 } }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#333" gap={20} />
        <Controls className="!bg-card !border-border !rounded-lg [&>button]:!bg-muted [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-primary [&>button:hover]:!text-primary-foreground" />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'frontend': return '#10b981';
              case 'backend': return '#f38020';
              case 'database': return '#22d3ee';
              case 'external': return '#9747FF';
              case 'user': return '#3b82f6';
              case 'success': return '#22c55e';
              default: return '#666';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.7)"
          className="!bg-card !border-border !rounded-lg"
        />
      </ReactFlow>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function Architecture() {
  const { user, loading, hasPermission, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeDiagram, setActiveDiagram] = useState<DiagramKey>('systemOverview');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const canViewArchitecture = isAdmin || hasPermission('view_devops');

  useEffect(() => {
    if (!loading && (!user || !canViewArchitecture)) {
      navigate('/');
    }
  }, [user, loading, canViewArchitecture, navigate]);

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNode(nodeId);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedNode(null);
  }, []);

  if (loading || !user || !canViewArchitecture) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentDiagram = diagrams[activeDiagram];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">🗺️ Architecture</h1>
        <p className="text-muted-foreground">
          Interactive diagrams of the microservices architecture.
          <span className="text-muted-foreground/70 ml-2">Click nodes for details • Drag to move • Scroll to zoom</span>
        </p>
      </div>

      {/* Diagram Selector */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(diagrams) as DiagramKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setActiveDiagram(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeDiagram === key
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border hover:border-primary/50'
            }`}
          >
            {diagrams[key].title}
          </button>
        ))}
      </div>

      {/* Active Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>{currentDiagram.title}</CardTitle>
          <CardDescription>{currentDiagram.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <DiagramView
            nodes={currentDiagram.nodes}
            edges={currentDiagram.edges}
            defaultZoom={currentDiagram.defaultZoom}
            onNodeClick={handleNodeClick}
          />
        </CardContent>
      </Card>

      {/* Node Details Modal */}
      {selectedNode && <NodeDetailsModal nodeId={selectedNode} onClose={handleCloseModal} />}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📖 Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-emerald-500"></div>
              <span className="text-sm text-muted-foreground">Frontend</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-500"></div>
              <span className="text-sm text-muted-foreground">Backend/API</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-cyan-500"></div>
              <span className="text-sm text-muted-foreground">Database</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-500"></div>
              <span className="text-sm text-muted-foreground">External Service</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span className="text-sm text-muted-foreground">User/Input</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-sm text-muted-foreground">Success/Output</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Reference Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl mb-2">🌐</div>
            <h3 className="font-semibold text-sm">Frontend Pages</h3>
            <p className="text-muted-foreground text-xs mt-1">4 repos on Cloudflare Pages</p>
            <code className="text-primary text-xs">emuy.gg, ironforged.gg, bingo.*, docs.*</code>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl mb-2">⚡</div>
            <h3 className="font-semibold text-sm">API Workers</h3>
            <p className="text-muted-foreground text-xs mt-1">4 microservices on CF Workers</p>
            <code className="text-primary text-xs">auth, attendance, events, bingo</code>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl mb-2">💾</div>
            <h3 className="font-semibold text-sm">Databases</h3>
            <p className="text-muted-foreground text-xs mt-1">4 D1 databases + R2 storage</p>
            <code className="text-primary text-xs">auth-db, attendance-db, events-db, bingo-db</code>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl mb-2">🤖</div>
            <h3 className="font-semibold text-sm">Discord Bot</h3>
            <p className="text-muted-foreground text-xs mt-1">Discord.js on Railway</p>
            <code className="text-primary text-xs">yume-bot</code>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

