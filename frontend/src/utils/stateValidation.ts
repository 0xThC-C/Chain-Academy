// Comprehensive State Validation System for Context Corruption Detection
import { safeStorageCleanup, backupCriticalData, restoreCriticalData } from './dataProtection';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  correctedData?: any;
}

interface ContextValidationRule<T = any> {
  name: string;
  validate: (data: T) => ValidationResult;
  repair?: (data: T) => T;
  critical: boolean;
}

interface ValidationConfig {
  enableAutoRepair: boolean;
  enableLogging: boolean;
  throwOnCriticalError: boolean;
  maxRepairAttempts: number;
}

class StateValidationSystem {
  private static instance: StateValidationSystem;
  private validationRules: Map<string, ContextValidationRule[]> = new Map();
  private config: ValidationConfig = {
    enableAutoRepair: true,
    enableLogging: true,
    throwOnCriticalError: false,
    maxRepairAttempts: 3
  };

  private constructor() {
    this.initializeDefaultRules();
  }

  static getInstance(): StateValidationSystem {
    if (!StateValidationSystem.instance) {
      StateValidationSystem.instance = new StateValidationSystem();
    }
    return StateValidationSystem.instance;
  }

  private initializeDefaultRules(): void {
    // Theme Context validation rules
    this.registerContextRules('theme', [
      {
        name: 'darkMode_boolean',
        validate: (data) => {
          const errors: string[] = [];
          if (typeof data.darkMode !== 'boolean') {
            errors.push('darkMode must be a boolean');
          }
          return { isValid: errors.length === 0, errors, warnings: [] };
        },
        repair: (data) => ({
          ...data,
          darkMode: Boolean(data.darkMode)
        }),
        critical: false
      },
      {
        name: 'isDarkMode_consistency',
        validate: (data) => {
          const errors: string[] = [];
          if (data.darkMode !== data.isDarkMode) {
            errors.push('darkMode and isDarkMode properties are inconsistent');
          }
          return { isValid: errors.length === 0, errors, warnings: [] };
        },
        repair: (data) => ({
          ...data,
          isDarkMode: data.darkMode
        }),
        critical: false
      }
    ]);

    // WebRTC Context validation rules
    this.registerContextRules('webrtc', [
      {
        name: 'socket_instance',
        validate: (data) => {
          const errors: string[] = [];
          const warnings: string[] = [];
          
          if (data.socket && typeof data.socket !== 'object') {
            errors.push('socket must be an object or null');
          }
          
          if (data.socket && !data.socket.connected && data.isConnected) {
            warnings.push('socket is not connected but isConnected is true');
          }
          
          return { isValid: errors.length === 0, errors, warnings };
        },
        repair: (data) => ({
          ...data,
          isConnected: data.socket ? data.socket.connected : false
        }),
        critical: true
      },
      {
        name: 'participants_array',
        validate: (data) => {
          const errors: string[] = [];
          
          if (!Array.isArray(data.participants)) {
            errors.push('participants must be an array');
          } else {
            data.participants.forEach((participant: any, index: number) => {
              if (!participant.address || typeof participant.address !== 'string') {
                errors.push(`participant[${index}] missing valid address`);
              }
            });
          }
          
          return { isValid: errors.length === 0, errors, warnings: [] };
        },
        repair: (data) => ({
          ...data,
          participants: Array.isArray(data.participants) 
            ? data.participants.filter((p: any) => p && p.address)
            : []
        }),
        critical: false
      },
      {
        name: 'remoteStreams_map',
        validate: (data) => {
          const errors: string[] = [];
          
          if (data.remoteStreams && !(data.remoteStreams instanceof Map)) {
            errors.push('remoteStreams must be a Map instance');
          }
          
          return { isValid: errors.length === 0, errors, warnings: [] };
        },
        repair: (data) => ({
          ...data,
          remoteStreams: new Map()
        }),
        critical: false
      },
      {
        name: 'mediaState_structure',
        validate: (data) => {
          const errors: string[] = [];
          const required = ['userId', 'video', 'audio', 'screenShare'];
          
          if (!data.mediaState || typeof data.mediaState !== 'object') {
            errors.push('mediaState must be an object');
          } else {
            required.forEach(field => {
              if (!(field in data.mediaState)) {
                errors.push(`mediaState missing required field: ${field}`);
              }
            });
            
            if (typeof data.mediaState.video !== 'boolean') {
              errors.push('mediaState.video must be boolean');
            }
            if (typeof data.mediaState.audio !== 'boolean') {
              errors.push('mediaState.audio must be boolean');
            }
            if (typeof data.mediaState.screenShare !== 'boolean') {
              errors.push('mediaState.screenShare must be boolean');
            }
          }
          
          return { isValid: errors.length === 0, errors, warnings: [] };
        },
        repair: (data) => ({
          ...data,
          mediaState: {
            userId: data.mediaState?.userId || '',
            video: Boolean(data.mediaState?.video),
            audio: Boolean(data.mediaState?.audio),
            screenShare: Boolean(data.mediaState?.screenShare)
          }
        }),
        critical: false
      }
    ]);

    // Notification Context validation rules
    this.registerContextRules('notification', [
      {
        name: 'sessionReminders_array',
        validate: (data) => {
          const errors: string[] = [];
          
          if (!Array.isArray(data.sessionReminders)) {
            errors.push('sessionReminders must be an array');
          } else {
            data.sessionReminders.forEach((reminder: any, index: number) => {
              const required = ['id', 'sessionId', 'mentorAddress', 'studentAddress', 'reminderType', 'userRole'];
              required.forEach(field => {
                if (!reminder[field]) {
                  errors.push(`sessionReminders[${index}] missing required field: ${field}`);
                }
              });
              
              if (reminder.reminderType && !['30min', '5min'].includes(reminder.reminderType)) {
                errors.push(`sessionReminders[${index}] has invalid reminderType: ${reminder.reminderType}`);
              }
              
              if (reminder.userRole && !['mentor', 'student'].includes(reminder.userRole)) {
                errors.push(`sessionReminders[${index}] has invalid userRole: ${reminder.userRole}`);
              }
            });
          }
          
          return { isValid: errors.length === 0, errors, warnings: [] };
        },
        repair: (data) => ({
          ...data,
          sessionReminders: Array.isArray(data.sessionReminders)
            ? data.sessionReminders.filter((r: any) => 
                r && r.id && r.sessionId && r.mentorAddress && r.studentAddress &&
                ['30min', '5min'].includes(r.reminderType) &&
                ['mentor', 'student'].includes(r.userRole)
              )
            : []
        }),
        critical: false
      }
    ]);

    // localStorage validation rules
    this.registerContextRules('localStorage', [
      {
        name: 'json_validity',
        validate: (data) => {
          const errors: string[] = [];
          
          Object.entries(data).forEach(([key, value]) => {
            if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
              try {
                JSON.parse(value);
              } catch (e) {
                errors.push(`localStorage[${key}] contains invalid JSON`);
              }
            }
          });
          
          return { isValid: errors.length === 0, errors, warnings: [] };
        },
        repair: (data) => {
          const repaired = { ...data };
          Object.entries(repaired).forEach(([key, value]) => {
            if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
              try {
                JSON.parse(value);
              } catch (e) {
                delete repaired[key];
              }
            }
          });
          return repaired;
        },
        critical: false
      }
    ]);
  }

  public registerContextRules(contextName: string, rules: ContextValidationRule[]): void {
    this.validationRules.set(contextName, rules);
  }

  public addRule(contextName: string, rule: ContextValidationRule): void {
    const existingRules = this.validationRules.get(contextName) || [];
    existingRules.push(rule);
    this.validationRules.set(contextName, existingRules);
  }

  public validateContext<T>(contextName: string, data: T): ValidationResult {
    const rules = this.validationRules.get(contextName);
    if (!rules) {
      return { isValid: true, errors: [], warnings: [] };
    }

    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    let isValid = true;

    for (const rule of rules) {
      try {
        const result = rule.validate(data);
        allErrors.push(...result.errors);
        allWarnings.push(...result.warnings);
        
        if (!result.isValid) {
          isValid = false;
          
          if (rule.critical && this.config.throwOnCriticalError) {
            throw new Error(`Critical validation error in ${contextName}: ${result.errors.join(', ')}`);
          }
        }
      } catch (error) {
        const errorMsg = `Validation rule '${rule.name}' failed: ${error}`;
        allErrors.push(errorMsg);
        isValid = false;
        
        if (this.config.enableLogging) {
          console.error(errorMsg);
        }
      }
    }

    if (this.config.enableLogging && !isValid) {
      console.warn(`Context validation failed for '${contextName}':`, { errors: allErrors, warnings: allWarnings });
    }

    return { isValid, errors: allErrors, warnings: allWarnings };
  }

  public validateAndRepair<T>(contextName: string, data: T): { data: T; result: ValidationResult } {
    let currentData = data;
    let attempts = 0;
    let lastResult: ValidationResult;

    do {
      lastResult = this.validateContext(contextName, currentData);
      
      if (!lastResult.isValid && this.config.enableAutoRepair && attempts < this.config.maxRepairAttempts) {
        currentData = this.repairContext(contextName, currentData);
        attempts++;
      } else {
        break;
      }
    } while (!lastResult.isValid && attempts < this.config.maxRepairAttempts);

    if (this.config.enableLogging && attempts > 0) {
      console.log(`Auto-repaired context '${contextName}' in ${attempts} attempts`);
    }

    return { data: currentData, result: lastResult };
  }

  private repairContext<T>(contextName: string, data: T): T {
    const rules = this.validationRules.get(contextName);
    if (!rules) return data;

    let repairedData = data;

    for (const rule of rules) {
      if (rule.repair) {
        try {
          const result = rule.validate(repairedData);
          if (!result.isValid) {
            repairedData = rule.repair(repairedData);
          }
        } catch (error) {
          if (this.config.enableLogging) {
            console.warn(`Repair rule '${rule.name}' failed:`, error);
          }
        }
      }
    }

    return repairedData;
  }

  public validateAllLocalStorage(): ValidationResult {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { isValid: true, errors: [], warnings: [] };
    }

    const storageData: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        storageData[key] = localStorage.getItem(key) || '';
      }
    }

    return this.validateContext('localStorage', storageData);
  }

  public cleanupCorruptedStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    console.log('🛡️ StateValidator: Using safe cleanup to preserve critical user data...');
    
    // Use safe cleanup instead of localStorage.clear() to preserve user data
    safeStorageCleanup();
    
    console.log('✅ StateValidator: Safe cleanup completed - user profiles, reviews, and bookings preserved');
  }

  private getCurrentStorageData(): Record<string, string> {
    const data: Record<string, string> = {};
    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          data[key] = localStorage.getItem(key) || '';
        }
      }
    }
    return data;
  }

  public performHealthCheck(): {
    overall: boolean;
    contexts: Record<string, ValidationResult>;
    storage: ValidationResult;
  } {
    const results: Record<string, ValidationResult> = {};
    let overallHealth = true;

    // Validate all registered contexts (would need actual data to validate)
    // This is more of a structural check
    for (const contextName of Array.from(this.validationRules.keys())) {
      // For now, just check if rules are properly configured
      const rules = this.validationRules.get(contextName);
      const hasValidRules = rules && rules.length > 0 && rules.every(rule => 
        typeof rule.validate === 'function' && typeof rule.name === 'string'
      );
      
      results[contextName] = {
        isValid: hasValidRules || false,
        errors: hasValidRules ? [] : [`Context '${contextName}' has invalid rules`],
        warnings: []
      };
      
      if (!results[contextName].isValid) {
        overallHealth = false;
      }
    }

    // Validate localStorage
    const storageResult = this.validateAllLocalStorage();
    if (!storageResult.isValid) {
      overallHealth = false;
    }

    return {
      overall: overallHealth,
      contexts: results,
      storage: storageResult
    };
  }

  public updateConfig(newConfig: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): ValidationConfig {
    return { ...this.config };
  }

  public clearRules(contextName?: string): void {
    if (contextName) {
      this.validationRules.delete(contextName);
    } else {
      this.validationRules.clear();
      this.initializeDefaultRules();
    }
  }
}

// Export singleton instance
export const stateValidator = StateValidationSystem.getInstance();

// Utility functions for common validation patterns
export const ValidationPatterns = {
  isValidAddress: (address: string): boolean => {
    return typeof address === 'string' && address.length === 42 && address.startsWith('0x');
  },
  
  isValidTimestamp: (timestamp: any): boolean => {
    const date = new Date(timestamp);
    return !isNaN(date.getTime()) && date.getTime() > 0;
  },
  
  isValidJSON: (str: string): boolean => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  },
  
  isValidUrl: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
};

export default StateValidationSystem;