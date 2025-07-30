import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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
} from "@shared/schema";
import { initializeSampleData, db } from "./db";
import { z } from "zod";
import { eq, desc, asc, and, or, like, count, sum, gte, lt, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { orders, orderItems, products, categories, transactions as transactionsTable, transactionItems as transactionItemsTable } from "@shared/schema";

export async function registerRoutes(app: Express): Promise {
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
    console.log("Inventory transactions table already exists or creation failed:", error);
  }

  // Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const { name, icon } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Category name is required" });
      }

      const categoryData = {
        name: name.trim(),
        icon: icon || "fas fa-utensils"
      };

      const category = await storage.createCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  app.put("/api/categories/:id", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const { name, icon } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Category name is required" });
      }

      const categoryData = {
        name: name.trim(),
        icon: icon || "fas fa-utensils"
      };

      const category = await storage.updateCategory(categoryId, categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);

      // Check if category has products
      const products = await storage.getProductsByCategory(categoryId);
      if (products.length > 0) {
        return res.status(400).json({ 
          error: `Không thể xóa danh mục vì còn ${products.length} sản phẩm. Vui lòng xóa hoặc chuyển các sản phẩm sang danh mục khác trước.` 
        });
      }

      await storage.deleteCategory(categoryId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting category:", error);

      // Handle foreign key constraint errors
      if (error instanceof Error && error.message.includes('foreign key constraint')) {
        return res.status(400).json({ 
          error: "Không thể xóa danh mục vì vẫn còn sản phẩm thuộc danh mục này. Vui lòng xóa hoặc chuyển các sản phẩm sang danh mục khác trước." 
        });
      }

      res.status(500).json({ error: "Có lỗi xảy ra khi xóa danh mục" });
    }
  });

  // Products
  app.get("/api/products", async (req, res) => {
    try {
      const { category, search, includeInactive } = req.query;
      let products;

      const shouldIncludeInactive = includeInactive === 'true';

      if (search) {
        products = await storage.searchProducts(search as string, shouldIncludeInactive);
      } else if (category && category !== "all") {
        products = await storage.getProductsByCategory(
          parseInt(category as string),
          shouldIncludeInactive
        );
      } else {
        products = await storage.getAllProducts(shouldIncludeInactive);
      }

      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Endpoint for POS to get only active products
  app.get("/api/products/active", async (req, res) => {
    try {
      const products = await storage.getActiveProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      console.log("Product creation request body:", req.body);

      // Ensure required fields are present
      if (!req.body.name || !req.body.sku || !req.body.price || !req.body.categoryId || req.body.taxRate === undefined) {
        return res.status(400).json({
          message: "Missing required fields: name, sku, price, categoryId, and taxRate are required"
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
        taxRate: req.body.taxRate.toString()
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
          code: "DUPLICATE_SKU"
        });
      }

      const product = await storage.createProduct(validatedData);
      console.log("Product created successfully:", product);
      res.status(201).json(product);
    } catch (error) {
      console.error("Product creation error:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res
          .status(400)
          .json({ 
            message: "Invalid product data", 
            errors: error.errors,
            details: error.format()
          });
      }
      res.status(500).json({ 
        message: "Failed to create product",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(id, validatedData);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProduct(id);

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
            code: "PRODUCT_IN_USE"
          });
        }
      }

      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // New endpoint to cleanup inactive products
  app.delete("/api/products/cleanup/inactive", async (req, res) => {
    try {
      const deletedCount = await storage.deleteInactiveProducts();
      res.json({ 
        message: `Successfully deleted ${deletedCount} inactive products`,
        deletedCount
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to cleanup inactive products" });
    }
  });

  app.get("/api/products/barcode/:sku", async (req, res) => {
    try {
      const sku = req.params.sku;
      const product = await storage.getProductBySku(sku);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product by SKU" });
    }
  });

  // Transactions
  app.post("/api/transactions", async (req, res) => {
    try {
      const { transaction, items } = req.body;

      console.log("Received transaction data:", JSON.stringify({ transaction, items }, null, 2));

      // Validate with original string format, then transform
      const validatedTransaction = insertTransactionSchema.parse(transaction);
      const validatedItems = z.array(insertTransactionItemSchema).parse(items);

      console.log("Validated data:", JSON.stringify({ validatedTransaction, validatedItems }, null, 2));

      // Validate stock availability
      for (const item of validatedItems) {
        const product = await storage.getProduct(item.productId);
        if (!product) {
          return res
            .status(400)
            .json({ message: `Product with ID ${item.productId} not found` });
        }
        if (product.stock < item.quantity) {
          return res.status(400).json({
            message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
          });
        }
      }

      const receipt = await storage.createTransaction(
        validatedTransaction,
        validatedItems,
      );
      res.status(201).json(receipt);
    } catch (error) {
      console.error("Transaction creation error:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ 
            message: "Invalid transaction data", 
            errors: error.errors,
            details: error.format()
          });
      }
      res.status(500).json({ 
        message: "Failed to create transaction",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get("/api/transactions/:transactionId", async (req, res) => {
    try {
      const transactionId = req.params.transactionId;
      const receipt =
        await storage.getTransactionByTransactionId(transactionId);

      if (!receipt) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      res.json(receipt);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transaction" });
    }
  });

  // Get next employee ID
  app.get("/api/employees/next-id", async (req, res) => {
    try {
      const nextId = await storage.getNextEmployeeId();
      res.json({ nextId });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate employee ID" });
    }
  });

  // Employees
  app.get("/api/employees", async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.get("/api/employees/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const employee = await storage.getEmployee(id);

      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      res.json(employee);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employee" });
    }
  });

  app.post("/api/employees", async (req, res) => {
    try {
      const validatedData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(validatedData);
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

  app.put("/api/employees/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(id, validatedData);

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

  app.delete("/api/employees/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteEmployee(id);

      if (!deleted) {
        return res.status(404).json({ message: "Employee not found" });
      }

      res.json({ message: "Employee deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // Attendance routes
  app.get("/api/attendance", async (req, res) => {
    try {
      const { date } = req.query;

      let whereCondition;
      if (date && typeof date === 'string') {
        // Filter by specific date
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        whereCondition = and(
          gte(attendanceRecords.clockIn, startOfDay),
          lt(attendanceRecords.clockIn, endOfDay)
        );
      }

      const attendance = await db.select().from(attendanceRecords)
        .where(whereCondition)
        .orderBy(desc(attendanceRecords.clockIn));

      res.json(attendance);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      res.status(500).json({ error: 'Failed to fetch attendance records' });
    }
  });

  app.get("/api/attendance/today/:employeeId", async (req, res) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const record = await storage.getTodayAttendance(employeeId);
      res.json(record);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch today's attendance" });
    }
  });

  app.post("/api/attendance/clock-in", async (req, res) => {
    try {
      const { employeeId, notes } = req.body;
      const record = await storage.clockIn(employeeId, notes);
      res.status(201).json(record);
    } catch (error) {
      res.status(500).json({ message: "Failed to clock in" });
    }
  });

  app.post("/api/attendance/clock-out/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const record = await storage.clockOut(id);

      if (!record) {
        return res.status(404).json({ message: "Attendance record not found" });
      }

      res.json(record);
    } catch (error) {
      res.status(500).json({ message: "Failed to clock out" });
    }
  });

  app.post("/api/attendance/break-start/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const record = await storage.startBreak(id);

      if (!record) {
        return res.status(404).json({ message: "Attendance record not found" });
      }

      res.json(record);
    } catch (error) {
      res.status(500).json({ message: "Failed to start break" });
    }
  });

  app.post("/api/attendance/break-end/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const record = await storage.endBreak(id);

      if (!record) {
        return res.status(404).json({ message: "Attendance record not found" });
      }

      res.json(record);
    } catch (error) {
      res.status(500).json({ message: "Failed to end break" });
    }
  });

  app.put("/api/attendance/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const record = await storage.updateAttendanceStatus(id, status);

      if (!record) {
        return res.status(404).json({ message: "Attendance record not found" });
      }

      res.json(record);
    } catch (error) {
      res.status(500).json({ message: "Failed to update attendance status" });
    }
  });

  // Tables
  app.get("/api/tables", async (req, res) => {
    try {
      const tables = await storage.getTables();
      res.json(tables);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tables" });
    }
  });

  app.get("/api/tables/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const table = await storage.getTable(id);

      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }

      res.json(table);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch table" });
    }
  });

  app.post("/api/tables", async (req, res) => {
    try {
      const tableData = insertTableSchema.parse(req.body);
      const table = await storage.createTable(tableData);
      res.status(201).json(table);
    } catch (error) {
      res.status(400).json({ message: "Failed to create table" });
    }
  });

  app.put("/api/tables/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tableData = insertTableSchema.partial().parse(req.body);
      const table = await storage.updateTable(id, tableData);

      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }

      res.json(table);
    } catch (error) {
      res.status(500).json({ message: "Failed to update table" });
    }
  });

  app.put("/api/tables/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const table = await storage.updateTableStatus(id, status);

      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }

      res.json(table);
    } catch (error) {
      res.status(500).json({ message: "Failed to update table status" });
    }
  });

  app.delete("/api/tables/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTable(id);

      if (!deleted) {
        return res.status(404).json({ message: "Table not found" });
      }

      res.json({ message: "Table deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete table" });
    }
  });

  // Orders
  app.get("/api/orders", async (req, res) => {
    try {
      const { tableId, status } = req.query;
      const orders = await storage.getOrders(
        tableId ? parseInt(tableId as string) : undefined,
        status as string,
      );
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrder(id);

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      const items = await storage.getOrderItems(id);
      res.json({ ...order, items });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const { order, items } = req.body;
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

      const newOrder = await storage.createOrder(orderData, itemsData);

      // Verify items were created
      const createdItems = await storage.getOrderItems(newOrder.id);
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

  app.put("/api/orders/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const order = await storage.updateOrderStatus(id, status);

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  app.post("/api/orders/:id/payment", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { paymentMethod } = req.body;

      // Update order status to paid
      const order = await storage.updateOrderStatus(id, 'paid');

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Also update table status to available if the order is linked to a table
      if (order.tableId) {
        await storage.updateTableStatus(order.tableId, 'available');
      }

      res.json({ ...order, paymentMethod });
    } catch (error) {
      console.error('Payment completion error:', error);
      res.status(500).json({ message: "Failed to complete payment" });
    }
  });

  app.get("/api/order-items/:orderId", async (req, res) => {
    try {
      console.log('=== GET ORDER ITEMS API CALLED ===');
      const orderId = parseInt(req.params.orderId);
      console.log('Order ID requested:', orderId);

      if (isNaN(orderId)) {
        console.error('Invalid order ID provided:', req.params.orderId);
        return res.status(400).json({ message: "Invalid order ID" });
      }

      console.log('Fetching order items from storage...');
      const items = await storage.getOrderItems(orderId);
      console.log(`Found ${items.length} order items:`, items);

      res.json(items);
    } catch (error) {
      console.error('=== GET ORDER ITEMS ERROR ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Order ID:', req.params.orderId);

      res.status(500).json({ 
        message: "Failed to fetch order items",
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Add order items to existing order
  app.post('/api/orders/:orderId/items', async (req, res) => {
    try {
      console.log('=== ADD ORDER ITEMS API CALLED ===');
      const orderId = parseInt(req.params.orderId);
      const { items } = req.body;

      console.log('Request params:', req.params);
      console.log('Order ID:', orderId);
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('Items to add:', JSON.stringify(items, null, 2));

      if (!orderId || isNaN(orderId)) {
        console.error('Invalid order ID:', req.params.orderId);
        return res.status(400).json({ error: 'Invalid order ID' });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        console.error('Invalid items data:', items);
        return res.status(400).json({ error: 'Items array is required and cannot be empty' });
      }

      // Check if order exists
      const [existingOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId));

      if (!existingOrder) {
        console.error('Order not found:', orderId);
        return res.status(404).json({ error: 'Order not found' });
      }

      console.log('Found existing order:', existingOrder);

      const createdItems = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log(`Processing item ${i + 1}/${items.length}:`, item);

        // Validate item data
        if (!item.productId || !item.quantity || !item.unitPrice || !item.total) {
          console.error('Missing required item data:', item);
          throw new Error(`Item ${i + 1} is missing required fields`);
        }

        // Get product info to include in the order item
        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, item.productId));

        if (!product) {
          console.error('Product not found:', item.productId);
          throw new Error(`Product with ID ${item.productId} not found`);
        }

        console.log('Found product:', product);

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

          console.log('Created order item:', orderItem);
          createdItems.push(orderItem);
        } catch (insertError) {
          console.error('Error inserting order item:', insertError);
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

        console.log('Order items sum result:', orderItemsSum);

        const totalAmount = Number(orderItemsSum.total) || 0;
        const subtotalAmount = totalAmount / 1.1; // Remove 10% tax
        const taxAmount = totalAmount - subtotalAmount;

        console.log('Calculated amounts:', {
          total: totalAmount,
          subtotal: subtotalAmount,
          tax: taxAmount
        });

        await db
          .update(orders)
          .set({
            total: totalAmount.toFixed(2),
            subtotal: subtotalAmount.toFixed(2),
            tax: taxAmount.toFixed(2),
          })
          .where(eq(orders.id, orderId));

        console.log('Updated order totals successfully');
      } catch (updateError) {
        console.error('Error updating order totals:', updateError);
        // Don't throw here, as items were already created successfully
      }

      console.log('=== ADD ORDER ITEMS COMPLETED SUCCESSFULLY ===');
      res.json(createdItems);
    } catch (error) {
      console.error('=== ADD ORDER ITEMS ERROR ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Request data:', {
        orderId: req.params.orderId,
        body: req.body
      });

      res.status(500).json({ 
        error: 'Failed to add items to order',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Inventory Management
  app.post("/api/inventory/update-stock", async (req, res) => {
    try {
      const { productId, quantity, type, notes, trackInventory } = req.body;

      // Get current product
      const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
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

      await db.update(products)
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
  app.get("/api/store-settings", async (req, res) => {
    try {
      const settings = await storage.getStoreSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch store settings" });
    }
  });

  app.put("/api/store-settings", async (req, res) => {
    try {
      const validatedData = insertStoreSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateStoreSettings(validatedData);
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
  app.get("/api/suppliers", async (req, res) => {
    try {
      const { status, search } = req.query;
      let suppliers;

      if (search) {
        suppliers = await storage.searchSuppliers(search as string);
      } else if (status && status !== "all") {
        suppliers = await storage.getSuppliersByStatus(status as string);
      } else {
        suppliers = await storage.getSuppliers();
      }

      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.get("/api/suppliers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const supplier = await storage.getSupplier(id);

      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      res.json(supplier);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch supplier" });
    }
  });

  app.post("/api/api/suppliers", async (req, res) =>{
    try {
      const validatedData = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(validatedData);
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

  app.put("/apii/suppliers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertSupplierSchema.partial().parse(req.body);
      const supplier = await storage.updateSupplier(id, validatedData);

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

  app.delete("/api/suppliers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSupplier(id);

      if (!deleted) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      res.json({ message: "Supplier deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete supplier" });
    }
  });

  // Customer management routes - Added Here
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const customerData = req.body;
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid customer data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.put("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customerData = req.body;
      const customer = await storage.updateCustomer(id, customerData);
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

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCustomer(id);
      if (!deleted) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json({ message: "Customer deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  app.post("/api/customers/:id/visit", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { amount, points } = req.body;

      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      const updatedCustomer = await storage.updateCustomerVisit(
        id,
        amount,
        points,
      );
      res.json(updatedCustomer);
    } catch (error) {
      res.status(500).json({ message: "Failed to update customer visit" });
    }
  });

  // Point Management API
  app.get("/api/customers/:id/points", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const pointsData = await storage.getCustomerPoints(customerId);

      if (!pointsData) {
        return res.status(404).json({ message: "Customer not found" });
      }

      res.json(pointsData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer points" });
    }
  });

  app.post("/api/customers/:id/points", async (req, res) => {
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

      const pointTransaction = await storage.updateCustomerPoints(
        customerId,
        points,
        description,
        type,
        employeeId,
        orderId,
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

  app.get("/api/customers/:id/point-history", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 50;

      const pointHistory = await storage.getPointHistory(customerId, limit);
      res.json(pointHistory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch point history" });
    }
  });

  // New endpoints for points management modal
  app.post("/api/customers/adjust-points", async (req, res) => {
    try {
      const pointUpdateSchema = z.object({
        customerId: z.number().int().min(1),
        points: z.number().int(),
        type: z.enum(["earned", "redeemed", "adjusted"]),
        description: z.string().min(1),
      });

      const { customerId, points, type, description } = pointUpdateSchema.parse(req.body);

      const pointTransaction = await storage.updateCustomerPoints(
        customerId,
        points,
        description,
        type,
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
      if (error instanceof Error && error.message === "Insufficient points balance") {
        return res.status(400).json({ message: "Insufficient points balance" });
      }
      res.status(500).json({ message: "Failed to adjust customer points" });
    }
  });

  app.post("/api/customers/redeem-points", async (req, res) => {
    try {
      const redeemSchema = z.object({
        customerId: z.number().int().min(1),
        points: z.number().int().min(1),
      });

      const { customerId, points } = redeemSchema.parse(req.body);

      const pointTransaction = await storage.updateCustomerPoints(
        customerId,
        -points,
        "포인트 결제 사용",
        "redeemed",
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
      if (error instanceof Error && error.message === "Insufficient points balance") {
        return res.status(400).json({ message: "Insufficient points balance" });
      }
      res.status(500).json({ message: "Failed to redeem customer points" });
    }
  });

  app.get("/api/point-transactions", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      // For now, get all point transactions across all customers
      // In a real app, you might want pagination and filtering
      const allTransactions = await storage.getAllPointTransactions(limit);
      res.json(allTransactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch point transactions" });
    }
  });

  // Membership thresholds management
  app.get("/api/membership-thresholds", async (req, res) => {
    try {
      const thresholds = await storage.getMembershipThresholds();
      res.json(thresholds);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch membership thresholds" });
    }
  });

  app.put("/api/membership-thresholds", async (req, res) => {
    try {
      const thresholdSchema = z.object({
        GOLD: z.number().min(0),
        VIP: z.number().min(0)
      });

      const validatedData = thresholdSchema.parse(req.body);
      const thresholds = await storage.updateMembershipThresholds(validatedData);

      res.json(thresholds);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid threshold data",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Failed to update membership thresholds" });
    }
  });

  // Supplier Reports APIs
  app.get("/api/supplier-debts", async (req, res) => {
    try {
      const { startDate, endDate, supplierId } = req.query;

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
          phone: "010-1234-5678"
        },
        {
          id: 2,
          supplierCode: "SUP002", 
          supplierName: "Nhà cung cấp B",
          initialDebt: 800000,
          newDebt: 400000,
          payment: 300000,
          finalDebt: 900000,
          phone: "010-2345-6789"
        }
      ];

      // Filter by supplier if specified
      let filteredDebts = supplierDebts;
      if (supplierId) {
        filteredDebts = supplierDebts.filter(debt => debt.id === parseInt(supplierId as string));
      }

      res.json(filteredDebts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch supplier debts" });
    }
  });

  app.get("/api/supplier-purchases", async (req, res) => {
    try {
      const { startDate, endDate, supplierId } = req.query;

      // Mock data for supplier purchases - replace with actual database queries
      const supplierPurchases = [
        {
          id: 1,
          supplierCode: "SUP001",
          supplierName: "Nhà cung cấp A", 
          purchaseValue: 1500000,
          paymentValue: 1200000,
          netValue: 300000,
          phone: "010-1234-5678"
        },
        {
          id: 2,
          supplierCode: "SUP002",
          supplierName: "Nhà cung cấp B",
          purchaseValue: 2000000,
          paymentValue: 1700000,
          netValue: 300000,
          phone: "010-2345-6789"
        }
      ];

      // Filter by supplier if specified
      let filteredPurchases = supplierPurchases;
      if (supplierId) {
        filteredPurchases = supplierPurchases.filter(purchase => purchase.id === parseInt(supplierId as string));
      }

      res.json(filteredPurchases);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch supplier purchases" });
    }
  });

  // Invoice templates management
  app.get("/api/invoice-templates", async (req, res) => {
    try {
      const templates = await storage.getInvoiceTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoice templates" });
    }
  });

  app.post("/api/invoice-templates", async (req, res) => {
    try {
      const templateData = req.body;
      const template = await storage.createInvoiceTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Invoice template creation error:", error);
      res.status(500).json({ message: "Failed to create invoice template" });
    }
  });

  app.put("/api/invoice-templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const templateData = req.body;
      const template = await storage.updateInvoiceTemplate(id, templateData);

      if (!template) {
        return res.status(404).json({ message: "Invoice template not found" });
      }

      res.json(template);
    } catch (error) {
      console.error("Invoice template update error:", error);
      res.status(500).json({ message: "Failed to update invoice template" });
    }
  });

  app.delete("/api/invoice-templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteInvoiceTemplate(id);

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
  app.get("/api/einvoice-connections", async (req, res) => {
    try {
      const connections = await storage.getEInvoiceConnections();
      res.json(connections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch e-invoice connections" });
    }
  });

  app.post("/api/einvoice-connections", async (req, res) => {
    try {
      const connectionData = req.body;
      const connection = await storage.createEInvoiceConnection(connectionData);
      res.status(201).json(connection);
    } catch (error) {
      console.error("E-invoice connection creation error:", error);
      res.status(500).json({ message: "Failed to create e-invoice connection" });
    }
  });

  app.put("/api/einvoice-connections/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const connectionData = req.body;
      const connection = await storage.updateEInvoiceConnection(id, connectionData);

      if (!connection) {
        return res.status(404).json({ message: "E-invoice connection not found" });
      }

      res.json(connection);
    } catch (error) {
      console.error("E-invoice connection update error:", error);
      res.status(500).json({ message: "Failed to update e-invoice connection" });
    }
  });

  app.delete("/api/einvoice-connections/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteEInvoiceConnection(id);

      if (!deleted) {
        return res.status(404).json({ message: "E-invoice connection not found" });
      }

      res.json({ message: "E-invoice connection deleted successfully" });
    } catch (error) {
      console.error("E-invoice connection deletion error:", error);
      res.status(500).json({ message: "Failed to delete e-invoice connection" });
    }
  });

  // Menu Analysis API
  app.get("/api/menu-analysis", async (req, res) => {
    try {
      const { startDate, endDate, search, categoryId, productType } = req.query;

      // Build query conditions
      const conditions = [];

      if (startDate && endDate) {
        conditions.push(
          sql`${orders.createdAt} >= ${startDate} AND ${orders.createdAt} <= ${endDate + ' 23:59:59'}`
        );
      }

      if (search) {
        conditions.push(
          sql`${products.name} ILIKE ${'%' + search + '%'}`
        );
      }

      if (categoryId && categoryId !== 'all') {
        conditions.push(eq(products.categoryId, parseInt(categoryId as string)));
      }

      if (productType && productType !== 'all') {
          conditions.push(eq(products.productType, productType as string));
        }

      // Get order items with product and category info
      let orderItemsQuery = db
        .select({
          productId: orderItems.productId,
          quantity: orderItems.quantity,
          totalPrice: orderItems.totalPrice,
          product: {
            id: products.id,
            name: products.name,
            price: products.price,
            categoryId: products.categoryId,
            productType: products.productType,
          },
          category: {
            id: categories.id,
            name: categories.name,
          }
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .innerJoin(orders, eq(orderItems.orderId, orders.id));

      // Only add where clause if there are conditions
      if (conditions.length > 0) {
        const whereCondition = conditions.reduce((acc, condition, index) => 
          index === 0 ? condition : sql`${acc} AND ${condition}`, sql``
        );
        orderItemsQuery = orderItemsQuery.where(whereCondition);
      }

      const orderItemsResult = await orderItemsQuery;

      // Initialize default values
      let totalRevenue = 0;
      let totalQuantity = 0;
      let categoryStats = [];
      let productStats = [];
      let topSellingProducts = [];
      let topRevenueProducts = [];

      // Process data if we have results
      if (orderItemsResult && orderItemsResult.length > 0) {
        // Calculate totals
        totalRevenue = orderItemsResult.reduce((sum, item) => sum + parseFloat(item.totalPrice || '0'), 0);
        totalQuantity = orderItemsResult.reduce((sum, item) => sum + (item.quantity || 0), 0);

        // Group by category
        const categoryStatsMap = new Map();
        const productStatsMap = new Map();

        orderItemsResult.forEach(item => {
          if (!item.category || !item.product) return;

          const categoryKey = item.category.id;
          const productKey = item.product.id;

          // Category stats
          if (!categoryStatsMap.has(categoryKey)) {
            categoryStatsMap.set(categoryKey, {
              category: item.category,
              revenue: 0,
              quantity: 0,
              productCount: new Set()
            });
          }
          const categoryStatsItem = categoryStatsMap.get(categoryKey);
          categoryStatsItem.revenue += parseFloat(item.totalPrice || '0');
          categoryStatsItem.quantity += item.quantity || 0;
          categoryStatsItem.productCount.add(item.product.id);

          // Product stats
          if (!productStatsMap.has(productKey)) {
            productStatsMap.set(productKey, {
              product: item.product,
              revenue: 0,
              quantity: 0
            });
          }
          const productStatsItem = productStatsMap.get(productKey);
          productStatsItem.revenue += parseFloat(item.totalPrice || '0');
          productStatsItem.quantity += item.quantity || 0;
        });

        // Convert to arrays and add productCount
        categoryStats = Array.from(categoryStatsMap.values()).map(cat => ({
          ...cat,
          productCount: cat.productCount.size
        }));

        productStats = Array.from(productStatsMap.values());

        // Sort products by quantity and revenue
        topSellingProducts = [...productStats].sort((a, b) => b.quantity - a.quantity);
        topRevenueProducts = [...productStats].sort((a, b) => b.revenue - a.revenue);
      }

      res.json({
        totalRevenue,
        totalQuantity,
        categoryStats,
        productStats,
        topSellingProducts,
        topRevenueProducts
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
        topRevenueProducts: []
      });
    }
  });

  // Customer Reports APIs
  app.get("/api/customer-debts", async (req, res) => {
    try {
      const { startDate, endDate, customerId } = req.query;

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
          phone: customers.phone
        })
        .from(customers)
        .where(eq(customers.status, 'active'));

      // Filter by customer if specified
      let filteredDebts = customerDebts;
      if (customerId) {
        filteredDebts = customerDebts.filter(debt => debt.id === parseInt(customerId as string));
      }

      res.json(filteredDebts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer debts" });
    }
  });

  app.get("/api/customer-sales", async (req, res) => {
    try {
      const { startDate, endDate, customerId } = req.query;

      // Get customer sales data from database
      const customerSales = await db
        .select({
          id: customers.id,
          customerCode: customers.customerId,
          customerName: customers.name,
          totalSales: customers.totalSpent,
          visitCount: customers.visitCount,
          averageOrder: sql<number>`CASE WHEN ${customers.visitCount} > 0 THEN ${customers.totalSpent} / ${customers.visitCount} ELSE 0 END`,
          phone: customers.phone
        })
        .from(customers)
        .where(eq(customers.status, 'active'));

      // Filter by customer if specified
      let filteredSales = customerSales;
      if (customerId) {
        filteredSales = customerSales.filter(sale => sale.id === parseInt(customerId as string));
      }

      res.json(filteredSales);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer sales" });
    }
  });

  // Bulk create products
  app.post("/api/products/bulk", async (req, res) => {
    try {
      const { products: productList } = req.body;

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
          if (productData.categoryId === undefined || productData.categoryId === null) missingFields.push("categoryId");

          if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
          }

          // Validate data types
          if (isNaN(parseFloat(productData.price))) {
            throw new Error(`Invalid price: ${productData.price}`);
          }

          if (isNaN(parseInt(productData.categoryId))) {
            throw new Error(`Invalid categoryId: ${productData.categoryId}`);
          }

          const [product] = await db.insert(products).values({
            name: productData.name,
            sku: productData.sku,
            price: productData.price.toString(),
            stock: parseInt(productData.stock) || 0,
            categoryId: parseInt(productData.categoryId),
            imageUrl: productData.imageUrl || null,
            taxRate: productData.taxRate ? productData.taxRate.toString() : "8.00",
          }).returning();

          console.log(`Successfully created product: ${product.name}`);
          results.push({ success: true, product });
          successCount++;
        } catch (error) {
          const errorMessage = error.message || "Unknown error";
          console.error(`Error creating product ${productData.name || 'Unknown'}:`, errorMessage);
          console.error("Product data:", JSON.stringify(productData, null, 2));

          results.push({ 
            success: false, 
            error: errorMessage, 
            data: productData,
            productName: productData.name || 'Unknown'
          });
          errorCount++;
        }
      }

      res.json({
        success: successCount,
        errors: errorCount,
        results,
        message: `${successCount} sản phẩm đã được tạo thành công${errorCount > 0 ? `, ${errorCount} sản phẩm lỗi` : ''}`
      });
    } catch (error) {
      console.error("Bulk products creation error:", error);
      res.status(500).json({ error: "Failed to create products" });
    }
  });

  // Employee routes
  app.get("/api/employees", async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  // Employee sales report data
  app.get("/api/employee-sales", async (req, res) => {
    try {
      const { startDate, endDate, employeeId } = req.query;

      let query = db
        .select({
          employeeName: transactionsTable.cashierName,
          total: transactionsTable.total,
          createdAt: transactionsTable.createdAt
        })
        .from(transactionsTable);

            if (startDate && endDate) {
        query = query.where(
          and(
            gte(transactionsTable.createdAt, startDate as string),
            lte(transactionsTable.createdAt, endDate as string)
          )
        );
      }

      if (employeeId && employeeId !== 'all') {
        query = query.where(eq(transactionsTable.cashierName, employeeId as string));
      }

      const salesData = await query;
      res.json(salesData);
    } catch (error) {
      console.error('Error fetching employee sales:', error);
      res.status(500).json({ message: "Failed to fetch employee sales data" });
    }
  });

  // Sales channel sales data
  // Sales Channel Sales API
app.get('/api/sales-channel-sales/:startDate/:endDate/:seller/:channel', async (req, res) => {
  try {
    const { startDate, endDate, seller, channel } = req.params;

    // Use storage instead of direct db queries
    const orders = await storage.getOrders();
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.orderedAt);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const dateMatch = orderDate >= start && orderDate <= end;
      const statusMatch = order.status === 'paid';
      const sellerMatch = seller === 'all' || order.employeeId?.toString() === seller;
      const channelMatch = channel === 'all' || order.salesChannel === channel;

      return dateMatch && statusMatch && sellerMatch && channelMatch;
    });

    const salesData = [{
      salesChannelName: 'Direct Sales',
      revenue: filteredOrders.reduce((sum, order) => sum + Number(order.total), 0),
      returnValue: 0,
      netRevenue: filteredOrders.reduce((sum, order) => sum + Number(order.total), 0)
    }];

    res.json(salesData);
  } catch (error) {
    console.error('Error fetching sales channel sales data:', error);
    res.status(500).json({ error: 'Failed to fetch sales channel sales data' });
  }
});

// Sales Channel Profit API
app.get('/api/sales-channel-profit/:startDate/:endDate/:seller/:channel', async (req, res) => {
  try {
    const { startDate, endDate, seller, channel } = req.params;

    // Use storage instead of direct db queries
    const orders = await storage.getOrders();
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.orderedAt);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const dateMatch = orderDate >= start && orderDate <= end;
      const statusMatch = order.status === 'paid';
      const sellerMatch = seller === 'all' || order.employeeId?.toString() === seller;
      const channelMatch = channel === 'all' || order.salesChannel === channel;

      return dateMatch && statusMatch && sellerMatch && channelMatch;
    });

    const totalAmount = filteredOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const profitData = [{
      salesChannelName: 'Direct Sales',
      totalAmount: totalAmount,
      discount: 0,
      revenue: totalAmount,
      returnValue: 0,
      netRevenue: totalAmount,
      totalCost: totalAmount * 0.6,
      grossProfit: totalAmount * 0.4,
      platformFee: 0,
      netProfit: totalAmount * 0.4
    }];

    res.json(profitData);
  } catch (error) {
    console.error('Error fetching sales channel profit data:', error);
    res.status(500).json({ error: 'Failed to fetch sales channel profit data' });
  }
});

  // Sales channel sales data
  app.get("/api/sales-channel-sales/:startDate/:endDate/:sellerId/:salesChannel", async (req, res) => {
    try {
      const { startDate, endDate, sellerId, salesChannel } = req.params;

      let query = `
        SELECT 
          COALESCE(t.salesChannel, 'Bán trực tiếp') as salesChannelName,
          e.name as sellerName,
          SUM(t.totalAmount) as revenue,
          SUM(COALESCE(t.refundAmount, 0)) as returnValue,
          SUM(t.totalAmount - COALESCE(t.refundAmount, 0)) as netRevenue
        FROM transactions t
        LEFT JOIN employees e ON t.employeeId = e.id
        WHERE DATE(t.createdAt) BETWEEN ? AND ?
      `;

      const params = [startDate, endDate];

      if (sellerId !== 'all') {
        query += ' AND t.employeeId = ?';
        params.push(sellerId);
      }

      if (salesChannel !== 'all') {
        if (salesChannel === 'direct') {
          query += ' AND (t.salesChannel IS NULL OR t.salesChannel = "Bán trực tiếp")';
        } else {
          query += ' AND t.salesChannel IS NOT NULL AND t.salesChannel != "Bán trực tiếp"';
        }
      }

      query += ' GROUP BY COALESCE(t.salesChannel, "Bán trực tiếp"), t.employeeId ORDER BY netRevenue DESC';

      const salesData = await new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      res.json(salesData);
    } catch (error) {
      console.error("Error fetching sales channel sales data:", error);
      res.status(500).json({ error: "Failed to fetch sales channel sales data" });
    }
  });

  // Sales channel profit data
  app.get("/api/sales-channel-profit/:startDate/:endDate/:sellerId/:salesChannel", async (req, res) => {
    try {
      const { startDate, endDate, sellerId, salesChannel } = req.params;

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

      if (sellerId !== 'all') {
        query += ' AND t.employeeId = ?';
        params.push(sellerId);
      }

      if (salesChannel !== 'all') {
        if (salesChannel === 'direct') {
          query += ' AND (t.salesChannel IS NULL OR t.salesChannel = "Bán trực tiếp")';        } else {
          query += ' AND t.salesChannel IS NOT NULL AND t.salesChannel != "Bán trực tiếp"';
        }
      }

      query += ' GROUP BY COALESCE(t.salesChannel, "Bán trực tiếp"), t.employeeId ORDER BY netProfit DESC';

      const profitData = await new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      res.json(profitData);
    } catch (error) {
      console.error("Error fetching sales channel profit data:", error);
      res.status(500).json({ error: "Failed to fetch sales channel profit data" });
    }
  });

  // Sales channel products data
  app.get("/api/sales-channel-products/:startDate/:endDate/:sellerId/:salesChannel/:productSearch/:productType/:categoryId", async (req, res) => {
    try {
      const { startDate, endDate, sellerId, salesChannel, productSearch, productType, categoryId } = req.params;

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

      if (sellerId !== 'all') {
        query += ' AND t.employeeId = ?';
        params.push(sellerId);
      }

      if (salesChannel !== 'all') {
        if (salesChannel === 'direct') {
          query += ' AND (t.salesChannel IS NULL OR t.salesChannel = "Bán trực tiếp")';
        } else {
          query += ' AND t.salesChannel IS NOT NULL AND t.salesChannel != "Bán trực tiếp"';
        }
      }

      if (productSearch !== 'all' && productSearch) {
        query += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
        params.push(`%${productSearch}%`, `%${productSearch}%`);
      }

      if (productType !== 'all') {
        query += ' AND p.type = ?';
        params.push(productType);
      }

      if (categoryId !== 'all') {
        query += ' AND p.categoryId = ?';
        params.push(categoryId);
      }

      query += ' GROUP BY COALESCE(t.salesChannel, "Bán trực tiếp"), t.employeeId, p.id ORDER BY netRevenue DESC';

      const productsData = await new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      res.json(productsData);
    } catch (error) {
      console.error("Error fetching sales channel products data:", error);
      res.status(500).json({ error: "Failed to fetch sales channel products data" });
    }
  });

  // Financial report endpoints
  app.get("/api/financial-summary/:period/:year/:month?/:quarter?", async (req, res) => {
    try {
      const { period, year, month, quarter } = req.params;

      // Get transactions for financial calculations
      const transactions = await storage.getTransactions();

      let filteredTransactions = transactions.filter(transaction => {
        const date = new Date(transaction.createdAt);
        const transactionYear = date.getFullYear();

        if (period === 'yearly') {
          return transactionYear === parseInt(year);
        } else if (period === 'monthly') {
          const transactionMonth = date.getMonth() + 1;
          return transactionYear === parseInt(year) && transactionMonth === parseInt(month);
        } else if (period === 'quarterly') {
          const transactionQuarter = Math.floor(date.getMonth() / 3) + 1;
          return transactionYear === parseInt(year) && transactionQuarter === parseInt(quarter);
        }
        return false;
      });

      // Calculate financial metrics
      const totalIncome = filteredTransactions.reduce((sum, t) => sum + Number(t.total), 0);
      const totalExpenses = totalIncome * 0.6; // Mock expense calculation (60% of income)
      const grossProfit = totalIncome - totalExpenses;
      const operatingExpenses = totalIncome * 0.15; // Mock operating expenses (15% of income)
      const netIncome = grossProfit - operatingExpenses;
      const profitMargin = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0;

      const summary = {
        totalIncome,
        totalExpenses,
        grossProfit,
        operatingExpenses,
        netIncome,
        profitMargin,
        transactionCount: filteredTransactions.length
      };

      res.json(summary);
    } catch (error) {
      console.error("Error fetching financial summary:", error);
      res.status(500).json({ error: "Failed to fetch financial summary" });
    }
  });

  app.get("/api/income-breakdown/:period/:year/:month?/:quarter?", async (req, res) => {
    try {
      const { period, year, month, quarter } = req.params;

      const transactions = await storage.getTransactions();

      let filteredTransactions = transactions.filter(transaction => {
        const date = new Date(transaction.createdAt);
        const transactionYear = date.getFullYear();

        if (period === 'yearly') {
          return transactionYear === parseInt(year);
        } else if (period === 'monthly') {
          const transactionMonth = date.getMonth() + 1;
          return transactionYear === parseInt(year) && transactionMonth === parseInt(month);
        } else if (period === 'quarterly') {
          const transactionQuarter = Math.floor(date.getMonth() / 3) + 1;
          return transactionYear === parseInt(year) && transactionQuarter === parseInt(quarter);
        }
        return false;
      });

      // Group by payment method
      const incomeByMethod = {};
      filteredTransactions.forEach(transaction => {
        const method = transaction.paymentMethod || 'cash';
        incomeByMethod[method] = (incomeByMethod[method] || 0) + Number(transaction.total);
      });

      const breakdown = Object.entries(incomeByMethod).map(([method, amount]) => ({
        category: method,
        amount: amount,
        percentage: filteredTransactions.length > 0 ? (amount / filteredTransactions.reduce((sum, t) => sum + Number(t.total), 0)) * 100 : 0
      }));

      res.json(breakdown);
    } catch (error) {
      console.error("Error fetching income breakdown:", error);
      res.status(500).json({ error: "Failed to fetch income breakdown" });
    }
  });

  app.get("/api/expense-breakdown/:period/:year/:month?/:quarter?", async (req, res) => {
    try {
      // Mock expense data since we don't have a dedicated expenses table
      const mockExpenses = [
        { category: 'Cost of Goods Sold', amount: 2500000, percentage: 60 },
        { category: 'Rent', amount: 500000, percentage: 12 },
        { category: 'Utilities', amount: 200000, percentage: 5 },
        { category: 'Staff Salaries', amount: 800000, percentage: 19 },
        { category: 'Marketing', amount: 100000, percentage: 2 },
        { category: 'Other', amount: 83333, percentage: 2 }
      ];

      res.json(mockExpenses);
    } catch (error) {
      console.error("Error fetching expense breakdown:", error);
      res.status(500).json({ error: "Failed to fetch expense breakdown" });
    }
  });

  app.get("/api/cash-flow/:period/:year/:month?/:quarter?", async (req, res) => {
    try {
      const { period, year, month, quarter } = req.params;

      const transactions = await storage.getTransactions();

      let filteredTransactions = transactions.filter(transaction => {
        const date = new Date(transaction.createdAt);
        const transactionYear = date.getFullYear();

        if (period === 'yearly') {
          return transactionYear === parseInt(year);
        } else if (period === 'monthly') {
          const transactionMonth = date.getMonth() + 1;
          return transactionYear === parseInt(year) && transactionMonth === parseInt(month);
        } else if (period === 'quarterly') {
          const transactionQuarter = Math.floor(date.getMonth() / 3) + 1;
          return transactionYear === parseInt(year) && transactionQuarter === parseInt(quarter);
        }
        return false;
      });

      const totalIncome = filteredTransactions.reduce((sum, t) => sum + Number(t.total), 0);

      // Mock cash flow calculations
      const operatingCashFlow = totalIncome * 0.25; // 25% of income
      const investingCashFlow = -totalIncome * 0.05; // 5% negative (investments)
      const financingCashFlow = totalIncome * 0.02; // 2% positive (financing)
      const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;

      const cashFlow = {
        operatingCashFlow,
        investingCashFlow,
        financingCashFlow,
        netCashFlow
      };

      res.json(cashFlow);
    } catch (error) {
      console.error("Error fetching cash flow:", error);
      res.status(500).json({ error: "Failed to fetch cash flow" });
    }
  });

  // QR Payment API proxy endpoint
  app.post("/api/pos/create-qr", async (req, res) => {
    // Stock update error
    try {
      const { bankCode, clientID } = req.query;
      const body = req.body;

      console.log('CreateQRPos request:', { bankCode, clientID, body });

      // Use external server URL
      const apiBaseUrl = process.env.QR_API_BASE_URL || 'http://1.55.212.135:9335';
      const response = await fetch(`${apiBaseUrl}/api/CreateQRPos?bankCode=${bankCode}&clientID=${clientID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        console.error('CreateQRPos API error:', response.status, response.statusText);
        return res.status(response.status).json({ 
          error: 'Failed to create QR payment',
          details: `API returned ${response.status}: ${response.statusText}`
        });
      }

      const result = await response.json();
      console.log('CreateQRPos response:', result);

      res.json(result);
    } catch (error) {
      console.error('CreateQRPos proxy error:', error);
      res.status(500).json({ 
        error: 'Failed to create QR payment',
        details: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}