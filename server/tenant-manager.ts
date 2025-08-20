import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
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
        subdomain: "demo",
        databaseUrl: process.env.DEMO_DATABASE_URL || process.env.DATABASE_URL!,
        storeName: "Demo Store - Cửa hàng demo",
        isActive: true,
      },
      {
        subdomain: "store1",
        databaseUrl:
          process.env.STORE1_DATABASE_URL || process.env.DATABASE_URL!,
        storeName: "Store 1 - Cửa hàng số 1",
        isActive: true,
      },
      {
        subdomain: "store2",
        databaseUrl:
          process.env.STORE2_DATABASE_URL || process.env.DATABASE_URL!,
        storeName: "Store 2 - Cửa hàng số 2",
        isActive: true,
      },
      {
        subdomain: "restaurant1",
        databaseUrl:
          process.env.RESTAURANT1_DATABASE_URL || process.env.DATABASE_URL!,
        storeName: "Restaurant 1 - Nhà hàng số 1",
        isActive: true,
      },
      {
        subdomain: "vitaly",
        databaseUrl: process.env.EXTERNAL_DB_URL,
        storeName: "Vitaly - Nhà hàng Vitaly",
        isActive: true,
      },
      // Add more tenants as needed
    ];

    tenantsConfig.forEach((config) => {
      this.tenants.set(config.subdomain, config);
    });
  }

  getTenantBySubdomain(subdomain: string): TenantConfig | null {
    return this.tenants.get("vitaly") || null;
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
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 10000,
      acquireTimeoutMillis: 10000,
      ssl: tenant.databaseUrl?.includes("1.55.212.138")
        ? { rejectUnauthorized: false }
        : undefined,
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
