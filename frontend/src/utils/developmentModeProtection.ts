// Development Mode Protection against HMR conflicts and state corruption

interface HMRState {
  lastReload: number;
  reloadCount: number;
  isHMRActive: boolean;
  conflictDetected: boolean;
}

interface ProcessState {
  processId: string;
  startTime: number;
  lastActivity: number;
  isStale: boolean;
}

class DevelopmentModeProtector {
  private static instance: DevelopmentModeProtector;
  private hmrState: HMRState;
  private processState: ProcessState;
  private conflictListeners: Map<string, Function> = new Map();
  private cleanupTasks: Function[] = [];

  private constructor() {
    this.hmrState = {
      lastReload: Date.now(),
      reloadCount: 0,
      isHMRActive: false,
      conflictDetected: false
    };

    this.processState = {
      processId: this.generateProcessId(),
      startTime: Date.now(),
      lastActivity: Date.now(),
      isStale: false
    };

    this.initializeProtection();
  }

  static getInstance(): DevelopmentModeProtector {
    if (!DevelopmentModeProtector.instance) {
      DevelopmentModeProtector.instance = new DevelopmentModeProtector();
    }
    return DevelopmentModeProtector.instance;
  }

  private generateProcessId(): string {
    return `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeProtection(): void {
    if (process.env.NODE_ENV !== 'development') return;

    this.setupHMRDetection();
    this.setupProcessMonitoring();
    this.setupConflictDetection();
    this.setupAutomaticCleanup();
  }

  private setupHMRDetection(): void {
    // Detect webpack HMR
    if (typeof window !== 'undefined') {
      // Monitor webpack hot updates
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        const message = args.join(' ');
        if (message.includes('[HMR]') || message.includes('webpack')) {
          this.handleHMREvent();
        }
        originalLog.apply(console, args);
      };

      // Monitor file changes via webpack
      if ((window as any).webpackHotUpdate) {
        const originalUpdate = (window as any).webpackHotUpdate;
        (window as any).webpackHotUpdate = (...args: any[]) => {
          this.handleHMREvent();
          return originalUpdate.apply(window, args);
        };
      }

      // Monitor React DevTools
      if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        const devtools = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
        if (devtools.onCommitFiberRoot) {
          const originalCommit = devtools.onCommitFiberRoot;
          devtools.onCommitFiberRoot = (...args: any[]) => {
            this.updateActivity();
            return originalCommit.apply(devtools, args);
          };
        }
      }
    }
  }

  private setupProcessMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Store process information
    const processKey = 'dev_process_state';
    const existingProcess = sessionStorage.getItem(processKey);
    
    if (existingProcess) {
      try {
        const parsed = JSON.parse(existingProcess);
        // Check if previous process is stale
        const timeDiff = Date.now() - parsed.lastActivity;
        if (timeDiff > 30000) { // 30 seconds
          console.warn('Stale development process detected, cleaning up...');
          this.cleanupStaleProcess();
        }
      } catch (error) {
        console.warn('Invalid process state, cleaning up:', error);
        sessionStorage.removeItem(processKey);
      }
    }

    // Store current process
    this.saveProcessState();

    // Update process state periodically
    const processMonitor = setInterval(() => {
      this.updateActivity();
      this.saveProcessState();
    }, 5000);

    this.cleanupTasks.push(() => clearInterval(processMonitor));

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.markProcessAsEnding();
    });
  }

  private setupConflictDetection(): void {
    if (typeof window === 'undefined') return;

    // Monitor global object pollution
    const globalKeys = new Set(Object.keys(window));
    
    const pollutionCheck = setInterval(() => {
      const currentKeys = Object.keys(window);
      const newKeys = currentKeys.filter(key => !globalKeys.has(key));
      
      if (newKeys.length > 10) { // Arbitrary threshold
        console.warn('Potential global object pollution detected:', newKeys);
        this.hmrState.conflictDetected = true;
        this.notifyConflictListeners('global_pollution', { newKeys });
      }
      
      // Update baseline
      newKeys.forEach(key => globalKeys.add(key));
    }, 10000);

    this.cleanupTasks.push(() => clearInterval(pollutionCheck));

    // Monitor memory usage if available
    if ('memory' in performance) {
      const memoryCheck = setInterval(() => {
        const memory = (performance as any).memory;
        if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
          console.warn('High memory usage detected:', memory);
          this.hmrState.conflictDetected = true;
          this.notifyConflictListeners('memory_pressure', { memory });
        }
      }, 15000);

      this.cleanupTasks.push(() => clearInterval(memoryCheck));
    }
  }

  private setupAutomaticCleanup(): void {
    // Cleanup duplicate event listeners
    this.cleanupDuplicateListeners();
    
    // Cleanup orphaned timers
    this.cleanupOrphanedTimers();
    
    // Cleanup stale WebSocket connections
    this.cleanupStaleConnections();
  }

  private cleanupDuplicateListeners(): void {
    if (typeof window === 'undefined') return;

    const originalAddListener = EventTarget.prototype.addEventListener;
    const listenerCounts = new Map<string, number>();

    EventTarget.prototype.addEventListener = function(type: string, listener: any, options?: any) {
      const key = `${this.constructor.name}_${type}`;
      const count = listenerCounts.get(key) || 0;
      
      if (count > 10) { // Arbitrary threshold
        console.warn(`Potential duplicate listeners detected for ${key}: ${count}`);
      }
      
      listenerCounts.set(key, count + 1);
      return originalAddListener.call(this, type, listener, options);
    };
  }

  private cleanupOrphanedTimers(): void {
    // Track active timers
    const activeTimers = new Set<any>();
    
    const originalSetTimeout = window.setTimeout;
    const originalSetInterval = window.setInterval;
    const originalClearTimeout = window.clearTimeout;
    const originalClearInterval = window.clearInterval;

    (window as any).setTimeout = function(callback: any, delay?: number) {
      const id = originalSetTimeout.call(window, (...callbackArgs: any[]) => {
        activeTimers.delete(id);
        return callback.apply(this, callbackArgs);
      }, delay);
      activeTimers.add(id);
      return id;
    };

    (window as any).setInterval = function(callback: any, delay?: number) {
      const id = originalSetInterval.call(window, callback, delay);
      activeTimers.add(id);
      return id;
    };

    (window as any).clearTimeout = function(id?: any) {
      if (id) activeTimers.delete(id);
      return originalClearTimeout.call(window, id);
    };

    (window as any).clearInterval = function(id?: any) {
      if (id) activeTimers.delete(id);
      return originalClearInterval.call(window, id);
    };

    // Periodic cleanup of abandoned timers
    const timerCleanup = setInterval(() => {
      if (activeTimers.size > 50) { // Arbitrary threshold
        console.warn(`High number of active timers detected: ${activeTimers.size}`);
      }
    }, 30000);

    this.cleanupTasks.push(() => {
      clearInterval(timerCleanup);
      // Clear all tracked timers on cleanup
      activeTimers.forEach(id => {
        try {
          clearTimeout(id);
          clearInterval(id);
        } catch (e) {
          // Timer may already be cleared
        }
      });
    });
  }

  private cleanupStaleConnections(): void {
    // Monitor WebSocket connections
    const activeConnections = new Set<WebSocket>();
    
    const originalWebSocket = window.WebSocket;
    window.WebSocket = class extends originalWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        activeConnections.add(this);
        
        this.addEventListener('close', () => {
          activeConnections.delete(this);
        });
      }
    };

    // Periodic cleanup
    const connectionCleanup = setInterval(() => {
      const staleConnections = Array.from(activeConnections).filter(ws => 
        ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING
      );

      staleConnections.forEach(ws => {
        activeConnections.delete(ws);
      });

      if (activeConnections.size > 5) { // Arbitrary threshold
        console.warn(`High number of active WebSocket connections: ${activeConnections.size}`);
      }
    }, 20000);

    this.cleanupTasks.push(() => {
      clearInterval(connectionCleanup);
      // Close all active connections on cleanup
      activeConnections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });
    });
  }

  private handleHMREvent(): void {
    this.hmrState.lastReload = Date.now();
    this.hmrState.reloadCount += 1;
    this.hmrState.isHMRActive = true;

    // Reset conflict detection after HMR
    this.hmrState.conflictDetected = false;

    this.notifyConflictListeners('hmr_reload', {
      count: this.hmrState.reloadCount,
      timestamp: this.hmrState.lastReload
    });

    // Auto-cleanup after rapid reloads
    if (this.hmrState.reloadCount > 5) {
      console.warn('Rapid HMR reloads detected, triggering cleanup...');
      this.performEmergencyCleanup();
    }
  }

  private updateActivity(): void {
    this.processState.lastActivity = Date.now();
  }

  private saveProcessState(): void {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.setItem('dev_process_state', JSON.stringify(this.processState));
    } catch (error) {
      console.warn('Failed to save process state:', error);
    }
  }

  private markProcessAsEnding(): void {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.removeItem('dev_process_state');
    } catch (error) {
      console.warn('Failed to clear process state:', error);
    }
  }

  private cleanupStaleProcess(): void {
    try {
      // Clear potentially stale storage
      sessionStorage.removeItem('dev_process_state');
      
      // Clear React DevTools state if present
      if (typeof window !== 'undefined' && (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        delete (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__.reactDevtoolsAgent;
      }

      console.log('Stale process cleanup completed');
    } catch (error) {
      console.error('Stale process cleanup failed:', error);
    }
  }

  private performEmergencyCleanup(): void {
    console.log('Performing emergency development cleanup...');

    // Run all cleanup tasks
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.warn('Cleanup task failed:', error);
      }
    });

    // Reset state
    this.hmrState.reloadCount = 0;
    this.hmrState.conflictDetected = false;
    
    // Force garbage collection if available
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }

    this.notifyConflictListeners('emergency_cleanup', {
      timestamp: Date.now()
    });
  }

  private notifyConflictListeners(type: string, data: any): void {
    this.conflictListeners.forEach((listener, key) => {
      try {
        listener({ type, data, timestamp: Date.now() });
      } catch (error) {
        console.warn(`Conflict listener ${key} failed:`, error);
      }
    });
  }

  // Public API
  public registerConflictListener(key: string, listener: Function): void {
    this.conflictListeners.set(key, listener);
  }

  public unregisterConflictListener(key: string): void {
    this.conflictListeners.delete(key);
  }

  public getState(): { hmr: HMRState; process: ProcessState } {
    return {
      hmr: { ...this.hmrState },
      process: { ...this.processState }
    };
  }

  public forceCleanup(): void {
    this.performEmergencyCleanup();
  }

  public isConflictDetected(): boolean {
    return this.hmrState.conflictDetected;
  }

  public destroy(): void {
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.warn('Cleanup task failed during destroy:', error);
      }
    });
    this.cleanupTasks = [];
    this.conflictListeners.clear();
  }
}

// Export singleton instance
export const developmentModeProtector = DevelopmentModeProtector.getInstance();

// Auto-initialize in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Initialize protection on next tick to avoid blocking
  setTimeout(() => {
    const protector = developmentModeProtector;
    console.log('Development mode protection initialized', protector);
  }, 0);
}

export default DevelopmentModeProtector;