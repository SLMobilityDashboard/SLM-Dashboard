# Persistent Query Caching System with Smart Pre-Warming

## Overview

This system implements an intelligent, persistent caching layer that learns from query patterns and automatically maintains frequently-used queries in cache indefinitely, while expiring unused queries after 7 days of inactivity.

## Key Features

### 🎯 Persistent Scoring

- **Accumulates scores over time** based on query usage patterns
- **No daily reset** - scores persist and accumulate as long as queries are being used
- **Automatic decay** - scores decrease when queries aren't used, leading to eventual expiration

### 🔒 Persistent Caching

- Queries meeting persistence criteria are cached **without expiration**
- No need to fetch the same popular query every day
- Automatic cache maintenance based on usage patterns

### 🔄 Intelligent Query Normalization

The system uses a **two-hash approach** to handle both static and dynamic queries:

- **Cache Hash**: Unique per execution (includes date for dynamic queries)
- **Stats Hash**: Normalized pattern (accumulates statistics over time)

This allows:

- Dynamic queries (with `CURRENT_DATE()`) get fresh data daily
- Statistics accumulate properly across all executions
- Static historical queries can become persistent

**Detected Dynamic Functions:**

```sql
CURRENT_DATE(), CURRENT_TIMESTAMP(), NOW()
GETDATE(), CURDATE(), SYSDATE()
```

**Static Queries (eligible for persistence):**

```sql
-- Date literals are treated as static
SELECT * FROM sales WHERE date = '2025-10-01'
SELECT * FROM sales WHERE date BETWEEN '2025-01-01' AND '2025-12-31'
```

**Optional Force Dynamic Flag:**
If your application generates date literals dynamically, use `forceDynamic: true`:

```json
{
  "sql": "SELECT * FROM sales WHERE date = '2025-10-03'",
  "forceDynamic": true
}
```

### 📊 Smart Scoring Algorithm

Queries are scored based on multiple factors (0-100 scale):

```
Score = (
  Frequency (20%) +        // Total executions
  Duration (15%) +          // Average query time
  Data Size (10%) +         // Result set size
  Total Hits (20%) +        // Cache hit count
  Recent Activity (25%) +   // Hits in last 7 days
  Consistency (10%)         // Active days ratio
) × Decay Multiplier
```

**Decay Formula**: `multiplier = 0.75^(days_without_hits)`

- Day 1: 75% of score
- Day 3: 42% of score
- Day 7: 17% of score
- Day 14: 6% of score

### ⚡ Persistence Criteria

A query becomes persistent (no expiration) when:

1. Has cache hits on **at least 3 different days** in the last 7 days
2. Averages **2+ hits per active day**
3. Less than **7 consecutive days** without hits
4. **Only applies to static queries** - dynamic queries always refresh

### 🕐 Cache Strategy by Query Type

| Query Type    | Detection                      | TTL  | Can Be Persistent |
| ------------- | ------------------------------ | ---- | ----------------- |
| Static        | No date functions              | None | Yes ✓             |
| Daily         | `CURRENT_DATE()`               | 24h  | No                |
| Hourly        | `NOW()`, `CURRENT_TIMESTAMP()` | 1h   | No                |
| Force Dynamic | `forceDynamic: true`           | 24h  | No                |

### 🧹 Automatic Expiration

Queries are removed when:

1. **TTL expires** (dynamic queries: 1h or 24h)
2. **7+ consecutive days** without cache hits (persistent queries lose persistence)
3. Manual deletion via API

## API Endpoints

### 1. Query Execution with Auto-Caching

```bash
POST /api/query
{
  "sql": "SELECT * FROM users WHERE active = true",
  "userId": "user123",      // optional
  "forceDynamic": false     // optional
}
```

**Response Headers:**

- `X-Cache-Status`: HIT or MISS
- `X-Cache-Hash`: Cache identifier (changes daily for dynamic queries)
- `X-Stats-Hash`: Stats identifier (same for pattern tracking)
- `X-Cache-Type`: static | daily | hourly
- `X-Persistent`: true/false (if persistent cache)

**Examples:**

```javascript
// Static query - can become persistent
fetch("/api/query", {
  method: "POST",
  body: JSON.stringify({
    sql: "SELECT * FROM users WHERE status = 'active'",
  }),
});

// Dynamic query - daily refresh
fetch("/api/query", {
  method: "POST",
  body: JSON.stringify({
    sql: "SELECT * FROM sales WHERE date = CURRENT_DATE()",
  }),
});

// App-generated date literal - force dynamic
const today = new Date().toISOString().slice(0, 10);
fetch("/api/query", {
  method: "POST",
  body: JSON.stringify({
    sql: `SELECT * FROM sales WHERE date = '${today}'`,
    forceDynamic: true,
  }),
});
```

### 2. Analytics Dashboard

```bash
GET /api/cache-analytics?sortBy=score&limit=50&persistent=true
```

**Query Parameters:**

- `sortBy`: score | hits | hitRatio | total | recentActivity
- `limit`: Number of results (default: 50)
- `persistent`: Filter to show only persistent queries

**Response:**

```json
{
  "success": true,
  "count": 25,
  "candidates": [
    {
      "queryHash": "abc123...",
      "hits": 145,
      "misses": 12,
      "total": 157,
      "hitRatio": 0.924,
      "score": 87.5,
      "sql": "SELECT...",
      "isCached": true,
      "isPersistent": true,
      "cacheSize": 1048576,
      "ttl": null,
      "lastCacheHit": "2025-10-03T10:30:00Z",
      "consecutiveDaysNoHits": 0,
      "recentHits": 23,
      "activeDays": 7
    }
  ],
  "summary": {
    "totalQueries": 150,
    "totalHits": 2340,
    "totalMisses": 456,
    "averageHitRatio": 0.837,
    "cachedQueries": 45,
    "persistentQueries": 12,
    "expiringSoon": 8
  }
}
```

### 3. Manual Cache Management

```bash
POST /api/cache-analytics
{
  "queryHash": "abc123...",
  "action": "clearCache" | "makePersistent" | "makeTemporary" | "resetStats" | "delete"
}
```

**Actions:**

- `clearCache`: Remove cached data (keeps stats)
- `makePersistent`: Force query to be persistent (static queries only)
- `makeTemporary`: Convert to 24h expiring cache
- `resetStats`: Reset all statistics
- `delete`: Complete removal from system

### 4. Pre-Warming Job (Daily Cron)

```bash
# Dry run - see what would be pre-warmed
GET /api/prewarm-job

# Execute pre-warming
POST /api/prewarm-job
```

**Pre-Warming Logic:**

- Only queries **NOT currently cached**
- Score > 15 (meaningful activity)
- **Less than 3 consecutive days** without hits (recently active)
- **At least 2 active days** in last 7 days (regular pattern)
- **At least 3 total hits** in last 7 days
- **Average 1.5+ hits per active day** (consistent usage)
- Limit: 20 queries per run
- Skip datasets > 5MB (memory protection)

**Why this prevents one-time spikes:**

- ✅ Requires hits on **multiple different days** (not just 100 hits on one day)
- ✅ Must be **recently active** (hit within last 2 days)
- ✅ Shows **consistent pattern** of usage (1.5+ avg hits/day)

**Example scenarios:**

❌ **NOT pre-warmed**: 100 hits on Day 1, then nothing for 3 days

- Reason: `consecutiveDaysNoHits = 3` (exceeds 2-day limit)

❌ **NOT pre-warmed**: 50 hits on Day 1, 50 hits on Day 8

- Reason: Only 1 active day in last 7 days (needs 2+)

❌ **NOT pre-warmed**: 1 hit Monday, 1 hit Friday

- Reason: Only 2 hits total (needs 3+), avg 1.0/day (needs 1.5+)

✅ **WILL pre-warm**: 10 hits on Day 1, 8 hits on Day 3, 5 hits on Day 5

- Reason: 3 active days, 23 hits total, 7.67 avg/day, recent activity

## Deployment

### Cron Job Setup (Vercel)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/prewarm-job",
      "schedule": "0 2 * * *"
    }
  ]
}
```

This runs daily at 2 AM, pre-warming high-value queries that aren't currently cached.

### Alternative: GitHub Actions

```yaml
# .github/workflows/prewarm.yml
name: Pre-warm Cache
on:
  schedule:
    - cron: "0 2 * * *"
jobs:
  prewarm:
    runs-on: ubuntu-latest
    steps:
      - name: Call Pre-warm API
        run: |
          curl -X POST https://your-domain.com/api/prewarm-job \
            -H "Authorization: Bearer ${{ secrets.PREWARM_SECRET }}"
```

### Environment Variables

```env
REDIS_URL=your_redis_url
SNOWFLAKE_ACCOUNT=your_account
SNOWFLAKE_USERNAME=your_username
SNOWFLAKE_PASSWORD=your_password
SNOWFLAKE_DATABASE=your_database
SNOWFLAKE_SCHEMA=your_schema
SNOWFLAKE_WAREHOUSE=your_warehouse
CRON_SECRET=your_secret_for_cron_protection
```

## How It Works

### Query Flow with Normalization

**Static Query:**

```sql
SELECT * FROM sales WHERE date = '2025-10-01'
```

- Day 1: Cache Hash = `abc123`, Stats Hash = `abc123`
- Day 2: Cache Hash = `abc123`, Stats Hash = `abc123` (same)
- Day 4: Becomes persistent (no expiration)

**Dynamic Query:**

```sql
SELECT * FROM sales WHERE date = CURRENT_DATE()
```

- Day 1: Cache Hash = `xyz789_2025-10-01`, Stats Hash = `def456`
- Day 2: Cache Hash = `xyz789_2025-10-02`, Stats Hash = `def456` (accumulates)
- Day 4: Stats show persistent pattern, but cache refreshes daily

### Day-by-Day Example (Static Query)

**Day 1**: New query executed

- Score: 5 (low)
- Status: Cached for 24h
- Persistent: No

**Day 2**: Query used again (2 hits)

- Score: 12 → 15 (increasing)
- Status: Cached for 24h
- Persistent: No (needs 3+ days)

**Day 3**: Query used again (3 hits)

- Score: 15 → 22
- Status: Cached for 24h
- Persistent: No (needs 3+ days)

**Day 4**: Query used again (2 hits)

- Score: 22 → 28
- Status: **NOW PERSISTENT** (3 days active, 2+ avg hits)
- TTL: **Removed** (no expiration)

**Days 5-30**: Query continues to be used

- Score: 28 → 45 → 67 (accumulating)
- Status: Persistent
- **No re-fetching needed** - stays cached

**Day 31**: No hits

- Score: 67 × 0.75 = 50.25
- Status: Still persistent (decay day 1)

**Days 32-37**: No hits for 7 days

- Score: 67 × 0.13 = 8.7
- Status: **Persistence removed**
- Cache: Expires after TTL

**Day 38**: Redis auto-cleanup

- Cache removed (TTL expired)
- Stats preserved for future use

## Benefits

### Cost Savings

- **Reduces Snowflake warehouse time** by 60-80%
- Only executes queries when needed
- Persistent caching eliminates redundant daily fetches

### Performance

- **Instant responses** for frequently-used queries
- No "cold start" on popular queries
- Pre-warming ensures readiness before peak hours

### Intelligence

- **Self-learning** system adapts to usage patterns
- **Automatic cleanup** via Redis TTL
- **Priority-based** pre-warming

### Data Freshness

- Dynamic queries refresh automatically (daily/hourly)
- Static queries can be persistent
- No stale data for time-sensitive reports

## Monitoring

### Key Metrics to Watch

1. **Cache Hit Rate**: Target > 80%
2. **Persistent Query Count**: Should stabilize around 10-20
3. **Pre-Warm Success Rate**: Target > 90%
4. **Memory Usage**: Should stay < 24MB (Redis manages via TTL)

### Response Headers for Debugging

Every query response includes:

```
X-Cache-Status: HIT | MISS
X-Cache-Hash: abc123...
X-Stats-Hash: def456...
X-Cache-Type: static | daily | hourly
X-Persistent: true | false
```

## Best Practices

1. **Review analytics weekly** to ensure scoring is working correctly
2. **Monitor pre-warm job** success rate
3. **Use forceDynamic flag** when your app generates date literals dynamically
4. **Don't force persistence** on dynamic queries (defeats freshness)
5. **Adjust scoring weights** based on your usage patterns

## Troubleshooting

### Query Not Becoming Persistent

- Check if it has 3+ active days in last 7 days
- Verify average 2+ hits per active day
- Ensure it's a **static query** (no date functions)
- Look for gaps in usage (resets count)

### Stale Data Issues

- Check if query has `CURRENT_DATE()` or similar functions
- Use `forceDynamic: true` if your app generates date literals
- Verify `X-Cache-Type` header shows correct strategy

### Pre-Warming Failures

- Check Snowflake connection
- Verify SQL is still valid
- Review error logs in job response
- Check if datasets > 5MB (automatically skipped)

### Memory Issues

- Redis TTL handles most cleanup automatically
- Check for too many persistent queries
- Manually remove unused persistent queries via API

## Security

### Protect Pre-Warm Endpoint

```typescript
// Add to prewarm-job route
const authHeader = req.headers.get("authorization");
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

## Future Enhancements

- [ ] Machine learning for score prediction
- [ ] Query similarity detection (avoid duplicates)
- [ ] Custom persistence rules per query type
- [ ] Real-time analytics dashboard UI
- [ ] Query parameter extraction and normalization
- [ ] Multi-region cache replication
