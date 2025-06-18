import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface SessionReminder {
  id: string;
  sessionId: string;
  mentorAddress: string;
  studentAddress: string;
  mentorName: string;
  sessionTitle: string;
  sessionDate: string;
  sessionTime: string;
  sessionDateTime: Date; // Full date/time object for calculations
  userRole: 'mentor' | 'student'; // Role of the current user for this session
  reminderType: '30min' | '5min'; // When to show the reminder
  createdAt: string;
  dismissed: boolean; // Whether user has dismissed this reminder
}

interface NotificationContextType {
  sessionReminders: SessionReminder[];
  addSessionReminder: (session: Omit<SessionReminder, 'id' | 'createdAt' | 'dismissed'>) => void;
  removeSessionReminder: (id: string) => void;
  dismissReminder: (id: string) => void;
  getActiveReminders: () => SessionReminder[];
  getTotalActiveCount: () => number;
  getHighPriorityCount: () => number;
  // Utility function to add both 30min and 5min reminders for a session
  addSessionWithReminders: (sessionData: {
    sessionId: string;
    mentorAddress: string;
    studentAddress: string;
    mentorName: string;
    sessionTitle: string;
    sessionDate: string;
    sessionTime: string;
    sessionDateTime: Date;
  }, currentUserAddress: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

const SESSION_REMINDERS_KEY = 'chain_academy_session_reminders';
const BACKUP_REMINDERS_KEY = 'chain_academy_session_reminders_backup';
const SESSION_REMINDERS_SESSION_KEY = 'chain_academy_session_reminders_session';
const SESSION_SYNC_KEY = 'chain_academy_notification_sync';
const INDEXEDDB_NAME = 'ChainAcademyNotifications';
const INDEXEDDB_VERSION = 2;
const OBJECT_STORE_NAME = 'sessionReminders';

// Utility functions for robust localStorage operations
const safeStorageGet = (key: string): string | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key);
    }
  } catch (error) {
    console.error(`Error reading from localStorage key ${key}:`, error);
  }
  return null;
};

const safeStorageSet = (key: string, value: string): boolean => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, value);
      // Verify the write was successful
      const verified = localStorage.getItem(key);
      return verified === value;
    }
  } catch (error) {
    console.error(`Error writing to localStorage key ${key}:`, error);
  }
  return false;
};

const safeStorageRemove = (key: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.error(`Error removing from localStorage key ${key}:`, error);
  }
};

// SessionStorage utilities for temporary backup
const safeSessionGet = (key: string): string | null => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return sessionStorage.getItem(key);
    }
  } catch (error) {
    console.error(`Error reading from sessionStorage key ${key}:`, error);
  }
  return null;
};

const safeSessionSet = (key: string, value: string): boolean => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem(key, value);
      const verified = sessionStorage.getItem(key);
      return verified === value;
    }
  } catch (error) {
    console.error(`Error writing to sessionStorage key ${key}:`, error);
  }
  return false;
};

// Clear corrupted IndexedDB data (emergency cleanup)
const clearIndexedDB = async (): Promise<boolean> => {
  try {
    if (!window.indexedDB) return false;
    
    return new Promise((resolve) => {
      const deleteRequest = indexedDB.deleteDatabase(INDEXEDDB_NAME);
      
      deleteRequest.onsuccess = () => {
        console.log('✅ NotificationContext: IndexedDB cleared successfully');
        resolve(true);
      };
      
      deleteRequest.onerror = () => {
        console.error('❌ NotificationContext: Failed to clear IndexedDB');
        resolve(false);
      };
      
      deleteRequest.onblocked = () => {
        console.warn('⚠️ NotificationContext: IndexedDB clear blocked, trying force close');
        // Force clear in next tick
        setTimeout(() => resolve(true), 100);
      };
    });
  } catch (error) {
    console.error('❌ NotificationContext: Error clearing IndexedDB:', error);
    return false;
  }
};

// IndexedDB emergency backup (for extreme persistence)
const saveToIndexedDB = async (data: SessionReminder[]): Promise<boolean> => {
  try {
    if (!window.indexedDB) return false;
    
    const request = indexedDB.open(INDEXEDDB_NAME, INDEXEDDB_VERSION);
    
    return new Promise((resolve) => {
      request.onerror = () => {
        console.warn('NotificationContext: IndexedDB save open failed');
        resolve(false);
      };
      
      request.onupgradeneeded = (event) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
            db.createObjectStore(OBJECT_STORE_NAME, { keyPath: 'id' });
            console.log('✅ NotificationContext: Created sessionReminders object store for save');
          }
        } catch (error) {
          console.error('❌ NotificationContext: Error creating object store for save:', error);
        }
      };
      
      request.onsuccess = (event) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // Check if object store exists before creating transaction
          if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
            console.warn('NotificationContext: sessionReminders object store does not exist for save');
            db.close();
            resolve(false);
            return;
          }
          
          const transaction = db.transaction([OBJECT_STORE_NAME], 'readwrite');
          
          transaction.onerror = () => {
            console.error('NotificationContext: IndexedDB save transaction failed');
            db.close();
            resolve(false);
          };
          
          transaction.oncomplete = () => {
            console.log('✅ NotificationContext: IndexedDB save successful');
            db.close();
            resolve(true);
          };
          
          const store = transaction.objectStore(OBJECT_STORE_NAME);
          
          // Clear existing data and save new
          store.clear().onsuccess = () => {
            try {
              data.forEach(reminder => {
                store.add(reminder);
              });
            } catch (error) {
              console.error('❌ NotificationContext: Error adding data to IndexedDB:', error);
              db.close();
              resolve(false);
            }
          };
          
        } catch (error) {
          console.error('❌ NotificationContext: Error in IndexedDB save success handler:', error);
          resolve(false);
        }
      };
    });
  } catch (error) {
    console.error('❌ NotificationContext: IndexedDB save error:', error);
    return false;
  }
};

const loadFromIndexedDB = async (): Promise<SessionReminder[]> => {
  try {
    if (!window.indexedDB) return [];
    
    const request = indexedDB.open(INDEXEDDB_NAME, INDEXEDDB_VERSION);
    
    return new Promise((resolve) => {
      request.onerror = () => {
        console.warn('NotificationContext: IndexedDB open failed');
        resolve([]);
      };
      
      request.onupgradeneeded = (event) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
            db.createObjectStore(OBJECT_STORE_NAME, { keyPath: 'id' });
            console.log('✅ NotificationContext: Created sessionReminders object store');
          }
        } catch (error) {
          console.error('❌ NotificationContext: Error creating object store:', error);
        }
      };
      
      request.onsuccess = (event) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // Check if object store exists before creating transaction
          if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
            console.warn('NotificationContext: sessionReminders object store does not exist');
            db.close();
            resolve([]);
            return;
          }
          
          const transaction = db.transaction([OBJECT_STORE_NAME], 'readonly');
          
          transaction.onerror = () => {
            console.error('NotificationContext: IndexedDB transaction failed');
            db.close();
            resolve([]);
          };
          
          const store = transaction.objectStore(OBJECT_STORE_NAME);
          const getAllRequest = store.getAll();
          
          getAllRequest.onsuccess = () => {
            try {
              const data = getAllRequest.result || [];
              console.log('🔍 NotificationContext: IndexedDB loaded:', data.length, 'reminders');
              db.close();
              resolve(data);
            } catch (error) {
              console.error('❌ NotificationContext: Error reading IndexedDB data:', error);
              db.close();
              resolve([]);
            }
          };
          
          getAllRequest.onerror = () => {
            console.error('NotificationContext: IndexedDB getAll failed');
            db.close();
            resolve([]);
          };
          
        } catch (error) {
          console.error('❌ NotificationContext: Error in IndexedDB success handler:', error);
          resolve([]);
        }
      };
    });
  } catch (error) {
    console.error('❌ NotificationContext: IndexedDB load error:', error);
    return [];
  }
};

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [sessionReminders, setSessionReminders] = useState<SessionReminder[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Enhanced data validation function
  const validateReminderData = (data: any): SessionReminder[] => {
    if (!Array.isArray(data)) {
      console.warn('NotificationContext: Invalid data format, expected array');
      return [];
    }
    
    const validReminders = data.filter((reminder: any) => {
      const isValid = reminder && 
        typeof reminder === 'object' &&
        typeof reminder.id === 'string' &&
        typeof reminder.sessionId === 'string' &&
        typeof reminder.mentorAddress === 'string' &&
        typeof reminder.studentAddress === 'string' &&
        typeof reminder.mentorName === 'string' &&
        typeof reminder.sessionTitle === 'string' &&
        typeof reminder.sessionDate === 'string' &&
        typeof reminder.sessionTime === 'string' &&
        typeof reminder.createdAt === 'string' &&
        (reminder.sessionDateTime instanceof Date || typeof reminder.sessionDateTime === 'string') &&
        ['mentor', 'student'].includes(reminder.userRole) &&
        ['30min', '5min'].includes(reminder.reminderType) &&
        typeof reminder.dismissed === 'boolean';
      
      if (!isValid) {
        console.warn('NotificationContext: Invalid reminder object:', reminder);
      }
      
      return isValid;
    });
    
    // Convert sessionDateTime strings back to Date objects if needed
    return validReminders.map((reminder: any) => ({
      ...reminder,
      sessionDateTime: reminder.sessionDateTime instanceof Date 
        ? reminder.sessionDateTime 
        : new Date(reminder.sessionDateTime)
    })) as SessionReminder[];
  };

  // Helper function to check if a reminder should be shown
  const shouldShowReminder = (reminder: SessionReminder): boolean => {
    if (reminder.dismissed) return false;
    
    const now = new Date();
    const sessionDateTime = reminder.sessionDateTime;
    const timeDiff = sessionDateTime.getTime() - now.getTime();
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));
    
    // Show 30min reminder when between 30-25 minutes before session
    if (reminder.reminderType === '30min') {
      return minutesDiff <= 30 && minutesDiff > 25;
    }
    
    // Show 5min reminder when between 5-0 minutes before session
    if (reminder.reminderType === '5min') {
      return minutesDiff <= 5 && minutesDiff > 0;
    }
    
    return false;
  };

  // Robust loading with multiple fallback layers
  useEffect(() => {
    const loadSessionReminders = async () => {
      let loadedReminders: SessionReminder[] = [];
      let loadSource = 'none';
      
      try {
        // Primary storage attempt
        const stored = safeStorageGet(SESSION_REMINDERS_KEY);
        console.log('🔍 NotificationContext: Loading from primary storage:', stored ? 'Found data' : 'No data');
        
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            const validated = validateReminderData(parsed);
            if (validated.length > 0) {
              loadedReminders = validated;
              loadSource = 'primary';
              console.log('✅ NotificationContext: Loaded from primary storage:', validated.length, 'reminders');
            }
          } catch (parseError) {
            console.warn('NotificationContext: Failed to parse primary storage data:', parseError);
          }
        }
        
        // Backup storage attempt if primary failed
        if (loadedReminders.length === 0) {
          const backupStored = safeStorageGet(BACKUP_REMINDERS_KEY);
          console.log('🔍 NotificationContext: Trying backup storage:', backupStored ? 'Found backup data' : 'No backup data');
          
          if (backupStored) {
            try {
              const parsed = JSON.parse(backupStored);
              const validated = validateReminderData(parsed);
              if (validated.length > 0) {
                loadedReminders = validated;
                loadSource = 'backup';
                console.log('✅ NotificationContext: Restored from backup storage:', validated.length, 'reminders');
                
                // Restore primary storage from backup
                const serialized = JSON.stringify(validated);
                const writeSuccess = safeStorageSet(SESSION_REMINDERS_KEY, serialized);
                if (writeSuccess) {
                  console.log('🔄 NotificationContext: Restored primary storage from backup');
                } else {
                  console.warn('⚠️ NotificationContext: Failed to restore primary storage from backup');
                }
              }
            } catch (parseError) {
              console.warn('NotificationContext: Failed to parse backup storage data:', parseError);
            }
          }
        }
        
        // Session storage attempt if both primary and backup failed
        if (loadedReminders.length === 0) {
          const sessionStored = safeSessionGet(SESSION_REMINDERS_SESSION_KEY);
          console.log('🔍 NotificationContext: Trying session storage:', sessionStored ? 'Found session data' : 'No session data');
          
          if (sessionStored) {
            try {
              const parsed = JSON.parse(sessionStored);
              const validated = validateReminderData(parsed);
              if (validated.length > 0) {
                loadedReminders = validated;
                loadSource = 'session';
                console.log('✅ NotificationContext: Restored from session storage:', validated.length, 'reminders');
                
                // Restore both localStorage from session
                const serialized = JSON.stringify(validated);
                const primarySuccess = safeStorageSet(SESSION_REMINDERS_KEY, serialized);
                const backupSuccess = safeStorageSet(BACKUP_REMINDERS_KEY, serialized);
                
                if (primarySuccess && backupSuccess) {
                  console.log('🔄 NotificationContext: Restored both localStorage from session');
                } else {
                  console.warn('⚠️ NotificationContext: Partial restore from session storage');
                }
              }
            } catch (parseError) {
              console.warn('NotificationContext: Failed to parse session storage data:', parseError);
            }
          }
        }
        
        // IndexedDB attempt if all storage methods failed
        if (loadedReminders.length === 0) {
          console.log('🔍 NotificationContext: Trying IndexedDB storage...');
          try {
            const indexedDBData = await loadFromIndexedDB();
            if (indexedDBData.length > 0) {
              const validated = validateReminderData(indexedDBData);
              if (validated.length > 0) {
                loadedReminders = validated;
                loadSource = 'indexeddb';
                console.log('✅ NotificationContext: Restored from IndexedDB:', validated.length, 'reminders');
                
                // Restore all storage methods from IndexedDB
                const serialized = JSON.stringify(validated);
                const primarySuccess = safeStorageSet(SESSION_REMINDERS_KEY, serialized);
                const backupSuccess = safeStorageSet(BACKUP_REMINDERS_KEY, serialized);
                const sessionSuccess = safeSessionSet(SESSION_REMINDERS_SESSION_KEY, serialized);
                
                console.log('🔄 NotificationContext: Storage restoration results:', {
                  primary: primarySuccess,
                  backup: backupSuccess,
                  session: sessionSuccess
                });
              }
            }
          } catch (indexedDBError) {
            console.warn('NotificationContext: IndexedDB loading failed:', indexedDBError);
            
            // If IndexedDB is corrupted, try to clear it
            const error = indexedDBError as Error;
            if (error.message?.includes('NotFoundError') || 
                error.message?.includes('One of the specified object stores was not found')) {
              console.log('🧹 NotificationContext: Attempting to clear corrupted IndexedDB...');
              try {
                await clearIndexedDB();
                console.log('✅ NotificationContext: Cleared corrupted IndexedDB');
              } catch (clearError) {
                console.error('❌ NotificationContext: Failed to clear corrupted IndexedDB:', clearError);
              }
            }
          }
        }
        
        // Set the loaded data
        setSessionReminders(loadedReminders);
        setIsInitialized(true);
        
        if (loadedReminders.length > 0) {
          console.log(`✅ NotificationContext: Successfully loaded ${loadedReminders.length} reminders from ${loadSource} storage`);
        } else {
          console.log('ℹ️ NotificationContext: No valid reminder data found in any storage');
        }
        
        // Update session sync timestamp
        const syncData = {
          timestamp: Date.now(),
          reminderCount: loadedReminders.length,
          source: loadSource
        };
        safeStorageSet(SESSION_SYNC_KEY, JSON.stringify(syncData));
        
      } catch (error) {
        console.error('❌ NotificationContext: Critical error during reminder loading:', error);
        setIsInitialized(true);
        
        // Clear corrupted data
        safeStorageRemove(SESSION_REMINDERS_KEY);
        safeStorageRemove(BACKUP_REMINDERS_KEY);
      }
    };

    // Call async function
    loadSessionReminders().catch(error => {
      console.error('❌ NotificationContext: Failed to load reminders:', error);
      setIsInitialized(true);
    });
  }, []);

  // Cross-tab synchronization using storage events
  useEffect(() => {
    if (!isInitialized) return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === SESSION_REMINDERS_KEY && event.newValue !== event.oldValue) {
        console.log('🔄 NotificationContext: Storage changed from another tab, syncing...');
        
        try {
          if (event.newValue) {
            const parsed = JSON.parse(event.newValue);
            const validated = validateReminderData(parsed);
            console.log('🔄 NotificationContext: Synced from another tab:', validated.length, 'reminders');
            setSessionReminders(validated);
          } else {
            console.log('🔄 NotificationContext: Storage cleared from another tab');
            setSessionReminders([]);
          }
        } catch (error) {
          console.error('❌ NotificationContext: Error syncing from another tab:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isInitialized]);

  // Periodic integrity check to ensure data persistence
  useEffect(() => {
    if (!isInitialized) return;

    const integrityCheck = () => {
      const storedPrimary = safeStorageGet(SESSION_REMINDERS_KEY);
      const storedBackup = safeStorageGet(BACKUP_REMINDERS_KEY);
      
      // If both are lost, restore from current state
      if (!storedPrimary && !storedBackup && sessionReminders.length > 0) {
        console.warn('🔄 NotificationContext: Storage lost, restoring from memory');
        const serialized = JSON.stringify(sessionReminders);
        safeStorageSet(SESSION_REMINDERS_KEY, serialized);
        safeStorageSet(BACKUP_REMINDERS_KEY, serialized);
      }
      
      // If primary is lost but backup exists, restore primary
      if (!storedPrimary && storedBackup) {
        console.warn('🔄 NotificationContext: Primary storage lost, restoring from backup');
        safeStorageSet(SESSION_REMINDERS_KEY, storedBackup);
      }
      
      // If backup is lost but primary exists, restore backup
      if (storedPrimary && !storedBackup) {
        console.warn('🔄 NotificationContext: Backup storage lost, restoring from primary');
        safeStorageSet(BACKUP_REMINDERS_KEY, storedPrimary);
      }
    };

    // Run integrity check every 30 seconds
    const interval = setInterval(integrityCheck, 30000);
    
    return () => clearInterval(interval);
  }, [isInitialized, sessionReminders]);

  // Enhanced saving with multiple backup layers
  useEffect(() => {
    // Only save if initialized to avoid overwriting during load
    if (!isInitialized) return;
    
    try {
      const serializedData = JSON.stringify(sessionReminders);
      console.log('💾 NotificationContext: Saving to storage:', sessionReminders.length, 'reminders');
      
      // Save to primary storage
      const primarySuccess = safeStorageSet(SESSION_REMINDERS_KEY, serializedData);
      if (primarySuccess) {
        console.log('✅ NotificationContext: Primary storage save successful');
      } else {
        console.error('❌ NotificationContext: Primary storage save failed');
      }
      
      // Always maintain backup storage
      const backupSuccess = safeStorageSet(BACKUP_REMINDERS_KEY, serializedData);
      if (backupSuccess) {
        console.log('✅ NotificationContext: Backup storage save successful');
      } else {
        console.error('❌ NotificationContext: Backup storage save failed');
      }
      
      // Also save to session storage as additional backup
      const sessionSuccess = safeSessionSet(SESSION_REMINDERS_SESSION_KEY, serializedData);
      if (sessionSuccess) {
        console.log('✅ NotificationContext: Session storage save successful');
      } else {
        console.warn('⚠️ NotificationContext: Session storage save failed');
      }
      
      // Also save to IndexedDB for maximum persistence
      if (sessionReminders.length > 0) {
        saveToIndexedDB(sessionReminders).then(indexedDBSuccess => {
          if (indexedDBSuccess) {
            console.log('✅ NotificationContext: IndexedDB save successful');
          } else {
            console.warn('⚠️ NotificationContext: IndexedDB save failed');
          }
        }).catch(error => {
          console.error('❌ NotificationContext: IndexedDB save error:', error);
        });
      }
      
      // Update session sync
      const syncData = {
        timestamp: Date.now(),
        reminderCount: sessionReminders.length,
        lastSave: Date.now(),
        primarySuccess,
        backupSuccess,
        sessionSuccess
      };
      safeStorageSet(SESSION_SYNC_KEY, JSON.stringify(syncData));
      
      // Verification read-back check
      setTimeout(() => {
        const verifyPrimary = safeStorageGet(SESSION_REMINDERS_KEY);
        const verifyBackup = safeStorageGet(BACKUP_REMINDERS_KEY);
        
        if (!verifyPrimary && !verifyBackup) {
          console.error('🚨 NotificationContext: CRITICAL - Both primary and backup storage verification failed!');
        } else if (!verifyPrimary && verifyBackup) {
          console.warn('⚠️ NotificationContext: Primary storage lost, backup exists');
        } else if (verifyPrimary && !verifyBackup) {
          console.warn('⚠️ NotificationContext: Backup storage lost, primary exists');
        } else {
          console.log('✅ NotificationContext: Storage verification successful');
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ NotificationContext: Critical error during save:', error);
    }
  }, [sessionReminders, isInitialized]);

  // Periodic cleanup of expired reminders
  useEffect(() => {
    if (!isInitialized) return;

    // Clean up expired reminders every 5 minutes
    const cleanupInterval = setInterval(cleanupExpiredReminders, 5 * 60 * 1000);
    
    // Also clean up on initial load
    cleanupExpiredReminders();
    
    return () => clearInterval(cleanupInterval);
  }, [isInitialized]);

  // Session reminder management functions
  const addSessionReminder = (session: Omit<SessionReminder, 'id' | 'createdAt' | 'dismissed'>) => {
    const newReminder: SessionReminder = {
      ...session,
      id: `${session.sessionId}_${session.reminderType}_${Date.now()}`,
      createdAt: new Date().toISOString(),
      dismissed: false
    };

    console.log('➕ NotificationContext: Adding new session reminder:', newReminder);

    setSessionReminders(prev => {
      // Check if already exists to avoid duplicates
      const exists = prev.some(r => 
        r.sessionId === session.sessionId && 
        r.reminderType === session.reminderType && 
        r.userRole === session.userRole
      );
      if (exists) {
        console.log('⚠️ NotificationContext: Reminder already exists, skipping');
        return prev;
      }
      console.log('✅ NotificationContext: Adding reminder to list');
      return [...prev, newReminder];
    });
  };

  const removeSessionReminder = (id: string) => {
    console.log('🗑️ NotificationContext: Removing session reminder:', id);
    setSessionReminders(prev => prev.filter(reminder => reminder.id !== id));
  };

  const dismissReminder = (id: string) => {
    console.log('👋 NotificationContext: Dismissing reminder:', id);
    setSessionReminders(prev => 
      prev.map(reminder => 
        reminder.id === id 
          ? { ...reminder, dismissed: true }
          : reminder
      )
    );
  };

  const getActiveReminders = (): SessionReminder[] => {
    return sessionReminders.filter(reminder => shouldShowReminder(reminder));
  };

  const getTotalActiveCount = (): number => {
    return getActiveReminders().length;
  };

  const getHighPriorityCount = (): number => {
    // High priority reminders are 5-minute reminders
    return getActiveReminders().filter(reminder => reminder.reminderType === '5min').length;
  };

  // Clean up expired reminders (sessions that have already passed)
  const cleanupExpiredReminders = () => {
    const now = new Date();
    setSessionReminders(prev => {
      const unexpired = prev.filter(reminder => {
        const sessionDateTime = reminder.sessionDateTime;
        const timeDiff = sessionDateTime.getTime() - now.getTime();
        // Keep reminders for sessions that haven't started yet (positive time diff)
        // or sessions that started less than 1 hour ago (for grace period)
        return timeDiff > -3600000; // -1 hour in milliseconds
      });
      
      if (unexpired.length !== prev.length) {
        console.log(`🧹 NotificationContext: Cleaned up ${prev.length - unexpired.length} expired reminders`);
      }
      
      return unexpired;
    });
  };

  // Diagnostic function to check all storage layers
  const runStorageDiagnostic = async () => {
    console.log('🔧 NotificationContext: Running comprehensive storage diagnostic...');
    
    const diagnostic = {
      timestamp: new Date().toISOString(),
      memoryState: sessionReminders.length,
      localStorage: {
        primary: !!safeStorageGet(SESSION_REMINDERS_KEY),
        backup: !!safeStorageGet(BACKUP_REMINDERS_KEY),
        sync: !!safeStorageGet(SESSION_SYNC_KEY)
      },
      sessionStorage: {
        session: !!safeSessionGet(SESSION_REMINDERS_SESSION_KEY)
      },
      indexedDB: {
        available: !!window.indexedDB,
        data: 0
      }
    };
    
    // Check IndexedDB
    try {
      const indexedData = await loadFromIndexedDB();
      diagnostic.indexedDB.data = indexedData.length;
    } catch (error) {
      console.error('Diagnostic IndexedDB check failed:', error);
    }
    
    console.log('🔧 Storage Diagnostic Results:', diagnostic);
    return diagnostic;
  };

  // Utility function to add both 30min and 5min reminders for a session
  const addSessionWithReminders = (sessionData: {
    sessionId: string;
    mentorAddress: string;
    studentAddress: string;
    mentorName: string;
    sessionTitle: string;
    sessionDate: string;
    sessionTime: string;
    sessionDateTime: Date;
  }, currentUserAddress: string) => {
    const userRole: 'mentor' | 'student' = currentUserAddress === sessionData.mentorAddress ? 'mentor' : 'student';
    
    // Add 30-minute reminder
    addSessionReminder({
      sessionId: sessionData.sessionId,
      mentorAddress: sessionData.mentorAddress,
      studentAddress: sessionData.studentAddress,
      mentorName: sessionData.mentorName,
      sessionTitle: sessionData.sessionTitle,
      sessionDate: sessionData.sessionDate,
      sessionTime: sessionData.sessionTime,
      sessionDateTime: sessionData.sessionDateTime,
      userRole,
      reminderType: '30min'
    });
    
    // Add 5-minute reminder
    addSessionReminder({
      sessionId: sessionData.sessionId,
      mentorAddress: sessionData.mentorAddress,
      studentAddress: sessionData.studentAddress,
      mentorName: sessionData.mentorName,
      sessionTitle: sessionData.sessionTitle,
      sessionDate: sessionData.sessionDate,
      sessionTime: sessionData.sessionTime,
      sessionDateTime: sessionData.sessionDateTime,
      userRole,
      reminderType: '5min'
    });
    
    console.log(`✅ Added session reminders for ${userRole}:`, {
      sessionId: sessionData.sessionId,
      sessionTitle: sessionData.sessionTitle,
      sessionDateTime: sessionData.sessionDateTime,
      reminders: ['30min', '5min']
    });
  };

  // Make diagnostic available globally for debugging
  if (typeof window !== 'undefined') {
    (window as any).notificationDiagnostic = runStorageDiagnostic;
  }

  return (
    <NotificationContext.Provider value={{
      sessionReminders,
      addSessionReminder,
      removeSessionReminder,
      dismissReminder,
      getActiveReminders,
      getTotalActiveCount,
      getHighPriorityCount,
      addSessionWithReminders
    }}>
      {children}
    </NotificationContext.Provider>
  );
};