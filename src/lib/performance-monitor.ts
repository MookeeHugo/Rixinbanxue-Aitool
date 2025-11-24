/**
 * Performance Monitoring Utility
 *
 * Tracks performance metrics including:
 * - SSE connection counts
 * - API response times
 * - Active recording sessions
 */

import { logger } from './logger';

interface PerformanceMetrics {
  // SSE Metrics
  sseConnections: {
    total: number;
    bySession: Map<string, number>;
  };

  // API Response Time Metrics
  apiResponseTimes: {
    startRecording: number[];
    stopRecording: number[];
    storageStats: number[];
  };

  // Recording Metrics
  activeRecordings: number;
  totalRecordings: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    sseConnections: {
      total: 0,
      bySession: new Map(),
    },
    apiResponseTimes: {
      startRecording: [],
      stopRecording: [],
      storageStats: [],
    },
    activeRecordings: 0,
    totalRecordings: 0,
  };

  /**
   * Track SSE connection
   */
  trackSSEConnection(sessionId: string, action: 'connect' | 'disconnect') {
    if (action === 'connect') {
      this.metrics.sseConnections.total++;
      const current = this.metrics.sseConnections.bySession.get(sessionId) || 0;
      this.metrics.sseConnections.bySession.set(sessionId, current + 1);

      logger.info('SSE connection tracked', {
        action: 'connect',
        sessionId,
        totalConnections: this.metrics.sseConnections.total,
        sessionConnections: current + 1,
      });
    } else {
      this.metrics.sseConnections.total = Math.max(0, this.metrics.sseConnections.total - 1);
      const current = this.metrics.sseConnections.bySession.get(sessionId) || 0;
      const newCount = Math.max(0, current - 1);

      if (newCount === 0) {
        this.metrics.sseConnections.bySession.delete(sessionId);
      } else {
        this.metrics.sseConnections.bySession.set(sessionId, newCount);
      }

      logger.info('SSE connection tracked', {
        action: 'disconnect',
        sessionId,
        totalConnections: this.metrics.sseConnections.total,
        sessionConnections: newCount,
      });
    }
  }

  /**
   * Track API response time
   */
  trackAPIResponseTime(endpoint: 'startRecording' | 'stopRecording' | 'storageStats', duration: number) {
    const times = this.metrics.apiResponseTimes[endpoint];
    times.push(duration);

    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }

    const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
    const max = Math.max(...times);
    const min = Math.min(...times);

    logger.info('API response time tracked', {
      endpoint,
      duration,
      avg: Math.round(avg),
      max,
      min,
      sampleSize: times.length,
    });

    // Warn if response time is slow
    if (duration > 1000) {
      logger.warn('Slow API response detected', {
        endpoint,
        duration,
        threshold: 1000,
      });
    }
  }

  /**
   * Track recording session
   */
  trackRecording(action: 'start' | 'stop') {
    if (action === 'start') {
      this.metrics.activeRecordings++;
      this.metrics.totalRecordings++;

      logger.info('Recording session tracked', {
        action: 'start',
        activeRecordings: this.metrics.activeRecordings,
        totalRecordings: this.metrics.totalRecordings,
      });
    } else {
      this.metrics.activeRecordings = Math.max(0, this.metrics.activeRecordings - 1);

      logger.info('Recording session tracked', {
        action: 'stop',
        activeRecordings: this.metrics.activeRecordings,
        totalRecordings: this.metrics.totalRecordings,
      });
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return {
      ...this.metrics,
      sseConnections: {
        ...this.metrics.sseConnections,
        bySession: new Map(this.metrics.sseConnections.bySession),
      },
      apiResponseTimes: {
        startRecording: [...this.metrics.apiResponseTimes.startRecording],
        stopRecording: [...this.metrics.apiResponseTimes.stopRecording],
        storageStats: [...this.metrics.apiResponseTimes.storageStats],
      },
    };
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary() {
    const calculateStats = (times: number[]) => {
      if (times.length === 0) {
        return { avg: 0, min: 0, max: 0, p95: 0, count: 0 };
      }

      const sorted = [...times].sort((a, b) => a - b);
      const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
      const p95Index = Math.floor(times.length * 0.95);

      return {
        avg: Math.round(avg),
        min: sorted[0],
        max: sorted[sorted.length - 1],
        p95: sorted[p95Index] || sorted[sorted.length - 1],
        count: times.length,
      };
    };

    return {
      sseConnections: {
        total: this.metrics.sseConnections.total,
        uniqueSessions: this.metrics.sseConnections.bySession.size,
        sessionsWithMultipleConnections: Array.from(this.metrics.sseConnections.bySession.values())
          .filter(count => count > 1).length,
      },
      apiResponseTimes: {
        startRecording: calculateStats(this.metrics.apiResponseTimes.startRecording),
        stopRecording: calculateStats(this.metrics.apiResponseTimes.stopRecording),
        storageStats: calculateStats(this.metrics.apiResponseTimes.storageStats),
      },
      recordings: {
        active: this.metrics.activeRecordings,
        total: this.metrics.totalRecordings,
      },
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      sseConnections: {
        total: 0,
        bySession: new Map(),
      },
      apiResponseTimes: {
        startRecording: [],
        stopRecording: [],
        storageStats: [],
      },
      activeRecordings: 0,
      totalRecordings: 0,
    };

    logger.info('Performance metrics reset');
  }

  /**
   * Log current metrics
   */
  logMetrics() {
    const summary = this.getMetricsSummary();

    logger.info('Performance Metrics Summary', {
      ...summary,
      timestamp: new Date().toISOString(),
    });

    return summary;
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

export { performanceMonitor, PerformanceMonitor };
export type { PerformanceMetrics };
