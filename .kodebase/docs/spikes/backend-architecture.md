# Backend Architecture Spike

## Executive Summary

**Key Finding**: Serverless architecture optimal for GitHub API proxy patterns but creates complexity for MCP server integration and real-time features. Hybrid approach recommended.

**Recommendation**: Serverless for GitHub API operations, persistent server for MCP and WebSocket features, unified through shared Redis state.

## Analysis Framework

### Approaches Evaluated

1. **Pure Serverless**: All backend logic in serverless functions
2. **Traditional Server**: Single persistent Node.js server
3. **Hybrid Architecture**: Serverless for API proxy, persistent for real-time features
4. **Microservices**: Separate services for different concerns

### Evaluation Criteria

```yaml
criteria:
  github_api_performance: "Rate limiting, caching, batching efficiency"
  real_time_capabilities: "WebSocket support and performance"
  mcp_integration: "Model Context Protocol server requirements"
  cold_start_impact: "User experience and response times"
  development_complexity: "Team velocity and maintainability"
  scaling_characteristics: "Performance under load"
```

## 1. Pure Serverless Analysis

### Architecture Design
```yaml
serverless_components:
  github_proxy: "API routes for GitHub operations"
  auth_handler: "NextAuth serverless functions"
  webhook_processor: "Repository change notifications"
  mcp_endpoint: "MCP protocol handler functions"

vercel_implementation:
  - "API routes in /api directory"
  - "Edge functions for global distribution"
  - "Serverless functions for compute-heavy operations"
  - "Static site generation for dashboard"
```

### GitHub API Proxy Pattern
```typescript
// /api/github/[...path].ts - Serverless GitHub proxy
import { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  const githubPath = Array.isArray(path) ? path.join('/') : path;

  // Rate limiting with Redis
  const userKey = `rate_limit:${req.headers.authorization}`;
  const current = await redis.incr(userKey);
  if (current === 1) await redis.expire(userKey, 3600); // 1 hour window

  if (current > 4800) { // Leave buffer under 5000/hour limit
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: await redis.ttl(userKey)
    });
  }

  // Caching strategy
  const cacheKey = `github:${githubPath}:${req.headers.authorization?.slice(-8)}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  // GitHub API call with error handling
  try {
    const response = await fetch(`https://api.github.com/${githubPath}`, {
      headers: {
        'Authorization': req.headers.authorization,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Kodebase-Web/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    // Cache based on resource type
    const ttl = getCacheTTL(githubPath);
    await redis.setex(cacheKey, ttl, JSON.stringify(data));

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-RateLimit-Remaining', response.headers.get('x-ratelimit-remaining'));
    return res.json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

function getCacheTTL(path: string): number {
  if (path.includes('/contents/')) return 60; // File contents: 1 minute
  if (path.includes('/commits')) return 300;  // Commits: 5 minutes
  if (path.includes('/repos')) return 1800;   // Repository info: 30 minutes
  return 60; // Default: 1 minute
}
```

### Batching Pattern for Efficiency
```typescript
// /api/github/batch.ts - Batch multiple GitHub requests
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { requests } = req.body; // Array of GitHub API paths

  // Parallel execution with rate limit awareness
  const results = await Promise.allSettled(
    requests.map(async (path: string) => {
      const cached = await redis.get(`github:${path}`);
      if (cached) return { path, data: cached, cached: true };

      // Use GitHub GraphQL for efficient batching
      return fetchFromGitHub(path);
    })
  );

  return res.json({
    results: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason }),
    batchId: generateBatchId()
  });
}
```

### Advantages
- **Auto-scaling**: Functions scale to zero when unused
- **Cost efficiency**: Pay only for execution time
- **Global distribution**: Edge functions reduce latency
- **Simple deployment**: No server management required

### Limitations
```yaml
serverless_constraints:
  cold_starts: "100-500ms initialization delay"
  execution_time: "10s max on Vercel Hobby, 60s Pro"
  memory_limits: "1GB max per function"
  connection_pooling: "No persistent connections"
  websocket_support: "Not available in serverless functions"
```

### Cold Start Impact Analysis
```yaml
cold_start_scenarios:
  first_request: "500ms delay"
  after_5min_idle: "300ms delay"
  after_15min_idle: "500ms delay"
  concurrent_scaling: "Multiple cold starts possible"

mitigation_strategies:
  - "Warming functions with scheduled requests"
  - "Edge functions for faster initialization"
  - "Optimistic UI updates while loading"
  - "Aggressive caching to reduce function calls"
```

## 2. Traditional Server Analysis

### Architecture Design
```yaml
persistent_server:
  web_server: "Express.js or Fastify server"
  websocket_server: "Socket.io for real-time features"
  mcp_server: "Embedded MCP protocol handler"
  background_jobs: "Scheduled issues and processing"

deployment_options:
  - "Fly.io with persistent volumes"
  - "Railway with Redis addon"
  - "Render with managed database"
  - "AWS ECS with RDS"
```

### GitHub API Integration
```typescript
// Traditional server with connection pooling
import express from 'express';
import Redis from 'ioredis';
import { Octokit } from '@octokit/rest';

const app = express();
const redis = new Redis(process.env.REDIS_URL);

// Connection pool for GitHub API
const githubClients = new Map<string, Octokit>();

function getGitHubClient(token: string): Octokit {
  if (!githubClients.has(token)) {
    githubClients.set(token, new Octokit({ auth: token }));
  }
  return githubClients.get(token)!;
}

// GitHub proxy with persistent rate limiting
app.get('/api/github/*', async (req, res) => {
  const path = req.path.replace('/api/github/', '');
  const token = req.headers.authorization?.replace('Bearer ', '');

  // Sophisticated rate limiting with Redis
  const rateLimiter = new RateLimiter(redis, token);
  const allowed = await rateLimiter.checkAndDecrement();

  if (!allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: await rateLimiter.getResetTime()
    });
  }

  // Persistent caching with background refresh
  const cached = await getCachedWithRefresh(path, token);
  if (cached) return res.json(cached);

  // GitHub API call with retry logic
  const client = getGitHubClient(token);
  try {
    const response = await client.request(`GET /${path}`);
    await setCacheWithTTL(path, response.data);
    res.json(response.data);
  } catch (error) {
    handleGitHubError(error, res);
  }
});

class RateLimiter {
  constructor(private redis: Redis, private token: string) {}

  async checkAndDecrement(): Promise<boolean> {
    const key = `rate_limit:${this.token}`;
    const current = await this.redis.get(key);

    if (!current) {
      await this.redis.setex(key, 3600, 4999); // Start with 4999
      return true;
    }

    const remaining = parseInt(current);
    if (remaining <= 0) return false;

    await this.redis.decr(key);
    return true;
  }
}
```

### WebSocket Integration
```typescript
// Real-time updates with Socket.io
import { Server as SocketServer } from 'socket.io';
import { createServer } from 'http';

const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: { origin: process.env.FRONTEND_URL }
});

// Real-time issue updates
io.use(authenticateSocket); // Validate JWT tokens

io.on('connection', (socket) => {
  socket.on('join-project', async (projectId) => {
    // Validate user access to project
    const hasAccess = await validateProjectAccess(socket.user.id, projectId);
    if (!hasAccess) return socket.disconnect();

    socket.join(`project:${projectId}`);

    // Send current project state
    const projectState = await getProjectState(projectId);
    socket.emit('project-state', projectState);
  });

  socket.on('issue-update', async (issueUpdate) => {
    // Validate and process issue update
    const result = await updateIssue(issueUpdate);

    // Broadcast to all project members
    io.to(`project:${issueUpdate.projectId}`).emit('issue-updated', result);

    // Update GitHub repository
    await syncIssueToGitHub(issueUpdate);
  });
});

// GitHub webhook integration
app.post('/webhooks/github', async (req, res) => {
  const { repository, commits } = req.body;

  // Process .kodebase/ changes
  const kodebaseChanges = await parseKodebaseChanges(commits);

  if (kodebaseChanges.length > 0) {
    // Broadcast changes to connected clients
    io.to(`project:${repository.id}`).emit('kodebase-updated', kodebaseChanges);

    // Invalidate relevant caches
    await invalidateProjectCache(repository.id);
  }

  res.status(200).send('OK');
});
```

### Advantages
- **Persistent connections**: WebSocket support for real-time features
- **Connection pooling**: Efficient GitHub API client management
- **Background processing**: Scheduled issues and webhook processing
- **Stateful operations**: Session management and connection state

### Limitations
```yaml
traditional_server_constraints:
  scaling_complexity: "Manual horizontal scaling"
  always_on_costs: "Base cost even with no traffic"
  deployment_complexity: "Database migrations and infrastructure"
  single_point_failure: "Server downtime affects all users"
```

## 3. MCP Server Integration Analysis

### Serverless MCP Challenges
```typescript
// MCP in serverless - connection per request
export default async function mcpHandler(req: NextApiRequest, res: NextApiResponse) {
  // Problem: New MCP connection for each request
  const mcpServer = new MCPServer();
  await mcpServer.initialize(); // Cold start penalty

  // Process MCP request
  const result = await mcpServer.handleRequest(req.body);

  // Connection closes after response - no state persistence
  return res.json(result);
}
```

### Traditional Server MCP Integration
```typescript
// MCP with persistent connections
class MCPServerManager {
  private connections = new Map<string, MCPConnection>();

  async getConnection(userId: string): Promise<MCPConnection> {
    if (!this.connections.has(userId)) {
      const connection = new MCPConnection(userId);
      await connection.initialize();
      this.connections.set(userId, connection);
    }
    return this.connections.get(userId)!;
  }

  async handleMCPRequest(userId: string, request: MCPRequest) {
    const connection = await this.getConnection(userId);
    return await connection.process(request);
  }
}

// WebSocket endpoint for MCP
io.on('connection', (socket) => {
  socket.on('mcp-request', async (request) => {
    const connection = await mcpManager.getConnection(socket.user.id);
    const response = await connection.process(request);
    socket.emit('mcp-response', response);
  });
});
```

### MCP Performance Comparison
```yaml
serverless_mcp:
  connection_time: "200-500ms per request"
  context_persistence: "None - rebuilt each time"
  concurrent_users: "Each request independent"
  memory_usage: "Low - functions terminate"

traditional_mcp:
  connection_time: "5-10ms after initial setup"
  context_persistence: "Full session state maintained"
  concurrent_users: "Shared server resources"
  memory_usage: "Higher - persistent connections"
```

## 4. Real-time Features Analysis

### WebSocket Requirements for Kodebase
```yaml
real_time_features:
  issue_updates: "Live status changes across team"
  collaborative_editing: "Multiple users editing initiatives/issues"
  progress_notifications: "Real-time milestone completion"
  presence_indicators: "Who's working on what"
  github_sync_status: "Live sync progress indicators"
```

### Serverless Real-time Limitations
```yaml
serverless_constraints:
  no_websockets: "Functions can't maintain persistent connections"
  polling_required: "Client must poll for updates"
  state_management: "Must use external state store (Redis)"
  connection_management: "Complex user presence tracking"

workarounds:
  server_sent_events: "One-way real-time updates"
  polling_optimization: "Smart polling with exponential backoff"
  redis_pubsub: "External message queue for coordination"
```

### Traditional Server Real-time Capabilities
```typescript
// Real-time collaboration example
interface IssueCollaboration {
  issueId: string;
  activeUsers: string[];
  lockStatus: 'unlocked' | 'editing' | 'locked';
  lastModified: Date;
}

class CollaborationManager {
  private issueSessions = new Map<string, IssueCollaboration>();

  async joinIssueEditing(issueId: string, userId: string) {
    const session = this.issueSessions.get(issueId) || {
      issueId,
      activeUsers: [],
      lockStatus: 'unlocked',
      lastModified: new Date()
    };

    session.activeUsers.push(userId);
    this.issueSessions.set(issueId, session);

    // Broadcast to all issue participants
    io.to(`issue:${issueId}`).emit('user-joined', { userId, session });

    return session;
  }

  async updateIssue(issueId: string, userId: string, changes: IssueChanges) {
    const session = this.issueSessions.get(issueId);
    if (!session || !session.activeUsers.includes(userId)) {
      throw new Error('User not in editing session');
    }

    // Apply optimistic updates
    const updatedIssue = await applyIssueChanges(issueId, changes);

    // Broadcast changes to all participants except sender
    io.to(`issue:${issueId}`).except(userId).emit('issue-changed', {
      issueId,
      changes,
      updatedIssue,
      by: userId
    });

    // Queue GitHub sync
    await queueGitHubSync(issueId, changes);

    return updatedIssue;
  }
}
```

## 5. Hybrid Architecture Recommendation

### Architecture Design
```yaml
hybrid_components:
  serverless_layer:
    - "GitHub API proxy functions"
    - "Authentication endpoints"
    - "Static dashboard serving"
    - "Webhook processing"

  persistent_layer:
    - "WebSocket server for real-time"
    - "MCP server with session management"
    - "Background job processing"
    - "Collaboration state management"

  shared_state:
    - "Redis for caching and pub/sub"
    - "Session management"
    - "Rate limiting coordination"
```

### Communication Pattern
```typescript
// Serverless function communicates with persistent server
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle GitHub API proxy (fast, cacheable)
  if (req.url?.startsWith('/api/github/')) {
    return await handleGitHubProxy(req, res);
  }

  // Forward real-time requests to persistent server
  if (req.url?.startsWith('/api/realtime/')) {
    const response = await fetch(`${PERSISTENT_SERVER_URL}/api${req.url}`, {
      method: req.method,
      headers: req.headers,
      body: JSON.stringify(req.body)
    });
    return res.json(await response.json());
  }
}

// Persistent server handles complex state
app.post('/api/issue-update', async (req, res) => {
  const { issueId, changes } = req.body;

  // Update issue with collaboration tracking
  const result = await collaborationManager.updateIssue(issueId, req.user.id, changes);

  // Notify serverless layer via Redis pub/sub
  await redis.publish('issue-updated', JSON.stringify({
    issueId,
    changes,
    timestamp: new Date()
  }));

  res.json(result);
});
```

### Deployment Strategy
```yaml
vercel_deployment:
  - "Next.js app with serverless functions"
  - "GitHub API proxy and auth"
  - "Static dashboard and marketing pages"

flyio_deployment:
  - "Node.js server with WebSocket support"
  - "MCP server integration"
  - "Background job processing"
  - "Redis for shared state"

communication:
  - "Shared Redis instance for state"
  - "HTTP API calls between layers"
  - "Pub/sub for event coordination"
```

## 6. Performance Analysis

### Response Time Comparison
```yaml
operation_times:
  github_api_proxy:
    serverless: "150ms (cached) / 600ms (cold start)"
    traditional: "50ms (persistent connection)"
    hybrid: "150ms (serverless handles this)"

  issue_update:
    serverless: "Not possible (no real-time)"
    traditional: "25ms (WebSocket)"
    hybrid: "25ms (persistent server handles)"

  dashboard_load:
    serverless: "300ms (multiple function calls)"
    traditional: "100ms (single request)"
    hybrid: "200ms (optimized for static + API)"
```

### Scaling Characteristics
```yaml
concurrent_users:
  100_users:
    serverless: "Auto-scales perfectly"
    traditional: "Single server handles easily"
    hybrid: "Best of both - scales where needed"

  1000_users:
    serverless: "Excellent for API calls, no real-time"
    traditional: "May need horizontal scaling"
    hybrid: "Serverless scales API, persistent handles real-time"

  10000_users:
    serverless: "Cold start issues at scale"
    traditional: "Requires sophisticated load balancing"
    hybrid: "Each layer scales independently"
```

## 7. Development Complexity Analysis

### Team Velocity Impact
```yaml
pure_serverless:
  initial_velocity: "Fast - familiar patterns"
  real_time_features: "Slow - workarounds required"
  mcp_integration: "Complex - stateless challenges"

pure_traditional:
  initial_velocity: "Slower - more setup"
  real_time_features: "Fast - native support"
  mcp_integration: "Straightforward - persistent state"

hybrid_approach:
  initial_velocity: "Medium - two systems"
  real_time_features: "Fast - dedicated server"
  mcp_integration: "Medium - coordination complexity"
```

### Operational Complexity
```yaml
monitoring_and_debugging:
  serverless: "Multiple function logs, distributed tracing"
  traditional: "Single application logs, easier debugging"
  hybrid: "Two systems to monitor, but clear separation"

deployment_complexity:
  serverless: "Simple - git push"
  traditional: "Medium - server management"
  hybrid: "Medium - coordinate two deployments"
```

## 8. Cost Analysis

### Monthly Costs at Scale
```yaml
100_active_users:
  serverless: "$20 (Vercel Pro + Upstash)"
  traditional: "$25 (Fly.io app + Redis)"
  hybrid: "$35 (Vercel + Fly.io)"

1000_active_users:
  serverless: "$200 (function costs scale up)"
  traditional: "$80 (larger instance + Redis)"
  hybrid: "$150 (optimized for each use case)"

10000_active_users:
  serverless: "$2000 (high function volume)"
  traditional: "$500 (load balancer + instances)"
  hybrid: "$800 (best of both worlds)"
```

## 9. Recommendation

### Phase 1: Pure Serverless MVP
```yaml
rationale: "Fastest time to market, validates core value"
timeline: "4-6 weeks"
features:
  - "GitHub API proxy with caching"
  - "Dashboard with polling updates"
  - "Basic issue management"
  - "NextAuth authentication"

limitations_accepted:
  - "No real-time collaboration"
  - "Polling for updates (30-second interval)"
  - "Simple MCP integration via API calls"
```

### Phase 2: Add Persistent Layer
```yaml
trigger: "When real-time features become user requirement"
timeline: "2-3 weeks additional"
additions:
  - "Fly.io persistent server for WebSocket"
  - "Real-time issue collaboration"
  - "Enhanced MCP server with session state"
  - "Background job processing"

migration_strategy:
  - "Keep serverless GitHub proxy (it works well)"
  - "Add persistent server for new features"
  - "Gradual feature migration based on requirements"
```

### Phase 3: Optimize Based on Usage
```yaml
optimization_triggers:
  high_github_api_usage: "Consider moving to persistent connections"
  heavy_real_time_usage: "Scale persistent server infrastructure"
  cost_concerns: "Evaluate full migration to traditional"
```

## 10. Implementation Architecture

### Recommended Hybrid Stack
```typescript
// Serverless layer (Vercel)
interface ServerlessAPI {
  '/api/github/*': 'GitHub API proxy with caching';
  '/api/auth/*': 'NextAuth authentication endpoints';
  '/api/webhooks/*': 'GitHub webhook processing';
}

// Persistent layer (Fly.io)
interface PersistentServer {
  websocket: 'Real-time collaboration and updates';
  mcp: 'Model Context Protocol server';
  background: 'Scheduled issues and processing';
  api: 'Complex state operations';
}

// Shared infrastructure
interface SharedServices {
  redis: 'Caching, rate limiting, pub/sub';
  github: 'API integration and webhooks';
  auth: 'Session validation across both layers';
}
```

### Communication Patterns
```typescript
// Serverless to Persistent
async function notifyPersistentServer(event: KodebaseEvent) {
  await fetch(`${PERSISTENT_SERVER_URL}/api/events`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SERVER_TOKEN}` },
    body: JSON.stringify(event)
  });
}

// Persistent to Serverless
async function invalidateServerlessCache(cacheKeys: string[]) {
  await redis.publish('cache-invalidate', JSON.stringify(cacheKeys));
}

// Real-time coordination
io.on('connection', (socket) => {
  // Subscribe to Redis pub/sub for cross-server events
  redisSubscriber.on('message', (channel, message) => {
    if (channel === 'issue-updated') {
      socket.emit('issue-update', JSON.parse(message));
    }
  });
});
```

This hybrid approach gives us the best of both worlds: fast, scalable GitHub API handling through serverless functions, and robust real-time features through a persistent server, all while maintaining a clear upgrade path as the platform evolves.
