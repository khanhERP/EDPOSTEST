
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";

interface TenantConfig {
  subdomain: string;
  databaseUrl: string;
  storeName: string;
  isActive: boolean;
}

class TenantManager {
  private tenants: Map<string, TenantConfig> = new Map();
  private dbConnections: Map<string, any> = new Map();

  constructor() {
    this.loadTenants();
  }

  private loadTenants() {
    // Load tenant configurations from environment or main database
    const tenantsConfig = [
      {
        subdomain: 'demo',
        databaseUrl: process.env.DEMO_DATABASE_URL || process.env.DATABASE_URL!,
        storeName: 'Demo Store',
        isActive: true
      },
      {
        subdomain: 'store1',
        databaseUrl: process.env.STORE1_DATABASE_URL || process.env.DATABASE_URL!,
        storeName: 'Store 1',
        isActive: true
      }
      // Add more tenants as needed
    ];

    tenantsConfig.forEach(config => {
      this.tenants.set(config.subdomain, config);
    });
  }

  getTenantBySubdomain(subdomain: string): TenantConfig | null {
    return this.tenants.get(subdomain) || null;
  }

  async getDatabaseConnection(subdomain: string) {
    if (this.dbConnections.has(subdomain)) {
      return this.dbConnections.get(subdomain);
    }

    const tenant = this.getTenantBySubdomain(subdomain);
    if (!tenant) {
      throw new Error(`Tenant not found: ${subdomain}`);
    }

    const pool = new Pool({ 
      connectionString: tenant.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
    });

    const db = drizzle({ client: pool, schema });
    this.dbConnections.set(subdomain, db);
    
    return db;
  }

  getAllTenants(): TenantConfig[] {
    return Array.from(this.tenants.values());
  }

  addTenant(config: TenantConfig) {
    this.tenants.set(config.subdomain, config);
  }

  removeTenant(subdomain: string) {
    this.tenants.delete(subdomain);
    this.dbConnections.delete(subdomain);
  }
}

export const tenantManager = new TenantManager();
