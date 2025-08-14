
import { Request, Response, NextFunction } from 'express';
import { tenantManager } from './tenant-manager';

export interface TenantRequest extends Request {
  tenant?: {
    subdomain: string;
    config: any;
    db: any;
  };
}

export function tenantMiddleware(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    // Extract subdomain from host header
    const host = req.get('host') || req.get('x-forwarded-host') || '';
    const subdomain = extractSubdomain(host);

    if (!subdomain) {
      return res.status(400).json({ 
        error: 'Invalid subdomain',
        message: 'Please access through a valid subdomain (e.g., store1.yourapp.replit.app)'
      });
    }

    const tenantConfig = tenantManager.getTenantBySubdomain(subdomain);
    if (!tenantConfig) {
      return res.status(404).json({ 
        error: 'Tenant not found',
        message: `Store '${subdomain}' not found`
      });
    }

    if (!tenantConfig.isActive) {
      return res.status(403).json({ 
        error: 'Store inactive',
        message: 'This store is currently inactive'
      });
    }

    // Attach tenant info to request
    req.tenant = {
      subdomain,
      config: tenantConfig,
      db: null // Will be loaded lazily
    };

    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function extractSubdomain(host: string): string | null {
  // Remove port if present
  const hostWithoutPort = host.split(':')[0];
  
  // Handle development environment
  if (hostWithoutPort.includes('replit.dev')) {
    // Format: subdomain-hash.username.replit.dev
    const parts = hostWithoutPort.split('.');
    if (parts.length >= 3) {
      const firstPart = parts[0];
      // Extract subdomain from hash format (e.g., "store1-abc123" -> "store1")
      const subdomainMatch = firstPart.match(/^([a-zA-Z0-9-]+)-[a-f0-9]+$/);
      return subdomainMatch ? subdomainMatch[1] : firstPart;
    }
  }
  
  // Handle production custom domain
  if (hostWithoutPort.includes('replit.app')) {
    // Format: subdomain.appname.replit.app
    const parts = hostWithoutPort.split('.');
    if (parts.length >= 3) {
      return parts[0];
    }
  }

  // Handle custom domain
  const parts = hostWithoutPort.split('.');
  if (parts.length >= 2) {
    return parts[0];
  }

  return 'main'; // Default subdomain
}

export async function getTenantDatabase(req: TenantRequest) {
  if (!req.tenant) {
    throw new Error('Tenant not found in request');
  }

  if (!req.tenant.db) {
    req.tenant.db = await tenantManager.getDatabaseConnection(req.tenant.subdomain);
  }

  return req.tenant.db;
}
