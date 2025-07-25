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
} from "@shared/schema";
import { initializeSampleData, db } from "./db";
import { z } from "zod";
import { eq, desc, asc, and, or, like, count, sum, gte, lt } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize sample data
  await initializeSampleData();

  // Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Products
  app.get("/api/products", async (req, res) => {
    try {
      const { category, search } = req.query;
      let products;

      if (search) {
        products = await storage.searchProducts(search as string);
      } else if (category && category !== "all") {
        products = await storage.getProductsByCategory(
          parseInt(category as string),
        );
      } else {
        products = await storage.getProducts();
      }

      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
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
      const validatedData = insertProductSchema.parse(req.body);

      // Check if SKU already exists
      const existingProduct = await storage.getProductBySku(validatedData.sku);
      if (existingProduct) {
        return res.status(409).json({ 
          message: "Product with this SKU already exists",
          code: "DUPLICATE_SKU"
        });
      }

      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product" });
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
      res.status(500).json({ message: "Failed to delete product" });
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

  app.post("/api/products/bulk", async (req, res) => {
    try {
      const { products } = req.body;
      
      if (!Array.isArray(products)) {
        return res.status(400).json({ message: "Products must be an array" });
      }

      const results = [];
      const errors = [];

      for (const productData of products) {
        try {
          const validatedData = insertProductSchema.parse(productData);
          const product = await storage.createProduct(validatedData);
          results.push(product);
        } catch (error) {
          errors.push({
            product: productData,
            error: error instanceof z.ZodError ? error.errors : "Failed to create product"
          });
        }
      }

      res.json({
        success: results.length,
        failed: errors.length,
        results,
        errors
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to bulk create products" });
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

      let whereClause = {};
      if (date && typeof date === 'string') {
        // Filter by specific date
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        whereClause = {
          clockIn: {
            gte: startOfDay.toISOString(),
            lt: endOfDay.toISOString()
          }
        };
      }

      const attendance = await db.select().from(attendanceRecords)
        .where(whereClause.clockIn ? 
          and(
            gte(attendanceRecords.clockIn, whereClause.clockIn.gte),
            lt(attendanceRecords.clockIn, whereClause.clockIn.lt)
          ) : 
          undefined
        )
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

  app.get("/api/order-items/:orderId", async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);

      if (isNaN(orderId)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }

      const items = await storage.getOrderItems(orderId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order items" });
    }
  });

  app.post("/api/orders/:id/items", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const itemsData = req.body.map((item: any) =>
        insertOrderItemSchema.parse(item),
      );

      const items = await storage.addOrderItems(orderId, itemsData);
      res.status(201).json(items);
    } catch (error) {
      res.status(400).json({ message: "Failed to add order items" });
    }
  });

  // Inventory Management
  app.post("/api/inventory/update-stock", async (req, res) => {
    try {
      const stockUpdateSchema = z.object({
        productId: z.number(),
        quantity: z.number().min(1),
        type: z.enum(["add", "subtract", "set"]),
        notes: z.string().optional(),
      });

      const { productId, quantity, type, notes } = stockUpdateSchema.parse(
        req.body,
      );
      const product = await storage.updateInventoryStock(
        productId,
        quantity,
        type,
        notes,
      );

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid stock update data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update stock" });
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

  app.post("/api/suppliers", async (req, res) => {
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

  app.put("/api/suppliers/:id", async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}