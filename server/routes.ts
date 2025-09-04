import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  tenantMiddleware,
  getTenantDatabase,
  TenantRequest,
} from "./tenant-middleware";
import {
  insertProductSchema,
  insertTransactionSchema,
  insertTransactionItemSchema,
  insertEmployeeSchema,
  insertAttendanceSchema,
  insertTableSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertStoreSettingsSchema,
  insertSupplierSchema,
  insertCustomerSchema,
  insertPointTransactionSchema,
  attendanceRecords,
  products,
  inventoryTransactions,
  invoiceTemplates,
  invoices,
  invoiceItems,
  customers,
} from "@shared/schema";
import { initializeSampleData, db } from "./db";
import { registerTenantRoutes } from "./tenant-routes";
import { z } from "zod";
import {
  eq,
  desc,
  asc,
  and,
  or,
  like,
  count,
  sum,
  gte,
  lt,
  lte,
  ilike,
  ne,
} from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  orders,
  orderItems,
  products,
  categories,
  transactions as transactionsTable,
  transactionItems as transactionItemsTable,
  tables,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register tenant management routes
  registerTenantRoutes(app);

  // Apply tenant middleware to all API routes
  app.use("/api", tenantMiddleware);

  // Initialize sample data
  await initializeSampleData();

  // Ensure inventory_transactions table exists
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) NOT NULL,
        type VARCHAR(20) NOT NULL,
        quantity INTEGER NOT NULL,
        previous_stock INTEGER NOT NULL,
        new_stock INTEGER NOT NULL,
        notes TEXT,
        created_at VARCHAR(50) NOT NULL
      )
    `);
  } catch (error) {
    console.log(
      "Inventory transactions table already exists or creation failed:",
      error,
    );
  }

  // Categories
  app.get(
    "/api/categories",
    tenantMiddleware,
    async (req: TenantRequest, res) => {
      try {
        console.log("🔍 GET /api/categories - Starting request processing");
        let tenantDb;
        try {
          tenantDb = await getTenantDatabase(req);
          console.log("✅ Tenant database connection obtained for categories");
        } catch (dbError) {
          console.error(
            "❌ Failed to get tenant database for categories:",
            dbError,
          );
          tenantDb = null;
        }

        const categories = await storage.getCategories(tenantDb);
        console.log(`✅ Successfully fetched ${categories.length} categories`);
        res.json(categories);
      } catch (error) {
        console.error("❌ Error fetching categories:", error);
        res.status(500).json({ error: "Failed to fetch categories" });
      }
    },
  );

  app.post("/api/categories", async (req: TenantRequest, res) => {
    try {
      const { name, icon } = req.body;
      const tenantDb = await getTenantDatabase(req);

      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Category name is required" });
      }

      const categoryData = {
        name: name.trim(),
        icon: icon || "fas fa-utensils",
      };

      const category = await storage.createCategory(categoryData, tenantDb);
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  app.put("/api/categories/:id", async (req: TenantRequest, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const { name, icon } = req.body;
      const tenantDb = await getTenantDatabase(req);

      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Category name is required" });
      }

      const categoryData = {
        name: name.trim(),
        icon: icon || "fas fa-utensils",
      };

      const category = await storage.updateCategory(
        categoryId,
        categoryData,
        tenantDb,
      );
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", async (req: TenantRequest, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const tenantDb = await getTenantDatabase(req);

      // Check if category has products
      const products = await storage.getProductsByCategory(
        categoryId,
        tenantDb,
      );
      if (products.length > 0) {
        return res.status(400).json({
          error: `Không thể xóa danh mục vì còn ${products.length} sản phẩm. Vui lòng xóa hoặc chuyển các sản phẩm sang danh mục khác trước.`,
        });
      }

      await storage.deleteCategory(categoryId, tenantDb);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting category:", error);

      // Handle foreign key constraint errors
      if (
        error instanceof Error &&
        error.message.includes("foreign key constraint")
      ) {
        return res.status(400).json({
          error:
            "Không thể xóa danh mục vì vẫn còn sản phẩm thuộc danh mục này. Vui lòng xóa hoặc chuyển các sản phẩm sang danh mục khác trước.",
        });
      }

      res.status(500).json({ error: "Có lỗi xảy ra khi xóa danh mục" });
    }
  });

  // Products
  app.get(
    "/api/products",
    tenantMiddleware,
    async (req: TenantRequest, res) => {
      try {
        console.log("🔍 GET /api/products - Starting request processing");
        let tenantDb;
        try {
          tenantDb = await getTenantDatabase(req);
          console.log("✅ Tenant database connection obtained for products");
        } catch (dbError) {
          console.error(
            "❌ Failed to get tenant database for products:",
            dbError,
          );
          tenantDb = null;
        }

        const products = await storage.getProducts(tenantDb);
        console.log(`✅ Successfully fetched ${products.length} products`);
        res.json(products);
      } catch (error) {
        console.error("❌ Error fetching products:", error);
        res.status(500).json({ error: "Failed to fetch products" });
      }
    },
  );

  // Endpoint for POS to get only active products
  app.get("/api/products/active", async (req: TenantRequest, res) => {
    try {
      const tenantDb = await getTenantDatabase(req);
      const products = await storage.getActiveProducts(tenantDb);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active products" });
    }
  });

  // Get single product by ID
  app.get("/api/products/:id", async (req: TenantRequest, res) => {
    try {
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ error: "Invalid product ID" });
      }

      const tenantDb = await getTenantDatabase(req);

      const [product] = await db
        .select({
          id: products.id,
          name: products.name,
          sku: products.sku,
          price: products.price,
          stock: products.stock,
          categoryId: products.categoryId,
          categoryName: categories.name,
          imageUrl: products.imageUrl,
          isActive: products.isActive,
          productType: products.productType,
          trackInventory: products.trackInventory,
          taxRate: products.taxRate,
          priceIncludesTax: products.priceIncludesTax,
          afterTaxPrice: products.afterTaxPrice,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(and(eq(products.id, productId), eq(products.isActive, true)))
        .limit(1);

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      console.log(`=== SINGLE PRODUCT API DEBUG ===`);
      console.log(`Product ID: ${product.id}`);
      console.log(`Name: ${product.name}`);
      console.log(`Price: ${product.price}`);
      console.log(`Tax Rate: ${product.taxRate}`);
      console.log(`After Tax Price: ${product.afterTaxPrice}`);

      res.json(product);
    } catch (error) {
      console.error("Error fetching single product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/products", async (req: TenantRequest, res) => {
    try {
      console.log("Product creation request body:", req.body);
      const tenantDb = await getTenantDatabase(req);

      // Ensure required fields are present
      if (
        !req.body.name ||
        !req.body.sku ||
        !req.body.price ||
        !req.body.categoryId ||
        req.body.taxRate === undefined
      ) {
        return res.status(400).json({
          message:
            "Missing required fields: name, sku, price, categoryId, and taxRate are required",
        });
      }

      // Validate and transform the data
      const validatedData = insertProductSchema.parse({
        name: req.body.name,
        sku: req.body.sku,
        price: req.body.price.toString(),
        stock: Number(req.body.stock) || 0,
        categoryId: Number(req.body.categoryId),
        productType: Number(req.body.productType) || 1,
        trackInventory: req.body.trackInventory !== false,
        imageUrl: req.body.imageUrl || null,
        taxRate: req.body.taxRate.toString(),
        afterTaxPrice:
          req.body.afterTaxPrice && req.body.afterTaxPrice.trim() !== ""
            ? req.body.afterTaxPrice.toString()
            : null,
      });

      console.log("Validated product data:", validatedData);

      // Check if SKU already exists (including inactive products)
      const [existingProduct] = await db
        .select()
        .from(products)
        .where(eq(products.sku, validatedData.sku));

      if (existingProduct) {
        console.log("SKU already exists:", validatedData.sku);
        return res.status(409).json({
          message: `SKU "${validatedData.sku}" đã tồn tại trong hệ thống`,
          code: "DUPLICATE_SKU",
        });
      }

      const product = await storage.createProduct(validatedData, tenantDb);
      console.log("Product created successfully:", product);
      res.status(201).json(product);
    } catch (error) {
      console.error("Product creation error:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({
          message: "Invalid product data",
          errors: error.errors,
          details: error.format(),
        });
      }
      res.status(500).json({
        message: "Failed to create product",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.put("/api/products/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log("Product update request:", id, req.body);

      // Transform data to ensure proper types
      const transformedData = {
        ...req.body,
        price: req.body.price ? req.body.price.toString() : undefined,
        taxRate: req.body.taxRate ? req.body.taxRate.toString() : undefined,
        afterTaxPrice:
          req.body.afterTaxPrice && req.body.afterTaxPrice.trim() !== ""
            ? req.body.afterTaxPrice.toString()
            : null,
        priceIncludesTax: req.body.priceIncludesTax || false,
        trackInventory: req.body.trackInventory !== false,
      };

      // Remove undefined fields
      Object.keys(transformedData).forEach((key) => {
        if (transformedData[key] === undefined) {
          delete transformedData[key];
        }
      });

      console.log("Transformed update data:", transformedData);

      const validatedData = insertProductSchema
        .partial()
        .parse(transformedData);
      const tenantDb = await getTenantDatabase(req);
      const product = await storage.updateProduct(id, validatedData, tenantDb);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      console.log("Product updated successfully:", product);
      res.json(product);
    } catch (error) {
      console.error("Product update error:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({
        message: "Failed to update product",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.delete("/api/products/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantDb = await getTenantDatabase(req);
      const deleted = await storage.deleteProduct(id, tenantDb);

      if (!deleted) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Delete product error:", error);

      if (error instanceof Error) {
        if (error.message.includes("Cannot delete product")) {
          return res.status(400).json({
            message: error.message,
            code: "PRODUCT_IN_USE",
          });
        }
      }

      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // New endpoint to cleanup inactive products
  app.delete(
    "/api/products/cleanup/inactive",
    async (req: TenantRequest, res) => {
      try {
        const tenantDb = await getTenantDatabase(req);
        const deletedCount = await storage.deleteInactiveProducts(tenantDb);
        res.json({
          message: `Successfully deleted ${deletedCount} inactive products`,
          deletedCount,
        });
      } catch (error) {
        res
          .status(500)
          .json({ message: "Failed to cleanup inactive products" });
      }
    },
  );

  app.get("/api/products/barcode/:sku", async (req: TenantRequest, res) => {
    try {
      const sku = req.params.sku;
      const tenantDb = await getTenantDatabase(req);
      const product = await storage.getProductBySku(sku, tenantDb);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product by SKU" });
    }
  });

  // Transactions
  app.post("/api/transactions", async (req: TenantRequest, res) => {
    try {
      const { transaction, items } = req.body;
      const tenantDb = await getTenantDatabase(req);

      console.log(
        "Received transaction data:",
        JSON.stringify({ transaction, items }, null, 2),
      );

      // Transaction validation schema with proper nullable handling for invoiceNumber
      const transactionSchema = z.object({
        transactionId: z.string(),
        subtotal: z.string(),
        tax: z.string(),
        total: z.string(),
        paymentMethod: z.string(),
        cashierName: z.string(),
        notes: z.string().optional(),
        invoiceNumber: z.string().nullable().optional(), // Allow null/undefined for publish later
        invoiceId: z.number().nullable().optional(), // Also allow invoiceId to be null
        orderId: z.number().optional(),
      });

      // Validate with original string format, then transform
      const validatedTransaction = transactionSchema.parse(transaction);
      const validatedItems = z.array(insertTransactionItemSchema).parse(items);

      console.log(
        "Validated data:",
        JSON.stringify({ validatedTransaction, validatedItems }, null, 2),
      );

      // Fetch all products to access tax rates
      const products = await storage.getAllProducts(true, tenantDb);

      // Validate stock availability and calculate totals
      let subtotal = 0;
      let tax = 0;
      const stockValidationErrors = [];

      for (const item of validatedItems) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) {
          return res
            .status(400)
            .json({ message: `Product with ID ${item.productId} not found` });
        }

        // Check stock availability only for products that track inventory
        if (product.trackInventory && product.stock < item.quantity) {
          const errorMsg = `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`;
          console.log(`❌ ${errorMsg}`);
          stockValidationErrors.push(errorMsg);
          continue; // Continue checking other items
        }

        console.log(
          `✅ Stock check passed for ${product.name}: Available=${product.stock}, Requested=${item.quantity}`,
        );

        const itemSubtotal = parseFloat(item.price) * item.quantity;
        let itemTax = 0;

        // Tax = (after_tax_price - price) * quantity
        if (
          product.afterTaxPrice &&
          product.afterTaxPrice !== null &&
          product.afterTaxPrice !== ""
        ) {
          const afterTaxPrice = parseFloat(product.afterTaxPrice);
          const price = parseFloat(product.price);
          itemTax = (afterTaxPrice - price) * item.quantity;
        } else {
          // No afterTaxPrice means no tax
          itemTax = 0;
        }

        subtotal += itemSubtotal;
        tax += itemTax;
      }

      // Return all stock validation errors if any
      if (stockValidationErrors.length > 0) {
        return res.status(400).json({
          message: "Stock validation failed for multiple products",
          errors: stockValidationErrors,
          details: stockValidationErrors.join("; "),
        });
      }

      const total = subtotal + tax;

      // Update the transaction with calculated totals and proper null handling
      const transactionWithTotals = {
        ...validatedTransaction,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        invoiceId: validatedTransaction.invoiceId || null,
        invoiceNumber: validatedTransaction.invoiceNumber || null,
        notes: validatedTransaction.notes || null,
        orderId: validatedTransaction.orderId || null,
      };

      const receipt = await storage.createTransaction(
        transactionWithTotals,
        validatedItems,
        tenantDb,
      );
      res.status(201).json(receipt);
    } catch (error) {
      console.error("Transaction creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid transaction data",
          errors: error.errors,
          details: error.format(),
        });
      }
      res.status(500).json({
        message: "Failed to create transaction",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get("/api/transactions", async (req: TenantRequest, res) => {
    try {
      const tenantDb = await getTenantDatabase(req);
      const transactions = await storage.getTransactions(tenantDb);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Get transactions by date range
  app.get(
    "/api/transactions/:startDate/:endDate",
    async (req: TenantRequest, res) => {
      try {
        const { startDate, endDate } = req.params;

        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);

        const transactions = await db
          .select()
          .from(transactionsTable)
          .where(
            and(
              gte(transactionsTable.createdAt, start),
              lte(transactionsTable.createdAt, end),
            ),
          )
          .orderBy(desc(transactionsTable.createdAt));

        // Always return an array, even if empty
        res.json(transactions || []);
      } catch (error) {
        console.error("Error fetching transactions:", error);
        // Return empty array instead of error for reports
        res.json([]);
      }
    },
  );

  // Get orders by date range
  app.get(
    "/api/orders/date-range/:startDate/:endDate",
    async (req: TenantRequest, res) => {
      try {
        const { startDate, endDate } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const tenantDb = await getTenantDatabase(req);

        // Use direct database query with proper ordering
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);

        const allOrders = await db
          .select()
          .from(orders)
          .where(and(gte(orders.orderedAt, start), lte(orders.orderedAt, end)))
          .orderBy(
            desc(orders.orderedAt), // Primary sort by order date (newest first)
            desc(orders.id), // Secondary sort by ID (newest first)
          );

        console.log("Orders by date range - Total found:", allOrders.length);

        // Paginate results after sorting
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedOrders = allOrders.slice(startIndex, endIndex);

        console.log("Orders by date range - Paginated result:", {
          page,
          limit,
          total: allOrders.length,
          returned: paginatedOrders.length,
          newestOrder: paginatedOrders[0]
            ? {
                id: paginatedOrders[0].id,
                orderNumber: paginatedOrders[0].orderNumber,
                orderedAt: paginatedOrders[0].orderedAt,
              }
            : null,
        });

        res.json(paginatedOrders);
      } catch (error) {
        console.error("Error fetching orders by date range:", error);
        res.status(500).json({ error: "Failed to fetch orders" });
      }
    },
  );

  // Get invoices by date range
  app.get(
    "/api/invoices/date-range/:startDate/:endDate",
    async (req: TenantRequest, res) => {
      try {
        const { startDate, endDate } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const tenantDb = await getTenantDatabase(req);

        // Filter by date range using direct database query
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);

        const allInvoices = await db
          .select()
          .from(invoices)
          .where(
            and(
              gte(invoices.invoiceDate, start),
              lte(invoices.invoiceDate, end),
            ),
          )
          .orderBy(
            desc(invoices.createdAt), // Primary sort by creation time (newest first)
            desc(invoices.id), // Secondary sort by ID (newest first)
          );

        // Paginate results
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedInvoices = allInvoices.slice(startIndex, endIndex);

        console.log(
          "Invoices by date range - Total found:",
          allInvoices.length,
        );
        console.log("Invoices by date range - Paginated result:", {
          page,
          limit,
          total: allInvoices.length,
          returned: paginatedInvoices.length,
          newestInvoice: paginatedInvoices[0]
            ? {
                id: paginatedInvoices[0].id,
                tradeNumber: paginatedInvoices[0].tradeNumber,
                createdAt: paginatedInvoices[0].createdAt,
              }
            : null,
        });

        res.json(paginatedInvoices);
      } catch (error) {
        console.error("Error fetching invoices by date range:", error);
        res.status(500).json({ error: "Failed to fetch invoices" });
      }
    },
  );

  app.get(
    "/api/transactions/:transactionId",
    async (req: TenantRequest, res) => {
      try {
        const transactionId = req.params.transactionId;
        const tenantDb = await getTenantDatabase(req);
        const receipt = await storage.getTransactionByTransactionId(
          transactionId,
          tenantDb,
        );

        if (!receipt) {
          return res.status(404).json({ message: "Transaction not found" });
        }

        res.json(receipt);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch transaction" });
      }
    },
  );

  // Get next employee ID
  app.get("/api/employees/next-id", async (req: TenantRequest, res) => {
    try {
      const tenantDb = await getTenantDatabase(req);
      const nextId = await storage.getNextEmployeeId(tenantDb);
      res.json({ nextId });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate employee ID" });
    }
  });

  // Employees
  app.get(
    "/api/employees",
    tenantMiddleware,
    async (req: TenantRequest, res) => {
      try {
        console.log("🔍 GET /api/employees - Starting request processing");
        let tenantDb;
        try {
          tenantDb = await getTenantDatabase(req);
          console.log("✅ Tenant database connection obtained for employees");
        } catch (dbError) {
          console.error(
            "❌ Failed to get tenant database for employees:",
            dbError,
          );
          tenantDb = null;
        }

        const employees = await storage.getEmployees(tenantDb);
        console.log(`✅ Successfully fetched ${employees.length} employees`);
        res.json(employees);
      } catch (error) {
        console.error("❌ Error fetching employees:", error);
        res.status(500).json({ message: "Failed to fetch employees" });
      }
    },
  );

  app.get("/api/employees/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantDb = await getTenantDatabase(req);
      const employee = await storage.getEmployee(id, tenantDb);

      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      res.json(employee);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employee" });
    }
  });

  app.post("/api/employees", async (req: TenantRequest, res) => {
    try {
      const validatedData = insertEmployeeSchema.parse(req.body);
      const tenantDb = await getTenantDatabase(req);

      // Check if email already exists (only if email is provided and not empty)
      if (validatedData.email && validatedData.email.trim() !== "") {
        const existingEmployee = await storage.getEmployeeByEmail(
          validatedData.email,
          tenantDb,
        );
        if (existingEmployee) {
          return res.status(400).json({
            message: "Email đã tồn tại trong hệ thống",
            code: "DUPLICATE_EMAIL",
            field: "email",
          });
        }
      }

      const employee = await storage.createEmployee(validatedData, tenantDb);
      res.status(201).json(employee);
    } catch (error) {
      console.log("error: ", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid employee data", errors: error });
      }
      res.status(500).json({ message: "Failed to create employee" });
    }
  });

  app.put("/api/employees/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertEmployeeSchema.partial().parse(req.body);
      const tenantDb = await getTenantDatabase(req);

      // Check if email already exists (only if email is provided and not empty, excluding current employee)
      if (validatedData.email && validatedData.email.trim() !== "") {
        const existingEmployee = await storage.getEmployeeByEmail(
          validatedData.email,
          tenantDb,
        );
        if (existingEmployee && existingEmployee.id !== id) {
          return res.status(409).json({
            message: "Email đã tồn tại trong hệ thống",
            code: "DUPLICATE_EMAIL",
            field: "email",
          });
        }
      }

      const employee = await storage.updateEmployee(
        id,
        validatedData,
        tenantDb,
      );

      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      res.json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid employee data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update employee" });
    }
  });

  app.delete("/api/employees/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantDb = await getTenantDatabase(req);
      const deleted = await storage.deleteEmployee(id, tenantDb);

      if (!deleted) {
        return res.status(404).json({ message: "Employee not found" });
      }

      res.json({ message: "Employee deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // Attendance routes
  app.get("/api/attendance", async (req: TenantRequest, res) => {
    try {
      const { date, startDate, endDate, employeeId } = req.query;
      const tenantDb = await getTenantDatabase(req);

      console.log(`📅 Attendance API called with params:`, {
        date,
        startDate,
        endDate,
        employeeId,
      });

      if (!tenantDb) {
        return res
          .status(500)
          .json({ message: "Database connection not available" });
      }

      let records;

      // If startDate and endDate are provided, use date range
      if (startDate && endDate) {
        console.log(
          `📅 Fetching attendance records by date range: ${startDate} to ${endDate}`,
        );
        records = await storage.getAttendanceRecordsByRange(
          startDate as string,
          endDate as string,
          tenantDb,
        );
      } else if (date) {
        // Single date filter
        console.log(`📅 Fetching attendance records for single date: ${date}`);
        const employeeIdNum = employeeId
          ? parseInt(employeeId as string)
          : undefined;
        records = await storage.getAttendanceRecords(
          employeeIdNum,
          date as string,
          tenantDb,
        );
      } else {
        // All records
        console.log(`📅 Fetching all attendance records`);
        const employeeIdNum = employeeId
          ? parseInt(employeeId as string)
          : undefined;
        records = await storage.getAttendanceRecords(
          employeeIdNum,
          undefined,
          tenantDb,
        );
      }

      console.log(`✅ Returning ${records.length} attendance records`);
      res.json(records);
    } catch (error) {
      console.error("Error fetching attendance records:", error);
      res.status(500).json({ message: "Failed to fetch attendance records" });
    }
  });

  app.get(
    "/api/attendance/today/:employeeId",
    async (req: TenantRequest, res) => {
      try {
        const employeeId = parseInt(req.params.employeeId);
        const tenantDb = await getTenantDatabase(req);
        const record = await storage.getTodayAttendance(employeeId, tenantDb);
        res.json(record);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch today's attendance" });
      }
    },
  );

  app.post("/api/attendance/clock-in", async (req: TenantRequest, res) => {
    try {
      const { employeeId, notes } = req.body;

      if (!employeeId) {
        return res.status(400).json({ message: "Employee ID is required" });
      }

      const tenantDb = await getTenantDatabase(req);
      const record = await storage.clockIn(
        parseInt(employeeId),
        notes,
        tenantDb,
      );
      res.status(201).json(record);
    } catch (error) {
      console.error("Clock-in API error:", error);

      let statusCode = 500;
      let message = "Failed to clock in";

      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          statusCode = 404;
          message = error.message;
        } else if (error.message.includes("already clocked in")) {
          statusCode = 400;
          message = error.message;
        } else if (error.message.includes("database")) {
          message = "Database error occurred";
        }
      }

      res.status(statusCode).json({
        message,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/api/attendance/clock-out/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantDb = await getTenantDatabase(req);
      const record = await storage.clockOut(id, tenantDb);

      if (!record) {
        return res.status(404).json({ message: "Attendance record not found" });
      }

      res.json(record);
    } catch (error) {
      res.status(500).json({ message: "Failed to clock out" });
    }
  });

  app.post(
    "/api/attendance/break-start/:id",
    async (req: TenantRequest, res) => {
      try {
        const id = parseInt(req.params.id);
        const tenantDb = await getTenantDatabase(req);
        const record = await storage.startBreak(id, tenantDb);

        if (!record) {
          return res
            .status(404)
            .json({ message: "Attendance record not found" });
        }

        res.json(record);
      } catch (error) {
        res.status(500).json({ message: "Failed to start break" });
      }
    },
  );

  app.post("/api/attendance/break-end/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantDb = await getTenantDatabase(req);
      const record = await storage.endBreak(id, tenantDb);

      if (!record) {
        return res.status(404).json({ message: "Attendance record not found" });
      }

      res.json(record);
    } catch (error) {
      res.status(500).json({ message: "Failed to end break" });
    }
  });

  app.put("/api/attendance/:id/status", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const tenantDb = await getTenantDatabase(req);
      const record = await storage.updateAttendanceStatus(id, status, tenantDb);

      if (!record) {
        return res.status(404).json({ message: "Attendance record not found" });
      }

      res.json(record);
    } catch (error) {
      res.status(500).json({ message: "Failed to update attendance status" });
    }
  });

  // Tables
  app.get("/api/tables", tenantMiddleware, async (req: TenantRequest, res) => {
    try {
      console.log("🔍 GET /api/tables - Starting request processing");
      let tenantDb;
      try {
        tenantDb = await getTenantDatabase(req);
        console.log("✅ Tenant database connection obtained for tables");
      } catch (dbError) {
        console.error("❌ Failed to get tenant database for tables:", dbError);
        tenantDb = null;
      }

      const tables = await storage.getTables(tenantDb);
      console.log(`✅ Successfully fetched ${tables.length} tables`);
      res.json(tables);
    } catch (error) {
      console.error("❌ Error fetching tables:", error);
      res.status(500).json({ message: "Failed to fetch tables" });
    }
  });

  app.get("/api/tables/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantDb = await getTenantDatabase(req);
      const table = await storage.getTable(id, tenantDb);

      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }

      res.json(table);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch table" });
    }
  });

  app.post("/api/tables", async (req: TenantRequest, res) => {
    try {
      const tableData = insertTableSchema.parse(req.body);
      const tenantDb = await getTenantDatabase(req);
      const table = await storage.createTable(tableData, tenantDb);
      res.status(201).json(table);
    } catch (error) {
      res.status(400).json({ message: "Failed to create table" });
    }
  });

  app.put("/api/tables/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const tableData = insertTableSchema.partial().parse(req.body);
      const tenantDb = await getTenantDatabase(req);
      const table = await storage.updateTable(id, tableData, tenantDb);

      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }

      res.json(table);
    } catch (error) {
      res.status(500).json({ message: "Failed to update table" });
    }
  });

  app.put("/api/tables/:id/status", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const tenantDb = await getTenantDatabase(req);
      const table = await storage.updateTableStatus(id, status, tenantDb);

      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }

      res.json(table);
    } catch (error) {
      res.status(500).json({ message: "Failed to update table status" });
    }
  });

  app.delete("/api/tables/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantDb = await getTenantDatabase(req);
      const deleted = await storage.deleteTable(id, tenantDb);

      if (!deleted) {
        return res.status(404).json({ message: "Table not found" });
      }

      res.json({ message: "Table deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete table" });
    }
  });

  // Orders
  app.get("/api/orders", tenantMiddleware, async (req: TenantRequest, res) => {
    try {
      console.log("🔍 GET /api/orders - Starting request processing");
      let tenantDb;
      try {
        tenantDb = await getTenantDatabase(req);
        console.log("✅ Tenant database connection obtained");
      } catch (dbError) {
        console.error("❌ Failed to get tenant database:", dbError);
        // Fall back to default storage without tenant DB
        console.log("🔄 Falling back to default database connection");
        tenantDb = null;
      }

      const orders = await storage.getOrders(undefined, undefined, tenantDb);
      console.log(`✅ Successfully fetched ${orders.length} orders`);
      res.json(orders);
    } catch (error) {
      console.error("❌ Error fetching orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantDb = await getTenantDatabase(req);
      const order = await storage.getOrder(id, tenantDb);

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      const items = await storage.getOrderItems(id, tenantDb);
      res.json({ ...order, items });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", async (req: TenantRequest, res) => {
    try {
      const { order, items } = req.body;
      const tenantDb = await getTenantDatabase(req);
      console.log(
        "Received order data:",
        JSON.stringify({ order, items }, null, 2),
      );

      // If no order object is provided, create a default one for POS orders
      let orderData;
      if (!order) {
        console.log("No order object provided, creating default POS order");

        // Calculate totals from items
        let subtotal = 0;
        let tax = 0;

        if (items && Array.isArray(items)) {
          for (const item of items) {
            const itemSubtotal =
              parseFloat(item.unitPrice || "0") * (item.quantity || 0);
            subtotal += itemSubtotal;

            // Get product to calculate tax
            try {
              const [product] = await db
                .select()
                .from(products)
                .where(eq(products.id, item.productId))
                .limit(1);

              if (
                product?.afterTaxPrice &&
                product.afterTaxPrice !== null &&
                product.afterTaxPrice !== ""
              ) {
                const afterTaxPrice = parseFloat(product.afterTaxPrice);
                const basePrice = parseFloat(product.price);
                const taxPerUnit = afterTaxPrice - basePrice;
                tax += taxPerUnit * (item.quantity || 0);
              }
            } catch (productError) {
              console.warn(
                "Could not fetch product for tax calculation:",
                item.productId,
              );
            }
          }
        }

        const total = subtotal + tax;

        orderData = {
          orderNumber: `ORD-${Date.now()}`,
          tableId: null,
          employeeId: null,
          status: "pending",
          customerName: "Khách hàng",
          customerCount: 1,
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
          paymentMethod: null,
          paymentStatus: "pending",
          notes: "POS Order",
          orderedAt: new Date(),
          salesChannel: "pos",
        };

        console.log("Created default order:", orderData);
      } else {
        orderData = insertOrderSchema.parse(order);
      }

      const itemsData = items.map((item: any) =>
        insertOrderItemSchema.parse(item),
      );

      console.log(
        "Parsed order data:",
        JSON.stringify({ orderData, itemsData }, null, 2),
      );

      const newOrder = await storage.createOrder(
        orderData,
        itemsData,
        tenantDb,
      );

      // Verify items were created
      const createdItems = await storage.getOrderItems(newOrder.id, tenantDb);
      console.log(
        `Created ${createdItems.length} items for order ${newOrder.id}:`,
        createdItems,
      );

      res.status(201).json(newOrder);
    } catch (error) {
      console.error("Order creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid order data",
          errors: error.errors,
          details: error.format(),
        });
      }
      res.status(500).json({
        message: "Failed to create order",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.put("/api/orders/:id", async (req: TenantRequest, res) => {
    try {
      const { id: rawId } = req.params;
      const orderData = req.body; // Use raw body to preserve all fields
      const tenantDb = await getTenantDatabase(req);

      console.log(`=== PUT ORDER API CALLED ===`);
      console.log(`Raw Order ID: ${rawId}`);
      console.log(`Update data:`, JSON.stringify(orderData, null, 2));

      // Handle temporary IDs - allow flow to continue
      const isTemporaryId = rawId.startsWith("temp-");
      if (isTemporaryId) {
        console.log(
          `🟡 Temporary order ID detected: ${rawId} - returning success for flow continuation`,
        );

        // Return a mock success response to allow E-invoice flow to continue
        const mockOrder = {
          id: rawId,
          orderNumber: `TEMP-${Date.now()}`,
          tableId: null,
          customerName: orderData.customerName || "Khách hàng",
          status: orderData.status || "paid",
          paymentMethod: orderData.paymentMethod || "cash",
          einvoiceStatus: orderData.einvoiceStatus || 0,
          paidAt: orderData.paidAt || new Date(),
          updatedAt: new Date(),
          updated: true,
          updateTimestamp: new Date().toISOString(),
        };

        console.log(
          `✅ Mock order update response for temporary ID:`,
          mockOrder,
        );
        return res.json(mockOrder);
      }

      const id = parseInt(rawId);
      if (isNaN(id)) {
        console.error(`❌ Invalid order ID: ${rawId}`);
        return res.status(400).json({ message: "Invalid order ID" });
      }

      // Check if order exists first
      const [existingOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, id));

      if (!existingOrder) {
        console.error(`❌ Order not found: ${id}`);
        return res.status(404).json({ message: "Order not found" });
      }

      console.log(`📋 Current order state:`, {
        id: existingOrder.id,
        orderNumber: existingOrder.orderNumber,
        tableId: existingOrder.tableId,
        currentStatus: existingOrder.status,
        paymentMethod: existingOrder.paymentMethod,
        currentSubtotal: existingOrder.subtotal,
        currentTax: existingOrder.tax,
        currentTotal: existingOrder.total,
      });

      // If updating financial fields from table-grid, recalculate using order-dialog logic
      if (
        (orderData.subtotal !== undefined ||
          orderData.tax !== undefined ||
          orderData.total !== undefined) &&
        !orderData.skipRecalculation
      ) {
        console.log(
          `💰 Recalculating totals from order items for order ${id} (using order-dialog logic)`,
        );

        try {
          // Fetch current order items
          const orderItemsResponse = await db
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, id));

          if (orderItemsResponse && orderItemsResponse.length > 0) {
            console.log(
              `📦 Found ${orderItemsResponse.length} items for calculation`,
            );

            // Get products for tax calculation (same as order-dialog)
            const allProducts = await db.select().from(products);
            const productMap = new Map(allProducts.map((p) => [p.id, p]));

            // EXACT same logic as order-dialog calculateTotal()
            let calculatedSubtotal = 0; // Tiền tạm tính (trước thuế)

            orderItemsResponse.forEach((item: any) => {
              const unitPrice = Number(item.unitPrice || 0); // Giá trước thuế
              const quantity = Number(item.quantity || 0);

              // Calculate subtotal (base price * quantity) - EXACT same as order-dialog
              const itemSubtotal = unitPrice * quantity;
              calculatedSubtotal += itemSubtotal;
            });

            // EXACT same logic as order-dialog calculateTax()
            let calculatedTax = 0; // Tổng thuế

            orderItemsResponse.forEach((item: any) => {
              const unitPrice = Number(item.unitPrice || 0);
              const quantity = Number(item.quantity || 0);
              const product = productMap.get(item.productId);

              let itemTax = 0;
              // Thuế = (after_tax_price - price) * quantity - EXACT same as order-dialog
              if (
                product?.afterTaxPrice &&
                product.afterTaxPrice !== null &&
                product.afterTaxPrice !== ""
              ) {
                const afterTaxPrice = parseFloat(product.afterTaxPrice); // Giá sau thuế
                const preTaxPrice = unitPrice; // Giá trước thuế
                const taxPerUnit = Math.max(0, afterTaxPrice - preTaxPrice); // Thuế trên đơn vị
                itemTax = taxPerUnit * quantity;
              }
              // Không có thuế nếu không có afterTaxPrice
              calculatedTax += itemTax;
            });

            // EXACT same logic as order-dialog calculateGrandTotal()
            const calculatedTotal = calculatedSubtotal + calculatedTax;

            console.log(`💰 Calculated totals using order-dialog logic:`, {
              subtotal: calculatedSubtotal,
              tax: calculatedTax,
              total: calculatedTotal,
              itemsCount: orderItemsResponse.length,
              calculationMethod: "order-dialog-exact",
            });

            // Update orderData with calculated values (same format as order-dialog)
            orderData.subtotal = calculatedSubtotal.toString();
            orderData.tax = calculatedTax.toString();
            orderData.total = calculatedTotal.toString();

            console.log(
              `✅ Updated order data with order-dialog calculated totals`,
            );
          } else {
            console.log(
              `⚠️ No items found for order ${id}, setting totals to zero`,
            );
            orderData.subtotal = "0";
            orderData.tax = "0";
            orderData.total = "0";
          }
        } catch (calcError) {
          console.error(
            `❌ Error calculating totals for order ${id}:`,
            calcError,
          );
          // Continue with original values if calculation fails
        }
      }

      // Log the data being updated, especially financial fields
      if (
        orderData.subtotal !== undefined ||
        orderData.tax !== undefined ||
        orderData.total !== undefined
      ) {
        console.log(`💰 Updating financial fields:`, {
          subtotal: orderData.subtotal,
          tax: orderData.tax,
          total: orderData.total,
        });
      }

      const order = await storage.updateOrder(id, orderData, tenantDb);

      if (!order) {
        console.error(`❌ Failed to update order ${id}`);
        return res.status(500).json({ message: "Failed to update order" });
      }

      console.log(`✅ Order update API completed successfully:`, {
        orderId: order.id,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paidAt: order.paidAt,
        einvoiceStatus: order.einvoiceStatus,
        updatedSubtotal: order.subtotal,
        updatedTax: order.tax,
        updatedTotal: order.total,
      });

      res.json({
        ...order,
        updated: true,
        updateTimestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ PUT Order API error:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid order data", errors: error.errors });
      }
      res.status(500).json({
        message: "Failed to update order",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.put("/api/orders/:id/status", async (req: TenantRequest, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      console.log(`🚀 ========================================`);
      console.log(`🚀 API ENDPOINT CALLED: PUT /api/orders/${id}/status`);
      console.log(`🚀 ========================================`);
      console.log(
        `📋 Order status update API called - Order ID: ${id}, New Status: ${status}`,
      );

      // Get tenant database first
      const tenantDb = await getTenantDatabase(req);

      // Handle both numeric IDs and temporary string IDs
      let orderId: number | string = id;
      const isTemporaryId = id.startsWith("temp-");

      if (!isTemporaryId) {
        const parsedId = parseInt(id);
        if (isNaN(parsedId)) {
          console.error(`❌ Invalid order ID: ${id}`);
          return res.status(400).json({ message: "Invalid order ID" });
        }
        orderId = parsedId;
        console.log(`✅ ID converted to number: ${orderId}`);
      } else {
        console.log(`🟡 Keeping temporary ID as string: ${orderId}`);
        // For temporary IDs, just return success without database update
        return res.json({
          id: orderId,
          status: status,
          updated: true,
          previousStatus: "served",
          updateTimestamp: new Date().toISOString(),
          success: true,
          temporary: true,
        });
      }

      if (!status) {
        console.error(`❌ Missing status in request body, received:`, req.body);
        return res.status(400).json({ message: "Status is required" });
      }

      // Get the current order to log its current state
      const [foundOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId as number));

      if (!foundOrder) {
        console.error(`❌ Order not found for ID: ${id}`);
        return res.status(404).json({ message: "Order not found" });
      }

      console.log(`📊 API: Current order state before update:`, {
        orderId: foundOrder.id,
        orderNumber: foundOrder.orderNumber,
        tableId: foundOrder.tableId,
        currentStatus: foundOrder.status,
        requestedStatus: status,
        timestamp: new Date().toISOString(),
      });

      // Direct database update for better reliability
      console.log(
        `🔄 Performing direct database update for order ${orderId} to status ${status}`,
      );

      const updateData: any = {
        status: status,
        updatedAt: new Date(),
      };

      // Add paidAt timestamp if status is 'paid'
      if (status === "paid") {
        updateData.paidAt = new Date();
      }

      const [updatedOrder] = await db
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, orderId as number))
        .returning();

      if (!updatedOrder) {
        console.error(
          `❌ Failed to update order ${orderId} to status ${status}`,
        );
        return res.status(500).json({
          message: "Failed to update order status",
          orderId: id,
          requestedStatus: status,
        });
      }

      console.log(`✅ API: Order status updated successfully:`, {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        tableId: updatedOrder.tableId,
        previousStatus: foundOrder.status,
        newStatus: updatedOrder.status,
        paidAt: updatedOrder.paidAt,
        timestamp: new Date().toISOString(),
      });

      // If status was updated to 'paid', check if table should be released
      if (status === "paid" && updatedOrder.tableId) {
        try {
          // Check if there are any other unpaid orders on this table
          const unpaidOrders = await db
            .select()
            .from(orders)
            .where(
              and(
                eq(orders.tableId, updatedOrder.tableId),
                ne(orders.status, "paid"),
                ne(orders.status, "cancelled"),
              ),
            );

          console.log(
            `📋 Checking table ${updatedOrder.tableId} for other unpaid orders:`,
            {
              tableId: updatedOrder.tableId,
              unpaidOrdersCount: unpaidOrders.length,
              unpaidOrders: unpaidOrders.map((o) => ({
                id: o.id,
                orderNumber: o.orderNumber,
                status: o.status,
              })),
            },
          );

          // If no unpaid orders remain, release the table
          if (unpaidOrders.length === 0) {
            await db
              .update(tables)
              .set({
                status: "available",
                updatedAt: new Date().toISOString(),
              })
              .where(eq(tables.id, updatedOrder.tableId));

            console.log(
              `✅ Table ${updatedOrder.tableId} released to available status`,
            );
          }
        } catch (tableUpdateError) {
          console.error(`❌ Error updating table status:`, tableUpdateError);
          // Don't fail the order update if table update fails
        }
      }

      // Send comprehensive response data
      res.json({
        ...updatedOrder,
        updated: true,
        previousStatus: foundOrder.status,
        updateTimestamp: new Date().toISOString(),
        success: true,
      });
    } catch (error) {
      console.error(`❌ Error updating order status via API:`, error);
      res.status(500).json({
        message: "Failed to update order status",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.post("/api/orders/:id/payment", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { paymentMethod, amountReceived, change } = req.body;
      const tenantDb = await getTenantDatabase(req);

      console.log(
        `💳 Payment completion API called - Order ID: ${id}, Payment Method: ${paymentMethod}`,
      );

      // Update order with payment details and status
      const updateData = {
        status: "paid",
        paymentMethod,
        paidAt: new Date().toISOString(),
      };

      // Add cash payment specific data if provided
      if (amountReceived !== undefined) {
        updateData.amountReceived = amountReceived;
      }
      if (change !== undefined) {
        updateData.change = change;
      }

      console.log(`'=>$' Updating order with payment data:`, updateData);

      const order = await storage.updateOrder(id, updateData, tenantDb);

      if (!order) {
        console.error(`❌ Order not found for payment completion: ${id}`);
        return res.status(404).json({ message: "Order not found" });
      }

      console.log(`✅ Payment completed successfully for order:`, order);

      res.json({
        ...order,
        paymentMethod,
        amountReceived,
        change,
      });
    } catch (error) {
      console.error("❌ Payment completion error:", error);
      res.status(500).json({
        message: "Failed to complete payment",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Get order items for a specific order
  app.get("/api/order-items/:orderId", async (req: TenantRequest, res) => {
    try {
      console.log("=== GET ORDER ITEMS API CALLED ===");
      const orderId = parseInt(req.params.orderId);
      console.log("Order ID requested:", orderId);

      if (isNaN(orderId)) {
        console.error("Invalid order ID provided:", req.params.orderId);
        return res.status(400).json({ message: "Invalid order ID" });
      }

      let tenantDb;
      try {
        tenantDb = await getTenantDatabase(req);
        console.log("✅ Tenant database connection obtained for order items");
      } catch (dbError) {
        console.error(
          "❌ Failed to get tenant database for order items:",
          dbError,
        );
        tenantDb = null;
      }

      console.log("Fetching order items from storage...");
      const items = await storage.getOrderItems(orderId, tenantDb);
      console.log(`Found ${items.length} order items:`, items);

      // Ensure items is always an array
      const safeItems = Array.isArray(items) ? items : [];
      res.json(safeItems);
    } catch (error) {
      console.error("=== GET ORDER ITEMS ERROR ===");
      console.error("Error type:", error?.constructor?.name || "Unknown");
      console.error("Error message:", error?.message || "Unknown error");
      console.error("Error stack:", error?.stack || "No stack trace");
      console.error("Order ID:", req.params.orderId);

      res.status(500).json({
        message: "Failed to fetch order items",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Delete a specific order item
  app.delete("/api/order-items/:itemId", async (req: TenantRequest, res) => {
    try {
      console.log("=== DELETE ORDER ITEM API CALLED ===");
      const itemId = parseInt(req.params.itemId);
      const tenantDb = await getTenantDatabase(req); // Assuming tenantDb is needed here as well
      console.log("Item ID requested:", itemId);

      if (isNaN(itemId)) {
        return res.status(400).json({ error: "Invalid item ID" });
      }

      console.log("Deleting order item from storage...");
      const success = await storage.deleteOrderItem(itemId, tenantDb); // Pass tenantDb to storage function

      if (success) {
        console.log("Order item deleted successfully");
        res.json({ success: true, message: "Order item deleted successfully" });
      } else {
        console.log("Order item not found");
        res.status(404).json({ error: "Order item not found" });
      }
    } catch (error) {
      console.error("=== DELETE ORDER ITEM ERROR ===");
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      console.error("Item ID:", req.params.itemId);
      res.status(500).json({
        error: "Failed to delete order item",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Add order items to existing order
  app.post("/api/orders/:orderId/items", async (req: TenantRequest, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const { items } = req.body;

      console.log(`📝 Adding ${items?.length || 0} items to order ${orderId}`);

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Items array is required" });
      }

      if (isNaN(orderId)) {
        return res.status(400).json({ error: "Invalid order ID" });
      }

      // Get tenant database connection
      let tenantDb;
      try {
        tenantDb = await getTenantDatabase(req);
        console.log(
          "✅ Tenant database connection obtained for adding order items",
        );
      } catch (dbError) {
        console.error(
          "❌ Failed to get tenant database for adding order items:",
          dbError,
        );
        return res.status(500).json({ error: "Database connection failed" });
      }

      // Use tenant database for all operations
      const database = tenantDb || db;

      // Validate that order exists
      const [existingOrder] = await database
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!existingOrder) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Validate items data
      const validatedItems = items.map((item: any, index: number) => {
        if (!item.productId || !item.quantity || !item.unitPrice) {
          throw new Error(
            `Item at index ${index} is missing required fields: productId, quantity, or unitPrice`,
          );
        }

        return {
          orderId,
          productId: parseInt(item.productId),
          quantity: parseInt(item.quantity),
          unitPrice: item.unitPrice.toString(),
          total: item.total
            ? item.total.toString()
            : (parseFloat(item.unitPrice) * parseInt(item.quantity)).toString(),
          notes: item.notes || null,
        };
      });

      console.log(`📝 Validated items for insertion:`, validatedItems);

      // Insert new items using tenant database
      const insertedItems = await database
        .insert(orderItems)
        .values(validatedItems)
        .returning();

      console.log(
        `✅ Successfully added ${insertedItems.length} items to order ${orderId}`,
      );

      // Fetch ALL order items to recalculate totals using order-dialog logic
      const allOrderItems = await database
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      console.log(
        `📦 Found ${allOrderItems.length} total items for order ${orderId}`,
      );

      // Get products for tax calculation (same as order-dialog)
      const allProducts = await database.select().from(products);
      const productMap = new Map(allProducts.map((p) => [p.id, p]));

      // EXACT same logic as order-dialog calculateTotal()
      let calculatedSubtotal = 0; // Tiền tạm tính (trước thuế)

      allOrderItems.forEach((item: any) => {
        const unitPrice = Number(item.unitPrice || 0); // Giá trước thuế
        const quantity = Number(item.quantity || 0);

        // Calculate subtotal (base price * quantity) - EXACT same as order-dialog
        const itemSubtotal = unitPrice * quantity;
        calculatedSubtotal += itemSubtotal;
      });

      // EXACT same logic as order-dialog calculateTax()
      let calculatedTax = 0; // Tổng thuế

      allOrderItems.forEach((item: any) => {
        const unitPrice = Number(item.unitPrice || 0);
        const quantity = Number(item.quantity || 0);
        const product = productMap.get(item.productId);

        let itemTax = 0;
        // Thuế = (after_tax_price - price) * quantity - EXACT same as order-dialog
        if (
          product?.afterTaxPrice &&
          product.afterTaxPrice !== null &&
          product.afterTaxPrice !== ""
        ) {
          const afterTaxPrice = parseFloat(product.afterTaxPrice); // Giá sau thuế
          const preTaxPrice = unitPrice; // Giá trước thuế
          const taxPerUnit = Math.max(0, afterTaxPrice - preTaxPrice); // Thuế trên đơn vị
          itemTax = taxPerUnit * quantity;
        }
        // Không có thuế nếu không có afterTaxPrice
        calculatedTax += itemTax;
      });

      // EXACT same logic as order-dialog calculateGrandTotal()
      const calculatedTotal = calculatedSubtotal + calculatedTax;

      console.log(`💰 Calculated new totals using order-dialog logic:`, {
        subtotal: calculatedSubtotal,
        tax: calculatedTax,
        total: calculatedTotal,
        itemsCount: allOrderItems.length,
        calculationMethod: "order-dialog-exact",
      });

      // Update order totals with calculated values using tenant database
      const [updatedOrder] = await database
        .update(orders)
        .set({
          subtotal: calculatedSubtotal.toString(),
          tax: calculatedTax.toString(),
          total: calculatedTotal.toString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(orders.id, orderId))
        .returning();

      console.log(
        `✅ Order ${orderId} totals updated successfully using order-dialog calculation`,
      );

      res.json({
        success: true,
        insertedItems,
        updatedOrder,
        message: `Added ${insertedItems.length} items and updated order totals using order-dialog logic`,
      });
    } catch (error) {
      console.error(
        `❌ Error adding items to order ${req.params.orderId}:`,
        error,
      );

      let errorMessage = "Failed to add items to order";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      res.status(500).json({
        error: errorMessage,
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Inventory Management
  app.post("/api/inventory/update-stock", async (req: TenantRequest, res) => {
    try {
      const { productId, quantity, type, notes, trackInventory } = req.body;
      const tenantDb = await getTenantDatabase(req);

      // Get current product
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      let newStock = product.stock;
      switch (type) {
        case "add":
          newStock += quantity;
          break;
        case "subtract":
          newStock = Math.max(0, product.stock - quantity);
          break;
        case "set":
          newStock = quantity;
          break;
      }

      // Update product stock and trackInventory
      const updateData: any = { stock: newStock };
      if (trackInventory !== undefined) {
        updateData.trackInventory = trackInventory;
      }

      await db
        .update(products)
        .set(updateData)
        .where(eq(products.id, productId));

      // Create inventory transaction record
      await db.insert(inventoryTransactions).values({
        productId,
        type,
        quantity,
        previousStock: product.stock,
        newStock,
        notes: notes || null,
        createdAt: new Date().toISOString(),
      });

      res.json({ success: true, newStock });
    } catch (error) {
      console.error("Stock update error:", error);
      res.status(500).json({ error: "Failed to update stock" });
    }
  });

  // Store Settings
  app.get("/api/store-settings", async (req: TenantRequest, res) => {
    try {
      const tenantDb = await getTenantDatabase(req);
      const settings = await storage.getStoreSettings(tenantDb);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch store settings" });
    }
  });

  app.put("/api/store-settings", async (req: TenantRequest, res) => {
    try {
      const validatedData = insertStoreSettingsSchema.partial().parse(req.body);
      const tenantDb = await getTenantDatabase(req);
      const settings = await storage.updateStoreSettings(
        validatedData,
        tenantDb,
      );
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid store settings data",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Failed to update store settings" });
    }
  });

  // Suppliers
  app.get(
    "/api/suppliers",
    tenantMiddleware,
    async (req: TenantRequest, res) => {
      try {
        console.log("🔍 GET /api/suppliers - Starting request processing");
        let tenantDb;
        try {
          tenantDb = await getTenantDatabase(req);
          console.log("✅ Tenant database connection obtained for suppliers");
        } catch (dbError) {
          console.error(
            "❌ Failed to get tenant database for suppliers:",
            dbError,
          );
          tenantDb = null;
        }

        const { status, search } = req.query;
        let suppliers;

        if (search) {
          suppliers = await storage.searchSuppliers(search as string, tenantDb);
        } else if (status && status !== "all") {
          suppliers = await storage.getSuppliersByStatus(
            status as string,
            tenantDb,
          );
        } else {
          suppliers = await storage.getSuppliers(tenantDb);
        }
        console.log(`✅ Successfully fetched ${suppliers.length} suppliers`);
        res.json(suppliers);
      } catch (error) {
        console.error("❌ Error fetching suppliers:", error);
        res.status(500).json({ message: "Failed to fetch suppliers" });
      }
    },
  );

  app.get("/api/suppliers/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantDb = await getTenantDatabase(req);
      const supplier = await storage.getSupplier(id, tenantDb);

      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      res.json(supplier);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch supplier" });
    }
  });

  app.post("/api/suppliers", async (req: TenantRequest, res) => {
    try {
      const validatedData = insertSupplierSchema.parse(req.body);
      const tenantDb = await getTenantDatabase(req);
      const supplier = await storage.createSupplier(validatedData, tenantDb);
      res.status(201).json(supplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid supplier data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create supplier" });
    }
  });

  app.put("/api/suppliers/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertSupplierSchema.partial().parse(req.body);
      const tenantDb = await getTenantDatabase(req);
      const supplier = await storage.updateSupplier(
        id,
        validatedData,
        tenantDb,
      );

      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      res.json(supplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid supplier data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update supplier" });
    }
  });

  app.delete("/api/suppliers/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantDb = await getTenantDatabase(req);
      const deleted = await storage.deleteSupplier(id, tenantDb);

      if (!deleted) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      res.json({ message: "Supplier deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete supplier" });
    }
  });

  // Get next customer ID
  app.get("/api/customers/next-id", async (req: TenantRequest, res) => {
    try {
      const tenantDb = await getTenantDatabase(req);
      const nextId = await storage.getNextCustomerId(tenantDb);
      res.json({ nextId });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate customer ID" });
    }
  });

  // Customer management routes - Added Here
  app.get(
    "/api/customers",
    tenantMiddleware,
    async (req: TenantRequest, res) => {
      try {
        console.log("🔍 GET /api/customers - Starting request processing");
        let tenantDb;
        try {
          tenantDb = await getTenantDatabase(req);
          console.log("✅ Tenant database connection obtained for customers");
        } catch (dbError) {
          console.error(
            "❌ Failed to get tenant database for customers:",
            dbError,
          );
          tenantDb = null;
        }

        const customers = await storage.getCustomers(tenantDb);
        console.log(`✅ Successfully fetched ${customers.length} customers`);
        res.json(customers);
      } catch (error) {
        console.error("❌ Error fetching customers:", error);
        res.status(500).json({ message: "Failed to fetch customers" });
      }
    },
  );

  app.get("/api/customers/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantDb = await getTenantDatabase(req);
      const customer = await storage.getCustomer(id, tenantDb);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  // Create customer
  app.post("/api/customers", async (req: TenantRequest, res) => {
    try {
      const tenantDb = await getTenantDatabase(req);

      // Validate required fields
      if (!req.body.name) {
        return res.status(400).json({ message: "Customer name is required" });
      }

      // Prepare customer data with proper defaults
      const customerData = {
        ...req.body,
        customerId: req.body.customerId || undefined,
        phone: req.body.phone || null,
        email: req.body.email || null,
        address: req.body.address || null,
        dateOfBirth: req.body.dateOfBirth || null,
        membershipLevel: req.body.membershipLevel || "Silver",
        notes: req.body.notes || null,
        status: req.body.status || "active",
        totalSpent: "0",
        pointsBalance: 0,
      };

      const [customer] = await db
        .insert(customers)
        .values(customerData)
        .returning();
      res.json(customer);
    } catch (error: any) {
      console.error("Error creating customer:", error);

      // Handle specific database errors
      if (error.code === "SQLITE_CONSTRAINT") {
        return res.status(400).json({
          message: "Customer with this ID already exists",
        });
      }

      res.status(500).json({
        message: "Failed to create customer",
        error: error.message,
      });
    }
  });

  app.put("/api/customers/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const customerData = req.body;
      const tenantDb = await getTenantDatabase(req);
      const customer = await storage.updateCustomer(id, customerData, tenantDb);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid customer data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantDb = await getTenantDatabase(req);
      const deleted = await storage.deleteCustomer(id, tenantDb);
      if (!deleted) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json({ message: "Customer deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  app.post("/api/customers/:id/visit", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { amount, points } = req.body;
      const tenantDb = await getTenantDatabase(req);

      const customer = await storage.getCustomer(id, tenantDb);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      const updatedCustomer = await storage.updateCustomerVisit(
        id,
        amount,
        points,
        tenantDb,
      );
      res.json(updatedCustomer);
    } catch (error) {
      res.status(500).json({ message: "Failed to update customer visit" });
    }
  });

  // Point Management API
  app.get("/api/customers/:id/points", async (req: TenantRequest, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const tenantDb = await getTenantDatabase(req);
      const pointsData = await storage.getCustomerPoints(customerId, tenantDb);

      if (!pointsData) {
        return res.status(404).json({ message: "Customer not found" });
      }

      res.json(pointsData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer points" });
    }
  });

  app.post("/api/customers/:id/points", async (req: TenantRequest, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const pointUpdateSchema = z.object({
        points: z.number().int().min(1),
        description: z.string().min(1),
        type: z.enum(["earned", "redeemed", "adjusted"]),
        employeeId: z.number().optional(),
        orderId: z.number().optional(),
      });

      const { points, description, type, employeeId, orderId } =
        pointUpdateSchema.parse(req.body);
      const tenantDb = await getTenantDatabase(req);

      const pointTransaction = await storage.updateCustomerPoints(
        customerId,
        points,
        description,
        type,
        employeeId,
        orderId,
        tenantDb,
      );

      res.status(201).json(pointTransaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid point update data",
          errors: error.errors,
        });
      }
      if (error instanceof Error && error.message === "Customer not found") {
        return res.status(404).json({ message: "Customer not found" });
      }
      if (
        error instanceof Error &&
        error.message === "Insufficient points balance"
      ) {
        return res.status(400).json({ message: "Insufficient points balance" });
      }
      res.status(500).json({ message: "Failed to update customer points" });
    }
  });

  app.get(
    "/api/customers/:id/point-history",
    async (req: TenantRequest, res) => {
      try {
        const customerId = parseInt(req.params.id);
        const limit = parseInt(req.query.limit as string) || 50;
        const tenantDb = await getTenantDatabase(req);

        const pointHistory = await storage.getPointHistory(
          customerId,
          limit,
          tenantDb,
        );
        res.json(pointHistory);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch point history" });
      }
    },
  );

  // New endpoints for points management modal
  app.post("/api/customers/adjust-points", async (req: TenantRequest, res) => {
    try {
      const pointUpdateSchema = z.object({
        customerId: z.number().int().min(1),
        points: z.number().int(),
        type: z.enum(["earned", "redeemed", "adjusted"]),
        description: z.string().min(1),
      });

      const { customerId, points, type, description } = pointUpdateSchema.parse(
        req.body,
      );
      const tenantDb = await getTenantDatabase(req);

      const pointTransaction = await storage.updateCustomerPoints(
        customerId,
        points,
        description,
        type,
        undefined, // employeeId is optional and not provided here
        undefined, // orderId is optional and not provided here
        tenantDb,
      );

      res.status(201).json(pointTransaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid point adjustment data",
          errors: error.errors,
        });
      }
      if (error instanceof Error && error.message === "Customer not found") {
        return res.status(404).json({ message: "Customer not found" });
      }
      if (
        error instanceof Error &&
        error.message === "Insufficient points balance"
      ) {
        return res.status(400).json({ message: "Insufficient points balance" });
      }
      res.status(500).json({ message: "Failed to adjust customer points" });
    }
  });

  app.post("/api/customers/redeem-points", async (req: TenantRequest, res) => {
    try {
      const redeemSchema = z.object({
        customerId: z.number().int().min(1),
        points: z.number().int().min(1),
      });

      const { customerId, points } = redeemSchema.parse(req.body);
      const tenantDb = await getTenantDatabase(req);

      const pointTransaction = await storage.updateCustomerPoints(
        customerId,
        -points,
        "포인트 결제 사용",
        "redeemed",
        undefined, // employeeId is optional
        undefined, // orderId is optional
        tenantDb,
      );

      res.status(201).json(pointTransaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid point redemption data",
          errors: error.errors,
        });
      }
      if (error instanceof Error && error.message === "Customer not found") {
        return res.status(404).json({ message: "Customer not found" });
      }
      if (
        error instanceof Error &&
        error.message === "Insufficient points balance"
      ) {
        return res.status(400).json({ message: "Insufficient points balance" });
      }
      res.status(500).json({ message: "Failed to redeem customer points" });
    }
  });

  app.get("/api/point-transactions", async (req: TenantRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const tenantDb = await getTenantDatabase(req);
      // For now, get all point transactions across all customers
      // In a real app, you might want to add pagination and filtering
      const allTransactions = await storage.getAllPointTransactions(
        limit,
        tenantDb,
      );
      res.json(allTransactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch point transactions" });
    }
  });

  // Membership thresholds management
  app.get("/api/membership-thresholds", async (req: TenantRequest, res) => {
    try {
      const tenantDb = await getTenantDatabase(req);
      const thresholds = await storage.getMembershipThresholds(tenantDb);
      res.json(thresholds);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to fetch membership thresholds" });
    }
  });

  app.put("/api/membership-thresholds", async (req: TenantRequest, res) => {
    try {
      const thresholdSchema = z.object({
        GOLD: z.number().min(0),
        VIP: z.number().min(0),
      });

      const validatedData = thresholdSchema.parse(req.body);
      const tenantDb = await getTenantDatabase(req);
      const thresholds = await storage.updateMembershipThresholds(
        validatedData,
        tenantDb,
      );

      res.json(thresholds);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid threshold data",
          errors: error.errors,
        });
      }
      res
        .status(500)
        .json({ message: "Failed to update membership thresholds" });
    }
  });

  // Supplier Reports APIs
  app.get("/api/supplier-debts", async (req: TenantRequest, res) => {
    try {
      const { startDate, endDate, supplierId } = req.query;
      const tenantDb = await getTenantDatabase(req);

      // Mock data for supplier debts - replace with actual database queries
      const supplierDebts = [
        {
          id: 1,
          supplierCode: "SUP001",
          supplierName: "Nhà cung cấp A",
          initialDebt: 500000,
          newDebt: 300000,
          payment: 200000,
          finalDebt: 600000,
          phone: "010-1234-5678",
        },
        {
          id: 2,
          supplierCode: "SUP002",
          supplierName: "Nhà cung cấp B",
          initialDebt: 800000,
          newDebt: 400000,
          payment: 300000,
          finalDebt: 900000,
          phone: "010-2345-6789",
        },
      ];

      // Filter by supplier if specified
      let filteredDebts = supplierDebts;
      if (supplierId) {
        filteredDebts = supplierDebts.filter(
          (debt) => debt.id === parseInt(supplierId as string),
        );
      }

      res.json(filteredDebts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch supplier debts" });
    }
  });

  app.get("/api/supplier-purchases", async (req: TenantRequest, res) => {
    try {
      const { startDate, endDate, supplierId } = req.query;
      const tenantDb = await getTenantDatabase(req);

      // Mock data for supplier purchases - replace with actual database queries
      const supplierPurchases = [
        {
          id: 1,
          supplierCode: "SUP001",
          supplierName: "Nhà cung cấp A",
          purchaseValue: 1500000,
          paymentValue: 1200000,
          netValue: 300000,
          phone: "010-1234-5678",
        },
        {
          id: 2,
          supplierCode: "SUP002",
          supplierName: "Nhà cung cấp B",
          purchaseValue: 2000000,
          paymentValue: 1700000,
          netValue: 300000,
          phone: "010-2345-6789",
        },
      ];

      // Filter by supplier if specified
      let filteredPurchases = supplierPurchases;
      if (supplierId) {
        filteredPurchases = supplierPurchases.filter(
          (purchase) => purchase.id === parseInt(supplierId as string),
        );
      }

      res.json(filteredPurchases);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch supplier purchases" });
    }
  });

  // Invoice templates management
  app.get(
    "/api/invoice-templates",
    tenantMiddleware,
    async (req: TenantRequest, res) => {
      try {
        console.log(
          "🔍 GET /api/invoice-templates - Starting request processing",
        );
        let tenantDb;
        try {
          tenantDb = await getTenantDatabase(req);
          console.log(
            "✅ Tenant database connection obtained for invoice templates",
          );
        } catch (dbError) {
          console.error(
            "❌ Failed to get tenant database for invoice templates:",
            dbError,
          );
          tenantDb = null;
        }

        const templates = await storage.getInvoiceTemplates(tenantDb);
        console.log(
          `✅ Successfully fetched ${templates.length} invoice templates`,
        );
        res.json(templates);
      } catch (error) {
        console.error("❌ Error fetching invoice templates:", error);
        res.status(500).json({ error: "Failed to fetch invoice templates" });
      }
    },
  );

  app.get("/api/invoice-templates/active", async (req: TenantRequest, res) => {
    try {
      const tenantDb = await getTenantDatabase(req);
      const activeTemplates = await storage.getActiveInvoiceTemplates();
      res.json(activeTemplates);
    } catch (error) {
      console.error("Error fetching active invoice templates:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch active invoice templates" });
    }
  });

  app.post("/api/invoice-templates", async (req: TenantRequest, res) => {
    try {
      const templateData = req.body;
      const tenantDb = await getTenantDatabase(req);
      const template = await storage.createInvoiceTemplate(
        templateData,
        tenantDb,
      );
      res.status(201).json(template);
    } catch (error) {
      console.error("Invoice template creation error:", error);
      res.status(500).json({ message: "Failed to create invoice template" });
    }
  });

  app.put("/api/invoice-templates/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const templateData = req.body;
      const tenantDb = await getTenantDatabase(req);
      const template = await storage.updateInvoiceTemplate(
        id,
        templateData,
        tenantDb,
      );

      if (!template) {
        return res.status(404).json({ message: "Invoice template not found" });
      }

      res.json(template);
    } catch (error) {
      console.error("Invoice template update error:", error);
      res.status(500).json({ message: "Failed to update invoice template" });
    }
  });

  app.delete("/api/invoice-templates/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantDb = await getTenantDatabase(req);
      const deleted = await storage.deleteInvoiceTemplate(id, tenantDb);

      if (!deleted) {
        return res.status(404).json({ message: "Invoice template not found" });
      }

      res.json({ message: "Invoice template deleted successfully" });
    } catch (error) {
      console.error("Invoice template deletion error:", error);
      res.status(500).json({ message: "Failed to delete invoice template" });
    }
  });

  // Invoices management
  app.get(
    "/api/invoices",
    tenantMiddleware,
    async (req: TenantRequest, res) => {
      try {
        console.log("🔍 GET /api/invoices - Starting request processing");
        let tenantDb;
        try {
          tenantDb = await getTenantDatabase(req);
          console.log("✅ Tenant database connection obtained for invoices");
        } catch (dbError) {
          console.error(
            "❌ Failed to get tenant database for invoices:",
            dbError,
          );
          tenantDb = null;
        }

        const invoices = await storage.getInvoices(tenantDb);
        console.log(`✅ Successfully fetched ${invoices.length} invoices`);
        res.json(invoices);
      } catch (error) {
        console.error("❌ Error fetching invoices:", error);
        res.status(500).json({ message: "Failed to fetch invoices" });
      }
    },
  );

  app.post("/api/invoices", async (req: TenantRequest, res) => {
    try {
      console.log("🔍 POST /api/invoices - Creating new invoice");
      const tenantDb = await getTenantDatabase(req);
      const invoiceData = req.body;

      console.log(
        "📄 Invoice data received:",
        JSON.stringify(invoiceData, null, 2),
      );

      // Validate required fields
      if (!invoiceData.customerName) {
        return res.status(400).json({ error: "Customer name is required" });
      }

      if (!invoiceData.total || parseFloat(invoiceData.total) <= 0) {
        return res
          .status(400)
          .json({ error: "Valid total amount is required" });
      }

      if (
        !invoiceData.items ||
        !Array.isArray(invoiceData.items) ||
        invoiceData.items.length === 0
      ) {
        return res.status(400).json({ error: "Invoice items are required" });
      }

      // Create invoice in database
      const invoice = await storage.createInvoice(invoiceData, tenantDb);

      console.log("✅ Invoice created successfully:", invoice);
      res.status(201).json({
        success: true,
        invoice: invoice,
        message: "Invoice created successfully",
      });
    } catch (error) {
      console.error("❌ Error creating invoice:", error);

      let errorMessage = "Failed to create invoice";
      if (error instanceof Error) {
        errorMessage = `Failed to create invoice: ${error.message}`;
      }

      res.status(500).json({
        error: errorMessage,
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get("/api/invoices/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantDb = await getTenantDatabase(req);

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid invoice ID" });
      }

      const invoice = await storage.getInvoice(id, tenantDb);

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      res.json(invoice);
    } catch (error) {
      console.error("❌ Error fetching invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.put("/api/invoices/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantDb = await getTenantDatabase(req);
      const updateData = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid invoice ID" });
      }

      const invoice = await storage.updateInvoice(id, updateData, tenantDb);

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      res.json(invoice);
    } catch (error) {
      console.error("❌ Error updating invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantDb = await getTenantDatabase(req);

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid invoice ID" });
      }

      const deleted = await storage.deleteInvoice(id, tenantDb);

      if (!deleted) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      res.json({ message: "Invoice deleted successfully" });
    } catch (error) {
      console.error("❌ Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // E-invoice connections management
  app.get(
    "/api/einvoice-connections",
    tenantMiddleware,
    async (req: TenantRequest, res) => {
      try {
        console.log(
          "🔍 GET /api/einvoice-connections - Starting request processing",
        );
        let tenantDb;
        try {
          tenantDb = await getTenantDatabase(req);
          console.log(
            "✅ Tenant database connection obtained for e-invoice connections",
          );
        } catch (dbError) {
          console.error(
            "❌ Failed to get tenant database for e-invoice connections:",
            dbError,
          );
          tenantDb = null;
        }

        const connections = await storage.getEInvoiceConnections(tenantDb);
        console.log(
          `✅ Successfully fetched ${connections.length} e-invoice connections`,
        );
        res.json(connections);
      } catch (error) {
        console.error("❌ Error fetching e-invoice connections:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch e-invoice connections" });
      }
    },
  );

  app.post("/api/einvoice-connections", async (req: TenantRequest, res) => {
    try {
      const connectionData = req.body;
      const tenantDb = await getTenantDatabase(req);
      const connection = await storage.createEInvoiceConnection(
        connectionData,
        tenantDb,
      );
      res.status(201).json(connection);
    } catch (error) {
      console.error("E-invoice connection creation error:", error);
      res
        .status(500)
        .json({ message: "Failed to create e-invoice connection" });
    }
  });

  app.put("/api/einvoice-connections/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const connectionData = req.body;
      const tenantDb = await getTenantDatabase(req);
      const connection = await storage.updateEInvoiceConnection(
        id,
        connectionData,
        tenantDb,
      );

      if (!connection) {
        return res
          .status(404)
          .json({ message: "E-invoice connection not found" });
      }

      res.json(connection);
    } catch (error) {
      console.error("E-invoice connection update error:", error);
      res
        .status(500)
        .json({ message: "Failed to update e-invoice connection" });
    }
  });

  app.delete(
    "/api/einvoice-connections/:id",
    async (req: TenantRequest, res) => {
      try {
        const id = parseInt(req.params.id);
        const tenantDb = await getTenantDatabase(req);
        const deleted = await storage.deleteEInvoiceConnection(id, tenantDb);

        if (!deleted) {
          return res
            .status(404)
            .json({ message: "E-invoice connection not found" });
        }

        res.json({ message: "E-invoice connection deleted successfully" });
      } catch (error) {
        console.error("E-invoice connection deletion error:", error);
        res
          .status(500)
          .json({ message: "Failed to delete e-invoice connection" });
      }
    },
  );

  // Menu Analysis API
  app.get("/api/menu-analysis", async (req, res) => {
    try {
      const { startDate, endDate, categoryId } = req.query;
      const tenantDb = await getTenantDatabase(req);

      console.log("Menu Analysis API called with params:", {
        startDate,
        endDate,
        search: req.query.search,
        categoryId,
        productType: req.query.productType,
      });

      console.log("Executing transaction and order queries...");

      // Build date conditions
      const dateConditions = [];
      if (startDate && endDate) {
        const startDateTime = new Date(startDate as string);
        const endDateTime = new Date(endDate as string);
        endDateTime.setHours(23, 59, 59, 999);
        dateConditions.push(
          gte(transactionsTable.createdAt, startDateTime),
          lte(transactionsTable.createdAt, endDateTime),
        );
      } else if (startDate) {
        const startDateTime = new Date(startDate as string);
        dateConditions.push(gte(transactionsTable.createdAt, startDateTime));
      } else if (endDate) {
        const endDateTime = new Date(endDate as string);
        endDateTime.setHours(23, 59, 59, 999);
        dateConditions.push(lte(transactionsTable.createdAt, endDateTime));
      }

      // Build category conditions
      const categoryConditions = [];
      if (categoryId && categoryId !== "all") {
        categoryConditions.push(
          eq(products.categoryId, parseInt(categoryId as string)),
        );
      }

      // Query transaction items with proper Drizzle ORM
      const transactionResults = await db
        .select({
          productId: transactionItemsTable.productId,
          productName: products.name,
          categoryId: products.categoryId,
          categoryName: categories.name,
          totalQuantity: sql<number>`SUM(${transactionItemsTable.quantity})`,
          totalRevenue: sql<number>`SUM(CAST(${transactionItemsTable.unitPrice} AS DECIMAL(10,2)) * ${transactionItemsTable.quantity})`,
        })
        .from(transactionItemsTable)
        .innerJoin(
          transactionsTable,
          eq(transactionItemsTable.transactionId, transactionsTable.id),
        )
        .innerJoin(products, eq(transactionItemsTable.productId, products.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(and(...dateConditions, ...categoryConditions))
        .groupBy(
          transactionItemsTable.productId,
          products.name,
          products.categoryId,
          categories.name,
        );

      // Query order items with proper Drizzle ORM
      const orderDateConditions = [];
      if (startDate && endDate) {
        const startDateTime = new Date(startDate as string);
        const endDateTime = new Date(endDate as string);
        endDateTime.setHours(23, 59, 59, 999);
        orderDateConditions.push(
          gte(orders.orderedAt, startDateTime),
          lte(orders.orderedAt, endDateTime),
        );
      } else if (startDate) {
        const startDateTime = new Date(startDate as string);
        orderDateConditions.push(gte(orders.orderedAt, startDateTime));
      } else if (endDate) {
        const endDateTime = new Date(endDate as string);
        endDateTime.setHours(23, 59, 59, 999);
        orderDateConditions.push(lte(orders.orderedAt, endDateTime));
      }

      const orderResults = await db
        .select({
          productId: orderItems.productId,
          productName: products.name,
          categoryId: products.categoryId,
          categoryName: categories.name,
          totalQuantity: sql<number>`SUM(${orderItems.quantity})`,
          totalRevenue: sql<number>`SUM(CAST(${orderItems.unitPrice} AS DECIMAL(10,2)) * ${orderItems.quantity})`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .innerJoin(products, eq(orderItems.productId, products.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(
          and(
            eq(orders.status, "paid"),
            ...orderDateConditions,
            ...categoryConditions,
          ),
        )
        .groupBy(
          orderItems.productId,
          products.name,
          products.categoryId,
          categories.name,
        );

      console.log("Transaction stats:", transactionResults.length, "items");
      console.log("Order stats:", orderResults.length, "items");

      // Combine and aggregate results
      const productMap = new Map();
      const categoryMap = new Map();

      // Process transaction results
      transactionResults.forEach((item) => {
        const key = item.productId;
        if (productMap.has(key)) {
          const existing = productMap.get(key);
          existing.totalQuantity += Number(item.totalQuantity || 0);
          existing.totalRevenue += Number(item.totalRevenue || 0);
        } else {
          productMap.set(key, {
            productId: item.productId,
            productName: item.productName,
            categoryId: item.categoryId,
            categoryName: item.categoryName,
            totalQuantity: Number(item.totalQuantity || 0),
            totalRevenue: Number(item.totalRevenue || 0),
          });
        }
      });

      // Process order results
      orderResults.forEach((item) => {
        const key = item.productId;
        if (productMap.has(key)) {
          const existing = productMap.get(key);
          existing.totalQuantity += Number(item.totalQuantity || 0);
          existing.totalRevenue += Number(item.totalRevenue || 0);
        } else {
          productMap.set(key, {
            productId: item.productId,
            productName: item.productName,
            categoryId: item.categoryId,
            categoryName: item.categoryName,
            totalQuantity: Number(item.totalQuantity || 0),
            totalRevenue: Number(item.totalRevenue || 0),
          });
        }
      });

      // Calculate category stats
      productMap.forEach((product) => {
        const categoryKey = product.categoryId;
        if (categoryMap.has(categoryKey)) {
          const existing = categoryMap.get(categoryKey);
          existing.totalQuantity += product.totalQuantity;
          existing.totalRevenue += product.totalRevenue;
          existing.productCount += 1;
        } else {
          categoryMap.set(categoryKey, {
            categoryId: product.categoryId,
            categoryName: product.categoryName,
            totalQuantity: product.totalQuantity,
            totalRevenue: product.totalRevenue,
            productCount: 1,
          });
        }
      });

      const productStats = Array.from(productMap.values());
      const categoryStats = Array.from(categoryMap.values());

      // Calculate totals
      const totalRevenue = productStats.reduce(
        (sum, product) => sum + product.totalRevenue,
        0,
      );
      const totalQuantity = productStats.reduce(
        (sum, product) => sum + product.totalQuantity,
        0,
      );

      // Top selling products (by quantity)
      const topSellingProducts = productStats
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 10);

      // Top revenue products
      const topRevenueProducts = productStats
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10);

      const result = {
        totalRevenue,
        totalQuantity,
        categoryStats,
        productStats,
        topSellingProducts,
        topRevenueProducts,
      };

      console.log("Menu Analysis Results:", {
        totalRevenue,
        totalQuantity,
        productCount: productStats.length,
        categoryCount: categoryStats.length,
      });

      res.json(result);
    } catch (error) {
      console.error("Menu analysis error:", error);
      res.status(500).json({
        error: "Failed to fetch menu analysis",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Customer Reports APIs
  app.get("/api/customer-debts", async (req: TenantRequest, res) => {
    try {
      const { startDate, endDate, customerId } = req.query;
      const tenantDb = await getTenantDatabase(req);

      // Get customer debts from database
      const customerDebts = await db
        .select({
          id: customers.id,
          customerCode: customers.customerId,
          customerName: customers.name,
          initialDebt: sql<number>`0`, // Mock initial debt
          newDebt: sql<number>`COALESCE(${customers.totalSpent}, 0) * 0.1`, // 10% of total spent as debt
          payment: sql<number>`COALESCE(${customers.totalSpent}, 0) * 0.05`, // 5% as payment
          finalDebt: sql<number>`COALESCE(${customers.totalSpent}, 0) * 0.05`, // Final debt
          phone: customers.phone,
        })
        .from(customers)
        .where(eq(customers.status, "active"));

      // Filter by customer if specified
      let filteredDebts = customerDebts;
      if (customerId) {
        filteredDebts = customerDebts.filter(
          (debt) => debt.id === parseInt(customerId as string),
        );
      }

      res.json(filteredDebts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer debts" });
    }
  });

  app.get("/api/customer-sales", async (req: TenantRequest, res) => {
    try {
      const { startDate, endDate, customerId } = req.query;
      const tenantDb = await getTenantDatabase(req);

      // Get customer sales data from database
      const customerSales = await db
        .select({
          id: customers.id,
          customerCode: customers.customerId,
          customerName: customers.name,
          totalSales: customers.totalSpent,
          visitCount: customers.visitCount,
          averageOrder: sql<number>`CASE WHEN ${customers.visitCount} > 0 THEN ${customers.totalSpent} / ${customers.visitCount} ELSE 0 END`,
          phone: customers.phone,
        })
        .from(customers)
        .where(eq(customers.status, "active"));

      // Filter by customer if specified
      let filteredSales = customerSales;
      if (customerId) {
        filteredSales = customerSales.filter(
          (sale) => sale.id === parseInt(customerId as string),
        );
      }

      res.json(filteredSales);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer sales" });
    }
  });

  // Bulk create products
  app.post("/api/products/bulk", async (req: TenantRequest, res) => {
    try {
      const { products: productList } = req.body;
      const tenantDb = await getTenantDatabase(req);

      if (!productList || !Array.isArray(productList)) {
        return res.status(400).json({ error: "Invalid products data" });
      }

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const productData of productList) {
        try {
          console.log(`Processing product: ${JSON.stringify(productData)}`);

          // Validate required fields with detailed messages
          const missingFields = [];
          if (!productData.name) missingFields.push("name");
          if (!productData.sku) missingFields.push("sku");
          if (!productData.price) missingFields.push("price");
          if (
            productData.categoryId === undefined ||
            productData.categoryId === null
          )
            missingFields.push("categoryId");

          if (missingFields.length > 0) {
            throw new Error(
              `Missing required fields: ${missingFields.join(", ")}`,
            );
          }

          // Validate data types
          if (isNaN(parseFloat(productData.price))) {
            throw new Error(`Invalid price: ${productData.price}`);
          }

          if (isNaN(parseInt(productData.categoryId))) {
            throw new Error(`Invalid categoryId: ${productData.categoryId}`);
          }

          const [product] = await db
            .insert(products)
            .values({
              name: productData.name,
              sku: productData.sku,
              price: productData.price.toString(),
              stock: parseInt(productData.stock) || 0,
              categoryId: parseInt(productData.categoryId),
              imageUrl: productData.imageUrl || null,
              taxRate: productData.taxRate
                ? productData.taxRate.toString()
                : "0.00",
            })
            .returning();

          console.log(`Successfully created product: ${product.name}`);
          results.push({ success: true, product });
          successCount++;
        } catch (error) {
          const errorMessage = error.message || "Unknown error";
          console.error(
            `Error creating product ${productData.name || "Unknown"}:`,
            errorMessage,
          );
          console.error("Product data:", JSON.stringify(productData, null, 2));

          results.push({
            success: false,
            error: errorMessage,
            data: productData,
            productName: productData.name || "Unknown",
          });
          errorCount++;
        }
      }

      res.json({
        success: successCount,
        errors: errorCount,
        results,
        message: `${successCount} sản phẩm đã được tạo thành công${errorCount > 0 ? `, ${errorCount} sản phẩm lỗi` : ""}`,
      });
    } catch (error) {
      console.error("Bulk products creation error:", error);
      res.status(500).json({ error: "Failed to create products" });
    }
  });

  // Employee routes
  app.get(
    "/api/employees",
    tenantMiddleware,
    async (req: TenantRequest, res) => {
      try {
        console.log("🔍 GET /api/employees - Starting request processing");
        let tenantDb;
        try {
          tenantDb = await getTenantDatabase(req);
          console.log("✅ Tenant database connection obtained for employees");
        } catch (dbError) {
          console.error(
            "❌ Failed to get tenant database for employees:",
            dbError,
          );
          tenantDb = null;
        }

        const employees = await storage.getEmployees(tenantDb);
        console.log(`✅ Successfully fetched ${employees.length} employees`);
        res.json(employees);
      } catch (error) {
        console.error("❌ Error fetching employees:", error);
        res.status(500).json({ message: "Failed to fetch employees" });
      }
    },
  );

  // Employee sales report data
  app.get("/api/employee-sales", async (req: TenantRequest, res) => {
    try {
      const { startDate, endDate, employeeId } = req.query;
      const tenantDb = await getTenantDatabase(req);

      let query = db
        .select({
          employeeName: transactionsTable.cashierName,
          total: transactionsTable.total,
          createdAt: transactionsTable.createdAt,
        })
        .from(transactionsTable);

      if (startDate && endDate) {
        query = query.where(
          and(
            gte(transactionsTable.createdAt, startDate as string),
            lte(transactionsTable.createdAt, endDate as string),
          ),
        );
      }

      if (employeeId && employeeId !== "all") {
        query = query.where(
          eq(transactionsTable.cashierName, employeeId as string),
        );
      }

      const salesData = await query;
      res.json(salesData);
    } catch (error) {
      console.error("Error fetching employee sales:", error);
      res.status(500).json({ message: "Failed to fetch employee sales data" });
    }
  });

  // Server time endpoint for consistent timestamps
  app.get("/api/server-time", async (req: TenantRequest, res) => {
    try {
      const serverTime = {
        timestamp: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        localTime: new Date().toLocaleString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      };
      res.json(serverTime);
    } catch (error) {
      res.status(500).json({ error: "Failed to get server time" });
    }
  });

  // Enhanced API endpoints for sales chart report - using same data source as dashboard
  app.get(
    "/api/dashboard-data/:startDate/:endDate",
    async (req: TenantRequest, res) => {
      try {
        const { startDate, endDate } = req.params;
        const tenantDb = await getTenantDatabase(req);

        console.log("Dashboard data API called with params:", {
          startDate,
          endDate,
        });

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Get orders, tables, transactions, invoices - EXACT same as dashboard
        const [orders, tables, transactions, invoices] = await Promise.all([
          storage.getOrders(undefined, undefined, tenantDb),
          storage.getTables(tenantDb),
          storage.getTransactions(tenantDb),
          storage.getInvoices(tenantDb),
        ]);

        // Filter completed orders within date range - EXACT same logic as dashboard
        const filteredCompletedOrders = Array.isArray(orders)
          ? orders.filter((order: any) => {
              try {
                if (!order) return false;

                // Try multiple date fields - prioritize orderedAt, then paidAt, then createdAt
                const orderDate = new Date(
                  order.orderedAt ||
                    order.paidAt ||
                    order.createdAt ||
                    order.created_at,
                );

                if (isNaN(orderDate.getTime())) {
                  return false;
                }

                const dateMatch = orderDate >= start && orderDate <= end;

                // Include more order statuses to show real data
                const isCompleted =
                  order.status === "paid" ||
                  order.status === "completed" ||
                  order.status === "served" ||
                  order.status === "confirmed";

                return dateMatch && isCompleted;
              } catch (error) {
                console.error("Error filtering order:", order, error);
                return false;
              }
            })
          : [];

        // Calculate dashboard stats - EXACT same logic
        const periodRevenue = filteredCompletedOrders.reduce(
          (total: number, order: any) => {
            const orderTotal = Number(order.total || 0);
            return total + orderTotal;
          },
          0,
        );

        const periodOrderCount = filteredCompletedOrders.length;

        // Customer count: count unique customers from completed orders
        const uniqueCustomers = new Set();
        filteredCompletedOrders.forEach((order: any) => {
          if (order.customerId) {
            uniqueCustomers.add(order.customerId);
          } else {
            uniqueCustomers.add(`order_${order.id}`);
          }
        });
        const periodCustomerCount = uniqueCustomers.size;

        // Daily average for the period
        const daysDiff = Math.max(
          1,
          Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
        );
        const dailyAverageRevenue = periodRevenue / daysDiff;

        // Active orders (pending/in-progress orders)
        const activeOrders = orders.filter(
          (order: any) =>
            order.status === "pending" || order.status === "in_progress",
        ).length;

        const occupiedTables = tables.filter(
          (table: any) => table.status === "occupied",
        );

        const monthRevenue = periodRevenue;
        const averageOrderValue =
          periodOrderCount > 0 ? periodRevenue / periodOrderCount : 0;

        // Peak hours analysis
        const hourlyOrders: { [key: number]: number } = {};
        filteredCompletedOrders.forEach((order: any) => {
          const orderDate = new Date(
            order.orderedAt || order.createdAt || order.created_at || order.paidAt,
          );
          if (!isNaN(orderDate.getTime())) {
            const hour = orderDate.getHours();
            hourlyOrders[hour] = (hourlyOrders[hour] || 0) + 1;
          }
        });

        const peakHour = Object.keys(hourlyOrders).reduce(
          (peak, hour) =>
            hourlyOrders[parseInt(hour)] > hourlyOrders[parseInt(peak)]
              ? hour
              : peak,
          "12",
        );

        const dashboardData = {
          periodRevenue,
          periodOrderCount,
          periodCustomerCount,
          dailyAverageRevenue,
          activeOrders,
          occupiedTables: occupiedTables.length,
          monthRevenue,
          averageOrderValue,
          peakHour: parseInt(peakHour),
          totalTables: tables.length,
          filteredCompletedOrders,
          orders: orders || [],
          tables: tables || [],
          transactions: transactions || [],
          invoices: invoices || [],
        };

        console.log("Dashboard data calculated:", {
          periodRevenue,
          periodOrderCount,
          periodCustomerCount,
          filteredOrdersCount: filteredCompletedOrders.length,
        });

        res.json(dashboardData);
      } catch (error) {
        console.error("Error in dashboard data API:", error);
        res.status(500).json({ error: "Failed to fetch dashboard data" });
      }
    },
  );

  // Transactions API with enhanced filtering
  app.get(
    "/api/transactions/:startDate/:endDate/:salesMethod/:salesChannel/:analysisType/:concernType/:selectedEmployee",
    async (req: TenantRequest, res) => {
      try {
        const {
          startDate,
          endDate,
          salesMethod,
          salesChannel,
          analysisType,
          concernType,
          selectedEmployee,
        } = req.params;
        const tenantDb = await getTenantDatabase(req);

        console.log("Transactions API called with params:", {
          startDate,
          endDate,
          salesMethod,
          salesChannel,
          analysisType,
          concernType,
          selectedEmployee,
        });

        // Get transactions data
        const transactions = await storage.getTransactions(tenantDb);

        // Filter transactions based on parameters
        const filteredTransactions = transactions.filter((transaction: any) => {
          const transactionDate = new Date(transaction.createdAt);
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);

          const dateMatch = transactionDate >= start && transactionDate <= end;

          // Enhanced sales method filtering
          let salesMethodMatch = true;
          if (salesMethod !== "all") {
            const paymentMethod = transaction.paymentMethod || "cash";
            switch (salesMethod) {
              case "no_delivery":
                salesMethodMatch =
                  !transaction.deliveryMethod ||
                  transaction.deliveryMethod === "pickup" ||
                  transaction.deliveryMethod === "takeaway";
                break;
              case "delivery":
                salesMethodMatch = transaction.deliveryMethod === "delivery";
                break;
              default:
                salesMethodMatch =
                  paymentMethod.toLowerCase() === salesMethod.toLowerCase();
            }
          }

          // Enhanced sales channel filtering
          let salesChannelMatch = true;
          if (salesChannel !== "all") {
            const channel = transaction.salesChannel || "direct";
            switch (salesChannel) {
              case "direct":
                salesChannelMatch =
                  !transaction.salesChannel ||
                  transaction.salesChannel === "direct" ||
                  transaction.salesChannel === "pos";
                break;
              case "other":
                salesChannelMatch =
                  transaction.salesChannel &&
                  transaction.salesChannel !== "direct" &&
                  transaction.salesChannel !== "pos";
                break;
              default:
                salesChannelMatch =
                  channel.toLowerCase() === salesChannel.toLowerCase();
            }
          }

          // Enhanced employee filtering
          let employeeMatch = true;
          if (selectedEmployee !== "all") {
            employeeMatch =
              transaction.cashierName === selectedEmployee ||
              (transaction.cashierName &&
                transaction.cashierName
                  .toLowerCase()
                  .includes(selectedEmployee.toLowerCase()));
          }

          return (
            dateMatch && salesMethodMatch && salesChannelMatch && employeeMatch
          );
        });

        console.log(
          `Found ${filteredTransactions.length} filtered transactions out of ${transactions.length} total`,
        );
        res.json(filteredTransactions);
      } catch (error) {
        console.error("Error in transactions API:", error);
        res.status(500).json({ error: "Failed to fetch transactions data" });
      }
    },
  );

  app.get(
    "/api/orders/:startDate/:endDate/:selectedEmployee/:salesChannel/:salesMethod/:analysisType/:concernType",
    async (req: TenantRequest, res) => {
      try {
        const {
          startDate,
          endDate,
          selectedEmployee,
          salesChannel,
          salesMethod,
          analysisType,
          concernType,
        } = req.params;
        const tenantDb = await getTenantDatabase(req);

        console.log("Orders API called with params:", {
          startDate,
          endDate,
          selectedEmployee,
          salesChannel,
          salesMethod,
          analysisType,
          concernType,
        });

        // Get orders data
        const orders = await storage.getOrders(undefined, undefined, tenantDb);

        // Filter orders based on parameters with enhanced logic
        const filteredOrders = orders.filter((order: any) => {
          const orderDate = new Date(order.orderedAt || order.createdAt);
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);

          const dateMatch = orderDate >= start && orderDate <= end;

          // Enhanced employee filtering
          let employeeMatch = true;
          if (selectedEmployee !== "all") {
            employeeMatch =
              order.employeeId?.toString() === selectedEmployee ||
              (order.employeeName &&
                order.employeeName
                  .toLowerCase()
                  .includes(selectedEmployee.toLowerCase()));
          }

          // Enhanced sales channel filtering
          let salesChannelMatch = true;
          if (salesChannel !== "all") {
            const channel = order.salesChannel || "direct";
            switch (salesChannel) {
              case "direct":
                salesChannelMatch =
                  !order.salesChannel ||
                  order.salesChannel === "direct" ||
                  order.salesChannel === "pos";
                break;
              case "other":
                salesChannelMatch =
                  order.salesChannel &&
                  order.salesChannel !== "direct" &&
                  order.salesChannel !== "pos";
                break;
              default:
                salesChannelMatch =
                  channel.toLowerCase() === salesChannel.toLowerCase();
            }
          }

          // Enhanced sales method filtering
          let salesMethodMatch = true;
          if (salesMethod !== "all") {
            switch (salesMethod) {
              case "no_delivery":
                salesMethodMatch =
                  !order.deliveryMethod ||
                  order.deliveryMethod === "pickup" ||
                  order.deliveryMethod === "takeaway";
                break;
              case "delivery":
                salesMethodMatch = order.deliveryMethod === "delivery";
                break;
              default:
                const paymentMethod = order.paymentMethod || "cash";
                salesMethodMatch =
                  paymentMethod.toLowerCase() === salesMethod.toLowerCase();
            }
          }

          // Only include paid orders for analysis
          const statusMatch = order.status === "paid";

          return (
            dateMatch &&
            employeeMatch &&
            salesChannelMatch &&
            salesMethodMatch &&
            statusMatch
          );
        });

        console.log(
          `Found ${filteredOrders.length} filtered orders out of ${orders.length} total`,
        );
        res.json(filteredOrders);
      } catch (error) {
        console.error("Error in orders API:", error);
        res.status(500).json({ error: "Failed to fetch orders data" });
      }
    },
  );

  app.get(
    "/api/products/:selectedCategory/:productType/:productSearch?",
    async (req: TenantRequest, res) => {
      try {
        const { selectedCategory, productType, productSearch } = req.params;
        const tenantDb = await getTenantDatabase(req);

        console.log("Products API called with params:", {
          selectedCategory,
          productType,
          productSearch,
        });

        let products;

        // Get products by category or all products
        if (
          selectedCategory &&
          selectedCategory !== "all" &&
          selectedCategory !== "undefined"
        ) {
          const categoryId = parseInt(selectedCategory);
          if (!isNaN(categoryId)) {
            products = await storage.getProductsByCategory(
              categoryId,
              true,
              tenantDb,
            );
          } else {
            products = await storage.getAllProducts(true, tenantDb);
          }
        } else {
          products = await storage.getAllProducts(true, tenantDb);
        }

        // Filter by product type if specified
        if (
          productType &&
          productType !== "all" &&
          productType !== "undefined"
        ) {
          const typeMap = {
            combo: 3,
            "combo-dongoi": 3,
            product: 1,
            "hang-hoa": 1,
            service: 2,
            "dich-vu": 2,
          };
          const typeValue =
            typeMap[productType.toLowerCase() as keyof typeof typeMap];
          if (typeValue) {
            products = products.filter(
              (product: any) => product.productType === typeValue,
            );
          }
        }

        // Filter by product search if provided
        if (
          productSearch &&
          productSearch !== "" &&
          productSearch !== "undefined" &&
          productSearch !== "all"
        ) {
          const searchTerm = productSearch.toLowerCase();
          products = products.filter(
            (product: any) =>
              product.name?.toLowerCase().includes(searchTerm) ||
              product.sku?.toLowerCase().includes(searchTerm) ||
              product.description?.toLowerCase().includes(searchTerm),
          );
        }

        console.log(`Found ${products.length} products after filtering`);
        res.json(products);
      } catch (error) {
        console.error("Error in products API:", error);
        res.status(500).json({ error: "Failed to fetch products data" });
      }
    },
  );

  app.get(
    "/api/customers/:customerSearch?/:customerStatus?",
    async (req: TenantRequest, res) => {
      try {
        const { customerSearch, customerStatus } = req.params;
        const tenantDb = await getTenantDatabase(req);

        console.log(
          "Customers API called with search:",
          customerSearch,
          "status:",
          customerStatus,
        );

        let customers = await storage.getCustomers(tenantDb);

        // Filter by search if provided
        if (
          customerSearch &&
          customerSearch !== "" &&
          customerSearch !== "undefined" &&
          customerSearch !== "all"
        ) {
          const searchTerm = customerSearch.toLowerCase();
          customers = customers.filter(
            (customer: any) =>
              customer.name?.toLowerCase().includes(searchTerm) ||
              customer.phone?.includes(customerSearch) ||
              customer.email?.toLowerCase().includes(searchTerm) ||
              customer.customerId?.toLowerCase().includes(searchTerm) ||
              customer.address?.toLowerCase().includes(searchTerm),
          );
        }

        // Filter by status if provided
        if (
          customerStatus &&
          customerStatus !== "all" &&
          customerStatus !== "undefined"
        ) {
          const now = new Date();
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          customers = customers.filter((customer: any) => {
            const totalSpent = Number(customer.totalSpent || 0);
            const lastVisit = customer.lastVisit
              ? new Date(customer.lastVisit)
              : null;

            switch (customerStatus) {
              case "active":
                return lastVisit && lastVisit >= thirtyDaysAgo;
              case "inactive":
                return !lastVisit || lastVisit < thirtyDaysAgo;
              case "vip":
                return totalSpent >= 500000; // VIP customers with total spent >= 500k VND
              case "new":
                const joinDate = customer.createdAt
                  ? new Date(customer.createdAt)
                  : null;
                returnjoinDate && joinDate >= thirtyDaysAgo;
              default:
                return true;
            }
          });
        }

        console.log(`Found ${customers.length} customers after filtering`);
        res.json(customers);
      } catch (error) {
        console.error("Error in customers API:", error);
        res.status(500).json({ error: "Failed to fetch customers data" });
      }
    },
  );

  // Tax code lookup proxy endpoint
  app.post("/api/tax-code-lookup", async (req: TenantRequest, res) => {
    try {
      const { taxCode } = req.body;
      const tenantDb = await getTenantDatabase(req);

      if (!taxCode) {
        return res.status(400).json({
          success: false,
          message: "Mã số thuế không được để trống",
        });
      }

      // Call the external tax code API
      const response = await fetch(
        "https://infoerpvn.com:9440/api/CheckListTaxCode/v2",
        {
          method: "POST",
          headers: {
            token: "EnURbbnPhUm4GjNgE4Ogrw==",
            "Content-Type": "application/json",
          },
          body: JSON.stringify([taxCode]),
        },
      );

      if (!response.ok) {
        throw new Error(
          `External API error: ${response.status} ${response.statusText}`,
        );
      }

      const result = await response.json();

      res.json({
        success: true,
        data: result,
        message: "Tra cứu thành công",
      });
    } catch (error) {
      console.error("Tax code lookup error:", error);
      res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra khi tra cứu mã số thuế",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // E-invoice publish proxy endpoint
  // E-invoice publish proxy endpoint
  app.post("/api/einvoice/publish", async (req: TenantRequest, res) => {
    try {
      const publishRequest = req.body;
      const tenantDb = await getTenantDatabase(req);
      console.log(
        "Publishing invoice with data:",
        JSON.stringify(publishRequest, null, 2),
      );

      // Call the real e-invoice API
      const response = await fetch(
        "https://infoerpvn.com:9440/api/invoice/publish",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            token: "EnURbbnPhUm4GjNgE4Ogrw==",
          },
          body: JSON.stringify(publishRequest),
        },
      );

      if (!response.ok) {
        console.error(
          "E-invoice API error:",
          response.status,
          response.statusText,
        );
        const errorText = await response.text();
        console.error("Error response:", errorText);

        return res.status(response.status).json({
          error: "Failed to publish invoice",
          details: `API returned ${response.status}: ${response.statusText}`,
          apiResponse: errorText,
        });
      }

      const result = await response.json();
      console.log("E-invoice API response:", result);

      // Check if the API returned success
      if (result.status === true) {
        console.log("Invoice published successfully:", result);

        // Return standardized response format
        res.json({
          success: true,
          message:
            result.message || "Hóa đơn điện tử đã được phát hành thành công",
          data: {
            invoiceNo: result.data?.invoiceNo,
            invDate: result.data?.invDate,
            transactionID: result.data?.transactionID,
            macqt: result.data?.macqt,
            originalRequest: {
              transactionID: publishRequest.transactionID,
              invRef: publishRequest.invRef,
              totalAmount: publishRequest.invTotalAmount,
              customer: publishRequest.Customer,
            },
          },
        });
      } else {
        // API returned failure
        console.error("E-invoice API returned failure:", result);
        res.status(400).json({
          error: "E-invoice publication failed",
          message: result.message || "Unknown error from e-invoice service",
          details: result,
        });
      }
    } catch (error) {
      console.error("E-invoice publish proxy error details:");
      console.error("- Error type:", error.constructor.name);
      console.error("- Error message:", error.message);
      console.error("- Full error:", error);

      res.status(500).json({
        error: "Failed to publish invoice",
        details: error.message,
        errorType: error.constructor.name,
      });
    }
  });

  // Database health check
  app.get("/api/health/db", async (req, res) => {
    try {
      // Test basic connection with simple query
      const result = await db.execute(sql`SELECT 
        current_database() as database_name,
        current_user as user_name,
        version() as postgres_version,
        NOW() as server_time
      `);

      const dbInfo = result && result.length > 0 ? result[0] : {};

      res.json({
        status: "healthy",
        database: dbInfo.database_name,
        user: dbInfo.user_name,
        version: dbInfo.postgres_version,
        serverTime: dbInfo.server_time,
        connectionString: process.env.DATABASE_URL?.replace(
          /:[^:@]*@/,
          ":****@",
        ),
        usingExternalDb: !!process.env.EXTERNAL_DB_URL,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Database health check failed:", error);

      res.status(500).json({
        status: "unhealthy",
        error: errorMessage,
        connectionString: process.env.DATABASE_URL?.replace(
          /:[^:@]*@/,
          ":****@",
        ),
        usingExternalDb: !!process.env.EXTERNAL_DB_URL,
        details: error,
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
