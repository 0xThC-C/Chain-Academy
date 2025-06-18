/**
 * Session Manager utility to handle session lifecycle and prevent memory leaks
 */

interface SessionState {
  sessionId: string;
  isActive: boolean;
  startTime: number;
  resources: Set<() => void>; // Cleanup functions
}

class SessionManager {
  private sessions = new Map<string, SessionState>();
  private globalCleanups = new Set<() => void>();

  /**
   * Start a new session
   */
  startSession(sessionId: string): void {
    // Clean up any existing session
    this.endSession(sessionId);

    const sessionState: SessionState = {
      sessionId,
      isActive: true,
      startTime: Date.now(),
      resources: new Set()
    };

    this.sessions.set(sessionId, sessionState);
    console.log(`Session ${sessionId} started`);
  }

  /**
   * Add a cleanup function to the current session
   */
  addCleanup(sessionId: string, cleanup: () => void): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.resources.add(cleanup);
    }
  }

  /**
   * Add a global cleanup function (will be called when all sessions end)
   */
  addGlobalCleanup(cleanup: () => void): void {
    this.globalCleanups.add(cleanup);
  }

  /**
   * End a session and run all cleanup functions
   */
  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.log(`Ending session ${sessionId}...`);
    session.isActive = false;

    // Run all cleanup functions
    session.resources.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.warn('Error during cleanup:', error);
      }
    });

    // Remove session
    this.sessions.delete(sessionId);
    console.log(`Session ${sessionId} ended`);
  }

  /**
   * End all sessions
   */
  endAllSessions(): void {
    console.log('Ending all sessions...');
    
    this.sessions.forEach((_session, sessionId) => {
      this.endSession(sessionId);
    });

    // Run global cleanups
    this.globalCleanups.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.warn('Error during global cleanup:', error);
      }
    });

    this.globalCleanups.clear();
  }

  /**
   * Check if a session is active
   */
  isSessionActive(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session?.isActive ?? false;
  }

  /**
   * Get session duration in milliseconds
   */
  getSessionDuration(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    return session ? Date.now() - session.startTime : 0;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys()).filter(sessionId => 
      this.isSessionActive(sessionId)
    );
  }

  /**
   * Emergency cleanup - force end all sessions and cleanups
   */
  emergencyCleanup(): void {
    console.warn('Running emergency cleanup...');
    
    try {
      this.endAllSessions();
    } catch (error) {
      console.error('Error during emergency cleanup:', error);
    }

    // Force clear everything
    this.sessions.clear();
    this.globalCleanups.clear();
  }
}

// Global instance
const sessionManager = new SessionManager();

// Add global cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    sessionManager.emergencyCleanup();
  });

  // Add visibility change listener to handle tab switching
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Page is hidden, but don't cleanup yet
      console.log('Page hidden, sessions remain active');
    } else {
      // Page is visible again
      console.log('Page visible, sessions active:', sessionManager.getActiveSessions());
    }
  });
}

export default sessionManager;

/**
 * Hook-like utility for React components to manage session lifecycle
 */
export const useSessionManager = (sessionId: string) => {
  const startSession = () => {
    sessionManager.startSession(sessionId);
  };

  const endSession = () => {
    sessionManager.endSession(sessionId);
  };

  const addCleanup = (cleanup: () => void) => {
    sessionManager.addCleanup(sessionId, cleanup);
  };

  const isActive = () => {
    return sessionManager.isSessionActive(sessionId);
  };

  return {
    startSession,
    endSession,
    addCleanup,
    isActive
  };
};

/**
 * Memory leak detector
 */
export const detectMemoryLeaks = () => {
  if (typeof window !== 'undefined' && (window as any).performance?.memory) {
    const memory = (window as any).performance.memory;
    
    const memoryInfo = {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
    };

    console.log('Memory usage:', memoryInfo);

    // Warn if memory usage is high
    if (memoryInfo.usagePercentage > 80) {
      console.warn('High memory usage detected:', memoryInfo.usagePercentage.toFixed(2) + '%');
      return memoryInfo;
    }

    return memoryInfo;
  }

  return null;
};