/**
 * 🔒 SECURITY: Security validation utilities
 * Validates application security state and detects potential vulnerabilities
 */

interface SecurityCheckResult {
  passed: boolean;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
}

interface SecurityReport {
  overall: boolean;
  checks: SecurityCheckResult[];
  score: number;
  timestamp: Date;
}

export class SecurityValidator {
  private static instance: SecurityValidator;
  
  public static getInstance(): SecurityValidator {
    if (!SecurityValidator.instance) {
      SecurityValidator.instance = new SecurityValidator();
    }
    return SecurityValidator.instance;
  }

  /**
   * Perform comprehensive security validation
   */
  public async performSecurityAudit(): Promise<SecurityReport> {
    const checks: SecurityCheckResult[] = [];
    
    // Environment security checks
    checks.push(this.validateEnvironmentSecurity());
    
    // Network security checks
    checks.push(this.validateNetworkSecurity());
    
    // Local storage security
    checks.push(this.validateStorageSecurity());
    
    // Wallet security
    checks.push(this.validateWalletSecurity());
    
    // Content security
    checks.push(this.validateContentSecurity());
    
    // Session security
    checks.push(this.validateSessionSecurity());
    
    // Calculate overall score
    const totalChecks = checks.length;
    const passedChecks = checks.filter(check => check.passed).length;
    const score = Math.round((passedChecks / totalChecks) * 100);
    
    const overall = checks.every(check => 
      check.passed || check.severity === 'low' || check.severity === 'info'
    );
    
    return {
      overall,
      checks,
      score,
      timestamp: new Date()
    };
  }

  private validateEnvironmentSecurity(): SecurityCheckResult {
    // Check if we're in development mode with production-like URLs
    const isDev = process.env.NODE_ENV === 'development';
    const hasProductionUrls = window.location.protocol === 'https:' && 
                              !window.location.hostname.includes('localhost');
    
    if (isDev && hasProductionUrls) {
      return {
        passed: false,
        message: 'Development mode detected in production environment',
        severity: 'high'
      };
    }
    
    // Check for exposed development tools
    if (isDev && typeof window !== 'undefined') {
      // Check for React DevTools
      const hasReactDevTools = !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (hasReactDevTools && hasProductionUrls) {
        return {
          passed: false,
          message: 'React DevTools detected in production',
          severity: 'medium'
        };
      }
    }
    
    return {
      passed: true,
      message: 'Environment security validated',
      severity: 'info'
    };
  }

  private validateNetworkSecurity(): SecurityCheckResult {
    // Check HTTPS usage
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && 
        !window.location.hostname.includes('localhost')) {
      return {
        passed: false,
        message: 'Non-HTTPS connection detected in production',
        severity: 'critical'
      };
    }
    
    // Check for mixed content
    if (typeof document !== 'undefined') {
      const scripts = document.querySelectorAll('script[src]');
      const hasInsecureScripts = Array.from(scripts).some(script => 
        script.getAttribute('src')?.startsWith('http://') && 
        !script.getAttribute('src')?.includes('localhost')
      );
      
      if (hasInsecureScripts) {
        return {
          passed: false,
          message: 'Insecure script sources detected',
          severity: 'high'
        };
      }
    }
    
    return {
      passed: true,
      message: 'Network security validated',
      severity: 'info'
    };
  }

  private validateStorageSecurity(): SecurityCheckResult {
    if (typeof window === 'undefined') {
      return { passed: true, message: 'Storage not available (SSR)', severity: 'info' };
    }
    
    try {
      // Check for sensitive data in localStorage
      const sensitiveKeys = ['private_key', 'mnemonic', 'seed', 'password', 'secret'];
      const localStorageKeys = Object.keys(localStorage);
      
      const hasSensitiveData = localStorageKeys.some(key => 
        sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))
      );
      
      if (hasSensitiveData) {
        return {
          passed: false,
          message: 'Sensitive data detected in localStorage',
          severity: 'critical'
        };
      }
      
      // Check for excessive data storage (potential DoS)
      const totalSize = localStorageKeys.reduce((size, key) => {
        return size + (localStorage.getItem(key)?.length || 0);
      }, 0);
      
      if (totalSize > 5 * 1024 * 1024) { // 5MB
        return {
          passed: false,
          message: 'Excessive localStorage usage detected',
          severity: 'medium'
        };
      }
      
      return {
        passed: true,
        message: 'Storage security validated',
        severity: 'info'
      };
    } catch (error) {
      return {
        passed: false,
        message: 'Storage security check failed',
        severity: 'medium'
      };
    }
  }

  private validateWalletSecurity(): SecurityCheckResult {
    if (typeof window === 'undefined') {
      return { passed: true, message: 'Wallet not available (SSR)', severity: 'info' };
    }
    
    // Check for wallet injection
    const ethereum = (window as any).ethereum;
    
    if (!ethereum) {
      return {
        passed: true,
        message: 'No wallet detected',
        severity: 'info'
      };
    }
    
    // Check for multiple wallet providers (potential conflict)
    const walletProviders = [
      (window as any).ethereum,
      (window as any).web3,
      (window as any).tronWeb
    ].filter(Boolean);
    
    if (walletProviders.length > 3) {
      return {
        passed: false,
        message: 'Multiple wallet providers detected (potential conflict)',
        severity: 'medium'
      };
    }
    
    // Check for wallet security features
    if (ethereum && !ethereum.isMetaMask && !ethereum.isCoinbaseWallet) {
      return {
        passed: false,
        message: 'Unknown wallet provider detected',
        severity: 'medium'
      };
    }
    
    return {
      passed: true,
      message: 'Wallet security validated',
      severity: 'info'
    };
  }

  private validateContentSecurity(): SecurityCheckResult {
    if (typeof document === 'undefined') {
      return { passed: true, message: 'Content not available (SSR)', severity: 'info' };
    }
    
    // Check for inline event handlers
    const elementsWithEvents = document.querySelectorAll('[onclick], [onload], [onerror]');
    if (elementsWithEvents.length > 0) {
      return {
        passed: false,
        message: 'Inline event handlers detected',
        severity: 'high'
      };
    }
    
    // Check for external scripts
    const externalScripts = document.querySelectorAll('script[src]:not([src^="/"], [src^="./"])');
    const suspiciousScripts = Array.from(externalScripts).filter(script => {
      const src = script.getAttribute('src') || '';
      return !src.includes('googleapis.com') && 
             !src.includes('jsdelivr.net') && 
             !src.includes('unpkg.com') &&
             !src.includes('localhost');
    });
    
    if (suspiciousScripts.length > 0) {
      return {
        passed: false,
        message: 'Suspicious external scripts detected',
        severity: 'high'
      };
    }
    
    return {
      passed: true,
      message: 'Content security validated',
      severity: 'info'
    };
  }

  private validateSessionSecurity(): SecurityCheckResult {
    if (typeof document === 'undefined') {
      return { passed: true, message: 'Session not available (SSR)', severity: 'info' };
    }
    
    // Check for secure cookies
    const cookies = document.cookie.split(';');
    const insecureCookies = cookies.filter(cookie => {
      const [name] = cookie.trim().split('=');
      return name && !cookie.includes('Secure') && !cookie.includes('HttpOnly');
    });
    
    if (insecureCookies.length > 0) {
      return {
        passed: false,
        message: 'Insecure cookies detected',
        severity: 'medium'
      };
    }
    
    // Check session storage for sensitive data
    try {
      const sessionKeys = Object.keys(sessionStorage);
      const sensitiveKeys = ['private_key', 'mnemonic', 'seed', 'password'];
      
      const hasSensitiveSessionData = sessionKeys.some(key => 
        sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))
      );
      
      if (hasSensitiveSessionData) {
        return {
          passed: false,
          message: 'Sensitive data in sessionStorage',
          severity: 'critical'
        };
      }
    } catch (error) {
      // sessionStorage not available or blocked
    }
    
    return {
      passed: true,
      message: 'Session security validated',
      severity: 'info'
    };
  }

  /**
   * Generate a security report for logging
   */
  public generateSecurityReport(report: SecurityReport): string {
    const failed = report.checks.filter(check => !check.passed);
    const critical = failed.filter(check => check.severity === 'critical');
    const high = failed.filter(check => check.severity === 'high');
    
    let reportText = `🔒 SECURITY AUDIT REPORT\n`;
    reportText += `Timestamp: ${report.timestamp.toISOString()}\n`;
    reportText += `Overall Status: ${report.overall ? '✅ PASSED' : '❌ FAILED'}\n`;
    reportText += `Security Score: ${report.score}/100\n\n`;
    
    if (critical.length > 0) {
      reportText += `🚨 CRITICAL ISSUES (${critical.length}):\n`;
      critical.forEach(check => reportText += `  - ${check.message}\n`);
      reportText += '\n';
    }
    
    if (high.length > 0) {
      reportText += `⚠️ HIGH PRIORITY ISSUES (${high.length}):\n`;
      high.forEach(check => reportText += `  - ${check.message}\n`);
      reportText += '\n';
    }
    
    if (report.overall) {
      reportText += `✅ All critical security checks passed!\n`;
    } else {
      reportText += `❌ Security issues detected. Review and fix before production deployment.\n`;
    }
    
    return reportText;
  }

  /**
   * Log security status to console (development only)
   */
  public async logSecurityStatus(): Promise<void> {
    if (process.env.NODE_ENV !== 'development') return;
    
    const report = await this.performSecurityAudit();
    const reportText = this.generateSecurityReport(report);
    
    if (report.overall) {
      console.log(reportText);
    } else {
      console.error(reportText);
    }
  }
}

// Auto-run security check in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  setTimeout(() => {
    SecurityValidator.getInstance().logSecurityStatus();
  }, 3000); // Wait for app initialization
}