/**
 * SessionTracker - Enhanced session tracking for V8
 * Manages session state persistence and tracking
 */

import fs from 'fs';
import path from 'path';

export interface TrackedSession {
  sessionId: string;
  chainId: number;
  createdAt: number;
  lastChecked: number;
  status: number; // SessionStatus enum value
  isTracked: boolean;
  completedButNotReleased: boolean;
}

export class SessionTracker {
  private sessions: Map<string, TrackedSession> = new Map();
  private filePath: string;
  private autoSaveInterval: NodeJS.Timeout | null = null;

  constructor(filePath: string = './data/session-tracker-v8.json') {
    this.filePath = filePath;
    this.ensureDirectoryExists();
    this.loadSessions();
    this.startAutoSave();
  }

  private ensureDirectoryExists(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadSessions(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(data);
        
        if (parsed.sessions && Array.isArray(parsed.sessions)) {
          this.sessions.clear();
          for (const session of parsed.sessions) {
            this.sessions.set(session.sessionId, session);
          }
          console.log(`[SessionTracker] Loaded ${this.sessions.size} sessions from ${this.filePath}`);
        }
      } else {
        console.log(`[SessionTracker] No existing session file found, starting fresh`);
      }
    } catch (error) {
      console.error(`[SessionTracker] Error loading sessions:`, error);
      this.sessions.clear();
    }
  }

  public async save(): Promise<void> {
    try {
      const data = {
        version: '8.0.0',
        lastSaved: Date.now(),
        sessionCount: this.sessions.size,
        sessions: Array.from(this.sessions.values())
      };

      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
      console.log(`[SessionTracker] Saved ${this.sessions.size} sessions to ${this.filePath}`);
    } catch (error) {
      console.error(`[SessionTracker] Error saving sessions:`, error);
    }
  }

  public addSession(sessionId: string, session: TrackedSession): void {
    this.sessions.set(sessionId, {
      ...session,
      lastChecked: Date.now()
    });
  }

  public updateSession(sessionId: string, updates: Partial<TrackedSession>): void {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      this.sessions.set(sessionId, {
        ...existing,
        ...updates,
        lastChecked: Date.now()
      });
    }
  }

  public getSession(sessionId: string): TrackedSession | undefined {
    return this.sessions.get(sessionId);
  }

  public removeSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  public getAllSessions(): TrackedSession[] {
    return Array.from(this.sessions.values());
  }

  public getSessionsByChain(chainId: number): TrackedSession[] {
    return Array.from(this.sessions.values()).filter(s => s.chainId === chainId);
  }

  public getSessionsByStatus(status: number): TrackedSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === status);
  }

  public getStaleSessions(maxAge: number = 24 * 60 * 60 * 1000): TrackedSession[] {
    const cutoff = Date.now() - maxAge;
    return Array.from(this.sessions.values()).filter(s => s.lastChecked < cutoff);
  }

  public get sessions(): Map<string, TrackedSession> {
    return this.sessions;
  }

  public getStats(): { total: number; byChain: Record<number, number>; byStatus: Record<number, number> } {
    const stats = {
      total: this.sessions.size,
      byChain: {} as Record<number, number>,
      byStatus: {} as Record<number, number>
    };

    for (const session of this.sessions.values()) {
      // Count by chain
      stats.byChain[session.chainId] = (stats.byChain[session.chainId] || 0) + 1;
      
      // Count by status
      stats.byStatus[session.status] = (stats.byStatus[session.status] || 0) + 1;
    }

    return stats;
  }

  private startAutoSave(): void {
    // Auto-save every 5 minutes
    this.autoSaveInterval = setInterval(() => {
      this.save();
    }, 5 * 60 * 1000);
  }

  public destroy(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    this.save(); // Final save
  }
}