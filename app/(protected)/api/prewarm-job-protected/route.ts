// app/api/prewarm-job/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import SnowflakeConnectionManager from '@/lib/snowflake';

interface QueryStats {
  queryHash: string;
  shortHash: string;
  sql: string;
  totalHits: number;
  totalMisses: number;
  totalExecutions: number;
  avgDuration: number;
  avgRowCount: number;
  lastExecuted: string | null;
  lastCacheHit: string | null;
  firstSeen: string;
  cacheHitRate: number;
  preWarmScore: number;
  dailyHitHistory: { [date: string]: number };
  consecutiveDaysNoHits: number;
  isPersistent: boolean;
}

// This endpoint should be called by a cron job daily
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('🔥 Starting pre-warm job...');

  try {
    const redis = await getRedis();
    
    // Get top scoring queries that are NOT currently cached
    const topHashes = await redis.zRange('query:prewarm:candidates', -50, -1, { 
      REV: true 
    });
    
    const toPrewarm: QueryStats[] = [];
    
    for (const hash of topHashes) {
      // Check if already cached
      const isCached = await redis.exists(hash);
      if (isCached) {
        continue; // Skip if already in cache
      }
      
      const statsKey = `query:stats:${hash}`;
      const statsData = await redis.get(statsKey);
      
      if (statsData) {
        const stats = JSON.parse(statsData) as QueryStats;
        
        // Get last 7 days for pattern analysis
        const last7Days = getLast7Days();
        const dailyHitHistory = stats.dailyHitHistory || {};
        
        // Calculate recent activity metrics
        const recentHits = last7Days.reduce((sum, date) => 
          sum + (dailyHitHistory[date] || 0), 0
        );
        
        const activeDays = last7Days.filter(date => 
          (dailyHitHistory[date] || 0) > 0
        ).length;
        
        // Calculate average hits per active day
        const avgHitsPerActiveDay = activeDays > 0 ? recentHits / activeDays : 0;
        
        // STRICT CRITERIA to prevent one-time spikes:
        const meetsPrewarmCriteria = 
          stats.preWarmScore > 15 &&              // Meaningful score (not just noise)
          stats.consecutiveDaysNoHits < 3 &&      // Must be RECENTLY active (hit in last 2 days)
          recentHits >= 3 &&                       // At least 3 hits in last week
          activeDays >= 2 &&                       // Active on at least 2 different days
          avgHitsPerActiveDay >= 1.5;              // Consistent usage (not all hits on one day)
        
        if (meetsPrewarmCriteria) {
          toPrewarm.push(stats);
          console.log(`✓ [${stats.shortHash}] Score: ${stats.preWarmScore.toFixed(1)}, Recent: ${recentHits}, Days: ${activeDays}, Avg/day: ${avgHitsPerActiveDay.toFixed(1)}`);
        } else {
          // Debug why queries don't qualify
          if (stats.preWarmScore > 10) {
            const reasons = [];
            if (stats.preWarmScore <= 15) reasons.push('score too low');
            if (stats.consecutiveDaysNoHits >= 3) reasons.push(`no hits for ${stats.consecutiveDaysNoHits}d`);
            if (recentHits < 3) reasons.push(`only ${recentHits} hits`);
            if (activeDays < 2) reasons.push(`only ${activeDays} active days`);
            if (avgHitsPerActiveDay < 1.5) reasons.push(`avg ${avgHitsPerActiveDay.toFixed(1)}/day too low`);
            
            console.log(`✗ [${stats.shortHash}] Excluded: ${reasons.join(', ')}`);
          }
        }
      }
      
      // Limit to 20 queries per run to avoid overloading
      if (toPrewarm.length >= 20) break;
    }
    
    console.log(`🎯 Found ${toPrewarm.length} queries to pre-warm`);
    
    if (toPrewarm.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No queries need pre-warming',
        prewarmed: 0,
        duration: Date.now() - startTime,
      });
    }
    
    // Connect to Snowflake
    await SnowflakeConnectionManager.connect();
    const connection = SnowflakeConnectionManager.getConnection();
    
    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      details: [] as any[],
    };
    
    // Pre-warm each query
    for (const stats of toPrewarm) {
      const queryStartTime = Date.now();
      
      try {
        console.log(`🔥 Pre-warming [${stats.shortHash}] - Score: ${stats.preWarmScore.toFixed(2)}`);
        
        // Execute query
        const rows = await new Promise<any[]>((resolve, reject) => {
          connection.execute({
            sqlText: stats.sql,
            complete: (err, _stmt, rows) => {
              if (err) return reject(err);
              resolve(rows || []);
            },
          });
        });
        
        if (!rows || rows.length === 0) {
          results.skipped++;
          results.details.push({
            hash: stats.shortHash,
            status: 'skipped',
            reason: 'No data returned',
          });
          continue;
        }
        
        // Store in cache
        const dataSize = Buffer.byteLength(JSON.stringify(rows), 'utf-8');
        
        // Skip if dataset is too large (>5MB) to avoid memory issues
        if (dataSize > 5 * 1024 * 1024) {
          results.skipped++;
          results.details.push({
            hash: stats.shortHash,
            status: 'skipped',
            reason: `Dataset too large (${(dataSize / 1024 / 1024).toFixed(2)}MB)`,
          });
          console.log(`⚠️ Skipped [${stats.shortHash}] - too large (${(dataSize / 1024 / 1024).toFixed(2)}MB)`);
          continue;
        }
        
        // Determine TTL based on persistence
        if (stats.isPersistent) {
          // No expiration for persistent queries
          await redis.set(stats.queryHash, JSON.stringify(rows));
        } else {
          // 24h for regular queries
          await redis.set(stats.queryHash, JSON.stringify(rows), { EX: 86400 });
        }
        
        const queryDuration = Date.now() - queryStartTime;
        
        // Update stats to mark as prewarmed
        await redis.hSet(`cache_stats:${stats.queryHash}`, {
          lastPrewarmed: Date.now().toString(),
          prewarmedCount: (parseInt(await redis.hGet(`cache_stats:${stats.queryHash}`, 'prewarmedCount') || '0') + 1).toString(),
        });
        
        results.success++;
        results.details.push({
          hash: stats.shortHash,
          status: 'success',
          rows: rows.length,
          size: `${(dataSize / 1024 / 1024).toFixed(2)}MB`,
          duration: `${queryDuration}ms`,
          persistent: stats.isPersistent,
          score: stats.preWarmScore.toFixed(2),
        });
        
        console.log(`✅ Pre-warmed [${stats.shortHash}] - ${rows.length} rows, ${(dataSize / 1024 / 1024).toFixed(2)}MB, ${queryDuration}ms${stats.isPersistent ? ' [PERSISTENT]' : ''}`);
        
      } catch (error: any) {
        results.failed++;
        results.details.push({
          hash: stats.shortHash,
          status: 'failed',
          error: error.message,
        });
        
        console.error(`❌ Failed to pre-warm [${stats.shortHash}]:`, error.message);
      }
      
      // Add small delay between queries to avoid overwhelming Snowflake
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const totalDuration = Date.now() - startTime;
    
    console.log(`🔥 Pre-warm job complete: ${results.success} success, ${results.failed} failed, ${results.skipped} skipped in ${totalDuration}ms`);
    
    return NextResponse.json({
      success: true,
      message: `Pre-warmed ${results.success} queries`,
      results,
      duration: totalDuration,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('❌ Pre-warm job failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// Helper functions
function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(date.toISOString().slice(0, 10));
  }
  return days;
}

// GET endpoint to check what would be pre-warmed (dry run)
export async function GET(req: NextRequest) {
  try {
    const redis = await getRedis();
    
    const topHashes = await redis.zRange('query:prewarm:candidates', -50, -1, { 
      REV: true 
    });
    
    const candidates: any[] = [];
    const excluded: any[] = [];
    
    for (const hash of topHashes) {
      const isCached = await redis.exists(hash);
      const statsKey = `query:stats:${hash}`;
      const statsData = await redis.get(statsKey);
      
      if (statsData) {
        const stats = JSON.parse(statsData) as QueryStats;
        
        const last7Days = getLast7Days();
        const dailyHitHistory = stats.dailyHitHistory || {};
        
        const recentHits = last7Days.reduce((sum, date) => 
          sum + (dailyHitHistory[date] || 0), 0
        );
        
        const activeDays = last7Days.filter(date => 
          (dailyHitHistory[date] || 0) > 0
        ).length;
        
        const avgHitsPerActiveDay = activeDays > 0 ? recentHits / activeDays : 0;
        
        const meetsPrewarmCriteria = 
          stats.preWarmScore > 15 &&
          stats.consecutiveDaysNoHits < 3 &&
          recentHits >= 3 &&
          activeDays >= 2 &&
          avgHitsPerActiveDay >= 1.5;
        
        const queryInfo = {
          hash: stats.shortHash,
          sql: stats.sql.substring(0, 100) + '...',
          score: stats.preWarmScore.toFixed(2),
          recentHits,
          activeDays,
          avgHitsPerActiveDay: avgHitsPerActiveDay.toFixed(1),
          isPersistent: stats.isPersistent,
          consecutiveDaysNoHits: stats.consecutiveDaysNoHits,
          isCached,
        };
        
        if (meetsPrewarmCriteria && !isCached) {
          candidates.push(queryInfo);
        } else if (stats.preWarmScore > 10) {
          // Track why it was excluded
          const reasons = [];
          if (isCached) reasons.push('already cached');
          if (stats.preWarmScore <= 15) reasons.push('score too low');
          if (stats.consecutiveDaysNoHits >= 3) reasons.push('not recent');
          if (recentHits < 3) reasons.push('insufficient hits');
          if (activeDays < 2) reasons.push('too few active days');
          if (avgHitsPerActiveDay < 1.5) reasons.push('low daily average');
          
          excluded.push({
            ...queryInfo,
            excludedReasons: reasons,
          });
        }
      }
      
      if (candidates.length >= 20) break;
    }
    
    return NextResponse.json({
      success: true,
      count: candidates.length,
      candidates,
      excluded: excluded.slice(0, 10), // Show top 10 excluded for debugging
      message: 'These queries would be pre-warmed if job runs now',
      criteria: {
        minScore: 15,
        maxConsecutiveDaysNoHits: 3,
        minRecentHits: 3,
        minActiveDays: 2,
        minAvgHitsPerDay: 1.5,
      },
    });
    
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}