import {
  categories,
  products,
  transactions as transactionsTable,
  transactionItems as transactionItemsTable,
  employees,
  attendanceRecords,
  tables,
  orders,
  orderItems,
  storeSettings,
  suppliers,
  customers,
  pointTransactions,
  invoiceTemplates,
  eInvoiceConnections,
  inventoryTransactions,
  invoices,
  invoiceItems,
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, and, gte, lte, or, sql, desc, not, like } from "drizzle-orm";

// Validate database connection on module load
if (!db) {
  console.error('❌ CRITICAL: Database connection is undefined on module load');
  throw new Error('Database connection failed to initialize');
}

// Additional validation to ensure db has required methods
if (!db.select || typeof db.select !== 'function') {
  console.error('❌ CRITICAL: Database connection is missing select method');
  throw new Error('Database connection is invalid - missing required methods');
}

console.log('✅ Database connection validated successfully');

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

  // Invoice methods
  getInvoices(tenantDb?: any): Promise<any[]>;
  getInvoice(id: number, tenantDb?: any): Promise<any>;
  createInvoice(invoiceData: any, tenantDb?: any): Promise<any>;
  updateInvoice(id: number, updateData: any, tenantDb?: any): Promise<any>;
  deleteInvoice(id: number, tenantDb?: any): Promise<boolean>;

  // Invoice template methods
  getInvoiceTemplates(tenantDb?: any): Promise<any[]>;
  getActiveInvoiceTemplates(): Promise<any[]>;

  // E-invoice connections
  getEInvoiceConnections(): Promise<any[]>;
  getEInvoiceConnection(id: number): Promise<any>;
  createEInvoiceConnection(data: any): Promise<any>;
  updateEInvoiceConnection(id: number, data: any): Promise<any>;
  deleteEInvoiceConnection(id: number): Promise<boolean>;

  getEmployeeByEmail(email: string): Promise<Employee | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Get safe database connection with fallback
  private getSafeDatabase(tenantDb?: any, operation: string = 'operation'): any {
    console.log(`🔍 Getting safe database for operation: ${operation}`);

    let database = tenantDb || db;

    // If both tenantDb and db are undefined/null, throw critical error
    if (!database) {
      console.error(`❌ CRITICAL: No database connection available for ${operation}`);
      console.error(`❌ tenantDb:`, !!tenantDb);
      console.error(`❌ global db:`, !!db);
      throw new Error(`Database connection is completely unavailable for ${operation}`);
    }

    // Comprehensive validation of database object
    if (typeof database !== 'object' || database === null) {
      console.error(`❌ Database is not a valid object in ${operation}:`, {
        type: typeof database,
        isNull: database === null,
        isUndefined: database === undefined
      });

      // Try falling back to global db if tenantDb is invalid
      if (tenantDb && db && typeof db === 'object' && db !== null) {
        console.log(`🔄 Falling back to global db for ${operation}`);
        database = db;
      } else {
        throw new Error(`Invalid database connection for ${operation} - no valid fallback available`);
      }
    }

    // Validate required methods exist
    const requiredMethods = ['select', 'insert', 'update', 'delete'];
    const missingMethods = requiredMethods.filter(method => !database[method] || typeof database[method] !== 'function');

    if (missingMethods.length > 0) {
      console.error(`❌ Database missing required methods in ${operation}:`, {
        missingMethods,
        availableMethods: Object.keys(database).filter(key => typeof database[key] === 'function')
      });

      // Try falling back to global db if methods are missing
      if (tenantDb && db && typeof db === 'object') {
        const globalDbMissingMethods = requiredMethods.filter(method => !db[method] || typeof db[method] !== 'function');
        if (globalDbMissingMethods.length === 0) {
          console.log(`🔄 Falling back to global db with complete methods for ${operation}`);
          database = db;
        } else {
          throw new Error(`Both tenant and global database connections are invalid for ${operation}`);
        }
      } else {
        throw new Error(`Database connection is invalid - missing methods: ${missingMethods.join(', ')} for ${operation}`);
      }
    }

    console.log(`✅ Database validation passed for ${operation}`);
    return database;
  }

  async getCategories(tenantDb?: any): Promise<Category[]> {
    try {
      const database = this.getSafeDatabase(tenantDb, 'getCategories');
      const result = await database.select().from(categories);
      return result || [];
    } catch (error) {
      console.error(`❌ Error in getCategories:`, error);
      // Return empty array instead of throwing to prevent crashes
      return [];
    }
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
    try {
      const database = this.getSafeDatabase(tenantDb, 'getProducts');
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
    } catch (error) {
      console.error(`❌ Error in getProducts:`, error);
      return [];
    }
  }

  async getProductsByCategory(
    categoryId: number,
    includeInactive: boolean = false,
    tenantDb?: any,
  ): Promise<Product[]> {
    try {
      const database = this.getSafeDatabase(tenantDb, 'getProductsByCategory');
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
    } catch (error) {
      console.error(`❌ Error in getProductsByCategory:`, error);
      return [];
    }
  }

  async getProduct(id: number, tenantDb?: any): Promise<Product | undefined> {
    const database = tenantDb || db;
    if (!database) {
      console.error(`❌ Database is undefined in getProduct`);
      throw new Error(`Database connection is not available`);
    }
    const [product] = await database
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.isActive, true)));
    return product || undefined;
  }

  async getProductBySku(sku: string, tenantDb?: any): Promise<Product | undefined> {
    const database = tenantDb || db;
    if (!database) {
      console.error(`❌ Database is undefined in getProductBySku`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!database) {
      console.error(`❌ Database is undefined in searchProducts`);
      throw new Error(`Database connection is not available`);
    }
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
    const database = tenantDb || db;
    if (!database) {
      console.error(`❌ Database is undefined in createProduct`);
      throw new Error(`Database connection is not available`);
    }
    try {
      console.log("Storage: Creating product with data:", insertProduct);
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
    if (!database) {
      console.error(`❌ Database is undefined in updateProduct`);
      throw new Error(`Database connection is not available`);
    }
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
    const database = tenantDb || db;
    if (!database) {
      console.error(`❌ Database is undefined in deleteProduct`);
      throw new Error(`Database connection is not available`);
    }
    try {
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
    if (!database) {
      console.error(`❌ Database is undefined in deleteInactiveProducts`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!database) {
      console.error(`❌ Database is undefined in updateProductStock`);
      throw new Error(`Database connection is not available`);
    }

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
    if (!database) {
      console.error(`❌ Database is undefined in createTransaction`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!db) {
      console.error(`❌ Database is undefined in getTransaction`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!db) {
      console.error(`❌ Database is undefined in getTransactionByTransactionId`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!database) {
      console.error(`❌ Database is undefined in getTransactions`);
      throw new Error(`Database connection is not available`);
    }
    return await database.select().from(transactions).orderBy(transactions.createdAt);
  }

  // Get next employee ID in sequence
  async getNextEmployeeId(tenantDb?: any): Promise<string> {
    const database = tenantDb || db;
    if (!database) {
      console.error(`❌ Database is undefined in getNextEmployeeId`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!database) {
      console.error(`❌ Database is undefined in getNextCustomerId`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!database) {
      console.error(`❌ Database is undefined in getEmployees`);
      throw new Error(`Database connection is not available`);
    }
    return await database
      .select()
      .from(employees)
      .where(eq(employees.isActive, true));
  }

  async getEmployee(id: number, tenantDb?: any): Promise<Employee | undefined> {
    const database = tenantDb || db;
    if (!database) {
      console.error(`❌ Database is undefined in getEmployee`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!database) {
      console.error(`❌ Database is undefined in getEmployeeByEmployeeId`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!database) {
      console.error(`❌ Database is undefined in createEmployee`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!database) {
      console.error(`❌ Database is undefined in updateEmployee`);
      throw new Error(`Database connection is not available`);
    }
    const [employee] = await database
      .update(employees)
      .set(updateData)
      .where(and(eq(employees.id, id), eq(employees.isActive, true)))
      .returning();
    return employee || undefined;
  }

  async deleteEmployee(id: number, tenantDb?: any): Promise<boolean> {
    const database = tenantDb || db;
    if (!database) {
      console.error(`❌ Database is undefined in deleteEmployee`);
      throw new Error(`Database connection is not available`);
    }
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
    tenantDb?: any,
  ): Promise<AttendanceRecord[]> {
    const database = tenantDb || db;

    try {
      this.validateDatabase(database, 'getAttendanceRecords');

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
        return await database
          .select()
          .from(attendanceRecords)
          .where(and(...conditions))
          .orderBy(attendanceRecords.clockIn);
      }

      return await database
        .select()
        .from(attendanceRecords)
        .orderBy(attendanceRecords.clockIn);
    } catch (error) {
      console.error(`❌ Error in getAttendanceRecords:`, error);
      return [];
    }
  }

  async getAttendanceRecord(id: number, tenantDb?: any): Promise<AttendanceRecord | undefined> {
    const database = tenantDb || db;

    try {
      this.validateDatabase(database, 'getAttendanceRecord');
      const [record] = await database
        .select()
        .from(attendanceRecords)
        .where(eq(attendanceRecords.id, id));
      return record || undefined;
    } catch (error) {
      console.error(`❌ Error in getAttendanceRecord:`, error);
      return undefined;
    }
  }

  async getTodayAttendance(
    employeeId: number,
    tenantDb?: any,
  ): Promise<AttendanceRecord | undefined> {
    const database = tenantDb || db;

    try {
      this.validateDatabase(database, 'getTodayAttendance');

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [record] = await database
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
    } catch (error) {
      console.error(`❌ Error in getTodayAttendance:`, error);
      return undefined;
    }
  }

  async clockIn(employeeId: number, notes?: string): Promise<AttendanceRecord> {
    if (!db) {
      console.error(`❌ Database is undefined in clockIn`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!db) {
      console.error(`❌ Database is undefined in clockOut`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!db) {
      console.error(`❌ Database is undefined in startBreak`);
      throw new Error(`Database connection is not available`);
    }
    const [record] = await db
      .update(attendanceRecords)
      .set({ breakStart: new Date() })
      .where(eq(attendanceRecords.id, attendanceId))
      .returning();
    return record || undefined;
  }

  async endBreak(attendanceId: number): Promise<AttendanceRecord | undefined> {
    if (!db) {
      console.error(`❌ Database is undefined in endBreak`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!db) {
      console.error(`❌ Database is undefined in updateAttendanceStatus`);
      throw new Error(`Database connection is not available`);
    }
    const [record] = await db
      .update(attendanceRecords)
      .set({ status })
      .where(eq(attendanceRecords.id, id))
      .returning();
    return record || undefined;
  }

  // Tables
  async getTables(tenantDb?: any): Promise<Table[]> {
    const database = tenantDb || db;

    try {
      this.validateDatabase(database, 'getTables');
      return await database.select().from(tables).orderBy(tables.tableNumber);
    } catch (error) {
      console.error(`❌ Error in getTables:`, error);
      return [];
    }
  }

  async getTable(id: number, tenantDb?: any): Promise<Table | undefined> {
    const database = tenantDb || db;

    try {
      this.validateDatabase(database, 'getTable');
      const [table] = await database.select().from(tables).where(eq(tables.id, id));
      return table || undefined;
    } catch (error) {
      console.error(`❌ Error in getTable:`, error);
      return undefined;
    }
  }

  async getTableByNumber(tableNumber: string, tenantDb?: any): Promise<Table | undefined> {
    const database = tenantDb || db;

    try {
      this.validateDatabase(database, 'getTableByNumber');
      const [table] = await database
        .select()
        .from(tables)
        .where(eq(tables.tableNumber, tableNumber));
      return table || undefined;
    } catch (error) {
      console.error(`❌ Error in getTableByNumber:`, error);
      return undefined;
    }
  }

  async createTable(table: InsertTable, tenantDb?: any): Promise<Table> {
    const database = tenantDb || db;

    try {
      this.validateDatabase(database, 'createTable');
      const [newTable] = await database.insert(tables).values(table).returning();
      return newTable;
    } catch (error) {
      console.error(`❌ Error in createTable:`, error);
      throw error;
    }
  }

  async updateTable(
    id: number,
    table: Partial<InsertTable>,
    tenantDb?: any,
  ): Promise<Table | undefined> {
    const database = tenantDb || db;

    try {
      this.validateDatabase(database, 'updateTable');
      const [updatedTable] = await database
        .update(tables)
        .set(table)
        .where(eq(tables.id, id))
        .returning();
      return updatedTable || undefined;
    } catch (error) {
      console.error(`❌ Error in updateTable:`, error);
      return undefined;
    }
  }

  async updateTableStatus(
    id: number,
    status: string,
    tenantDb?: any,
  ): Promise<Table | undefined> {
    const database = tenantDb || db;

    try {
      this.validateDatabase(database, 'updateTableStatus');
      const [table] = await database
        .update(tables)
        .set({ status })
        .where(eq(tables.id, id))
        .returning();
      return table || undefined;
    } catch (error) {
      console.error(`❌ Error in updateTableStatus:`, error);
      return undefined;
    }
  }

  async deleteTable(id: number, tenantDb?: any): Promise<boolean> {
    const database = tenantDb || db;

    try {
      this.validateDatabase(database, 'deleteTable');
      const result = await database.delete(tables).where(eq(tables.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error(`❌ Error in deleteTable:`, error);
      return false;
    }
  }

  // Orders
  async getOrders(tableId?: number, status?: string, tenantDb?: any): Promise<Order[]> {
    try {
      const database = this.getSafeDatabase(tenantDb, 'getOrders');

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
    } catch (error) {
      console.error(`❌ Error in getOrders:`, error);
      return [];
    }
  }

  async getOrder(id: number, tenantDb?: any): Promise<Order | undefined> {
    const database = tenantDb || db;

    try {
      this.validateDatabase(database, 'getOrder');
      const [order] = await database.select().from(orders).where(eq(orders.id, id));
      return order || undefined;
    } catch (error) {
      console.error(`❌ Error in getOrder:`, error);
      return undefined;
    }
  }

  async getOrderByNumber(orderNumber: string, tenantDb?: any): Promise<Order | undefined> {
    const database = tenantDb || db;

    try {
      this.validateDatabase(database, 'getOrderByNumber');
      const [order] = await database
        .select()
        .from(orders)
        .where(eq(orders.orderNumber, orderNumber));
      return order || undefined;
    } catch (error) {
      console.error(`❌ Error in getOrderByNumber:`, error);
      return undefined;
    }
  }

  async createOrder(
    order: InsertOrder,
    items: InsertOrderItem[],
    tenantDb?: any,
  ): Promise<Order> {
    const database = tenantDb || db;

    try {
      this.validateDatabase(database, 'createOrder');

      const [newOrder] = await database.insert(orders).values(order).returning();

      if (items.length > 0) {
        const itemsWithOrderId = items.map((item) => ({
          ...item,
          orderId: newOrder.id,
          unitPrice: item.unitPrice.toString(),
          total: item.total.toString(),
        }));
        await database.insert(orderItems).values(itemsWithOrderId);
      }

      // Update table status to occupied
      if (newOrder.tableId) {
        await this.updateTableStatus(newOrder.tableId, "occupied");
      }

      return newOrder;
    } catch (error) {
      console.error(`❌ Error in createOrder:`, error);
      throw error;
    }
  }

  async updateOrder(
    id: number,
    order: Partial<InsertOrder>,
    tenantDb?: any,
  ): Promise<Order | undefined> {
    try {
      const database = this.getSafeDatabase(tenantDb, 'updateOrder');

    console.log('=== UPDATING ORDER ===');
    console.log('Order ID:', id);
    console.log('Update data:', order);

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
          // Only process if current order is a real database order (not temporary)
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
    } catch (error) {
      console.error(`❌ Error in updateOrder:`, error);
      return undefined;
    }
  }

  // Validate database connection with comprehensive checks
  private validateDatabase(database: any, operation: string): void {
    if (!database) {
      console.error(`❌ Database is null/undefined in ${operation}`);
      throw new Error(`Database connection is not available for ${operation}`);
    }

    if (typeof database !== 'object') {
      console.error(`❌ Database is not an object in ${operation}:`, typeof database);
      throw new Error(`Invalid database type for ${operation}`);
    }

    if (!database.select || typeof database.select !== 'function') {
      console.error(`❌ Database missing select method in ${operation}`);
      console.error(`❌ Available methods:`, Object.keys(database));
      throw new Error(`Database connection is invalid - missing select method for ${operation}`);
    }

    if (!database.insert || typeof database.insert !== 'function') {
      console.error(`❌ Database missing insert method in ${operation}`);
      throw new Error(`Database connection is invalid - missing insert method for ${operation}`);
    }

    if (!database.update || typeof database.update !== 'function') {
      console.error(`❌ Database missing update method in ${operation}`);
      throw new Error(`Database connection is invalid - missing update method for ${operation}`);
    }
  }

  // Safe database query wrapper with enhanced error handling
  private async safeDbQuery<T>(
    queryFn: () => Promise<T>,
    fallbackValue: T,
    operation: string
  ): Promise<T> {
    try {
      console.log(`🔍 Executing safe database query for ${operation}`);
      const result = await queryFn();
      console.log(`✅ Safe database query completed successfully for ${operation}`);
      return result || fallbackValue;
    } catch (error) {
      console.error(`❌ Database error in ${operation}:`, {
        errorMessage: error?.message,
        errorType: error?.constructor?.name,
        errorStack: error?.stack
      });

      // Check if it's a connection error specifically
      if (error?.message?.includes('select') || error?.message?.includes('undefined')) {
        console.error(`❌ CRITICAL: Database connection lost during ${operation}`);
      }

      return fallbackValue;
    }
  }

  async updateOrderStatus(
    id: number | string,
    status: string,
    tenantDb?: any,
  ): Promise<Order | undefined> {
    console.log(`🚀 ========================================`);
    console.log(`🚀 STORAGE FUNCTION CALLED: updateOrderStatus`);
    console.log(`🚀 ========================================`);
    console.log(`📋 updateOrderStatus called with id: ${id}, status: ${status}`);
    console.log(`🔍 updateOrderStatus parameters: {`);
    console.log(`  id: ${id},`);
    console.log(`  idType: '${typeof id}',`);
    console.log(`  status: '${status}',`);
    console.log(`  statusType: '${typeof status}',`);
    console.log(`  tenantDb: ${!!tenantDb}`);
    console.log(`}`);

    // Handle temporary order IDs - return a success response to continue flow
    if (typeof id === 'string' && id.startsWith('temp-')) {
      console.log(`🟡 Temporary order ID detected: ${id} - allowing flow to continue to E-Invoice`);

      // Return a success order object that allows the flow to continue to E-Invoice modal
      const mockOrder = {
        id: id as any, // Keep the temp ID for reference
        orderNumber: `TEMP-${Date.now()}`,
        tableId: null,
        customerName: "Khách hàng",
        customerPhone: null,
        customerEmail: null,
        subtotal: "0.00",
        tax: "0.00", 
        total: "0.00",
        status: status,
        paymentMethod: status === 'paid' ? 'cash' : null,
        paymentStatus: status === 'paid' ? 'paid' : 'pending',
        einvoiceStatus: 0, // Not published yet
        invoiceNumber: null,
        templateNumber: null,
        symbol: null,
        notes: `Temporary order - payment flow continuing to E-Invoice`,
        orderedAt: new Date(),
        paidAt: status === 'paid' ? new Date() : null,
        employeeId: null,
        salesChannel: 'pos',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log(`✅ Mock order created for temporary ID - flow will continue to E-Invoice:`, {
        id: mockOrder.id,
        status: mockOrder.status,
        paymentMethod: mockOrder.paymentMethod,
        allowsContinuation: true
      });

      return mockOrder;
    }

    // Enhanced database validation with comprehensive error handling
    let database;
    try {
      database = this.getSafeDatabase(tenantDb, 'updateOrderStatus');

      // Additional runtime validation
      if (!database || typeof database !== 'object') {
        console.error(`❌ CRITICAL: Invalid database object in updateOrderStatus`);
        throw new Error(`Database connection is completely invalid`);
      }

      if (!database.select || typeof database.select !== 'function') {
        console.error(`❌ CRITICAL: Database missing select method in updateOrderStatus`);
        console.error(`❌ Available methods:`, Object.keys(database));
        throw new Error(`Database connection is missing required methods`);
      }

      if (!database.update || typeof database.update !== 'function') {
        console.error(`❌ CRITICAL: Database missing update method in updateOrderStatus`);
        throw new Error(`Database connection is missing update method`);
      }

      console.log(`✅ Database validation passed for updateOrderStatus`);

    } catch (dbError) {
      console.error(`❌ Database validation failed in updateOrderStatus:`, dbError);

      // Try to fall back to global db if tenant db is problematic
      if (tenantDb && db && typeof db === 'object' && db.select && db.update) {
        console.log(`🔄 Falling back to global database connection`);
        database = db;
      } else {
        console.error(`❌ No valid fallback database available`);
        throw new Error(`Database connection is completely unavailable: ${dbError.message}`);
      }
    }

    // Ensure id is a number for database operations
    const orderId = typeof id === 'string' ? parseInt(id) : id;
    if (isNaN(orderId)) {
      console.error(`❌ Invalid order ID: ${id}`);
      throw new Error(`Invalid order ID: ${id}`);
    }

    console.log(`🔍 Processing order ID: ${orderId} (type: ${typeof orderId})`);

    try {
      // First, get the current order to know its table
      console.log(`🔍 Fetching current order with ID: ${orderId}`);
      const result = await this.safeDbQuery(
        () => database.select().from(orders).where(eq(orders.id, orderId as number)),
        [],
        `fetchCurrentOrder-${orderId}`
      );
      const [currentOrder] = result;

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

      const updateResult = await this.safeDbQuery(
        () => database.update(orders).set(updateData).where(eq(orders.id, orderId as number)).returning(),
        [],
        `updateOrderStatus-${orderId}`
      );
      const [order] = updateResult;

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
    if (!db) {
      console.error(`❌ Database is undefined in addOrderItems`);
      throw new Error(`Database connection is not available`);
    }
    const itemsWithOrderId = items.map((item) => ({ ...item, orderId }));
    return await db.insert(orderItems).values(itemsWithOrderId).returning();
  }

  async removeOrderItem(itemId: number): Promise<boolean> {
    if (!db) {
      console.error(`❌ Database is undefined in removeOrderItem`);
      throw new Error(`Database connection is not available`);
    }
    const result = await db.delete(orderItems).where(eq(orderItems.id, itemId));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteOrderItem(itemId: number, tenantDb?: any): Promise<boolean> {
    const database = tenantDb || db;
    if (!database) {
      console.error(`❌ Database is undefined in deleteOrderItem`);
      throw new Error(`Database connection is not available`);
    }
    const result = await database.delete(orderItems).where(eq(orderItems.id, itemId));
    return (result.rowCount ?? 0) > 0;
  }

  async getOrderItems(orderId: number, tenantDb?: any): Promise<OrderItem[]> {
    const database = tenantDb || db;
    if (!database) {
      console.error(`❌ Database is undefined in getOrderItems`);
      throw new Error(`Database connection is not available`);
    }

    try {
      console.log(`=== GET ORDER ITEMS API CALLED ===`);
      console.log(`Order ID requested: ${orderId}`);
      console.log(`Fetching order items from storage...`);

      const items = await database
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

      console.log(`Found ${items.length} order items:`, items);
      return items;
    } catch (error) {
      console.error(`❌ Error fetching order items for order ${orderId}:`, error);
      throw error;
    }
  }

  // Inventory Management
  async updateInventoryStock(
    productId: number,
    quantity: number,
    type: "add" | "subtract" | "set",
    notes?: string,
  ): Promise<Product | undefined> {
    if (!db) {
      console.error(`❌ Database is undefined in updateInventoryStock`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!database) {
      console.error(`❌ Database is undefined in getStoreSettings`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!database) {
      console.error(`❌ Database is undefined in updateStoreSettings`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!db) {
      console.error(`❌ Database is undefined in getSuppliers`);
      throw new Error(`Database connection is not available`);
    }
    return await db.select().from(suppliers).orderBy(suppliers.name);
  }

  async getSupplier(id: number): Promise<any> {
    if (!db) {
      console.error(`❌ Database is undefined in getSupplier`);
      throw new Error(`Database connection is not available`);
    }
    const [result] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, id));
    return result;
  }

  async getSuppliersByStatus(status: string): Promise<any> {
    if (!db) {
      console.error(`❌ Database is undefined in getSuppliersByStatus`);
      throw new Error(`Database connection is not available`);
    }
    return await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.status, status))
      .orderBy(suppliers.name);
  }

  async searchSuppliers(query: string): Promise<any> {
    if (!db) {
      console.error(`❌ Database is undefined in searchSuppliers`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!db) {
      console.error(`❌ Database is undefined in createSupplier`);
      throw new Error(`Database connection is not available`);
    }
    const [result] = await db.insert(suppliers).values(data).returning();
    return result;
  }

  async updateSupplier(
    id: number,
    data: Partial<InsertSupplier>,
  ): Promise<any> {
    if (!db) {
      console.error(`❌ Database is undefined in updateSupplier`);
      throw new Error(`Database connection is not available`);
    }
    const [result] = await db
      .update(suppliers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(suppliers.id, id))
      .returning();

    return result;
  }

  async deleteSupplier(id: number): Promise<boolean> {
    if (!db) {
      console.error(`❌ Database is undefined in deleteSupplier`);
      throw new Error(`Database connection is not available`);
    }
    const result = await db
      .delete(suppliers)
      .where(eq(suppliers.id, id))
      .returning();
    return result.length > 0;
  }

  // Customers
  async getCustomers(tenantDb?: any): Promise<Customer[]> {
    const database = tenantDb || db;
    if (!database) {
      console.error(`❌ Database is undefined in getCustomers`);
      throw new Error(`Database connection is not available`);
    }

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
    if (!db) {
      console.error(`❌ Database is undefined in searchCustomers`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!db) {
      console.error(`❌ Database is undefined in getCustomer`);
      throw new Error(`Database connection is not available`);
    }
    const [result] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id));
    return result || undefined;
  }

  async getCustomerByCustomerId(
    customerId: string,
  ): Promise<Customer | undefined> {
    if (!db) {
      console.error(`❌ Database is undefined in getCustomerByCustomerId`);
      throw new Error(`Database connection is not available`);
    }
    const [result] = await db
      .select()
      .from(customers)
      .where(eq(customers.customerId, customerId));
    return result || undefined;
  }

  async createCustomer(customerData: InsertCustomer): Promise<Customer> {
    if (!db) {
      console.error(`❌ Database is undefined in createCustomer`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!db) {
      console.error(`❌ Database is undefined in updateCustomer`);
      throw new Error(`Database connection is not available`);
    }
    const [result] = await db
      .update(customers)
      .set({ ...customerData, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return result || undefined;
  }

  async deleteCustomer(id: number): Promise<boolean> {
    if (!db) {
      console.error(`❌ Database is undefined in deleteCustomer`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!db) {
      console.error(`❌ Database is undefined in updateCustomerVisit`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!db) {
      console.error(`❌ Database is undefined in getCustomerPoints`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!db) {
      console.error(`❌ Database is undefined in updateCustomerPoints`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!db) {
      console.error(`❌ Database is undefined in getPointHistory`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!db) {
      console.error(`❌ Database is undefined in getAllPointTransactions`);
      throw new Error(`Database connection is not available`);
    }
    return await db
      .select()
      .from(pointTransactions)
      .orderBy(sql`${pointTransactions.createdAt} DESC`)
      .limit(limit);
  }

  // Get membership thresholds
  async getMembershipThresholds(): Promise<{ GOLD: number; VIP: number }> {
    if (!db) {
      console.error(`❌ Database is undefined in getMembershipThresholds`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!db) {
      console.error(`❌ Database is undefined in updateMembershipThresholds`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!db) {
      console.error(`❌ Database is undefined in recalculateAllMembershipLevels`);
      throw new Error(`Database connection is not available`);
    }
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
    try {
      const database = this.getSafeDatabase(tenantDb, 'getAllProducts');
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
    } catch (error) {
      console.error(`❌ Error in getAllProducts:`, error);
      return [];
    }
  }

  async getActiveProducts(tenantDb?: any): Promise<Product[]> {
    const database = tenantDb || db;
    if (!database) {
      console.error(`❌ Database is undefined in getActiveProducts`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!db) {
      console.error(`❌ Database is undefined in createProduct`);
      throw new Error(`Database connection is not available`);
    }
    const [product] = await db
      .insert(products)
      .values({
        ...productData,
        productType: productData.productType || 1,
      })
      .returning();
    return product;
  }

  // Invoice template methods
  async getInvoiceTemplates(tenantDb?: any): Promise<any[]> {
    const database = tenantDb || db;
    return await database.select().from(invoiceTemplates).orderBy(invoiceTemplates.name);
  },

  async getActiveInvoiceTemplates(): Promise<any[]> {
    return await db.select().from(invoiceTemplates).where(eq(invoiceTemplates.isActive, true)).orderBy(invoiceTemplates.name);
  },

  // Invoice methods
  async getInvoices(tenantDb?: any): Promise<any[]> {
    const database = tenantDb || db;
    return await database.select().from(invoices).orderBy(desc(invoices.createdAt));
  },

  async getInvoice(id: number, tenantDb?: any): Promise<any> {
    const database = tenantDb || db;
    const [invoice] = await database.select().from(invoices).where(eq(invoices.id, id));

    if (!invoice) return null;

    // Get invoice items
    const items = await database.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));

    return {
      ...invoice,
      items: items
    };
  },

  async createInvoice(invoiceData: any, tenantDb?: any): Promise<any> {
    const database = tenantDb || db;

    console.log('💾 Creating invoice in database:', invoiceData);

    try {
      // Insert invoice
      const [invoice] = await database.insert(invoices).values({
        invoiceNumber: invoiceData.invoiceNumber || null,
        templateNumber: invoiceData.templateNumber || null,
        symbol: invoiceData.symbol || null,
        customerName: invoiceData.customerName,
        customerTaxCode: invoiceData.customerTaxCode || null,
        customerAddress: invoiceData.customerAddress || null,
        customerPhone: invoiceData.customerPhone || null,
        customerEmail: invoiceData.customerEmail || null,
        subtotal: invoiceData.subtotal,
        tax: invoiceData.tax,
        total: invoiceData.total,
        paymentMethod: invoiceData.paymentMethod || 1,
        invoiceDate: invoiceData.invoiceDate || new Date(),
        status: invoiceData.status || 'draft',
        einvoiceStatus: invoiceData.einvoiceStatus || 0,
        notes: invoiceData.notes || null
      }).returning();

      console.log('✅ Invoice created:', invoice);

      // Insert invoice items if provided
      if (invoiceData.items && Array.isArray(invoiceData.items) && invoiceData.items.length > 0) {
        const itemsToInsert = invoiceData.items.map((item: any) => ({
          invoiceId: invoice.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          taxRate: item.taxRate || "0.00"
        }));

        await database.insert(invoiceItems).values(itemsToInsert);
        console.log(`✅ Inserted ${itemsToInsert.length} invoice items`);
      }

      return invoice;
    } catch (error) {
      console.error('❌ Error creating invoice:', error);
      throw error;
    }
  },

  async updateInvoice(id: number, updateData: any, tenantDb?: any): Promise<any> {
    const database = tenantDb || db;

    const [invoice] = await database.update(invoices)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(invoices.id, id))
      .returning();

    return invoice;
  },

  async deleteInvoice(id: number, tenantDb?: any): Promise<boolean> {
    const database = tenantDb || db;

    // Delete invoice items first
    await database.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));

    // Delete invoice
    const result = await database.delete(invoices).where(eq(invoices.id, id));

    return result.rowCount > 0;
  },

  // E-invoice connections methods
  async getEInvoiceConnections(): Promise<any[]> {
    if (!db) {
      console.error(`❌ Database is undefined in getEInvoiceConnections`);
      throw new Error(`Database connection is not available`);
    }
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
  },

  async getEInvoiceConnection(id: number): Promise<any> {
    if (!db) {
      console.error(`❌ Database is undefined in getEInvoiceConnection`);
      throw new Error(`Database connection is not available`);
    }
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
  },

  async createEInvoiceConnection(data: any): Promise<any> {
    if (!db) {
      console.error(`❌ Database is undefined in createEInvoiceConnection`);
      throw new Error(`Database connection is not available`);
    }
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
  },

  async updateEInvoiceConnection(id: number, data: any): Promise<any> {
    if (!db) {
      console.error(`❌ Database is undefined in updateEInvoiceConnection`);
      throw new Error(`Database connection is not available`);
    }
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
  },

  async deleteEInvoiceConnection(id: number): Promise<boolean> {
    if (!db) {
      console.error(`❌ Database is undefined in deleteEInvoiceConnection`);
      throw new Error(`Database connection is not available`);
    }
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
    if (!db) {
      console.error(`❌ Database is undefined in getEmployeeByEmail`);
      throw new Error(`Database connection is not available`);
    }
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