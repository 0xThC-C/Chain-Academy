import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * 📚 API Documentation middleware
 * Generates automatic API documentation based on routes and middleware
 */

interface APIEndpoint {
  method: string;
  path: string;
  description?: string;
  auth: boolean;
  rateLimit?: string;
  parameters?: {
    body?: any;
    query?: any;
    params?: any;
  };
  responses?: {
    [statusCode: number]: {
      description: string;
      example?: any;
    };
  };
}

export class APIDocumentation {
  private static endpoints: APIEndpoint[] = [];

  /**
   * Register an API endpoint for documentation
   */
  static registerEndpoint(endpoint: APIEndpoint) {
    this.endpoints.push(endpoint);
  }

  /**
   * Generate API documentation
   */
  static generateDocs() {
    return {
      title: 'Chain Academy V2 API Documentation',
      version: '1.0.0',
      description: 'Decentralized mentorship platform API',
      baseUrl: process.env.API_BASE_URL || 'http://localhost:3001/api',
      authentication: {
        type: 'SIWE (Sign-In with Ethereum)',
        description: 'All protected endpoints require SIWE authentication',
        flow: [
          '1. POST /auth/nonce - Get nonce for signing',
          '2. Sign message with wallet',
          '3. POST /auth/verify - Verify signature and establish session'
        ]
      },
      endpoints: this.endpoints.map(endpoint => ({
        ...endpoint,
        fullPath: `/api${endpoint.path}`,
        curl: this.generateCurlExample(endpoint)
      })),
      errorCodes: {
        400: 'Bad Request - Invalid input parameters',
        401: 'Unauthorized - Authentication required',
        403: 'Forbidden - Insufficient permissions',
        404: 'Not Found - Resource not found',
        429: 'Too Many Requests - Rate limit exceeded',
        500: 'Internal Server Error - Server error'
      },
      rateLimiting: {
        general: '100 requests per 15 minutes',
        auth: '5 requests per 15 minutes',
        webrtc: '30 requests per minute'
      }
    };
  }

  /**
   * Generate curl example for endpoint
   */
  private static generateCurlExample(endpoint: APIEndpoint): string {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    let curl = `curl -X ${endpoint.method} "${baseUrl}/api${endpoint.path}"`;
    
    if (endpoint.auth) {
      curl += ' \\\n  -H "Authorization: Bearer <session-token>"';
    }
    
    if (endpoint.method !== 'GET' && endpoint.parameters?.body) {
      curl += ' \\\n  -H "Content-Type: application/json"';
      curl += ` \\\n  -d '${JSON.stringify(endpoint.parameters.body, null, 2)}'`;
    }
    
    return curl;
  }

  /**
   * Get all registered endpoints
   */
  static getEndpoints(): APIEndpoint[] {
    return this.endpoints;
  }
}

/**
 * Middleware to serve API documentation
 */
export const serveAPIDocs = (req: Request, res: Response, next: NextFunction): void => {
  if (req.path === '/docs' || req.path === '/documentation') {
    const docs = APIDocumentation.generateDocs();
    
    // Check if client wants JSON or HTML
    const acceptsHTML = req.headers.accept?.includes('text/html');
    
    if (acceptsHTML) {
      // Serve HTML documentation
      const html = generateHTMLDocs(docs);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } else {
      // Serve JSON documentation
      res.json(docs);
    }
  } else {
    next();
  }
};

/**
 * Generate HTML documentation
 */
function generateHTMLDocs(docs: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${docs.title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6; 
            color: #333; 
            background: #f8f9fa;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { 
            background: linear-gradient(135deg, #000 0%, #333 100%);
            color: white; 
            padding: 40px 20px; 
            text-align: center;
            margin: -20px -20px 40px -20px;
        }
        .method { 
            display: inline-block; 
            padding: 4px 8px; 
            border-radius: 4px; 
            font-weight: bold; 
            font-size: 12px;
            margin-right: 10px;
        }
        .method.GET { background: #28a745; color: white; }
        .method.POST { background: #007bff; color: white; }
        .method.PUT { background: #ffc107; color: black; }
        .method.DELETE { background: #dc3545; color: white; }
        .endpoint { 
            background: white; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 20px 0; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .endpoint h3 { margin-bottom: 10px; }
        .auth-required { 
            background: #ff4444; 
            color: white; 
            padding: 2px 6px; 
            border-radius: 3px; 
            font-size: 11px;
            margin-left: 10px;
        }
        .section { 
            background: white; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .code { 
            background: #f8f9fa; 
            border: 1px solid #e9ecef; 
            border-radius: 4px; 
            padding: 15px; 
            font-family: 'Monaco', 'Menlo', monospace; 
            font-size: 13px;
            overflow-x: auto;
            white-space: pre;
        }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
        .toc { 
            background: #e9ecef; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 20px 0;
        }
        .toc a { 
            color: #007bff; 
            text-decoration: none; 
            display: block; 
            padding: 5px 0;
        }
        .toc a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔗 ${docs.title}</h1>
        <p>${docs.description}</p>
        <p><strong>Base URL:</strong> ${docs.baseUrl}</p>
    </div>
    
    <div class="container">
        <div class="toc">
            <h2>📋 Table of Contents</h2>
            <a href="#authentication">Authentication</a>
            <a href="#endpoints">API Endpoints</a>
            <a href="#errors">Error Codes</a>
            <a href="#rate-limiting">Rate Limiting</a>
        </div>

        <div class="section" id="authentication">
            <h2>🔐 Authentication</h2>
            <p><strong>Type:</strong> ${docs.authentication.type}</p>
            <p><strong>Description:</strong> ${docs.authentication.description}</p>
            <h3>Authentication Flow:</h3>
            <ol>
                ${docs.authentication.flow.map((step: string) => `<li>${step}</li>`).join('')}
            </ol>
        </div>

        <div class="section" id="endpoints">
            <h2>🛣️ API Endpoints</h2>
            ${docs.endpoints.map((endpoint: any) => `
                <div class="endpoint">
                    <h3>
                        <span class="method ${endpoint.method}">${endpoint.method}</span>
                        ${endpoint.fullPath}
                        ${endpoint.auth ? '<span class="auth-required">AUTH REQUIRED</span>' : ''}
                    </h3>
                    ${endpoint.description ? `<p>${endpoint.description}</p>` : ''}
                    ${endpoint.rateLimit ? `<p><strong>Rate Limit:</strong> ${endpoint.rateLimit}</p>` : ''}
                    
                    <h4>Example Request:</h4>
                    <div class="code">${endpoint.curl}</div>
                </div>
            `).join('')}
        </div>

        <div class="section" id="errors">
            <h2>⚠️ Error Codes</h2>
            ${Object.entries(docs.errorCodes).map(([code, description]) => `
                <p><strong>${code}:</strong> ${description}</p>
            `).join('')}
        </div>

        <div class="section" id="rate-limiting">
            <h2>🚦 Rate Limiting</h2>
            ${Object.entries(docs.rateLimiting).map(([type, limit]) => `
                <p><strong>${type.charAt(0).toUpperCase() + type.slice(1)}:</strong> ${limit}</p>
            `).join('')}
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * Decorator to document API endpoints
 */
export function documentEndpoint(config: Omit<APIEndpoint, 'method' | 'path'>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // This would be used with route decorators in a more advanced setup
    // For now, endpoints are registered manually
  };
}

// Register core API endpoints for documentation
APIDocumentation.registerEndpoint({
  method: 'GET',
  path: '/health',
  description: 'Health check endpoint',
  auth: false,
  responses: {
    200: {
      description: 'Server is healthy',
      example: {
        status: 'OK',
        message: 'Chain Academy V2 Backend is running!',
        timestamp: '2024-01-01T00:00:00.000Z',
        services: {
          webrtc: { activeRooms: 0, status: 'operational' },
          auth: { status: 'operational' }
        }
      }
    }
  }
});

APIDocumentation.registerEndpoint({
  method: 'POST',
  path: '/auth/nonce',
  description: 'Get nonce for SIWE authentication',
  auth: false,
  rateLimit: 'Auth rate limit (5 per 15 minutes)',
  parameters: {
    body: {
      address: '0x1234...abcd',
      chainId: 1
    }
  },
  responses: {
    200: {
      description: 'Nonce generated successfully',
      example: {
        success: true,
        message: 'Sign in to Chain Academy V2...',
        nonce: 'random-nonce-string'
      }
    }
  }
});

APIDocumentation.registerEndpoint({
  method: 'POST',
  path: '/auth/verify',
  description: 'Verify SIWE signature and establish session',
  auth: false,
  rateLimit: 'Auth rate limit (5 per 15 minutes)',
  parameters: {
    body: {
      message: 'SIWE message string',
      signature: '0x...'
    }
  },
  responses: {
    200: {
      description: 'Authentication successful',
      example: {
        success: true,
        message: 'Authentication successful',
        user: {
          address: '0x1234...abcd',
          chainId: 1
        }
      }
    }
  }
});

APIDocumentation.registerEndpoint({
  method: 'POST',
  path: '/webrtc/rooms',
  description: 'Create a new WebRTC room for mentorship session',
  auth: true,
  rateLimit: 'WebRTC rate limit (30 per minute)',
  parameters: {
    body: {
      sessionId: 'session-123',
      participants: ['0x1234...', '0x5678...']
    }
  },
  responses: {
    200: {
      description: 'Room created successfully',
      example: {
        success: true,
        room: {
          roomId: 'room_session-123_1234567890',
          sessionId: 'session-123',
          participants: ['0x1234...', '0x5678...'],
          createdAt: '2024-01-01T00:00:00.000Z'
        }
      }
    }
  }
});

APIDocumentation.registerEndpoint({
  method: 'GET',
  path: '/webrtc/rooms/:roomId',
  description: 'Get WebRTC room information and participants',
  auth: true,
  parameters: {
    params: {
      roomId: 'room_session-123_1234567890'
    }
  },
  responses: {
    200: {
      description: 'Room information retrieved',
      example: {
        success: true,
        room: {
          roomId: 'room_session-123_1234567890',
          sessionId: 'session-123',
          participants: ['0x1234...', '0x5678...']
        },
        participants: [
          {
            address: '0x1234...',
            mediaState: { video: true, audio: true, screenShare: false },
            joinedAt: '2024-01-01T00:00:00.000Z'
          }
        ],
        chatMessages: []
      }
    }
  }
});

export default APIDocumentation;