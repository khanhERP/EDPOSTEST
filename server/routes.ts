import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { tenantMiddleware, getTenantDatabase, TenantRequest } from "./tenant-middleware";
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
} from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  orders,
  orderItems,
  products,
  categories,
  transactions as transactionsTable,
  transactionItems as transactionItemsTable,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register tenant management routes
  registerTenantRoutes(app);

  // Apply tenant middleware to all API routes
  app.use('/api', tenantMiddleware);

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
  app.get("/api/categories", async (req: TenantRequest, res) => {
    try {
      const tenantDb = await getTenantDatabase(req);
      const categories = await storage.getCategories(tenantDb);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

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

      const category = await storage.updateCategory(categoryId, categoryData, tenantDb);
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
      const products = await storage.getProductsByCategory(categoryId, tenantDb);
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
  app.get("/api/products", async (req: TenantRequest, res) => {
    try {
      const { category, search, includeInactive } = req.query;
      let products;

      console.log("=== PRODUCTS API DEBUG ===");
      console.log("Query params:", { category, search, includeInactive });

      const shouldIncludeInactive = includeInactive === "true";
      const tenantDb = await getTenantDatabase(req);

      if (search) {
        console.log("Searching products with term:", search);
        products = await storage.searchProducts(
          search as string,
          shouldIncludeInactive,
          tenantDb,
        );
      } else if (category && category !== "all") {
        console.log("Getting products by category:", category);
        products = await storage.getProductsByCategory(
          parseInt(category as string),
          shouldIncludeInactive,
          tenantDb,
        );
      } else {
        console.log("Getting all products, includeInactive:", shouldIncludeInactive);
        products = await storage.getAllProducts(shouldIncludeInactive, tenantDb);
      }

      console.log("Products found:", products.length);
      console.log("First few products:", products.slice(0, 3));

      // Debug afterTaxPrice for Bánh test
      const banhTest = products.find(p => p.name === 'Bánh test');
      if (banhTest) {
        console.log("=== BÁNH TEST DEBUG ===");
        console.log("Product ID:", banhTest.id);
        console.log("Name:", banhTest.name);
        console.log("Price:", banhTest.price);
        console.log("Tax Rate:", banhTest.taxRate);
        console.log("After Tax Price:", banhTest.afterTaxPrice);
        console.log("After Tax Price Type:", typeof banhTest.afterTaxPrice);
      }

      res.json(products);
    } catch (error) {
      console.error('Products API error:', error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

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
        afterTaxPrice: req.body.afterTaxPrice && req.body.afterTaxPrice.trim() !== "" ? req.body.afterTaxPrice.toString() : null,
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
        afterTaxPrice: req.body.afterTaxPrice && req.body.afterTaxPrice.trim() !== "" ? req.body.afterTaxPrice.toString() : null,
        priceIncludesTax: req.body.priceIncludesTax || false,
        trackInventory: req.body.trackInventory !== false
      };

      // Remove undefined fields
      Object.keys(transformedData).forEach(key => {
        if (transformedData[key] === undefined) {
          delete transformedData[key];
        }
      });

      console.log("Transformed update data:", transformedData);

      const validatedData = insertProductSchema.partial().parse(transformedData);
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
        error: error instanceof Error ? error.message : String(error)
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
  app.delete("/api/products/cleanup/inactive", async (req: TenantRequest, res) => {
    try {
      const tenantDb = await getTenantDatabase(req);
      const deletedCount = await storage.deleteInactiveProducts(tenantDb);
      res.json({
        message: `Successfully deleted ${deletedCount} inactive products`,
        deletedCount,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to cleanup inactive products" });
    }
  });

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

      // Validate with original string format, then transform
      const validatedTransaction = insertTransactionSchema.parse(transaction);
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
      for (const item of validatedItems) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) {
          return res
            .status(400)
            .json({ message: `Product with ID ${item.productId} not found` });
        }
        
        // Check stock availability only for products that track inventory
        if (product.trackInventory && product.stock < item.quantity) {
          return res.status(400).json({
            message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
          });
        }

        const itemSubtotal = parseFloat(item.price) * item.quantity;
        let itemTax = 0;
        
        // Use afterTaxPrice if available, otherwise no tax (default 0)
        if (product.afterTaxPrice && product.afterTaxPrice !== null && product.afterTaxPrice !== "") {
          const afterTaxPrice = parseFloat(product.afterTaxPrice);
          const taxPerUnit = afterTaxPrice - parseFloat(item.price);
          itemTax = taxPerUnit * item.quantity;
        } else {
          // No afterTaxPrice means no tax (default 0)
          itemTax = 0;
        }

        subtotal += itemSubtotal;
        tax += itemTax;
      }

      const total = subtotal + tax;

      // Update the transaction with calculated totals
      const transactionWithTotals = {
        ...validatedTransaction,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        invoiceId: validatedTransaction.invoiceId || null,
        invoiceNumber: validatedTransaction.invoiceNumber || null,
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
  app.get("/api/transactions/:startDate/:endDate", async (req: TenantRequest, res) => {
    try {
      const { startDate, endDate } = req.params;

      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);

      const transactions = await db.select().from(transactionsTable)
        .where(
          and(
            gte(transactionsTable.createdAt, start),
            lte(transactionsTable.createdAt, end)
          )
        )
        .orderBy(desc(transactionsTable.createdAt));

      // Always return an array, even if empty
      res.json(transactions || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      // Return empty array instead of error for reports
      res.json([]);
    }
  });


  app.get("/api/transactions/:transactionId", async (req: TenantRequest, res) => {
    try {
      const transactionId = req.params.transactionId;
      const tenantDb = await getTenantDatabase(req);
      const receipt =
        await storage.getTransactionByTransactionId(transactionId, tenantDb);

      if (!receipt) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      res.json(receipt);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transaction" });
    }
  });

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
  app.get("/api/employees", async (req: TenantRequest, res) => {
    try {
      const tenantDb = await getTenantDatabase(req);
      const employees = await storage.getEmployees(tenantDb);
      res.json(employees);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

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

      const employee = await storage.updateEmployee(id, validatedData, tenantDb);

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
      const { date } = req.query;
      const tenantDb = await getTenantDatabase(req);

      let whereCondition;
      if (date && typeof date === "string") {
        // Filter by specific date
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        whereCondition = and(
          gte(attendanceRecords.clockIn, startOfDay),
          lt(attendanceRecords.clockIn, endOfDay),
        );
      }

      const attendance = await db
        .select()
        .from(attendanceRecords)
        .where(whereCondition)
        .orderBy(desc(attendanceRecords.clockIn));

      res.json(attendance);
    } catch (error) {
      console.error("Error fetching attendance records:", error);
      res.status(500).json({ error: "Failed to fetch attendance records" });
    }
  });

  app.get("/api/attendance/today/:employeeId", async (req: TenantRequest, res) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const tenantDb = await getTenantDatabase(req);
      const record = await storage.getTodayAttendance(employeeId, tenantDb);
      res.json(record);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch today's attendance" });
    }
  });

  app.post("/api/attendance/clock-in", async (req: TenantRequest, res) => {
    try {
      const { employeeId, notes } = req.body;

      if (!employeeId) {
        return res.status(400).json({ message: "Employee ID is required" });
      }

      const tenantDb = await getTenantDatabase(req);
      const record = await storage.clockIn(parseInt(employeeId), notes, tenantDb);
      res.status(201).json(record);
    } catch (error) {
      console.error("Clock-in API error:", error);

      let statusCode = 500;
      let message = "Failed to clock in";

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          statusCode = 404;
          message = error.message;
        } else if (error.message.includes('already clocked in')) {
          statusCode = 400;
          message = error.message;
        } else if (error.message.includes('database')) {
          message = "Database error occurred";
        }
      }

      res.status(statusCode).json({ 
        message,
        error: error instanceof Error ? error.message : "Unknown error"
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

  app.post("/api/attendance/break-start/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantDb = await getTenantDatabase(req);
      const record = await storage.startBreak(id, tenantDb);

      if (!record) {
        return res.status(404).json({ message: "Attendance record not found" });
      }

      res.json(record);
    } catch (error) {
      res.status(500).json({ message: "Failed to start break" });
    }
  });

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
  app.get("/api/tables", async (req: TenantRequest, res) => {
    try {
      const tenantDb = await getTenantDatabase(req);
      const tables = await storage.getTables(tenantDb);
      res.json(tables);
    } catch (error) {
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
  app.get("/api/orders", async (req: TenantRequest, res) => {
    try {
      const { tableId, status } = req.query;
      const tenantDb = await getTenantDatabase(req);
      const orders = await storage.getOrders(
        tableId ? parseInt(tableId as string) : undefined,
        status as string,
        tenantDb,
      );
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
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

      const orderData = insertOrderSchema.parse(order);
      const itemsData = items.map((item: any) =>
        insertOrderItemSchema.parse(item),
      );

      console.log(
        "Parsed order data:",
        JSON.stringify({ orderData, itemsData }, null, 2),
      );

      const newOrder = await storage.createOrder(orderData, itemsData, tenantDb);

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

  app.put("/api/orders/:id/status", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const tenantDb = await getTenantDatabase(req);
      const order = await storage.updateOrderStatus(id, status, tenantDb);

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  app.post("/api/orders/:id/payment", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { paymentMethod } = req.body;
      const tenantDb = await getTenantDatabase(req);

      // Update order status to paid
      const order = await storage.updateOrderStatus(id, "paid", tenantDb);

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Also update table status to available if the order is linked to a table
      if (order.tableId) {
        await storage.updateTableStatus(order.tableId, "available", tenantDb);
      }

      res.json({ ...order, paymentMethod });
    } catch (error) {
      console.error("Payment completion error:", error);
      res.status(500).json({ message: "Failed to complete payment" });
    }
  });

  // Get order items for a specific order
  app.get('/api/order-items/:orderId', async (req: TenantRequest, res) => {
    try {
      console.log('=== GET ORDER ITEMS API CALLED ===');
      const orderId = parseInt(req.params.orderId);
      const tenantDb = await getTenantDatabase(req);
      console.log('Order ID requested:', orderId);

      if (isNaN(orderId)) {
        console.error('Invalid order ID provided:', req.params.orderId);
        return res.status(400).json({ message: "Invalid order ID" });
      }

      console.log('Fetching order items from storage...');
      const items = await storage.getOrderItems(orderId, tenantDb);
      console.log(`Found ${items.length} order items:`, items);

      res.json(items);
    } catch (error) {
      console.error('=== GET ORDER ITEMS ERROR ===');
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      console.error("Order ID:", req.params.orderId);

      res.status(500).json({
        message: "Failed to fetch order items",
        details: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Delete a specific order item
  app.delete('/api/order-items/:itemId', async (req: TenantRequest, res) => {
    try {
      console.log('=== DELETE ORDER ITEM API CALLED ===');
      const itemId = parseInt(req.params.itemId);
      const tenantDb = await getTenantDatabase(req); // Assuming tenantDb is needed here as well
      console.log('Item ID requested:', itemId);

      if (isNaN(itemId)) {
        return res.status(400).json({ error: 'Invalid item ID' });
      }

      console.log('Deleting order item from storage...');
      const success = await storage.deleteOrderItem(itemId, tenantDb); // Pass tenantDb to storage function

      if (success) {
        console.log('Order item deleted successfully');
        res.json({ success: true, message: 'Order item deleted successfully' });
      } else {
        console.log('Order item not found');
        res.status(404).json({ error: 'Order item not found' });
      }
    } catch (error) {
      console.error('=== DELETE ORDER ITEM ERROR ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Item ID:', req.params.itemId);
      res.status(500).json({ 
        error: 'Failed to delete order item',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Add order items to existing order
  app.post("/api/orders/:orderId/items", async (req: TenantRequest, res) => {
    try {
      console.log("=== ADD ORDER ITEMS API CALLED ===");
      const orderId = parseInt(req.params.orderId);
      const { items } = req.body;
      const tenantDb = await getTenantDatabase(req);

      console.log("Request params:", req.params);
      console.log("Order ID:", orderId);
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      console.log("Items to add:", JSON.stringify(items, null, 2));

      if (!orderId || isNaN(orderId)) {
        console.error("Invalid order ID:", req.params.orderId);
        return res.status(400).json({ error: "Invalid order ID" });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        console.error("Invalid items data:", items);
        return res
          .status(400)
          .json({ error: "Items array is required and cannot be empty" });
      }

      // Check if order exists
      const [existingOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId));

      if (!existingOrder) {
        console.error("Order not found:", orderId);
        return res.status(404).json({ error: "Order not found" });
      }

      console.log("Found existing order:", existingOrder);

      const createdItems = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log(`Processing item ${i + 1}/${items.length}:`, item);

        // Validate item data
        if (
          !item.productId ||
          !item.quantity ||
          !item.unitPrice ||
          !item.total
        ) {
          console.error("Missing required item data:", item);
          throw new Error(`Item ${i + 1} is missing required fields`);
        }

        // Get product info to include in the order item
        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, item.productId));

        if (!product) {
          console.error("Product not found:", item.productId);
          throw new Error(`Product with ID ${item.productId} not found`);
        }

        console.log("Found product:", product);

        try {
          const [orderItem] = await db
            .insert(orderItems)
            .values({
              orderId,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
              notes: item.notes || null,
            })
            .returning();

          console.log("Created order item:", orderItem);
          createdItems.push(orderItem);
        } catch (insertError) {
          console.error("Error inserting order item:", insertError);
          throw insertError;
        }
      }

      console.log(`Successfully created ${createdItems.length} items`);

      // Update order total
      try {
        const [orderItemsSum] = await db
          .select({
            total: sql<number>`COALESCE(sum(CAST(${orderItems.total} AS DECIMAL)), 0)`,
          })
          .from(orderItems)
          .where(eq(orderItems.orderId, orderId));

        console.log("Order items sum result:", orderItemsSum);

        const totalAmount = Number(orderItemsSum.total) || 0;
        const subtotalAmount = totalAmount / 1.1; // Remove 10% tax
        const taxAmount = totalAmount - subtotalAmount;

        console.log("Calculated amounts:", {
          total: totalAmount,
          subtotal: subtotalAmount,
          tax: taxAmount,
        });

        await db
          .update(orders)
          .set({
            total: totalAmount.toFixed(2),
            subtotal: subtotalAmount.toFixed(2),
            tax: taxAmount.toFixed(2),
          })
          .where(eq(orders.id, orderId));

        console.log("Updated order totals successfully");
      } catch (updateError) {
        console.error("Error updating order totals:", updateError);
        // Don't throw here, as items were already created successfully
      }

      console.log("=== ADD ORDER ITEMS COMPLETED SUCCESSFULLY ===");
      res.json(createdItems);
    } catch (error) {
      console.error("=== ADD ORDER ITEMS ERROR ===");
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      console.error("Request data:", {
        orderId: req.params.orderId,
        body: req.body,
      });

      res.status(500).json({
        error: "Failed to add items to order",
        details: error.message,
        timestamp: new Date().toISOString(),
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
      const settings = await storage.updateStoreSettings(validatedData, tenantDb);
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
  app.get("/api/suppliers", async (req: TenantRequest, res) => {
    try {
      const { status, search } = req.query;
      const tenantDb = await getTenantDatabase(req);
      let suppliers;

      if (search) {
        suppliers = await storage.searchSuppliers(search as string, tenantDb);
      } else if (status && status !== "all") {
        suppliers = await storage.getSuppliersByStatus(status as string, tenantDb);
      } else {
        suppliers = await storage.getSuppliers(tenantDb);
      }

      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

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
      const supplier = await storage.updateSupplier(id, validatedData, tenantDb);

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
  app.get("/api/customers", async (req: TenantRequest, res) => {
    try {
      const tenantDb = await getTenantDatabase(req);
      const customers = await storage.getCustomers(tenantDb);
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

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

      const [customer] = await db.insert(customers).values(customerData).returning();
      res.json(customer);
    } catch (error: any) {
      console.error("Error creating customer:", error);

      // Handle specific database errors
      if (error.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ 
          message: "Customer with this ID already exists" 
        });
      }

      res.status(500).json({ 
        message: "Failed to create customer",
        error: error.message 
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

  app.get("/api/customers/:id/point-history", async (req: TenantRequest, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 50;
      const tenantDb = await getTenantDatabase(req);

      const pointHistory = await storage.getPointHistory(customerId, limit, tenantDb);
      res.json(pointHistory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch point history" });
    }
  });

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
      const allTransactions = await storage.getAllPointTransactions(limit, tenantDb);
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
      const thresholds =
        await storage.updateMembershipThresholds(validatedData, tenantDb);

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
  app.get("/api/invoice-templates", async (req: TenantRequest, res) => {
    try {
      const tenantDb = await getTenantDatabase(req);
      const templates = await storage.getInvoiceTemplates(tenantDb);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching invoice templates:", error);
      res.status(500).json({ error: "Failed to fetch invoice templates" });
    }
  });

  app.get("/api/invoice-templates/active", async (req: TenantRequest, res) => {
    try {
      const tenantDb = await getTenantDatabase(req);
      const activeTemplates = await storage.getActiveInvoiceTemplates();
      res.json(activeTemplates);
    } catch (error) {
      console.error("Error fetching active invoice templates:", error);
      res.status(500).json({ error: "Failed to fetch active invoice templates" });
    }
  });

  app.post("/api/invoice-templates", async (req: TenantRequest, res) => {
    try {
      const templateData = req.body;
      const tenantDb = await getTenantDatabase(req);
      const template = await storage.createInvoiceTemplate(templateData, tenantDb);
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
      const template = await storage.updateInvoiceTemplate(id, templateData, tenantDb);

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

  // E-invoice connections management
  app.get("/api/einvoice-connections", async (req: TenantRequest, res) => {
    try {
      const tenantDb = await getTenantDatabase(req);
      const connections = await storage.getEInvoiceConnections(tenantDb);
      res.json(connections);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to fetch e-invoice connections" });
    }
  });

  app.post("/api/einvoice-connections", async (req: TenantRequest, res) => {
    try {
      const connectionData = req.body;
      const tenantDb = await getTenantDatabase(req);
      const connection = await storage.createEInvoiceConnection(connectionData, tenantDb);
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

  app.delete("/api/einvoice-connections/:id", async (req: TenantRequest, res) => {
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
  });

  // Menu Analysis API
  app.get("/api/menu-analysis", async (req: TenantRequest, res) => {
    try {
      const { startDate, endDate, search, categoryId, productType } = req.query;
      const tenantDb = await getTenantDatabase(req);

      // Base query for transaction items with product and category joins
      let query = db
        .select({
          product: products,
          category: categories,
          quantity: sql<number>`sum(${transactionItemsTable.quantity})`.as('quantity'),
          revenue: sql<number>`sum(${transactionItemsTable.total})`.as('revenue'),
        })
        .from(transactionItemsTable)
        .leftJoin(products, eq(transactionItemsTable.productId, products.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(transactionsTable, eq(transactionItemsTable.transactionId, transactionsTable.id))
        .groupBy(products.id, categories.id)
        .orderBy(desc(sql`sum(${transactionItemsTable.total})`));

      // Apply filters
      const conditions: any[] = [eq(products.isActive, true)];

      // Date range filter - IMPORTANT: Apply to transactions table
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999); // Include entire end date

        conditions.push(
          and(
            gte(transactionsTable.createdAt, start),
            lte(transactionsTable.createdAt, end)
          )
        );
      }

      if (search) {
        conditions.push(ilike(products.name, `%${search}%`));
      }

      if (categoryId && categoryId !== 'all') {
        conditions.push(eq(products.categoryId, parseInt(categoryId as string)));
      }

      if (productType !== "all" && productType) {
        const typeMap = { combo: 3, product: 1, service: 2 };
        const typeValue = typeMap[productType as keyof typeof typeMap];
        if (typeValue) {
          conditions.push(eq(products.productType, typeValue));
        }
      }

      // Apply all conditions
      query = query.where(and(...conditions));

      const productStats = await query;


      // Initialize default values
      let totalRevenue = 0;
      let totalQuantity = 0;
      let categoryStats = [];
      let productStatsGrouped = []; // Renamed from productStats to avoid conflict
      let topSellingProducts = [];
      let topRevenueProducts = [];

      // Process data if we have results
      if (productStats && productStats.length > 0) {
        // Calculate totals
        totalRevenue = productStats.reduce(
          (sum, item) => sum + parseFloat(item.revenue || "0"),
          0,
        );
        // Fix totalQuantity calculation to return proper number instead of concatenated string
        totalQuantity = productStats.reduce(
          (sum, item) => sum + parseInt(item.quantity.toString()),
          0,
        );

        // Group by category
        const categoryStatsMap = new Map();
        const productStatsMap = new Map();

        productStats.forEach((item) => {
          if (!item.category || !item.product) return;

          const categoryKey = item.category.id;
          const productKey = item.product.id;

          // Category stats
          if (!categoryStatsMap.has(categoryKey)) {
            categoryStatsMap.set(categoryKey, {
              category: item.category,
              revenue: 0,
              quantity: 0,
              productCount: new Set(),
            });
          }
          const categoryStatsItem = categoryStatsMap.get(categoryKey);
          categoryStatsItem.revenue += parseFloat(item.revenue || "0");
          categoryStatsItem.quantity += item.quantity || 0;
          categoryStatsItem.productCount.add(item.product.id);

          // Product stats
          if (!productStatsMap.has(productKey)) {
            productStatsMap.set(productKey, {
              product: item.product,
              revenue: 0,
              quantity: 0,
            });
          }
          const productStatsItem = productStatsMap.get(productKey);
          productStatsItem.revenue += parseFloat(item.revenue || "0");
          productStatsItem.quantity += item.quantity || 0;
        });

        // Convert to arrays and add productCount
        categoryStats = Array.from(categoryStatsMap.values()).map((cat) => ({
          ...cat,
          productCount: cat.productCount.size,
        }));

        productStatsGrouped = Array.from(productStatsMap.values());

        // Sort products by quantity and revenue
        topSellingProducts = [...productStatsGrouped].sort(
          (a, b) => b.quantity - a.quantity,
        );
        topRevenueProducts = [...productStatsGrouped].sort(
          (a, b) => b.revenue - a.revenue,
        );
      }

      res.json({
        totalRevenue,
        totalQuantity,
        categoryStats,
        productStats: productStatsGrouped, // Use the renamed variable
        topSellingProducts,
        topRevenueProducts,
      });
    } catch (error) {
      console.error("Error fetching menu analysis data:", error);
      res.status(500).json({
        error: "Failed to fetch menu analysis data",
        totalRevenue: 0,
        totalQuantity: 0,
        categoryStats: [],
        productStats: [],
        topSellingProducts: [],
        topRevenueProducts: [],
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
  app.get("/api/employees", async (req: TenantRequest, res) => {
    try {
      const tenantDb = await getTenantDatabase(req);
      const employees = await storage.getEmployees(tenantDb);
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

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

  // Add new API endpoints with proper date filtering for sales chart report
  app.get(
    "/api/transactions/:startDate/:endDate/:salesMethod/:salesChannel/:analysisType/:concernType/:selectedEmployee",
    async (req: TenantRequest, res) => {
      try {
        const { startDate, endDate, salesMethod, salesChannel, analysisType, concernType, selectedEmployee } = req.params;
        const tenantDb = await getTenantDatabase(req);

        console.log("Transactions API called with params:", {
          startDate, endDate, salesMethod, salesChannel, analysisType, concernType, selectedEmployee
        });

        const transactions = await storage.getTransactions(tenantDb);

        const filteredTransactions = transactions.filter((transaction) => {
          const transactionDate = new Date(transaction.createdAt);
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);

          const dateMatch = transactionDate >= start && transactionDate <= end;

          // Enhanced filtering logic based on actual transaction data
          const methodMatch =
            salesMethod === "all" ||
            (salesMethod === "no_delivery" && 
              (!transaction.deliveryMethod || transaction.deliveryMethod === "pickup")) ||
            (salesMethod === "delivery" && 
              transaction.deliveryMethod === "delivery");

          const channelMatch =
            salesChannel === "all" ||
            (salesChannel === "direct" && 
              (!transaction.salesChannel || transaction.salesChannel === "direct" || transaction.salesChannel === "pos")) ||
            (salesChannel === "other" && 
              transaction.salesChannel && transaction.salesChannel !== "direct" && transaction.salesChannel !== "pos");

          // Employee filter
          const employeeMatch =
            selectedEmployee === "all" ||
            transaction.cashierName === selectedEmployee ||
            transaction.employeeId?.toString() === selectedEmployee ||
            (transaction.cashierName && transaction.cashierName.includes(selectedEmployee));

          return dateMatch && methodMatch && salesChannelMatch && employeeMatch;
        });

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
        const { startDate, endDate, selectedEmployee, salesChannel, salesMethod, analysisType, concernType } = req.params;
        const tenantDb = await getTenantDatabase(req);

        console.log("Orders API called with params:", {
          startDate, endDate, selectedEmployee, salesChannel, salesMethod, analysisType, concernType
        });

        const orders = await storage.getOrders(undefined, undefined, tenantDb);

        const filteredOrders = orders.filter((order) => {
          const orderDate = new Date(order.orderedAt);
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);

          const dateMatch = orderDate >= start && orderDate <= end;
          const statusMatch = order.status === "paid";

          const employeeMatch =
            selectedEmployee === "all" || 
            order.employeeId?.toString() === selectedEmployee;

          const channelMatch =
            salesChannel === "all" ||
            (salesChannel === "direct" && 
              (!order.salesChannel || order.salesChannel === "direct")) ||
            (salesChannel === "other" && 
              order.salesChannel && order.salesChannel !== "direct");

          const methodMatch =
            salesMethod === "all" ||
            (salesMethod === "no_delivery" && 
              (!order.deliveryMethod || order.deliveryMethod === "pickup")) ||
            (salesMethod === "delivery" && 
              order.deliveryMethod === "delivery");

          return dateMatch && statusMatch && employeeMatch && channelMatch && methodMatch;
        });

        res.json(filteredOrders);
      } catch (error) {
        console.error("Error in orders API:", error);
        res.status(500).json({ error: "Failed to fetch orders data" });
      }
    },
  );

  // Sales channel sales data
  // Sales Channel Sales API
  app.get(
    "/api/sales-channel-sales/:startDate/:endDate/:seller/:channel",
    async (req: TenantRequest, res) => {
      try {
        const { startDate, endDate, seller, channel } = req.params;
        const tenantDb = await getTenantDatabase(req);

        // Use storage instead of direct db queries
        const orders = await storage.getOrders(undefined, undefined, tenantDb);
        const filteredOrders = orders.filter((order) => {
          const orderDate = new Date(order.orderedAt);
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);

          const dateMatch = orderDate >= start && orderDate <= end;
          const statusMatch = order.status === "paid";
          const sellerMatch =
            seller === "all" || order.employeeId?.toString() === seller;
          const channelMatch =
            channel === "all" || order.salesChannel === channel;

          return dateMatch && statusMatch && sellerMatch && channelMatch;
        });

        const salesData = [
          {
            salesChannelName: "Direct Sales",
            revenue: filteredOrders.reduce(
              (sum, order) => sum + Number(order.total),
              0,
            ),
            returnValue: 0,
            netRevenue: filteredOrders.reduce(
              (sum, order) => sum + Number(order.total),
              0,
            ),
          },
        ];

        res.json(salesData);
      } catch (error) {
        console.error("Error fetching sales channel sales data:", error);
        res
          .status(500)
          .json({ error: "Failed to fetch sales channel sales data" });
      }
    },
  );

  // Sales Channel Profit API
  app.get(
    "/api/sales-channel-profit/:startDate/:endDate/:seller/:channel",
    async (req: TenantRequest, res) => {
      try {
        const { startDate, endDate, seller, channel } = req.params;
        const tenantDb = await getTenantDatabase(req);

        // Use storage instead of direct db queries
        const orders = await storage.getOrders(undefined, undefined, tenantDb);
        const filteredOrders = orders.filter((order) => {
          const orderDate = new Date(order.orderedAt);
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);

          const dateMatch = orderDate >= start && orderDate <= end;
          const statusMatch = order.status === "paid";
          const sellerMatch =
            seller === "all" || order.employeeId?.toString() === seller;
          const channelMatch =
            channel === "all" || order.salesChannel === channel;

          return dateMatch && statusMatch && sellerMatch && channelMatch;
        });

        const totalAmount = filteredOrders.reduce(
          (sum, order) => sum + Number(order.total),
          0,
        );
        const profitData = [
          {
            salesChannelName: "Direct Sales",
            totalAmount: totalAmount,
            discount: 0,
            revenue: totalAmount,
            returnValue: 0,
            netRevenue: totalAmount,
            totalCost: totalAmount * 0.6,
            grossProfit: totalAmount * 0.4,
            platformFee: 0,
            netProfit: totalAmount * 0.4,
          },
        ];

        res.json(profitData);
      } catch (error) {
        console.error("Error fetching sales channel profit data:", error);
        res
          .status(500)
          .json({ error: "Failed to fetch sales channel profit data" });
      }
    },
  );

  // Sales channel sales data
  app.get(
    "/api/sales-channel-sales/:startDate/:endDate/:sellerId/:salesChannel",
    async (req: TenantRequest, res) => {
      try {
        const { startDate, endDate, sellerId, salesChannel } = req.params;
        const tenantDb = await getTenantDatabase(req);

        let query = `
        SELECT 
          COALESCE(t.salesChannel, 'Bán trực tiếp') as salesChannelName,
          e.name as sellerName,
          SUM(t.total) as revenue,
          SUM(COALESCE(t.refundAmount, 0)) as returnValue,
          SUM(t.total - COALESCE(t.refundAmount, 0)) as netRevenue
        FROM transactions t
        LEFT JOIN employees e ON t.employeeId = e.id
        WHERE DATE(t.createdAt) BETWEEN ? AND ?
      `;

        const params = [startDate, endDate];

        if (sellerId !== "all") {
          query += " AND t.employeeId = ?";
          params.push(sellerId);
        }

        if (salesChannel !== "all") {
          if (salesChannel === "direct") {
            query +=
              ' AND (t.salesChannel IS NULL OR t.salesChannel = "Bán trực tiếp")';
          } else {
            query +=
              ' AND t.salesChannel IS NOT NULL AND t.salesChannel != "Bán trực tiếp"';
          }
        }

        query +=
          ' GROUP BY COALESCE(t.salesChannel, "Bán trực tiếp"), t.employeeId ORDER BY netRevenue DESC';

        const salesData = await new Promise((resolve, reject) => {
          db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });

        res.json(salesData);
      } catch (error) {
        console.error("Error fetching sales channel sales data:", error);
        res
          .status(500)
          .json({ error: "Failed to fetch sales channel sales data" });
      }
    },
  );

  // Sales channel profit data
  app.get(
    "/api/sales-channel-profit/:startDate/:endDate/:sellerId/:salesChannel",
    async (req: TenantRequest, res) => {
      try {
        const { startDate, endDate, sellerId, salesChannel } = req.params;
        const tenantDb = await getTenantDatabase(req);

        let query = `
        SELECT 
          COALESCE(t.salesChannel, 'Bán trực tiếp') as salesChannelName,
          e.name as sellerName,
          SUM(t.totalAmount) as totalAmount,
          SUM(COALESCE(t.discountAmount, 0)) as discount,
          SUM(t.totalAmount - COALESCE(t.discountAmount, 0)) as revenue,
          SUM(COALESCE(t.refundAmount, 0)) as returnValue,
          SUM(t.totalAmount - COALESCE(t.discountAmount, 0) - COALESCE(t.refundAmount, 0)) as netRevenue,
          SUM(COALESCE(ti.quantity * p.costPrice, 0)) as totalCost,
          SUM(t.totalAmount - COALESCE(t.discountAmount, 0) - COALESCE(ti.quantity * p.costPrice, 0)) as grossProfit,
          SUM(COALESCE(t.platformFee, 0)) as platformFee,
          SUM(t.totalAmount - COALESCE(t.discountAmount, 0) - COALESCE(ti.quantity * p.costPrice, 0) - COALESCE(t.platformFee, 0)) as netProfit
        FROM transactions t
        LEFT JOIN employees e ON t.employeeId = e.id
        LEFT JOIN transaction_items ti ON t.id = ti.transactionId
        LEFT JOIN products p ON ti.productId = p.id
        WHERE DATE(t.createdAt) BETWEEN ? AND ?
      `;

        const params = [startDate, endDate];

        if (sellerId !== "all") {
          query += " AND t.employeeId = ?";
          params.push(sellerId);
        }

        if (salesChannel !== "all") {
          if (salesChannel === "direct") {
            query +=
              ' AND (t.salesChannel IS NULL OR t.salesChannel = "Bán trực tiếp")';
          } else {
            query +=
              ' AND t.salesChannel IS NOT NULL AND t.salesChannel != "Bán trực tiếp"';
          }
        }

        query +=
          ' GROUP BY COALESCE(t.salesChannel, "Bán trực tiếp"), t.employeeId ORDER BY netProfit DESC';

        const profitData = await new Promise((resolve, reject) => {
          db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });

        res.json(profitData);
      } catch (error) {
        console.error("Error fetching sales channel profit data:", error);
        res
          .status(500)
          .json({ error: "Failed to fetch sales channel profit data" });
      }
    },
  );

  // Sales channel products data
  app.get(
    "/api/sales-channel-products/:startDate/:endDate/:sellerId/:salesChannel/:productSearch/:productType/:categoryId",
    async (req: TenantRequest, res) => {
      try {
        const {
          startDate,
          endDate,
          sellerId,
          salesChannel,
          productSearch,
          productType,
          categoryId,
        } = req.params;
        const tenantDb = await getTenantDatabase(req);

        let query = `
        SELECT 
          COALESCE(t.salesChannel, 'Bán trực tiếp') as salesChannelName,
          e.name as sellerName,
          p.sku as productCode,
          p.name as productName,
          SUM(ti.quantity) as quantitySold,
          SUM(ti.quantity * ti.price) as revenue,
          SUM(COALESCE(rti.quantity, 0)) as quantityReturned,
          SUM(COALESCE(rti.quantity * rti.price, 0)) as returnValue,
          SUM(ti.quantity * ti.price - COALESCE(rti.quantity * rti.price, 0)) as netRevenue
        FROM transactions t
        LEFT JOIN employees e ON t.employeeId = e.id        LEFT JOIN transaction_items ti ON t.id = ti.transactionId
        LEFT JOIN products p ON ti.productId = p.id
        LEFT JOIN categories c ON p.categoryId = c.id
        LEFT JOIN transaction_items rti ON t.id = rti.transactionId AND rti.productId = p.id AND rti.isReturn = 1
        WHERE DATE(t.createdAt) BETWEEN ? AND ? AND ti.isReturn != 1
      `;

        const params = [startDate, endDate];

        if (sellerId !== "all") {
          query += " AND t.employeeId = ?";
          params.push(sellerId);
        }

        if (salesChannel !== "all") {
          if (salesChannel === "direct") {
            query +=
              ' AND (t.salesChannel IS NULL OR t.salesChannel = "Bán trực tiếp")';
          } else {
            query +=
              ' AND t.salesChannel IS NOT NULL AND t.salesChannel != "Bán trực tiếp"';
          }
        }

        if (productSearch !== "all" && productSearch) {
          query += " AND (p.name LIKE ? OR p.sku LIKE ?)";
          params.push(`%${productSearch}%`, `%${productSearch}%`);
        }

        if (productType !== "all" && productType) {
          query += " AND p.type = ?";
          params.push(productType);
        }

        if (categoryId !== "all" && categoryId) {
          query += " AND p.categoryId = ?";
          params.push(categoryId);
        }

        query +=
          ' GROUP BY COALESCE(t.salesChannel, "Bán trực tiếp"), t.employeeId, p.id ORDER BY netRevenue DESC';

        const productsData = await new Promise((resolve, reject) => {
          db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });

        res.json(productsData);
      } catch (error) {
        console.error("Error fetching sales channel products data:", error);
        res
          .status(500)
          .json({ error: "Failed to fetch sales channel products data" });
      }
    },
  );

  // Financial report endpoints
  app.get(
    "/api/financial-summary/:period/:year/:month?/:quarter?",
    async (req: TenantRequest, res) => {
      try {
        const { period, year, month, quarter } = req.params;
        const tenantDb = await getTenantDatabase(req);

        // Get transactions for financial calculations
        const transactions = await storage.getTransactions(tenantDb);

        let filteredTransactions = transactions.filter((transaction) => {
          const date = new Date(transaction.createdAt);
          const transactionYear = date.getFullYear();

          if (period === "yearly") {
            return transactionYear === parseInt(year);
          } else if (period === "monthly") {
            const transactionMonth = date.getMonth() + 1;
            return (
              transactionYear === parseInt(year) &&
              transactionMonth === parseInt(month)
            );
          } else if (period === "quarterly") {
            const transactionQuarter = Math.floor(date.getMonth() / 3) + 1;
            return (
              transactionYear === parseInt(year) &&
              transactionQuarter === parseInt(quarter)
            );
          }
          return false;
        });

        // Calculate financial metrics
        const totalIncome = filteredTransactions.reduce(
          (sum, t) => sum + Number(t.total),
          0,
        );
        const totalExpenses = totalIncome * 0.6; // Mock expense calculation (60% of income)
        const grossProfit = totalIncome - totalExpenses;
        const operatingExpenses = totalIncome * 0.15; // Mock operating expenses (15% of income)
        const netIncome = grossProfit - operatingExpenses;
        const profitMargin =
          totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0;

        const summary = {
          totalIncome,
          totalExpenses,
          grossProfit,
          operatingExpenses,
          netIncome,
          profitMargin,
          transactionCount: filteredTransactions.length,
        };

        res.json(summary);
      } catch (error) {
        console.error("Error fetching financial summary:", error);
        res.status(500).json({ error: "Failed to fetch financial summary" });
      }
    },
  );

  app.get(
    "/api/income-breakdown/:period/:year/:month?/:quarter?",
    async (req: TenantRequest, res) => {
      try {
        const { period, year, month, quarter } = req.params;
        const tenantDb = await getTenantDatabase(req);

        const transactions = await storage.getTransactions(tenantDb);

        let filteredTransactions = transactions.filter((transaction) => {
          const date = new Date(transaction.createdAt);
          const transactionYear = date.getFullYear();

          if (period === "yearly") {
            return transactionYear === parseInt(year);
          } else if (period === "monthly") {
            const transactionMonth = date.getMonth() + 1;
            return (
              transactionYear === parseInt(year) &&
              transactionMonth === parseInt(month)
            );
          } else if (period === "quarterly") {
            const transactionQuarter = Math.floor(date.getMonth() / 3) + 1;
            return (
              transactionYear === parseInt(year) &&
              transactionQuarter === parseInt(quarter)
            );
          }
          return false;
        });

        // Group by payment method
        const incomeByMethod = {};
        filteredTransactions.forEach((transaction) => {
          const method = transaction.paymentMethod || "cash";
          incomeByMethod[method] =
            (incomeByMethod[method] || 0) + Number(transaction.total);
        });

        const breakdown = Object.entries(incomeByMethod).map(
          ([method, amount]) => ({
            category: method,
            amount: amount,
            percentage:
              filteredTransactions.length > 0
                ? (amount /
                    filteredTransactions.reduce(
                      (sum, t) => sum + Number(t.total),
                      0,
                    )) *
                  100
                : 0,
          }),
        );

        res.json(breakdown);
      } catch (error) {
        console.error("Error fetching income breakdown:", error);
        res.status(500).json({ error: "Failed to fetch income breakdown" });
      }
    },
  );

  app.get(
    "/api/expense-breakdown/:period/:year/:month?/:quarter?",
    async (req: TenantRequest, res) => {
      try {
        // Mock expense data since we don't have a dedicated expenses table
        const mockExpenses = [
          { category: "Cost of Goods Sold", amount: 2500000, percentage: 60 },
          { category: "Rent", amount: 500000, percentage: 12 },
          { category: "Utilities", amount: 200000, percentage: 5 },
          { category: "Staff Salaries", amount: 800000, percentage: 19 },
          { category: "Marketing", amount: 100000, percentage: 2 },
          { category: "Other", amount: 83333, percentage: 2 },
        ];

        res.json(mockExpenses);
      } catch (error) {
        console.error("Error fetching expense breakdown:", error);
        res.status(500).json({ error: "Failed to fetch expense breakdown" });
      }
    },
  );

  app.get(
    "/api/cash-flow/:period/:year/:month?/:quarter?",
    async (req: TenantRequest, res) => {
      try {
        const { period, year, month, quarter } = req.params;
        const tenantDb = await getTenantDatabase(req);

        const transactions = await storage.getTransactions(tenantDb);

        let filteredTransactions = transactions.filter((transaction) => {
          const date = new Date(transaction.createdAt);
          const transactionYear = date.getFullYear();

          if (period === "yearly") {
            return transactionYear === parseInt(year);
          } else if (period === "monthly") {
            const transactionMonth = date.getMonth() + 1;
            return (
              transactionYear === parseInt(year) &&
              transactionMonth === parseInt(month)
            );
          } else if (period === "quarterly") {
            const transactionQuarter = Math.floor(date.getMonth() / 3) + 1;
            return (
              transactionYear === parseInt(year) &&
              transactionQuarter === parseInt(quarter)
            );
          }
          return false;
        });

        const totalIncome = filteredTransactions.reduce(
          (sum, t) => sum + Number(t.total),
          0,
        );

        // Mock cash flow calculations
        const operatingCashFlow = totalIncome * 0.25; // 25% of income
        const investingCashFlow = -totalIncome * 0.05; // 5% negative (investments)
        const financingCashFlow = totalIncome * 0.02; // 2% positive (financing)
        const netCashFlow =
          operatingCashFlow + investingCashFlow + financingCashFlow;

        const cashFlow = {
          operatingCashFlow,
          investingCashFlow,
          financingCashFlow,
          netCashFlow,
        };

        res.json(cashFlow);
      } catch (error) {
        console.error("Error fetching cash flow:", error);
        res.status(500).json({ error: "Failed to fetch cash flow" });
      }
    },
  );

  // POS Login API endpoint
  app.post("/api/pos/login", async (req: TenantRequest, res) => {
    try {
      const { clientID, clientSecret, masterId, bankCode } = req.body;
      const tenantDb = await getTenantDatabase(req);

      console.log("POS Login request:", { clientID, clientSecret, masterId, bankCode });

      // Use external server URL for login
      const apiBaseUrl = process.env.QR_API_BASE_URL || "http://1.55.212.135:9335";
      const response = await fetch(`${apiBaseUrl}/api/pos/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          clientID,
          clientSecret,
          masterId,
          bankCode,
        }),
      });

      if (!response.ok) {
        console.error("POS Login API error:", response.status, response.statusText);
        return res.status(response.status).json({
          error: "Failed to login for QR payment",
          details: `API returned ${response.status}: ${response.statusText}`,
        });
      }

      const result = await response.json();
      console.log("POS Login response:", result);

      res.json(result);
    } catch (error) {
      console.error("POS Login proxy error:", error);
      res.status(500).json({
        error: "Failed to login for QR payment",
        details: error.message,
      });
    }
  });

  // QR Payment API proxy endpoint
  app.post("/api/pos/create-qr", async (req: TenantRequest, res) => {
    // Stock update error
    try {
      const { bankCode, clientID } = req.query;
      const body = req.body;
      const tenantDb = await getTenantDatabase(req);

      console.log("CreateQRPos request:", { bankCode, clientID, body });

      // Use external server URL
      const apiBaseUrl =
        process.env.QR_API_BASE_URL || "http://1.55.212.135:9335";
      const response = await fetch(
        `${apiBaseUrl}/api/CreateQRPos?bankCode=${bankCode}&clientID=${clientID}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        console.error(
          "CreateQRPos API error:",
          response.status,
          response.statusText,
        );
        return res.status(response.status).json({
          error: "Failed to create QR payment",
          details: `API returned ${response.status}: ${response.statusText}`,
        });
      }

      const result = await response.json();
      console.log("CreateQRPos response:", result);

      res.json(result);
    } catch (error) {
      console.error("CreateQRPos proxy error:", error);
      res.status(500).json({
        error: "Failed to create QR payment",
        details: error.message,
      });
    }
  });

  // Tax code lookup proxy endpoint
  app.post("/api/tax-code-lookup", async (req: TenantRequest, res) => {
    try {
      const { taxCode } = req.body;
      const tenantDb = await getTenantDatabase(req);

      if (!taxCode) {
        return res.status(400).json({
          success: false,
          message: "Mã số thuế không được để trống"
        });
      }

      // Call the external tax code API
      const response = await fetch("https://infoerpvn.com:9440/api/CheckListTaxCode/v2", {
        method: "POST",
        headers: {
          "token": "EnURbbnPhUm4GjNgE4Ogrw==",
          "Content-Type": "application/json",
        },
        body: JSON.stringify([taxCode]),
      });

      if (!response.ok) {
        throw new Error(`External API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      res.json({
        success: true,
        data: result,
        message: "Tra cứu thành công"
      });

    } catch (error) {
      console.error("Tax code lookup error:", error);
      res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra khi tra cứu mã số thuế",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Invoices management
  app.post("/api/invoices", async (req: TenantRequest, res) => {
    try {
      const invoiceData = req.body;
      const tenantDb = await getTenantDatabase(req);
      console.log("Creating invoice record:", JSON.stringify(invoiceData, null, 2));

      // Validate required fields
      if (!invoiceData.total || !invoiceData.customerName) {
        return res.status(400).json({
          error: "Missing required fields",
          details: "total and customerName are required",
          received: invoiceData
        });
      }

      // Generate trade number
      const tradeNumber = `INV-${Date.now()}`;

      // Validate and prepare invoice data with proper type conversion
      const validatedInvoice = {
        invoiceNumber: null,
        tradeNumber,
        customerId: invoiceData.customerId || null,
        customerName: invoiceData.customerName || "Khách hàng",
        customerTaxCode: invoiceData.customerTaxCode || null,
        customerAddress: invoiceData.customerAddress || null,
        customerPhone: invoiceData.customerPhone || null,
        customerEmail: invoiceData.customerEmail || null,
        subtotal: typeof invoiceData.subtotal === 'string' ? invoiceData.subtotal : invoiceData.subtotal?.toString() || "0",
        tax: typeof invoiceData.tax === 'string' ? invoiceData.tax : invoiceData.tax?.toString() || "0",
        total: typeof invoiceData.total === 'string' ? invoiceData.total : invoiceData.total?.toString() || "0",
        paymentMethod: invoiceData.paymentMethod || 'cash',
        invoiceDate: new Date(invoiceData.invoiceDate || new Date()),
        status: invoiceData.status || 'draft',
        einvoiceStatus: invoiceData.einvoiceStatus || 0,
        notes: invoiceData.notes || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log("Validated invoice data:", JSON.stringify(validatedInvoice, null, 2));

      // Save invoice to database
      const [savedInvoice] = await db
        .insert(invoices)
        .values(validatedInvoice)
        .returning();

      console.log("Invoice saved to database:", savedInvoice);

      // Save invoice items
      if (invoiceData.items && Array.isArray(invoiceData.items) && invoiceData.items.length > 0) {
        console.log("Processing invoice items:", invoiceData.items.length);

        const invoiceItemsData = invoiceData.items.map((item: any, index: number) => {
          console.log(`Processing item ${index + 1}:`, item);

          return {
            invoiceId: savedInvoice.id,
            productId: item.productId || 0,
            productName: item.productName || `Product ${index + 1}`,
            quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) : (item.quantity || 1),
            unitPrice: typeof item.unitPrice === 'string' ? item.unitPrice : (item.unitPrice?.toString() || "0"),
            total: typeof item.total === 'string' ? item.total : (item.total?.toString() || "0"),
            taxRate: typeof item.taxRate === 'string' ? item.taxRate : ((item.taxRate || 10).toString())
          };
        });

        console.log("Invoice items data:", JSON.stringify(invoiceItemsData, null, 2));

        const savedItems = await db
          .insert(invoiceItems)
          .values(invoiceItemsData)
          .returning();

        console.log("Invoice items saved:", savedItems.length);
      } else {
        console.log("No invoice items to save");
      }

      res.status(201).json({
        success: true,
        invoice: savedInvoice,
        message: "Hóa đơn đã được lưu thành công"
      });

    } catch (error) {
      console.error("=== INVOICE CREATION ERROR ===");
      console.error("Error type:", error?.constructor?.name);
      console.error("Error message:", error?.message);
      console.error("Error stack:", error?.stack);
      console.error("Request body:", JSON.stringify(req.body, null, 2));

      // Check for specific database errors
      let errorMessage = "Failed to create invoice";
      let errorDetails = error instanceof Error ? error.message : "Unknown error";

      if (error?.message?.includes("NOT NULL constraint failed")) {
        errorMessage = "Missing required database fields";
        errorDetails = "Some required fields are missing or null";
      } else if (error?.message?.includes("FOREIGN KEY constraint failed")) {
        errorMessage = "Invalid reference data";
        errorDetails = "Referenced data does not exist";
      } else if (error?.message?.includes("UNIQUE constraint failed")) {
        errorMessage = "Duplicate data conflict";
        errorDetails = "Data already exists in database";
      }

      res.status(500).json({ 
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
        requestData: req.body
      });
    }
  });

  app.get("/api/invoices", async (req: TenantRequest, res) => {
    try {
      const tenantDb = await getTenantDatabase(req);
      const invoicesList = await db
        .select()
        .from(invoices)
        .orderBy(desc(invoices.createdAt));

      res.json(invoicesList);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoice-items/:invoiceId", async (req: TenantRequest, res) => {
    try {
      const invoiceId = parseInt(req.params.invoiceId);
      const tenantDb = await getTenantDatabase(req);

      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: "Invalid invoice ID" });
      }

      const items = await db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, invoiceId))
        .orderBy(invoiceItems.id);

      res.json(items);
    } catch (error) {
      console.error("Error fetching invoice items:", error);
      res.status(500).json({ error: "Failed to fetch invoice items" });
    }
  });

  // Update invoice (including status fields)
  app.put("/api/invoices/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const tenantDb = await getTenantDatabase(req);

      console.log("=== UPDATING INVOICE ===");
      console.log("Invoice ID:", id);
      console.log("Update data:", JSON.stringify(updateData, null, 2));

      if (isNaN(id)) {
        console.error("Invalid invoice ID:", req.params.id);
        return res.status(400).json({ error: "Invalid invoice ID" });
      }

      // Check if invoice exists first
      const [existingInvoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, id))
        .limit(1);

      if (!existingInvoice) {
        console.error("Invoice not found:", id);
        return res.status(404).json({ error: "Invoice not found" });
      }

      console.log("Existing invoice:", existingInvoice);

      // Prepare fields to update with proper mapping
      const fieldsToUpdate: any = {};

      // Handle invoiceStatus mapping
      if (updateData.invoiceStatus !== undefined) {
        fieldsToUpdate.invoiceStatus = updateData.invoiceStatus;
      }

      if (updateData.invoice_status !== undefined) {
        fieldsToUpdate.invoiceStatus = updateData.invoice_status; // Map to the correct database field
      }

      // Handle other standard fields
      const standardFields = ['status', 'einvoiceStatus', 'invoiceNumber', 'symbol', 'templateNumber', 'tradeNumber'];
      standardFields.forEach(field => {
        if (updateData[field] !== undefined) {
          fieldsToUpdate[field] = updateData[field];
        }
      });

      // Add any other fields from updateData (excluding already processed ones)
      Object.keys(updateData).forEach(key => {
        if (!['invoiceStatus', 'invoice_status', ...standardFields].includes(key)) {
          if (updateData[key] !== undefined) {
            fieldsToUpdate[key] = updateData[key];
          }
        }
      });

      fieldsToUpdate.updatedAt = new Date();

      console.log("Fields to update:", JSON.stringify(fieldsToUpdate, null, 2));

      const [updatedInvoice] = await db
        .update(invoices)
        .set(fieldsToUpdate)
        .where(eq(invoices.id, id))
        .returning();

      if (!updatedInvoice) {
        console.error("Failed to update invoice - no result returned");
        return res.status(500).json({ error: "Failed to update invoice - no result returned" });
      }

      console.log("✅ Invoice updated successfully:", updatedInvoice);
      res.json(updatedInvoice);
    } catch (error) {
      console.error("=== INVOICE UPDATE ERROR ===");
      console.error("Error type:", error?.constructor?.name);
      console.error("Error message:", error?.message);
      console.error("Error details:", error);
      console.error("Invoice ID:", req.params.id);
      console.error("Update data:", req.body);

      res.status(500).json({ 
        error: "Failed to update invoice",
        details: error instanceof Error ? error.message : "Unknown error",
        invoiceID: req.params.id,
        updateData: req.body
      });
    }
  });

  // Update order (including template_number and symbol fields)
  app.put("/api/orders/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const tenantDb = await getTenantDatabase(req);

      console.log("=== UPDATING ORDER ===");
      console.log("Order ID:", id);
      console.log("Update data:", JSON.stringify(updateData, null, 2));

      if (isNaN(id)) {
        console.error("Invalid order ID:", req.params.id);
        return res.status(400).json({ error: "Invalid order ID" });
      }

      // Check if order exists first
      const [existingOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1);

      if (!existingOrder) {
        console.error("Order not found:", id);
        return res.status(404).json({ error: "Order not found" });
      }

      console.log("Existing order:", existingOrder);

      // Prepare fields to update with validation
      const fieldsToUpdate: any = {};

      // Map and validate each field
      Object.keys(updateData).forEach(key => {
        const value = updateData[key];
        if (value !== undefined && value !== null) {
          fieldsToUpdate[key] = value;
        }
      });

      // Add updatedAt timestamp
      fieldsToUpdate.updatedAt = new Date();

      console.log("Fields to update:", JSON.stringify(fieldsToUpdate, null, 2));

      const [updatedOrder] = await db
        .update(orders)
        .set(fieldsToUpdate)
        .where(eq(orders.id, id))
        .returning();

      if (!updatedOrder) {
        console.error("Failed to update order - no result returned");
        return res.status(500).json({ error: "Failed to update order - no result returned" });
      }

      console.log("✅ Order updated successfully:", updatedOrder);
      res.json(updatedOrder);
    } catch (error) {
      console.error("=== ORDER UPDATE ERROR ===");
      console.error("Error type:", error?.constructor?.name);
      console.error("Error message:", error?.message);
      console.error("Error details:", error);
      console.error("Order ID:", req.params.id);
      console.error("Update data:", req.body);

      res.status(500).json({ 
        error: "Failed to update order",
        details: error instanceof Error ? error.message : "Unknown error",
        orderID: req.params.id,
        updateData: req.body
      });
    }
  });

  // Update invoice_number for both orders and invoices
  app.put("/api/einvoice/update-invoice-number", async (req: TenantRequest, res) => {
    try {
      const { orderId, invoiceId, invoiceNumber } = req.body;
      const tenantDb = await getTenantDatabase(req);

      console.log("=== UPDATING INVOICE NUMBER ===");
      console.log("Order ID:", orderId);
      console.log("Invoice ID:", invoiceId);
      console.log("Invoice Number:", invoiceNumber);

      const updateResults: any = {};

      // Update orders table if orderId is provided
      if (orderId) {
        try {
          const [updatedOrder] = await db
            .update(orders)
            .set({ 
              invoiceNumber: invoiceNumber,
              updatedAt: new Date() 
            })
            .where(eq(orders.id, orderId))
            .returning();

          if (updatedOrder) {
            updateResults.order = updatedOrder;
            console.log("✅ Order invoice_number updated successfully:", updatedOrder);
          } else {
            console.error("❌ Order not found for ID:", orderId);
            updateResults.orderError = "Order not found";
          }
        } catch (orderError) {
          console.error("❌ Error updating order:", orderError);
          updateResults.orderError = orderError.message;
        }
      }

      // Update invoices table if invoiceId is provided
      if (invoiceId) {
        try {
          const [updatedInvoice] = await db
            .update(invoices)
            .set({ 
              invoiceNumber: invoiceNumber,
              updatedAt: new Date() 
            })
            .where(eq(invoices.id, invoiceId))
            .returning();

          if (updatedInvoice) {
            updateResults.invoice = updatedInvoice;
            console.log("✅ Invoice invoice_number updated successfully:", updatedInvoice);
          } else {
            console.error("❌ Invoice not found for ID:", invoiceId);
            updateResults.invoiceError = "Invoice not found";
          }
        } catch (invoiceError) {
          console.error("❌ Error updating invoice:", invoiceError);
          updateResults.invoiceError = invoiceError.message;
        }
      }

      res.json({
        success: true,
        message: "Invoice number updated successfully",
        results: updateResults
      });

    } catch (error) {
      console.error("=== UPDATE INVOICE NUMBER ERROR ===");
      console.error("Error:", error);

      res.status(500).json({ 
        error: "Failed to update invoice number",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // E-invoice publish proxy endpoint
  app.post("/api/einvoice/publish", async (req: TenantRequest, res) => {
    try {
      const publishRequest = req.body;
      const tenantDb = await getTenantDatabase(req);
      console.log("Publishing invoice with data:", JSON.stringify(publishRequest, null, 2));

      // Call the real e-invoice API
      const response = await fetch("https://infoerpvn.com:9440/api/invoice/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "token": "EnURbbnPhUm4GjNgE4Ogrw=="
        },
        body: JSON.stringify(publishRequest)
      });

      if (!response.ok) {
        console.error("E-invoice API error:", response.status, response.statusText);
        const errorText = await response.text();
        console.error("Error response:", errorText);

        return res.status(response.status).json({
          error: "Failed to publish invoice",
          details: `API returned ${response.status}: ${response.statusText}`,
          apiResponse: errorText
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
          message: result.message || "Hóa đơn điện tử đã được phát hành thành công",
          data: {
            invoiceNo: result.data?.invoiceNo,
            invDate: result.data?.invDate,
            transactionID: result.data?.transactionID,
            macqt: result.data?.macqt,
            originalRequest: {
              transactionID: publishRequest.transactionID,
              invRef: publishRequest.invRef,
              totalAmount: publishRequest.invTotalAmount,
              customer: publishRequest.Customer
            }
          }
        });
      } else {
        // API returned failure
        console.error("E-invoice API returned failure:", result);
        res.status(400).json({
          error: "E-invoice publication failed",
          message: result.message || "Unknown error from e-invoice service",
          details: result
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
        errorType: error.constructor.name
      });
    }
  });

  // Add einvoiceStatus column to orders table if it doesn't exist
  try {
    await db.execute(sql`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS einvoice_status INTEGER NOT NULL DEFAULT 0
    `);
    console.log("Added einvoiceStatus column to orders table");
  } catch (error) {
    console.log("einvoiceStatus column already exists in orders table or addition failed:", error);
  }



  // Printer Configs API
  app.get('/api/printer-configs', async (req, res) => {
    try {
      const tenantDb = await getTenantDatabase(req);
      const result = await db.execute(sql`
        SELECT id, name, printer_type, connection_type, ip_address, port, 
               mac_address, paper_width, print_speed, is_employee, is_kitchen, 
               is_active, created_at, updated_at
        FROM printer_configs 
        ORDER BY id ASC
      `);

      const configs = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        printerType: row.printer_type,
        connectionType: row.connection_type,
        ipAddress: row.ip_address,
        port: row.port,
        macAddress: row.mac_address,
        paperWidth: row.paper_width,
        printSpeed: row.print_speed,
        isEmployee: row.is_employee,
        isKitchen: row.is_kitchen,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      res.json(configs);
    } catch (error) {
      console.error('Error fetching printer configs:', error);
      res.status(500).json({ error: 'Failed to fetch printer configs' });
    }
  });

  // Get active printer configs for auto-print
  app.get('/api/printer-configs/active', async (req, res) => {
    try {
      const { type } = req.query; // 'employee', 'kitchen', or 'all'
      const tenantDb = await getTenantDatabase(req);
      
      let whereClause = 'WHERE is_active = true';
      if (type === 'employee') {
        whereClause += ' AND is_employee = true';
      } else if (type === 'kitchen') {
        whereClause += ' AND is_kitchen = true';
      }

      const result = await db.execute(sql`
        SELECT id, name, printer_type, connection_type, ip_address, port, 
               mac_address, paper_width, print_speed, is_employee, is_kitchen, 
               is_active, created_at, updated_at
        FROM printer_configs 
        ${sql.raw(whereClause)}
        ORDER BY id ASC
      `);

      const configs = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        printerType: row.printer_type,
        connectionType: row.connection_type,
        ipAddress: row.ip_address,
        port: row.port,
        macAddress: row.mac_address,
        paperWidth: row.paper_width,
        printSpeed: row.print_speed,
        isEmployee: row.is_employee,
        isKitchen: row.is_kitchen,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      res.json(configs);
    } catch (error) {
      console.error('Error fetching active printer configs:', error);
      res.status(500).json({ error: 'Failed to fetch active printer configs' });
    }
  });

  // Auto-print API endpoint
  app.post('/api/auto-print', async (req, res) => {
    try {
      const { receiptData, printerType } = req.body;
      const tenantDb = await getTenantDatabase(req);

      console.log('🖨️ Auto-print request:', { printerType, receiptData: !!receiptData });

      // Get active printer configs based on type
      let whereClause = 'WHERE is_active = true';
      if (printerType === 'employee') {
        whereClause += ' AND is_employee = true';
      } else if (printerType === 'kitchen') {
        whereClause += ' AND is_kitchen = true';
      } else if (printerType === 'both') {
        whereClause += ' AND (is_employee = true OR is_kitchen = true)';
      }

      const result = await db.execute(sql`
        SELECT id, name, printer_type, connection_type, ip_address, port, 
               mac_address, paper_width, print_speed, is_employee, is_kitchen
        FROM printer_configs 
        ${sql.raw(whereClause)}
        ORDER BY is_employee DESC, is_kitchen DESC
      `);

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ 
          error: 'No active printer found',
          message: 'Không tìm thấy máy in hoặc không có cấu hình máy in' 
        });
      }

      const printResults = [];

      // Print to each configured printer
      for (const printer of result.rows) {
        try {
          console.log(`🖨️ Printing to: ${printer.name} (${printer.connection_type})`);

          // Mock print job - In real implementation, you would send to actual printer
          if (printer.connection_type === 'network' && printer.ip_address) {
            // Network printer logic
            console.log(`📡 Sending to network printer at ${printer.ip_address}:${printer.port}`);
          } else if (printer.connection_type === 'usb') {
            // USB printer logic
            console.log(`🔌 Sending to USB printer: ${printer.name}`);
          } else if (printer.connection_type === 'bluetooth' && printer.mac_address) {
            // Bluetooth printer logic
            console.log(`📶 Sending to Bluetooth printer: ${printer.mac_address}`);
          }

          printResults.push({
            printerId: printer.id,
            printerName: printer.name,
            status: 'success',
            message: `In thành công trên máy ${printer.name}`
          });

          // Simulate print delay
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (printerError) {
          console.error(`❌ Print failed for ${printer.name}:`, printerError);
          printResults.push({
            printerId: printer.id,
            printerName: printer.name,
            status: 'error',
            message: `Lỗi in trên máy ${printer.name}: ${printerError.message}`
          });
        }
      }

      const successCount = printResults.filter(r => r.status === 'success').length;
      const totalCount = printResults.length;

      res.json({
        success: successCount > 0,
        message: `In thành công ${successCount}/${totalCount} máy in`,
        results: printResults,
        totalPrinters: totalCount,
        successfulPrints: successCount
      });

    } catch (error) {
      console.error('❌ Auto-print error:', error);
      res.status(500).json({ 
        error: 'Print failed',
        message: 'Có lỗi xảy ra khi in hóa đơn'
      });
    }
  });

  app.post("/api/printer-configs", async (req: TenantRequest, res) => {
    try {
      const tenantDb = await getTenantDatabase(req);
      const configData = req.body;

      // If setting as primary, unset all other primaries
      if (configData.isPrimary) {
        await db.execute(sql`UPDATE printer_configs SET is_primary = false`);
      }

      // If setting as secondary, unset all other secondaries
      if (configData.isSecondary) {
        await db.execute(sql`UPDATE printer_configs SET is_secondary = false`);
      }

      const result = await db.execute(sql`
        INSERT INTO printer_configs (
          name, printer_type, connection_type, ip_address, port, mac_address,
          paper_width, print_speed, is_employee, is_kitchen, is_active
        ) VALUES (
          ${configData.name}, ${configData.printerType}, ${configData.connectionType},
          ${configData.ipAddress || null}, ${configData.port || null}, ${configData.macAddress || null},
          ${configData.paperWidth}, ${configData.printSpeed}, ${configData.isEmployee || false}, ${configData.isKitchen || false}, ${configData.isActive !== false}
        ) RETURNING *
      `);

      if (!result.rows || result.rows.length === 0) {
        return res.status(500).json({ error: "Failed to create printer config" });
      }

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Error creating printer config:", error);
      res.status(500).json({ error: "Failed to create printer config" });
    }
  });

  app.put("/api/printer-configs/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantDb = await getTenantDatabase(req);
      const configData = req.body;

      // If setting as employee printer, unset all other employee printers
      if (configData.isEmployee) {
        await db.execute(sql`UPDATE printer_configs SET is_employee = false WHERE id != ${id}`);
      }

      // If setting as kitchen printer, unset all other kitchen printers
      if (configData.isKitchen) {
        await db.execute(sql`UPDATE printer_configs SET is_kitchen = false WHERE id != ${id}`);
      }

      const result = await db.execute(sql`
        UPDATE printer_configs SET
          name = ${configData.name},
          printer_type = ${configData.printerType},
          connection_type = ${configData.connectionType},
          ip_address = ${configData.ipAddress || null},
          port = ${configData.port || null},
          mac_address = ${configData.macAddress || null},
          paper_width = ${configData.paperWidth},
          print_speed = ${configData.printSpeed},
          is_employee = ${configData.isEmployee},
          is_kitchen = ${configData.isKitchen},
          is_active = ${configData.isActive !== false}
        WHERE id = ${id}
        RETURNING *
      `);

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ error: "Printer config not found" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating printer config:", error);
      res.status(500).json({ error: "Failed to update printer config" });
    }
  });

  app.delete("/api/printer-configs/:id", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantDb = await getTenantDatabase(req);

      const result = await db.execute(sql`DELETE FROM printer_configs WHERE id = ${id}`);

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Printer config not found" });
      }

      res.json({ message: "Printer config deleted successfully" });
    } catch (error) {
      console.error("Error deleting printer config:", error);
      res.status(500).json({ error: "Failed to delete printer config" });
    }
  });

  app.post("/api/printer-configs/:id/test", async (req: TenantRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantDb = await getTenantDatabase(req);

      const result = await db.execute(sql`
        SELECT * FROM printer_configs WHERE id = ${id}
      `);

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ error: "Printer config not found" });
      }

      const config = result.rows[0];

      // Mock test print functionality
      console.log(`Testing printer: ${config.name}`);

      res.json({ 
        message: "Test print sent successfully",
        printer: config.name,
        status: "success"
      });
    } catch (error) {
      console.error("Error testing printer:", error);
      res.status(500).json({ error: "Failed to test printer" });
    }
  });

  // Save invoice as order (for both "Phát hành" and "Phát hành sau" functionality)
  app.post("/api/invoices/save-as-order", async (req: TenantRequest, res) => {
    try {
      const invoiceData = req.body;
      const { publishType } = invoiceData; // "publish" hoặc "draft"
      const tenantDb = await getTenantDatabase(req);
      console.log("Creating order from invoice data:", JSON.stringify(invoiceData, null, 2));

      // Validate required fields
      if (!invoiceData.total || !invoiceData.customerName || !invoiceData.items) {
        return res.status(400).json({
          error: "Missing required fields",
          details: "total, customerName and items are required",
          received: invoiceData
        });
      }

      // Calculate totals
      const subtotal = parseFloat(invoiceData.subtotal || "0");
      const tax = parseFloat(invoiceData.tax || "0");
      const total = parseFloat(invoiceData.total || "0");

      // Determine einvoice status based on publish type
      let einvoiceStatus = 0; // Default: Chưa phát hành
      let orderStatus = 'draft';
      let statusMessage = "Đơn hàng đã được lưu để phát hành hóa đơn sau";

      if (publishType === "publish") {
        einvoiceStatus = 1; // Đã phát hành
        orderStatus = 'paid';
        statusMessage = "Hóa đơn điện tử đã được phát hành thành công";
      }

      // Create order data
      const orderData = {
        orderNumber: `ORD-${Date.now()}`,
        tableId: null, // No table for POS orders
        customerName: invoiceData.customerName,
        customerPhone: invoiceData.customerPhone || null,
        customerEmail: invoiceData.customerEmail || null,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        status: orderStatus,
        paymentMethod: 'einvoice',
        paymentStatus: publishType === "publish" ? 'paid' : 'pending',
        einvoiceStatus: einvoiceStatus,
        notes: `E-Invoice Info - Tax Code: ${invoiceData.customerTaxCode || 'N/A'}, Address: ${invoiceData.customerAddress || 'N/A'}`,
        orderedAt: new Date(),
        employeeId: null, // Can be set if employee info is available
        salesChannel: 'pos'
      };

      console.log("Order data to save:", orderData);

      // Save order
      const [savedOrder] = await db
        .insert(orders)
        .values(orderData)
        .returning();

      console.log("Order saved:", savedOrder);

      // Save order items
      if (invoiceData.items && Array.isArray(invoiceData.items)) {
        const orderItemsData = invoiceData.items.map((item: any) => ({
          orderId: savedOrder.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          total: item.total.toString(),
          notes: `Tax Rate: ${item.taxRate}%`
        }));

        const savedItems = await db
          .insert(orderItems)
          .values(orderItemsData)
          .returning();

        console.log("Order items saved:", savedItems.length);
      }

      res.status(201).json({
        success: true,
        order: savedOrder,
        message: statusMessage,
        einvoiceStatus: einvoiceStatus
      });

    } catch (error) {
      console.error("=== SAVE ORDER FROM INVOICE ERROR ===");
      console.error("Error:", error);

      res.status(500).json({ 
        error: "Failed to save order from invoice",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Sales Chart Report API endpoints - Updated with proper filtering
  app.get("/api/transactions/:startDate/:endDate/:salesMethod/:salesChannel/:analysisType/:concernType/:selectedEmployee", async (req: TenantRequest, res) => {
    try {
      const { startDate, endDate, salesMethod, salesChannel, analysisType, concernType, selectedEmployee } = req.params;
      const tenantDb = await getTenantDatabase(req);

      console.log("Transactions API called with params:", { startDate, endDate, salesMethod, salesChannel, analysisType, concernType, selectedEmployee });

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
        if (salesMethod !== 'all') {
          const paymentMethod = transaction.paymentMethod || 'cash';
          switch (salesMethod) {
            case 'no_delivery':
              salesMethodMatch = !transaction.deliveryMethod || transaction.deliveryMethod === 'pickup' || transaction.deliveryMethod === 'takeaway';
              break;
            case 'delivery':
              salesMethodMatch = transaction.deliveryMethod === 'delivery';
              break;
            default:
              salesMethodMatch = paymentMethod.toLowerCase() === salesMethod.toLowerCase();
          }
        }

        // Enhanced sales channel filtering
        let salesChannelMatch = true;
        if (salesChannel !== 'all') {
          const channel = transaction.salesChannel || 'direct';
          switch (salesChannel) {
            case 'direct':
              salesChannelMatch = !transaction.salesChannel || transaction.salesChannel === 'direct' || transaction.salesChannel === 'pos';
              break;
            case 'other':
              salesChannelMatch = transaction.salesChannel && transaction.salesChannel !== 'direct' && transaction.salesChannel !== 'pos';
              break;
            default:
              salesChannelMatch = channel.toLowerCase() === salesChannel.toLowerCase();
          }
        }

        // Enhanced employee filtering
        let employeeMatch = true;
        if (selectedEmployee !== 'all') {
          employeeMatch = 
            transaction.cashierName === selectedEmployee ||
            transaction.employeeId?.toString() === selectedEmployee ||
            (transaction.cashierName && transaction.cashierName.toLowerCase().includes(selectedEmployee.toLowerCase()));
        }

        return dateMatch && salesMethodMatch && salesChannelMatch && employeeMatch;
      });

      console.log(`Found ${filteredTransactions.length} filtered transactions out of ${transactions.length} total`);
      res.json(filteredTransactions);
    } catch (error) {
      console.error("Error in transactions API:", error);
      res.status(500).json({ error: "Failed to fetch transactions data" });
    }
  });

  app.get("/api/orders/:startDate/:endDate/:selectedEmployee/:salesChannel/:salesMethod/:analysisType/:concernType", async (req: TenantRequest, res) => {
    try {
      const { startDate, endDate, selectedEmployee, salesChannel, salesMethod, analysisType, concernType } = req.params;
      const tenantDb = await getTenantDatabase(req);

      console.log("Orders API called with params:", { startDate, endDate, selectedEmployee, salesChannel, salesMethod, analysisType, concernType });

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
        if (selectedEmployee !== 'all') {
          employeeMatch = 
            order.employeeId?.toString() === selectedEmployee ||
            (order.employeeName && order.employeeName.toLowerCase().includes(selectedEmployee.toLowerCase()));
        }

        // Enhanced sales channel filtering
        let salesChannelMatch = true;
        if (salesChannel !== 'all') {
          const channel = order.salesChannel || 'direct';
          switch (salesChannel) {
            case 'direct':
              salesChannelMatch = !order.salesChannel || order.salesChannel === 'direct' || order.salesChannel === 'pos';
              break;
            case 'other':
              salesChannelMatch = order.salesChannel && order.salesChannel !== 'direct' && order.salesChannel !== 'pos';
              break;
            default:
              salesChannelMatch = channel.toLowerCase() === salesChannel.toLowerCase();
          }
        }

        // Enhanced sales method filtering
        let salesMethodMatch = true;
        if (salesMethod !== 'all') {
          switch (salesMethod) {
            case 'no_delivery':
              salesMethodMatch = !order.deliveryMethod || order.deliveryMethod === 'pickup' || order.deliveryMethod === 'takeaway';
              break;
            case 'delivery':
              salesMethodMatch = order.deliveryMethod === 'delivery';
              break;
            default:
              const paymentMethod = order.paymentMethod || 'cash';
              salesMethodMatch = paymentMethod.toLowerCase() === salesMethod.toLowerCase();
          }
        }

        // Only include paid orders for analysis
        const statusMatch = order.status === 'paid';

        return dateMatch && employeeMatch && salesChannelMatch && salesMethodMatch && statusMatch;
      });

      console.log(`Found ${filteredOrders.length} filtered orders out of ${orders.length} total`);
      res.json(filteredOrders);
    } catch (error) {
      console.error("Error in orders API:", error);
      res.status(500).json({ error: "Failed to fetch orders data" });
    }
  });

  app.get("/api/products/:selectedCategory/:productType/:productSearch?", async (req: TenantRequest, res) => {
    try {
      const { selectedCategory, productType, productSearch } = req.params;
      const tenantDb = await getTenantDatabase(req);

      console.log("Products API called with params:", { selectedCategory, productType, productSearch });

      let products;

      // Get products by category or all products
      if (selectedCategory && selectedCategory !== 'all' && selectedCategory !== 'undefined') {
        const categoryId = parseInt(selectedCategory);
        if (!isNaN(categoryId)) {
          products = await storage.getProductsByCategory(categoryId, true, tenantDb);
        } else {
          products = await storage.getAllProducts(true, tenantDb);
        }
      } else {
        products = await storage.getAllProducts(true, tenantDb);
      }

      // Filter by product type if specified
      if (productType && productType !== 'all' && productType !== 'undefined') {
        const typeMap = { 
          combo: 3, 
          'combo-dongoi': 3,
          product: 1, 
          'hang-hoa': 1,
          service: 2,
          'dich-vu': 2
        };
        const typeValue = typeMap[productType.toLowerCase() as keyof typeof typeMap];
        if (typeValue) {
          products = products.filter((product: any) => product.productType === typeValue);
        }
      }

      // Filter by product search if provided
      if (productSearch && productSearch !== '' && productSearch !== 'undefined' && productSearch !== 'all') {
        const searchTerm = productSearch.toLowerCase();
        products = products.filter((product: any) => 
          product.name?.toLowerCase().includes(searchTerm) ||
          product.sku?.toLowerCase().includes(searchTerm) ||
          product.description?.toLowerCase().includes(searchTerm)
        );
      }

      console.log(`Found ${products.length} products after filtering`);
      res.json(products);
    } catch (error) {
      console.error("Error in products API:", error);
      res.status(500).json({ error: "Failed to fetch products data" });
    }
  });

  app.get("/api/customers/:customerSearch?/:customerStatus?", async (req: TenantRequest, res) => {
    try {
      const { customerSearch, customerStatus } = req.params;
      const tenantDb = await getTenantDatabase(req);

      console.log("Customers API called with search:", customerSearch, "status:", customerStatus);

      let customers = await storage.getCustomers(tenantDb);

      // Filter by search if provided
      if (customerSearch && customerSearch !== '' && customerSearch !== 'undefined' && customerSearch !== 'all') {
        const searchTerm = customerSearch.toLowerCase();
        customers = customers.filter((customer: any) => 
          customer.name?.toLowerCase().includes(searchTerm) ||
          customer.phone?.includes(customerSearch) ||
          customer.email?.toLowerCase().includes(searchTerm) ||
          customer.customerId?.toLowerCase().includes(searchTerm) ||
          customer.address?.toLowerCase().includes(searchTerm)
        );
      }

      // Filter by status if provided
      if (customerStatus && customerStatus !== 'all' && customerStatus !== 'undefined') {
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        customers = customers.filter((customer: any) => {
          const totalSpent = Number(customer.totalSpent || 0);
          const lastVisit = customer.lastVisit ? new Date(customer.lastVisit) : null;

          switch (customerStatus) {
            case 'active':
              return lastVisit && lastVisit >= thirtyDaysAgo;
            case 'inactive':
              return !lastVisit || lastVisit < thirtyDaysAgo;
            case 'vip':
              return totalSpent >= 500000; // VIP customers with total spent >= 500k VND
            case 'new':
              const joinDate = customer.createdAt ? new Date(customer.createdAt) : null;
              return joinDate && joinDate >= thirtyDaysAgo;
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
        connectionString: DATABASE_URL?.replace(/:[^:@]*@/, ':****@'),
        usingExternalDb: !!process.env.EXTERNAL_DB_URL
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Database health check failed:", error);

      res.status(500).json({ 
        status: "unhealthy", 
        error: errorMessage,
        connectionString: DATABASE_URL?.replace(/:[^:@]*@/, ':****@'),
        usingExternalDb: !!process.env.EXTERNAL_DB_URL,
        details: error
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}