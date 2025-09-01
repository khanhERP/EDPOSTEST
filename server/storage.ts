import {
  categories,
  products,
  transactions,
  transactionItems,
  employees,
  attendanceRecords,
  tables,
  orders,
  orderItems,
  storeSettings,
  suppliers,
  type Category,
  type Product,
  type Transaction,
  type TransactionItem,
  type Employee,
  type AttendanceRecord,
  type Table,
  type Order,
  type OrderItem,
  type StoreSettings,
  type InsertCategory,
  type InsertProduct,
  type InsertTransaction,
  type InsertTransactionItem,
  type InsertEmployee,
  type InsertAttendance,
  type InsertTable,
  type InsertOrder,
  type InsertOrderItem,
  type InsertStoreSettings,
  type Receipt,
  type InsertSupplier,
  customers,
  pointTransactions,
  type Customer,
  type InsertCustomer,
  type PointTransaction,
  type InsertPointTransaction,
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, and, gte, lte, or, sql, desc, not, like } from "drizzle-orm";

export interface IStorage {
  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(
    id: number,
    updateData: Partial<InsertCategory>,
  ): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  // Products
  getProducts(): Promise<Product[]>;
  getProductsByCategory(
    categoryId: number,
    includeInactive?: boolean,
  ): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  searchProducts(query: string, includeInactive?: boolean): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(
    id: number,
    product: Partial<InsertProduct>,
  ): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  deleteInactiveProducts(): Promise<number>;
  updateProductStock(
    id: number,
    quantity: number,
  ): Promise<Product | undefined>;

  // Inventory Management
  updateInventoryStock(
    productId: number,
    quantity: number,
    type: "add" | "subtract" | "set",
    notes?: string,
  ): Promise<Product | undefined>;

  // Transactions
  createTransaction(
    transaction: InsertTransaction,
    items: InsertTransactionItem[],
  ): Promise<Receipt>;
  getTransaction(id: number): Promise<Receipt | undefined>;
  getTransactionByTransactionId(
    transactionId: string,
  ): Promise<Receipt | undefined>;
  getTransactions(): Promise<Transaction[]>;

  // Employees
  getEmployees(): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(
    id: number,
    employee: Partial<InsertEmployee>,
  ): Promise<Employee | undefined>;
  deleteEmployee(id: number): Promise<boolean>;
  getNextEmployeeId(): Promise<string>;

  // Attendance
  getAttendanceRecords(
    employeeId?: number,
    date?: string,
  ): Promise<AttendanceRecord[]>;
  getAttendanceRecord(id: number): Promise<AttendanceRecord | undefined>;
  getTodayAttendance(employeeId: number): Promise<AttendanceRecord | undefined>;
  clockIn(employeeId: number, notes?: string): Promise<AttendanceRecord>;
  clockOut(attendanceId: number): Promise<AttendanceRecord | undefined>;
  startBreak(attendanceId: number): Promise<AttendanceRecord | undefined>;
  endBreak(attendanceId: number): Promise<AttendanceRecord | undefined>;
  updateAttendanceStatus(
    id: number,
    status: string,
  ): Promise<AttendanceRecord | undefined>;

  // Tables
  getTables(): Promise<Table[]>;
  getTable(id: number): Promise<Table | undefined>;
  getTableByNumber(tableNumber: string): Promise<Table | undefined>;
  createTable(table: InsertTable): Promise<Table>;
  updateTable(
    id: number,
    table: Partial<InsertTable>,
  ): Promise<Table | undefined>;
  updateTableStatus(id: number, status: string): Promise<Table | undefined>;
  deleteTable(id: number): Promise<boolean>;

  // Orders
  getOrders(tableId?: number, status?: string): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  updateOrder(
    id: number,
    order: Partial<InsertOrder>,
  ): Promise<Order | undefined>;
  updateOrderStatus(id: number | string, status: string): Promise<Order | undefined>;
  addOrderItems(
    orderId: number,
    items: InsertOrderItem[],
  ): Promise<OrderItem[]>;
  removeOrderItem(itemId: number): Promise<boolean>;
  getOrderItems(orderId: number): Promise<OrderItem[]>;

  // Store Settings
  getStoreSettings(): Promise<StoreSettings>;
  updateStoreSettings(
    settings: Partial<InsertStoreSettings>,
  ): Promise<StoreSettings>;

  // Suppliers
  getSuppliers(): Promise<any>;
  getSupplier(id: number): Promise<any>;
  getSuppliersByStatus(status: string): Promise<any>;
  searchSuppliers(query: string): Promise<any>;
  createSupplier(data: InsertSupplier): Promise<any>;
  updateSupplier(id: number, data: Partial<InsertSupplier>): Promise<any>;
  deleteSupplier(id: number): Promise<boolean>;

  // Customers
  getCustomers(): Promise<Customer[]>;
  searchCustomers(query: string): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByCustomerId(customerId: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(
    id: number,
    customer: Partial<InsertCustomer>,
  ): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<boolean>;
  updateCustomerVisit(
    id: number,
    amount: number,
    points: number,
  ): Promise<Customer | undefined>;

  // Point Management
  getCustomerPoints(
    customerId: number,
  ): Promise<{ points: number } | undefined>;
  updateCustomerPoints(
    customerId: number,
    points: number,
    description: string,
    type: "earned" | "redeemed" | "adjusted",
    employeeId?: number,
    orderId?: number,
  ): Promise<PointTransaction>;
  getPointHistory(
    customerId: number,
    limit?: number,
  ): Promise<PointTransaction[]>;

  getAllPointTransactions(limit?: number): Promise<PointTransaction[]>;

  getMembershipThresholds(): Promise<{ GOLD: number; VIP: number }>;
  updateMembershipThresholds(thresholds: {
    GOLD: number;
    VIP: number;
  }): Promise<{ GOLD: number; VIP: number }>;
  recalculateAllMembershipLevels(
    goldThreshold: number,
    vipThreshold: number,
  ): Promise<void>;

  getAllProducts(includeInactive?: boolean): Promise<Product[]>;
  getActiveProducts(): Promise<Product[]>;

  // E-invoice connections
  getEInvoiceConnections(): Promise<any[]>;
  getEInvoiceConnection(id: number): Promise<any>;
  createEInvoiceConnection(data: any): Promise<any>;
  updateEInvoiceConnection(id: number, data: any): Promise<any>;
  deleteEInvoiceConnection(id: number): Promise<boolean>;

  getEmployeeByEmail(email: string): Promise<Employee | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getCategories(tenantDb?: any): Promise<Category[]> {
    const database = tenantDb || db;
    return await database.select().from(categories);
  }

  async createCategory(insertCategory: InsertCategory, tenantDb?: any): Promise<Category> {
    const database = tenantDb || db;
    const [category] = await database
      .insert(categories)
      .values(insertCategory)
      .returning();
    return category;
  }

  async updateCategory(
    id: number,
    updateData: Partial<InsertCategory>,
    tenantDb?: any,
  ): Promise<Category> {
    const database = tenantDb || db;
    const [category] = await database
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, id))
      .returning();
    return category;
  }

  async deleteCategory(id: number, tenantDb?: any): Promise<void> {
    const database = tenantDb || db;
    await database.delete(categories).where(eq(categories.id, id));
  }

  async getProducts(tenantDb?: any): Promise<Product[]> {
    const database = tenantDb || db;
    const result = await database
      .select()
      .from(products)
      .where(eq(products.isActive, true));
    // Ensure productType has a default value if missing and afterTaxPrice is properly returned
    return result.map((product) => ({
      ...product,
      productType: product.productType || 1,
      afterTaxPrice: product.afterTaxPrice || null
    }));
  }

  async getProductsByCategory(
    categoryId: number,
    includeInactive: boolean = false,
    tenantDb?: any,
  ): Promise<Product[]> {
    const database = tenantDb || db;
    let whereCondition = eq(products.categoryId, categoryId);

    if (!includeInactive) {
      whereCondition = and(whereCondition, eq(products.isActive, true));
    }

    const result = await database
      .select()
      .from(products)
      .where(whereCondition)
      .orderBy(products.name);

    // Ensure afterTaxPrice is properly returned
    return result.map((product) => ({
      ...product,
      afterTaxPrice: product.afterTaxPrice || null
    }));
  }

  async getProduct(id: number, tenantDb?: any): Promise<Product | undefined> {
    const database = tenantDb || db;
    const [product] = await database
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.isActive, true)));
    return product || undefined;
  }

  async getProductBySku(sku: string, tenantDb?: any): Promise<Product | undefined> {
    const database = tenantDb || db;
    const [product] = await database
      .select()
      .from(products)
      .where(and(eq(products.sku, sku), eq(products.isActive, true)));
    return product || undefined;
  }

  async searchProducts(
    query: string,
    includeInactive: boolean = false,
    tenantDb?: any,
  ): Promise<Product[]> {
    const database = tenantDb || db;
    let whereCondition = or(
      ilike(products.name, `%${query}%`),
      ilike(products.sku, `%${query}%`)
    );

    if (!includeInactive) {
      whereCondition = and(whereCondition, eq(products.isActive, true));
    }

    return await database.select().from(products).where(whereCondition);
  }

  async createProduct(insertProduct: InsertProduct, tenantDb?: any): Promise<Product> {
    try {
      console.log("Storage: Creating product with data:", insertProduct);
      const database = tenantDb || db;

      const productData = {
        name: insertProduct.name,
        sku: insertProduct.sku,
        price: insertProduct.price,
        stock: insertProduct.stock,
        categoryId: insertProduct.categoryId,
        productType: insertProduct.productType || 1,
        trackInventory: insertProduct.trackInventory !== false,
        imageUrl: insertProduct.imageUrl || null,
        isActive: true,
      };

      console.log("Storage: Inserting product data:", productData);

      const [product] = await database
        .insert(products)
        .values(productData)
        .returning();

      console.log("Storage: Product created successfully:", product);
      return product;
    } catch (error) {
      console.error("Storage: Error creating product:", error);
      throw error;
    }
  }

  async updateProduct(
    id: number,
    updateData: Partial<InsertProduct>,
    tenantDb?: any,
  ): Promise<Product | undefined> {
    const database = tenantDb || db;
    const [product] = await database
      .update(products)
      .set({
        ...updateData,
        imageUrl: updateData.imageUrl || null,
      })
      .where(and(eq(products.id, id), eq(products.isActive, true)))
      .returning();
    return product || undefined;
  }

  async deleteProduct(id: number, tenantDb?: any): Promise<boolean> {
    try {
      const database = tenantDb || db;

      // Check if product exists in transactions
      const transactionItemsCheck = await database
        .select()
        .from(transactionItems)
        .where(eq(transactionItems.productId, id))
        .limit(1);

      if (transactionItemsCheck.length > 0) {
        throw new Error(
          "Cannot delete product: it has been used in transactions",
        );
      }

      // Check if product exists in order items
      const orderItemsCheck = await database
        .select()
        .from(orderItems)
        .where(eq(orderItems.productId, id))
        .limit(1);

      if (orderItemsCheck.length > 0) {
        throw new Error("Cannot delete product: it has been used in orders");
      }

      // If no references found, delete the product
      const result = await database
        .delete(products)
        .where(eq(products.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error("Error deleting product:", error);
      throw error;
    }
  }

  async deleteInactiveProducts(tenantDb?: any): Promise<number> {
    const database = tenantDb || db;
    const result = await database
      .delete(products)
      .where(eq(products.isActive, false))
      .returning();
    return result.length;
  }

  async updateProductStock(
    id: number,
    quantity: number,
    tenantDb?: any,
  ): Promise<Product | undefined> {
    const database = tenantDb || db;

    try {
      console.log(`🔍 Starting stock update for product ID: ${id}, quantity change: ${quantity}`);

      const [product] = await database
        .select()
        .from(products)
        .where(eq(products.id, id));

      if (!product) {
        console.error(`❌ Product not found for stock update: ID ${id}`);
        throw new Error(`Product with ID ${id} not found`);
      }

      console.log(`📋 Product found: ${product.name}, current stock: ${product.stock}, tracks inventory: ${product.trackInventory}`);

      // Check if product tracks inventory before updating
      if (!product.trackInventory) {
        console.log(`⏭️ Product ${product.name} does not track inventory - skipping stock update`);
        return product; // Return the original product without updating stock
      }

      const currentStock = product.stock || 0;
      // Đơn giản: chỉ cần lấy tổng tồn kho hiện tại trừ đi số lượng bán
      const newStock = currentStock - Math.abs(quantity);

      // Log the stock calculation
      console.log(`📦 Simple stock calculation for ${product.name} (ID: ${id}):`);
      console.log(`   - Current stock: ${currentStock}`);
      console.log(`   - Quantity to subtract: ${Math.abs(quantity)}`);
      console.log(`   - New stock: ${newStock}`);

      // Check if we have sufficient stock
      if (newStock < 0) {
        const errorMsg = `Insufficient stock for ${product.name}. Available: ${currentStock}, Required: ${Math.abs(quantity)}`;
        console.error(`❌ ${errorMsg}`);
        throw new Error(errorMsg);
      }

      const [updatedProduct] = await database
        .update(products)
        .set({ stock: newStock })
        .where(eq(products.id, id))
        .returning();

      if (updatedProduct) {
        console.log(`✅ Stock updated successfully for ${product.name}: ${currentStock} → ${newStock}`);

        // Create inventory transaction record
        try {
          await database.execute(sql`
            INSERT INTO inventory_transactions 
            (product_id, type, quantity, previous_stock, new_stock, notes, created_at)
            VALUES (${id}, 'subtract', ${Math.abs(quantity)}, ${currentStock}, ${newStock}, 
                   'Stock deduction from sale', ${new Date().toISOString()})
          `);
          console.log(`📝 Inventory transaction recorded for ${product.name}`);
        } catch (invError) {
          console.error(`❌ Failed to record inventory transaction:`, invError);
          // Don't throw here as the stock update was successful
        }

        return updatedProduct;
      } else {
        console.error(`❌ Failed to update stock for ${product.name} - no updated product returned`);
        throw new Error(`Failed to update stock for product: ${product.name}`);
      }
    } catch (error) {
      console.error(`❌ Error updating stock for product ID ${id}:`, error);
      throw error; // Re-throw the error so the caller can handle it
    }
  }

  async createTransaction(
    insertTransaction: InsertTransaction,
    items: InsertTransactionItem[],
    tenantDb?: any,
  ): Promise<Receipt> {
    const database = tenantDb || db;
    console.log(`🔄 Creating transaction: ${insertTransaction.transactionId}`);
    console.log(`📦 Processing ${items.length} items for inventory deduction`);
    console.log(`📋 Transaction details:`, JSON.stringify(insertTransaction, null, 2));

    try {
      // Create the main transaction record
      const [transaction] = await database
        .insert(transactions)
        .values({
          ...insertTransaction,
          amountReceived: insertTransaction.amountReceived || null,
          change: insertTransaction.change || null,
        })
        .returning();

      console.log(`✅ Transaction record created with ID: ${transaction.id}`);

      const transactionItemsWithIds: TransactionItem[] = [];
      const stockUpdateResults: Array<{productName: string, success: boolean, error?: string}> = [];

      // Process each item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log(`📝 Processing item ${i + 1}/${items.length}: ${item.productName} (ID: ${item.productId}) - Qty: ${item.quantity}`);

        try {
          // Create transaction item record
          const [transactionItem] = await database
            .insert(transactionItems)
            .values({
              ...item,
              transactionId: transaction.id,
            })
            .returning();

          console.log(`✅ Transaction item created with ID: ${transactionItem.id}`);

          // Update product stock - trừ tồn kho đơn giản
          console.log(`🔢 Updating stock for product ID ${item.productId}: subtract ${item.quantity}`);

          try {
            const updatedProduct = await this.updateProductStock(item.productId, item.quantity, tenantDb);

            if (updatedProduct) {
              console.log(`✅ Stock successfully updated for ${item.productName}: New stock = ${updatedProduct.stock}`);
              stockUpdateResults.push({
                productName: item.productName,
                success: true
              });
            } else {
              const errorMsg = `Failed to update stock for ${item.productName} - no product returned`;
              console.error(`❌ ${errorMsg}`);
              stockUpdateResults.push({
                productName: item.productName,
                success: false,
                error: errorMsg
              });
            }
          } catch (stockError) {
            const errorMsg = stockError instanceof Error ? stockError.message : String(stockError);
            console.error(`❌ Stock update error for ${item.productName}:`, errorMsg);
            stockUpdateResults.push({
              productName: item.productName,
              success: false,
              error: errorMsg
            });
          }

          transactionItemsWithIds.push(transactionItem);
        } catch (itemError) {
          console.error(`❌ Error processing transaction item ${item.productName}:`, itemError);
          throw new Error(`Failed to process item ${item.productName}: ${itemError instanceof Error ? itemError.message : String(itemError)}`);
        }
      }

      // Log stock update summary
      const successfulUpdates = stockUpdateResults.filter(r => r.success);
      const failedUpdates = stockUpdateResults.filter(r => !r.success);

      console.log(`📊 Stock update summary:`);
      console.log(`   - Successful: ${successfulUpdates.length}/${items.length}`);
      console.log(`   - Failed: ${failedUpdates.length}/${items.length}`);

      if (failedUpdates.length > 0) {
        console.error(`❌ Failed stock updates:`, failedUpdates);
        // Log but don't fail the transaction - the transaction was created successfully
      }

      console.log(`✅ Transaction created successfully: ${transaction.transactionId} with ${transactionItemsWithIds.length} items`);

      return {
        ...transaction,
        items: transactionItemsWithIds,
      };
    } catch (error) {
      console.error(`❌ Error creating transaction ${insertTransaction.transactionId}:`, error);
      throw new Error(`Failed to create transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getTransaction(id: number): Promise<Receipt | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));

    if (!transaction) return undefined;

    const items = await db
      .select()
      .from(transactionItems)
      .where(eq(transactionItems.transactionId, id));

    return { ...transaction, items };
  }

  async getTransactionByTransactionId(
    transactionId: string,
  ): Promise<Receipt | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.transactionId, transactionId));

    if (!transaction) return undefined;

    const items = await db
      .select()
      .from(transactionItems)
      .where(eq(transactionItems.transactionId, transaction.id));

    return { ...transaction, items };
  }

  async getTransactions(tenantDb?: any): Promise<Transaction[]> {
    const database = tenantDb || db;
    return await database.select().from(transactions).orderBy(transactions.createdAt);
  }

  // Get next employee ID in sequence
  async getNextEmployeeId(tenantDb?: any): Promise<string> {
    const database = tenantDb || db;
    try {
      const lastEmployee = await database
        .select()
        .from(employees)
        .orderBy(desc(employees.id))
        .limit(1);

      if (lastEmployee.length === 0) {
        return "EMP-001";
      }

      // Extract number from last employee ID (EMP-001 -> 001)
      const lastId = lastEmployee[0].employeeId;
      const match = lastId.match(/EMP-(\d+)/);

      if (match) {
        const lastNumber = parseInt(match[1], 10);
        const nextNumber = lastNumber + 1;
        return `EMP-${nextNumber.toString().padStart(3, "0")}`;
      }

      // Fallback if format doesn't match
      return "EMP-001";
    } catch (error) {
      console.error("Error generating next employee ID:", error);
      return "EMP-001";
    }
  }

  // Generate next customer ID
  async getNextCustomerId(tenantDb?: any): Promise<string> {
    const database = tenantDb || db;
    try {
      // Get all customer IDs that match the CUST pattern and extract numbers
      const allCustomers = await database
        .select({ customerId: customers.customerId })
        .from(customers)
        .where(like(customers.customerId, "CUST%"));

      if (allCustomers.length === 0) {
        return "CUST001";
      }

      // Extract all numbers from existing customer IDs
      const existingNumbers = allCustomers
        .map(customer => {
          const match = customer.customerId.match(/CUST(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => num > 0)
        .sort((a, b) => b - a); // Sort descending

      // Find the highest number and increment
      const highestNumber = existingNumbers[0] || 0;
      const nextNumber = highestNumber + 1;

      return `CUST${nextNumber.toString().padStart(3, "0")}`;
    } catch (error) {
      console.error("Error generating next customer ID:", error);
      return "CUST001";
    }
  }

  // Employee methods
  async getEmployees(tenantDb?: any): Promise<Employee[]> {
    const database = tenantDb || db;
    return await database
      .select()
      .from(employees)
      .where(eq(employees.isActive, true));
  }

  async getEmployee(id: number, tenantDb?: any): Promise<Employee | undefined> {
    const database = tenantDb || db;
    const [employee] = await database
      .select()
      .from(employees)
      .where(and(eq(employees.id, id), eq(employees.isActive, true)));
    return employee || undefined;
  }

  async getEmployeeByEmployeeId(
    employeeId: string,
    tenantDb?: any,
  ): Promise<Employee | undefined> {
    const database = tenantDb || db;
    const [employee] = await database
      .select()
      .from(employees)
      .where(
        and(eq(employees.employeeId, employeeId), eq(employees.isActive, true)),
      );
    return employee || undefined;
  }

  async createEmployee(insertEmployee: InsertEmployee, tenantDb?: any): Promise<Employee> {
    const database = tenantDb || db;
    const [employee] = await database
      .insert(employees)
      .values(insertEmployee)
      .returning();
    return employee;
  }

  async updateEmployee(
    id: number,
    updateData: Partial<InsertEmployee>,
    tenantDb?: any,
  ): Promise<Employee | undefined> {
    const database = tenantDb || db;
    const [employee] = await database
      .update(employees)
      .set(updateData)
      .where(and(eq(employees.id, id), eq(employees.isActive, true)))
      .returning();
    return employee || undefined;
  }

  async deleteEmployee(id: number, tenantDb?: any): Promise<boolean> {
    const database = tenantDb || db;
    try {
      // Check if employee has attendance records
      const attendanceCheck = await database
        .select()
        .from(attendanceRecords)
        .where(eq(attendanceRecords.employeeId, id))
        .limit(1);

      if (attendanceCheck.length > 0) {
        throw new Error("Cannot delete employee: employee has attendance records");
      }

      // Check if employee has orders
      const orderCheck = await database
        .select()
        .from(orders)
        .where(eq(orders.employeeId, id))
        .limit(1);

      if (orderCheck.length > 0) {
        throw new Error("Cannot delete employee: employee has orders");
      }

      // If no references found, delete the employee
      const result = await database
        .delete(employees)
        .where(eq(employees.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error("Error deleting employee:", error);
      throw error;
    }
  }

  async getAttendanceRecords(
    employeeId?: number,
    date?: string,
  ): Promise<AttendanceRecord[]> {
    const conditions = [];

    if (employeeId) {
      conditions.push(eq(attendanceRecords.employeeId, employeeId));
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      conditions.push(
        gte(attendanceRecords.clockIn, startDate),
        lte(attendanceRecords.clockIn, endDate),
      );
    }

    if (conditions.length > 0) {
      return await db
        .select()
        .from(attendanceRecords)
        .where(and(...conditions))
        .orderBy(attendanceRecords.clockIn);
    }

    return await db
      .select()
      .from(attendanceRecords)
      .orderBy(attendanceRecords.clockIn);
  }

  async getAttendanceRecord(id: number): Promise<AttendanceRecord | undefined> {
    const [record] = await db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.id, id));
    return record || undefined;
  }

  async getTodayAttendance(
    employeeId: number,
  ): Promise<AttendanceRecord | undefined> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [record] = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employeeId),
          gte(attendanceRecords.clockIn, today),
          lte(attendanceRecords.clockIn, tomorrow),
        ),
      );
    return record || undefined;
  }

  async clockIn(employeeId: number, notes?: string): Promise<AttendanceRecord> {
    try {
      // Check if employee exists
      const [employee] = await db
        .select()
        .from(employees)
        .where(eq(employees.id, employeeId))
        .limit(1);

      if (!employee) {
        throw new Error(`Employee with ID ${employeeId} not found`);
      }

      // Check if already clocked in today
      const existingRecord = await this.getTodayAttendance(employeeId);
      if (existingRecord) {
        throw new Error('Employee already clocked in today');
      }

      const clockInTime = new Date();
      const [record] = await db
        .insert(attendanceRecords)
        .values({
          employeeId,
          clockIn: clockInTime,
          status: "present",
          notes: notes || null,
        })
        .returning();

      if (!record) {
        throw new Error('Failed to create attendance record');
      }

      return record;
    } catch (error) {
      console.error('Clock-in error:', error);
      throw error;
    }
  }

  async clockOut(attendanceId: number): Promise<AttendanceRecord | undefined> {
    const clockOutTime = new Date();
    const record = await this.getAttendanceRecord(attendanceId);
    if (!record) return undefined;

    const clockInTime = new Date(record.clockIn);
    const totalMinutes =
      (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60);
    let totalHours = totalMinutes / 60;

    // Subtract break time if any
    if (record.breakStart && record.breakEnd) {
      const breakMinutes =
        (new Date(record.breakEnd).getTime() -
          new Date(record.breakStart).getTime()) /
        (1000 * 60);
      totalHours -= breakMinutes / 60;
    }

    // Calculate overtime (assuming 8 hour work day)
    const overtime = Math.max(0, totalHours - 8);

    const [updatedRecord] = await db
      .update(attendanceRecords)
      .set({
        clockOut: clockOutTime,
        totalHours: totalHours.toFixed(2),
        overtime: overtime.toFixed(2),
      })
      .where(eq(attendanceRecords.id, attendanceId))
      .returning();

    return updatedRecord || undefined;
  }

  async startBreak(
    attendanceId: number,
  ): Promise<AttendanceRecord | undefined> {
    const [record] = await db
      .update(attendanceRecords)
      .set({ breakStart: new Date() })
      .where(eq(attendanceRecords.id, attendanceId))
      .returning();
    return record || undefined;
  }

  async endBreak(attendanceId: number): Promise<AttendanceRecord | undefined> {
    const [record] = await db
      .update(attendanceRecords)
      .set({ breakEnd: new Date() })
      .where(eq(attendanceRecords.id, attendanceId))
      .returning();
    return record || undefined;
  }

  async updateAttendanceStatus(
    id: number,
    status: string,
  ): Promise<AttendanceRecord | undefined> {
    const [record] = await db
      .update(attendanceRecords)
      .set({ status })
      .where(eq(attendanceRecords.id, id))
      .returning();
    return record || undefined;
  }

  // Tables
  async getTables(): Promise<Table[]> {
    return await db.select().from(tables).orderBy(tables.tableNumber);
  }

  async getTable(id: number): Promise<Table | undefined> {
    const [table] = await db.select().from(tables).where(eq(tables.id, id));
    return table || undefined;
  }

  async getTableByNumber(tableNumber: string): Promise<Table | undefined> {
    const [table] = await db
      .select()
      .from(tables)
      .where(eq(tables.tableNumber, tableNumber));
    return table || undefined;
  }

  async createTable(table: InsertTable): Promise<Table> {
    const [newTable] = await db.insert(tables).values(table).returning();
    return newTable;
  }

  async updateTable(
    id: number,
    table: Partial<InsertTable>,
  ): Promise<Table | undefined> {
    const [updatedTable] = await db
      .update(tables)
      .set(table)
      .where(eq(tables.id, id))
      .returning();
    return updatedTable || undefined;
  }

  async updateTableStatus(
    id: number,
    status: string,
  ): Promise<Table | undefined> {
    const [table] = await db
      .update(tables)
      .set({ status })
      .where(eq(tables.id, id))
      .returning();
    return table || undefined;
  }

  async deleteTable(id: number): Promise<boolean> {
    const result = await db.delete(tables).where(eq(tables.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Orders
  async getOrders(tableId?: number, status?: string, tenantDb?: any): Promise<Order[]> {
    const database = tenantDb || db;
    const conditions = [];

    if (tableId) {
      conditions.push(eq(orders.tableId, tableId));
    }
    if (status) {
      conditions.push(eq(orders.status, status));
    }

    if (conditions.length > 0) {
      return await database
        .select()
        .from(orders)
        .where(and(...conditions))
        .orderBy(orders.orderedAt);
    }

    return await database.select().from(orders).orderBy(orders.orderedAt);
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber));
    return order || undefined;
  }

  async createOrder(
    order: InsertOrder,
    items: InsertOrderItem[],
  ): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();

    if (items.length > 0) {
      const itemsWithOrderId = items.map((item) => ({
        ...item,
        orderId: newOrder.id,
        unitPrice: item.unitPrice.toString(),
        total: item.total.toString(),
      }));
      await db.insert(orderItems).values(itemsWithOrderId);
    }

    // Update table status to occupied
    await this.updateTableStatus(newOrder.tableId, "occupied");

    return newOrder;
  }

  async updateOrder(
    id: number,
    order: Partial<InsertOrder>,
    tenantDb?: any,
  ): Promise<Order | undefined> {
    console.log('=== UPDATING ORDER ===');
    console.log('Order ID:', id);
    console.log('Update data:', order);

    const database = tenantDb || db;

    // Get current order state before update
    const [currentOrder] = await database
      .select()
      .from(orders)
      .where(eq(orders.id, id));

    if (!currentOrder) {
      console.error(`❌ Order not found: ${id}`);
      return undefined;
    }

    // Handle field mapping - einvoiceStatus should map to einvoice_status in database
    const mappedData = { ...order };
    if (order.einvoiceStatus !== undefined) {
      mappedData.einvoiceStatus = order.einvoiceStatus;
      console.log('Mapped einvoiceStatus field:', order.einvoiceStatus);
    }

    // Add updatedAt timestamp
    mappedData.updatedAt = new Date();

    console.log('Final mapped data to update:', JSON.stringify(mappedData, null, 2));

    const [updatedOrder] = await database
      .update(orders)
      .set(mappedData)
      .where(eq(orders.id, id))
      .returning();

    if (updatedOrder) {
      console.log('✅ Order updated successfully:', {
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        einvoiceStatus: updatedOrder.einvoiceStatus,
        paymentMethod: updatedOrder.paymentMethod,
        paidAt: updatedOrder.paidAt
      });

      // If order status was updated to 'paid' or 'completed', check table status
      if ((order.status === "paid" || order.status === "completed") && updatedOrder.tableId) {
        console.log(`💳 Order ${order.status} - checking table ${updatedOrder.tableId} for release`);

        try {
          // Check for other unpaid orders on the same table (excluding current order)
          const unpaidStatuses = ["pending", "confirmed", "preparing", "ready", "served"];
          const otherUnpaidOrders = await database
                .select()
                .from(orders)
                .where(
                  and(
                    eq(orders.tableId, updatedOrder.tableId),
                    not(eq(orders.id, Number(id))), // Exclude current order
                    or(
                      ...unpaidStatuses.map(unpaidStatus => eq(orders.status, unpaidStatus))
                    )
                  )
                );

          console.log(`🔍 Unpaid orders remaining on table ${updatedOrder.tableId}:`, {
            count: otherUnpaidOrders.length,
            orders: otherUnpaidOrders.map(o => ({ 
              id: o.id, 
              status: o.status, 
              orderNumber: o.orderNumber 
            }))
          });

          // Import tables from schema
          const { tables } = await import("@shared/schema");

          // Only update table status to available if no other unpaid orders exist
          if (otherUnpaidOrders.length === 0) {
            console.log(`🔓 No unpaid orders remaining - releasing table ${updatedOrder.tableId}`);

            const [updatedTable] = await database
              .update(tables)
              .set({ 
                status: "available",
                updatedAt: new Date()
              })
              .where(eq(tables.id, updatedOrder.tableId))
              .returning();

            if (updatedTable) {
              console.log(`✅ Table ${updatedOrder.tableId} released successfully`);
            } else {
              console.error(`❌ Failed to release table ${updatedOrder.tableId}`);
            }
          } else {
            console.log(`🔒 Table ${updatedOrder.tableId} remains occupied due to ${otherUnpaidOrders.length} unpaid orders`);
          }
        } catch (tableError) {
          console.error(`❌ Error processing table status for table ${updatedOrder.tableId}:`, tableError);
        }
      }
    } else {
      console.error('❌ No order returned after update');
    }

    console.log('=== END UPDATING ORDER ===');
    return updatedOrder || undefined;
  }

  async updateOrderStatus(
    orderId: number | string,
    status: string,
    tenantDb?: any,
  ): Promise<Order | undefined> {
    console.log(`🚀 ========================================`);
    console.log(`🚀 STORAGE: updateOrderStatus FUNCTION CALLED`);
    console.log(`🚀 ========================================`);
    console.log(`=== UPDATING ORDER STATUS ===`);
    console.log(`Order ID: ${orderId}, New Status: ${status}`);
    console.log(`🔍 Function call stack:`, new Error().stack?.split('\n').slice(1, 4));
    console.log(`🔍 Function called with parameters:`, {
      id: orderId,
      idType: typeof orderId,
      status: status,
      statusType: typeof status,
      tenantDb: !!tenantDb
    });
    console.log(`🔍 Database info:`, {
      usingTenantDb: !!tenantDb,
      dbType: tenantDb ? 'tenant' : 'default',
      timestamp: new Date().toISOString()
    });

    console.log(`✅ CONFIRMATION: updateOrderStatus function HAS BEEN CALLED successfully`);
    console.log(`🔍 Process info:`, {
      processId: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    });

    console.log(`🔍 DEBUG: Input parameters validation:`, {
      orderId: orderId,
      orderIdType: typeof orderId,
      orderIdValid: !isNaN(Number(orderId)) && Number(orderId) > 0 || (typeof orderId === 'string' && orderId.startsWith('temp-')),
      newStatus: status,
      statusType: typeof status,
      statusValid: status && status.trim().length > 0
    });

    const database = tenantDb || db;

    try {
      // Handle temporary orders differently
      if (typeof orderId === 'string' && orderId.startsWith('temp-')) {
        console.log(`🔍 Handling temporary order: ${orderId}`);

        // For temporary orders, we need to find by orderNumber or create a new record
        const existingOrder = await database
          .select()
          .from(orders)
          .where(eq(orders.orderNumber, orderId))
          .limit(1);

        if (existingOrder.length > 0) {
          console.log(`🔍 Found existing temporary order:`, existingOrder[0]);
          const result = await database
            .update(orders)
            .set({
              status,
              updatedAt: new Date().toISOString()
            })
            .where(eq(orders.id, existingOrder[0].id))
            .returning();

          console.log(`✅ Temporary order status updated successfully:`, result[0]);
          return result[0];
        } else {
          console.log(`⚠️ Temporary order ${orderId} not found in database. Creating a placeholder entry.`);
          // This case should ideally not happen if temporary orders are first created in the DB.
          // However, as a fallback, we can create a placeholder or return a mock object.
          // For now, returning a mock object that signifies the status update.
          return {
            id: null, // Or a generated temp ID if needed elsewhere
            orderNumber: orderId,
            status: status,
            updatedAt: new Date().toISOString()
          } as any; // Cast to any to satisfy return type, acknowledging it's not a full Order object
        }
      } else {
        // Handle regular numeric order IDs
        console.log(`🔍 Handling regular order ID: ${orderId}`);

        // First, get the current order to know its table
        console.log(`🔍 Fetching current order with ID: ${orderId}`);
        const [currentOrder] = await database
          .select()
          .from(orders)
          .where(eq(orders.id, orderId as number));

        if (!currentOrder) {
          console.error(`❌ Order not found: ${orderId}`);
          console.log(`🔍 Attempting to fetch all orders to debug...`);
          try {
            const allOrders = await database.select().from(orders).limit(5);
            console.log(`🔍 Sample orders in database:`, allOrders.map(o => ({ id: o.id, orderNumber: o.orderNumber, status: o.status })));
          } catch (debugError) {
            console.error(`❌ Error fetching sample orders:`, debugError);
          }
          return undefined;
        }

        console.log(`📋 Current order before update:`, {
          id: currentOrder.id,
          orderNumber: currentOrder.orderNumber,
          tableId: currentOrder.tableId,
          currentStatus: currentOrder.status,
          requestedStatus: status,
          paidAt: currentOrder.paidAt,
          einvoiceStatus: currentOrder.einvoiceStatus
        });

        // Update the order status with additional paid timestamp if needed
        const updateData: any = {
          status,
          updatedAt: new Date()
        };

        if (status === "paid") {
          updateData.paidAt = new Date();
          console.log(`💳 Setting paidAt timestamp for order ${orderId}:`, updateData.paidAt);
        }

        console.log(`🔍 Update data being sent:`, updateData);
        console.log(`🔍 Update query targeting order ID: ${orderId}`);

        const queryStartTime = Date.now();
        console.log(`⏱️ DATABASE QUERY STARTED at:`, new Date().toISOString());

        const [order] = await database
          .update(orders)
          .set(updateData)
          .where(eq(orders.id, orderId as number))
          .returning();

        const queryEndTime = Date.now();
        console.log(`⏱️ DATABASE QUERY COMPLETED in ${queryEndTime - queryStartTime}ms`);
        console.log(`🔍 Database query execution result:`, {
          queryDuration: `${queryEndTime - queryStartTime}ms`,
          rowsAffected: order ? 1 : 0,
          orderReturned: !!order,
          timestamp: new Date().toISOString()
        });

        if (!order) {
          console.error(`❌ No order returned after status update for ID: ${orderId}`);
          console.log(`🔍 Verifying order still exists...`);
          const [verifyOrder] = await database
            .select()
            .from(orders)
            .where(eq(orders.id, orderId as number));
          console.log(`🔍 Order verification result:`, verifyOrder ? 'EXISTS' : 'NOT FOUND');
          return undefined;
        }

        console.log(`✅ Order status updated successfully:`, {
          id: order.id,
          orderNumber: order.orderNumber,
          tableId: order.tableId,
          previousStatus: currentOrder.status,
          newStatus: order.status,
          paidAt: order.paidAt,
          updatedAt: order.updatedAt,
          einvoiceStatus: order.einvoiceStatus
        });

        // CRITICAL: Handle table status update when order is paid
        if (status === "paid" && order.tableId) {
          console.log(`💳 Order PAID - IMMEDIATELY processing table ${order.tableId} release`);
          console.log(`🔍 DEBUG: Table release process started:`, {
            orderId: orderId,
            tableId: order.tableId,
            newStatus: status,
            timestamp: new Date().toISOString()
          });

          try {
            // Import tables from schema
            const { tables } = await import("@shared/schema");
            console.log(`✅ Tables schema imported successfully`);

            // Check for other ACTIVE orders on the same table (excluding current order and paid/cancelled orders)
            const activeStatuses = ["pending", "confirmed", "preparing", "ready", "served"];
            console.log(`🔍 DEBUG: Checking for other active orders on table ${order.tableId}:`, {
              excludeOrderId: orderId,
              activeStatuses: activeStatuses,
              tableId: order.tableId
            });

            const otherActiveOrders = await database
              .select()
              .from(orders)
              .where(
                and(
                  eq(orders.tableId, order.tableId),
                  not(eq(orders.id, orderId as number)), // Exclude current order
                  or(
                    ...activeStatuses.map(activeStatus => eq(orders.status, activeStatus))
                  )
                )
              );

            console.log(`🔍 DEBUG: Query completed - found ${otherActiveOrders.length} other active orders`);

            console.log(`🔍 Active orders remaining on table ${order.tableId}:`, {
              count: otherActiveOrders.length,
              orders: otherActiveOrders.map(o => ({
                id: o.id,
                status: o.status,
                orderNumber: o.orderNumber
              }))
            });

            // Get current table status
            const [currentTable] = await database
              .select()
              .from(tables)
              .where(eq(tables.id, order.tableId));

            if (!currentTable) {
              console.error(`❌ Table ${order.tableId} not found`);
            } else {
              console.log(`📋 Current table status:`, {
                id: currentTable.id,
                tableNumber: currentTable.tableNumber,
                status: currentTable.status
              });

              // FORCE table release if no other active orders exist
              if (otherActiveOrders.length === 0) {
                console.log(`🔓 FORCING table ${order.tableId} release - no active orders remaining`);
                console.log(`🔍 DEBUG: Table release attempt:`, {
                  tableId: order.tableId,
                  currentTableStatus: currentTable.status,
                  targetStatus: "available",
                  updateTimestamp: new Date().toISOString()
                });

                const [updatedTable] = await database
                  .update(tables)
                  .set({
                    status: "available",
                    updatedAt: new Date()
                  })
                  .where(eq(tables.id, order.tableId))
                  .returning();

                console.log(`🔍 DEBUG: Table update query result:`, {
                  updatedTableExists: !!updatedTable,
                  updatedTableData: updatedTable ? {
                    id: updatedTable.id,
                    tableNumber: updatedTable.tableNumber,
                    status: updatedTable.status,
                    updatedAt: updatedTable.updatedAt
                  } : null
                });

                if (updatedTable) {
                  console.log(`✅ Table ${order.tableId} FORCEFULLY released:`, {
                    id: updatedTable.id,
                    tableNumber: updatedTable.tableNumber,
                    previousStatus: currentTable.status,
                    newStatus: updatedTable.status,
                    updateSuccess: true
                  });

                  console.log(`🔍 DEBUG: Verifying table status after update...`);
                  const [verifyTable] = await database
                    .select()
                    .from(tables)
                    .where(eq(tables.id, order.tableId));

                  console.log(`🔍 DEBUG: Table verification result:`, {
                    tableFound: !!verifyTable,
                    verifiedStatus: verifyTable?.status,
                    verifiedUpdatedAt: verifyTable?.updatedAt
                  });

                } else {
                  console.error(`❌ CRITICAL: Failed to release table ${order.tableId} - no table returned`);
                  console.log(`🔍 DEBUG: Table update failed - investigating...`);

                  // Debug: Check if table exists
                  const [checkTable] = await database
                    .select()
                    .from(tables)
                    .where(eq(tables.id, order.tableId));

                  console.log(`🔍 DEBUG: Table existence check:`, {
                    tableExists: !!checkTable,
                    tableData: checkTable ? {
                      id: checkTable.id,
                      tableNumber: checkTable.tableNumber,
                      status: checkTable.status
                    } : null
                  });
                }
              } else {
                console.log(`🔒 Table ${order.tableId} remains occupied due to ${otherActiveOrders.length} active orders:`);
                console.log(`🔍 DEBUG: Active orders preventing table release:`, {
                  tableId: order.tableId,
                  activeOrdersCount: otherActiveOrders.length,
                  activeOrdersDetails: otherActiveOrders.map(o => ({
                    id: o.id,
                    orderNumber: o.orderNumber,
                    status: o.status,
                    orderedAt: o.orderedAt
                  }))
                });

                otherActiveOrders.forEach((activeOrder, index) => {
                  console.log(`   ${index + 1}. Order ${activeOrder.orderNumber} (${activeOrder.status}) - ID: ${activeOrder.id}`);
                });
              }
            }
          } catch (tableError) {
            console.error(`❌ CRITICAL: Error processing table status update for table ${order.tableId}:`, tableError);
            console.log(`🔍 DEBUG: Table update error details:`, {
              errorType: tableError?.constructor?.name,
              errorMessage: tableError?.message,
              errorStack: tableError?.stack,
              tableId: order.tableId,
              orderId: orderId
            });
          }
        } else {
          console.log(`🔍 DEBUG: Order status is not 'paid' or no tableId - skipping table update:`, {
            orderStatus: status,
            tableId: order.tableId,
            isPaidStatus: status === "paid",
            hasTableId: !!order.tableId
          });
        }

        console.log(`🔍 DEBUG: Final order state before return:`, {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          tableId: order.tableId,
          paidAt: order.paidAt,
          updatedAt: order.updatedAt,
          updateSuccess: true
        });
        return order;
      }
    } catch (error) {
      console.error(`❌ Error updating order status:`, error);
      console.log(`🔍 DEBUG: Storage layer error details:`, {
        errorType: error?.constructor?.name,
        errorMessage: error?.message,
        errorStack: error?.stack,
        orderId: orderId,
        requestedStatus: status,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async addOrderItems(
    orderId: number,
    items: InsertOrderItem[],
  ): Promise<OrderItem[]> {
    const itemsWithOrderId = items.map((item) => ({ ...item, orderId }));
    return await db.insert(orderItems).values(itemsWithOrderId).returning();
  }

  async removeOrderItem(itemId: number): Promise<boolean> {
    const result = await db.delete(orderItems).where(eq(orderItems.id, itemId));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteOrderItem(itemId: number, tenantDb?: any): Promise<boolean> {
    const database = tenantDb || db;
    const result = await database.delete(orderItems).where(eq(orderItems.id, itemId));
    return (result.rowCount ?? 0) > 0;
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    const items = await db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        total: orderItems.total,
        notes: orderItems.notes,
        productName: products.name,
        productSku: products.sku,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, orderId));

    return items as OrderItem[];
  }

  // Inventory Management
  async updateInventoryStock(
    productId: number,
    quantity: number,
    type: "add" | "subtract" | "set",
    notes?: string,
  ): Promise<Product | undefined> {
    const product = await this.getProduct(productId);
    if (!product) return undefined;

    let newStock: number;

    switch (type) {
      case "add":
        newStock = product.stock + quantity;
        break;
      case "subtract":
        newStock = Math.max(0, product.stock - quantity);
        break;
      case "set":
        newStock = quantity;
        break;
      default:
        return undefined;
    }

    const [updatedProduct] = await db
      .update(products)
      .set({ stock: newStock })
      .where(eq(products.id, productId))
      .returning();

    return updatedProduct || undefined;
  }

  // Store Settings
  async getStoreSettings(tenantDb?: any): Promise<StoreSettings> {
    const database = tenantDb || db;
    const [settings] = await database.select().from(storeSettings).limit(1);

    // If no settings exist, create default settings
    if (!settings) {
      const [newSettings] = await database
        .insert(storeSettings)
        .values({
          storeName: "EDPOS 레스토랑",
          storeCode: "STORE001",
          businessType: "restaurant",
          openTime: "09:00",
          closeTime: "22:00",
        })
        .returning();
      return newSettings;
    }

    return settings;
  }

  async updateStoreSettings(
    settings: Partial<InsertStoreSettings>,
    tenantDb?: any,
  ): Promise<StoreSettings> {
    const database = tenantDb || db;
    const currentSettings = await this.getStoreSettings(tenantDb);

    const [updatedSettings] = await database
      .update(storeSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(storeSettings.id, currentSettings.id))
      .returning();

    return updatedSettings;
  }

  // Suppliers
  async getSuppliers(): Promise<any> {
    return await db.select().from(suppliers).orderBy(suppliers.name);
  }

  async getSupplier(id: number): Promise<any> {
    const [result] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, id));
    return result;
  }

  async getSuppliersByStatus(status: string): Promise<any> {
    return await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.status, status))
      .orderBy(suppliers.name);
  }

  async searchSuppliers(query: string): Promise<any> {
    return await db
      .select()
      .from(suppliers)
      .where(
        or(
          ilike(suppliers.name, `%${query}%`),
          ilike(suppliers.code, `%${query}%`),
          ilike(suppliers.contactPerson, `%${query}%`),
        ),
      )
      .orderBy(suppliers.name);
  }

  async createSupplier(data: InsertSupplier): Promise<any> {
    const [result] = await db.insert(suppliers).values(data).returning();
    return result;
  }

  async updateSupplier(
    id: number,
    data: Partial<InsertSupplier>,
  ): Promise<any> {
    const [result] = await db
      .update(suppliers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(suppliers.id, id))
      .returning();

    return result;
  }

  async deleteSupplier(id: number): Promise<boolean> {
    const result = await db
      .delete(suppliers)
      .where(eq(suppliers.id, id))
      .returning();
    return result.length > 0;
  }

  // Customers
  async getCustomers(tenantDb?: any): Promise<Customer[]> {
    const database = tenantDb || db;

    // Get membership thresholds
    const thresholds = await this.getMembershipThresholds();

    // Get all customers
    const allCustomers = await database
      .select()
      .from(customers)
      .orderBy(customers.name);

    // Update membership levels based on spending
    const updatedCustomers = [];
    for (const customer of allCustomers) {
      const totalSpent = parseFloat(customer.totalSpent || "0");
      const calculatedLevel = this.calculateMembershipLevel(
        totalSpent,
        thresholds.GOLD,
        thresholds.VIP,
      );

      // Update if membership level has changed
      if (customer.membershipLevel !== calculatedLevel) {
        const [updatedCustomer] = await database
          .update(customers)
          .set({
            membershipLevel: calculatedLevel,
            updatedAt: new Date(),
          })
          .where(eq(customers.id, customer.id))
          .returning();
        updatedCustomers.push(updatedCustomer);
      } else {
        updatedCustomers.push(customer);
      }
    }

    return updatedCustomers;
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    return await db
      .select()
      .from(customers)
      .where(
        or(
          ilike(customers.name, `%${query}%`),
          ilike(customers.customerId, `%${query}%`),
          ilike(customers.phone, `%${query}%`),
          ilike(customers.email, `%${query}%`),
        ),
      )
      .orderBy(customers.name);
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [result] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id));
    return result || undefined;
  }

  async getCustomerByCustomerId(
    customerId: string,
  ): Promise<Customer | undefined> {
    const [result] = await db
      .select()
      .from(customers)
      .where(eq(customers.customerId, customerId));
    return result || undefined;
  }

  async createCustomer(customerData: InsertCustomer): Promise<Customer> {
    // Generate customer ID if not provided
    if (!customerData.customerId) {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(customers);
      const customerCount = count[0]?.count || 0;
      customerData.customerId = `CUST${String(customerCount + 1).padStart(3, "0")}`;
    }

    const [result] = await db
      .insert(customers)
      .values(customerData)
      .returning();
    return result;
  }

  async updateCustomer(
    id: number,
    customerData: Partial<InsertCustomer>,
  ): Promise<Customer | undefined> {
    const [result] = await db
      .update(customers)
      .set({ ...customerData, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return result || undefined;
  }

  async deleteCustomer(id: number): Promise<boolean> {
    const result = await db
      .delete(customers)
      .where(eq(customers.id, id))
      .returning();
    return result.length > 0;
  }

  async updateCustomerVisit(
    customerId: number,
    amount: number,
    points: number,
  ) {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId));

    if (!customer) {
      throw new Error("Customer not found");
    }

    const newTotalSpent = parseFloat(customer.totalSpent || "0") + amount;
    const newVisitCount = (customer.visitCount || 0) + 1;
    const newPoints = (customer.points || 0) + points;

    // Get membership thresholds and calculate new level
    const thresholds = await this.getMembershipThresholds();
    const newMembershipLevel = this.calculateMembershipLevel(
      newTotalSpent,
      thresholds.GOLD,
      thresholds.VIP,
    );

    const [updated] = await db
      .update(customers)
      .set({
        visitCount: newVisitCount,
        totalSpent: newTotalSpent.toString(),
        points: newPoints,
        membershipLevel: newMembershipLevel,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId))
      .returning();

    return updated;
  }

  // Point Management Methods
  async getCustomerPoints(
    customerId: number,
  ): Promise<{ points: number } | undefined> {
    const customer = await this.getCustomer(customerId);
    if (!customer) return undefined;
    return { points: customer.points || 0 };
  }

  async updateCustomerPoints(
    customerId: number,
    points: number,
    description: string,
    type: "earned" | "redeemed" | "adjusted",
    employeeId?: number,
    orderId?: number,
  ): Promise<PointTransaction> {
    const customer = await this.getCustomer(customerId);
    if (!customer) throw new Error("Customer not found");

    const previousBalance = customer.points || 0;
    let pointChange = points;

    // For redeemed points, make sure it's negative
    if (type === "redeemed" && pointChange > 0) {
      pointChange = -pointChange;
    }

    const newBalance = previousBalance + pointChange;

    // Ensure customer doesn't go below 0 points for redemption
    if (newBalance < 0) {
      throw new Error("Insufficient points balance");
    }

    // Update customer points
    await db
      .update(customers)
      .set({
        points: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId));

    // Create point transaction record
    const [pointTransaction] = await db
      .insert(pointTransactions)
      .values({
        customerId,
        type,
        points: pointChange,
        description,
        orderId,
        employeeId,
        previousBalance,
        newBalance,
      })
      .returning();

    return pointTransaction;
  }

  async getPointHistory(
    customerId: number,
    limit: number = 50,
  ): Promise<PointTransaction[]> {
    return await db
      .select()
      .from(pointTransactions)
      .where(eq(pointTransactions.customerId, customerId))
      .orderBy(sql`${pointTransactions.createdAt} DESC`)
      .limit(limit);
  }

  async getAllPointTransactions(
    limit: number = 100,
  ): Promise<PointTransaction[]> {
    return await db
      .select()
      .from(pointTransactions)
      .orderBy(sql`${pointTransactions.createdAt} DESC`)
      .limit(limit);
  }

  // Get membership thresholds
  async getMembershipThresholds(): Promise<{ GOLD: number; VIP: number }> {
    try {
      const [settings] = await db.select().from(storeSettings).limit(1);

      if (!settings) {
        // Return default values if no settings exist
        return { GOLD: 300000, VIP: 1000000 };
      }

      // Parse thresholds from settings or return defaults
      const goldThreshold =
        parseInt(settings.goldThreshold as string) || 300000;
      const vipThreshold = parseInt(settings.vipThreshold as string) || 1000000;

      return { GOLD: goldThreshold, VIP: vipThreshold };
    } catch (error) {
      console.error("Error fetching membership thresholds:", error);
      return { GOLD: 300000, VIP: 1000000 };
    }
  }

  // Calculate membership level based on total spent
  private calculateMembershipLevel(
    totalSpent: number,
    goldThreshold: number,
    vipThreshold: number,
  ): string {
    if (totalSpent >= vipThreshold) return "VIP";
    if (totalSpent >= goldThreshold) return "GOLD";
    return "SILVER";
  }

  async updateMembershipThresholds(thresholds: {
    GOLD: number;
    VIP: number;
  }): Promise<{ GOLD: number; VIP: number }> {
    try {
      // Update or insert store settings with thresholds
      const currentSettings = await this.getStoreSettings();

      await db
        .update(storeSettings)
        .set({
          goldThreshold: thresholds.GOLD.toString(),
          vipThreshold: thresholds.VIP.toString(),
          updatedAt: new Date(),
        })
        .where(eq(storeSettings.id, currentSettings.id));

      // Recalculate all customer membership levels with new thresholds
      await this.recalculateAllMembershipLevels(
        thresholds.GOLD,
        thresholds.VIP,
      );

      return thresholds;
    } catch (error) {
      console.error("Error updating membership thresholds:", error);
      throw error;
    }
  }

  // Recalculate membership levels for all customers
  async recalculateAllMembershipLevels(
    goldThreshold: number,
    vipThreshold: number,
  ) {
    const allCustomers = await db.select().from(customers);

    for (const customer of allCustomers) {
      const totalSpent = parseFloat(customer.totalSpent || "0");
      const calculatedLevel = this.calculateMembershipLevel(
        totalSpent,
        goldThreshold,
        vipThreshold,
      );

      if (customer.membershipLevel !== calculatedLevel) {
        await db
          .update(customers)
          .set({
            membershipLevel: calculatedLevel,
            updatedAt: new Date(),
          })
          .where(eq(customers.id, customer.id));
      }
    }
  }

  async getAllProducts(includeInactive: boolean = false, tenantDb?: any): Promise<Product[]> {
    const database = tenantDb || db;
    let result;
    if (includeInactive) {
      result = await database.select().from(products).orderBy(products.name);
    } else {
      result = await database
        .select()
        .from(products)
        .where(eq(products.isActive, true))
        .orderBy(products.name);
    }

    // Ensure afterTaxPrice is properly returned
    return result.map((product) => ({
      ...product,
      afterTaxPrice: product.afterTaxPrice || null
    }));
  }

  async getActiveProducts(tenantDb?: any): Promise<Product[]> {
    const database = tenantDb || db;
    const result = await database
      .select()
      .from(products)
      .where(eq(products.isActive, true))
      .orderBy(products.name);

    // Ensure afterTaxPrice is properly returned
    return result.map((product) => ({
      ...product,
      afterTaxPrice: product.afterTaxPrice || null
    }));
  }

  async createProduct(productData: Omit<Product, "id">): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values({
        ...productData,
        productType: productData.productType || 1,
      })
      .returning();
    return product;
  }

  // Invoice templates methods
  async getInvoiceTemplates(): Promise<any[]> {
    try {
      const { invoiceTemplates } = await import("@shared/schema");
      return await db
        .select()
        .from(invoiceTemplates)
        .orderBy(invoiceTemplates.id);
    } catch (error) {
      console.error("Error fetching invoice templates:", error);
      return [];
    }
  }

  async getActiveInvoiceTemplates(): Promise<any[]> {
    try {
      const { invoiceTemplates } = await import("@shared/schema");
      return await db
        .select()
        .from(invoiceTemplates)
        .where(eq(invoiceTemplates.isActive, true))
        .orderBy(invoiceTemplates.id);
    } catch (error) {
      console.error("Error fetching active invoice templates:", error);
      return [];
    }
  }

  async getInvoiceTemplate(id: number): Promise<any> {
    try {
      const { invoiceTemplates } = await import("@shared/schema");
      const [result] = await db
        .select()
        .from(invoiceTemplates)
        .where(eq(invoiceTemplates.id, id));
      return result;
    } catch (error) {
      console.error("Error fetching invoice template:", error);
      return null;
    }
  }

  async createInvoiceTemplate(data: any): Promise<any> {
    try {
      const { invoiceTemplates } = await import("@shared/schema");

      // If this template is set as default, unset all other defaults
      if (data.isDefault) {
        await db
          .update(invoiceTemplates)
          .set({ isDefault: false })
          .where(eq(invoiceTemplates.isDefault, true));
      }

      const [result] = await db
        .insert(invoiceTemplates)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating invoice template:", error);
      throw error;
    }
  }

  async updateInvoiceTemplate(id: number, data: any): Promise<any> {
    try {
      const { invoiceTemplates } = await import("@shared/schema");

      // If this template is set as default, unset all other defaults
      if (data.isDefault) {
        await db
          .update(invoiceTemplates)
          .set({ isDefault: false })
          .where(eq(invoiceTemplates.isDefault, true));
      }

      const [result] = await db
        .update(invoiceTemplates)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(invoiceTemplates.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error("Error updating invoice template:", error);
      throw error;
    }
  }

  async deleteInvoiceTemplate(id: number): Promise<boolean> {
    try {
      const { invoiceTemplates } = await import("@shared/schema");
      const result = await db
        .delete(invoiceTemplates)
        .where(eq(invoiceTemplates.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting invoice template:", error);
      return false;
    }
  }

  // E-invoice connections methods
  async getEInvoiceConnections(): Promise<any[]> {
    try {
      const { eInvoiceConnections } = await import("@shared/schema");
      return await db
        .select()
        .from(eInvoiceConnections)
        .orderBy(eInvoiceConnections.symbol);
    } catch (error) {
      console.error("Error fetching e-invoice connections:", error);
      return [];
    }
  }

  async getEInvoiceConnection(id: number): Promise<any> {
    try {
      const { eInvoiceConnections } = await import("@shared/schema");
      const [result] = await db
        .select()
        .from(eInvoiceConnections)
        .where(eq(eInvoiceConnections.id, id));
      return result;
    } catch (error) {
      console.error("Error fetching e-invoice connection:", error);
      return null;
    }
  }

  async createEInvoiceConnection(data: any): Promise<any> {
    try {
      const { eInvoiceConnections } = await import("@shared/schema");

      // Generate next symbol number
      const existingConnections = await this.getEInvoiceConnections();
      const nextSymbol = (existingConnections.length + 1).toString();

      const [result] = await db
        .insert(eInvoiceConnections)
        .values({
          ...data,
          symbol: nextSymbol,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating e-invoice connection:", error);
      throw error;
    }
  }

  async updateEInvoiceConnection(id: number, data: any): Promise<any> {
    try {
      const { eInvoiceConnections } = await import("@shared/schema");
      const [result] = await db
        .update(eInvoiceConnections)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(eInvoiceConnections.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error("Error updating e-invoice connection:", error);
      throw error;
    }
  }

  async deleteEInvoiceConnection(id: number): Promise<boolean> {
    try {
      const { eInvoiceConnections } = await import("@shared/schema");
      const result = await db
        .delete(eInvoiceConnections)
        .where(eq(eInvoiceConnections.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting e-invoice connection:", error);
      return false;
    }
  }

  async getEmployeeByEmail(email: string): Promise<Employee | undefined> {
    if (email && email.trim() !== "") {
      const [employee] = await db
        .select()
        .from(employees)
        .where(eq(employees.email, email));

      return employee || undefined;
    }
    return undefined;
  }
}

export const storage = new DatabaseStorage();