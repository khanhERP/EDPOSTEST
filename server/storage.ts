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
import { eq, ilike, and, gte, lte, or, sql } from "drizzle-orm";

export interface IStorage {
  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Products
  getProducts(): Promise<Product[]>;
  getProductsByCategory(categoryId: number): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  searchProducts(query: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(
    id: number,
    product: Partial<InsertProduct>,
  ): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
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
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
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
}

export class DatabaseStorage implements IStorage {
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db
      .insert(categories)
      .values(insertCategory)
      .returning();
    return category;
  }

  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.isActive, true));
  }

  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(
        and(eq(products.categoryId, categoryId), eq(products.isActive, true)),
      );
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.isActive, true)));
    return product || undefined;
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.sku, sku), eq(products.isActive, true)));
    return product || undefined;
  }

  async searchProducts(query: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(
        and(eq(products.isActive, true), ilike(products.name, `%${query}%`)),
      );
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values({
        ...insertProduct,
        imageUrl: insertProduct.imageUrl || null,
      })
      .returning();
    return product;
  }

  async updateProduct(
    id: number,
    updateData: Partial<InsertProduct>,
  ): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set({
        ...updateData,
        imageUrl: updateData.imageUrl || null,
      })
      .where(and(eq(products.id, id), eq(products.isActive, true)))
      .returning();
    return product || undefined;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const [product] = await db
      .update(products)
      .set({ isActive: false })
      .where(eq(products.id, id))
      .returning();
    return !!product;
  }

  async updateProductStock(
    id: number,
    quantity: number,
  ): Promise<Product | undefined> {
    const product = await this.getProduct(id);
    if (!product) return undefined;

    const newStock = Math.max(0, product.stock + quantity);
    const [updatedProduct] = await db
      .update(products)
      .set({ stock: newStock })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct || undefined;
  }

  async createTransaction(
    insertTransaction: InsertTransaction,
    items: InsertTransactionItem[],
  ): Promise<Receipt> {
    const [transaction] = await db
      .insert(transactions)
      .values({
        ...insertTransaction,
        amountReceived: insertTransaction.amountReceived || null,
        change: insertTransaction.change || null,
      })
      .returning();

    const transactionItemsWithIds: TransactionItem[] = [];
    for (const item of items) {
      const [transactionItem] = await db
        .insert(transactionItems)
        .values({
          ...item,
          transactionId: transaction.id,
        })
        .returning();

      // Update product stock
      await this.updateProductStock(item.productId, -item.quantity);
      transactionItemsWithIds.push(transactionItem);
    }

    return {
      ...transaction,
      items: transactionItemsWithIds,
    };
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

  async getTransactions(): Promise<Transaction[]> {
    return await db.select().from(transactions).orderBy(transactions.createdAt);
  }

  async getEmployees(): Promise<Employee[]> {
    return await db
      .select()
      .from(employees)
      .where(eq(employees.isActive, true));
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db
      .select()
      .from(employees)
      .where(and(eq(employees.id, id), eq(employees.isActive, true)));
    return employee || undefined;
  }

  async getEmployeeByEmployeeId(
    employeeId: string,
  ): Promise<Employee | undefined> {
    const [employee] = await db
      .select()
      .from(employees)
      .where(
        and(eq(employees.employeeId, employeeId), eq(employees.isActive, true)),
      );
    return employee || undefined;
  }

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const [employee] = await db
      .insert(employees)
      .values(insertEmployee)
      .returning();
    return employee;
  }

  async updateEmployee(
    id: number,
    updateData: Partial<InsertEmployee>,
  ): Promise<Employee | undefined> {
    const [employee] = await db
      .update(employees)
      .set(updateData)
      .where(and(eq(employees.id, id), eq(employees.isActive, true)))
      .returning();
    return employee || undefined;
  }

  async deleteEmployee(id: number): Promise<boolean> {
    const [employee] = await db
      .update(employees)
      .set({ isActive: false })
      .where(eq(employees.id, id))
      .returning();
    return !!employee;
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
    return record;
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
  async getOrders(tableId?: number, status?: string): Promise<Order[]> {
    const conditions = [];

    if (tableId) {
      conditions.push(eq(orders.tableId, tableId));
    }
    if (status) {
      conditions.push(eq(orders.status, status));
    }

    if (conditions.length > 0) {
      return await db
        .select()
        .from(orders)
        .where(and(...conditions))
        .orderBy(orders.orderedAt);
    }

    return await db.select().from(orders).orderBy(orders.orderedAt);
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
  ): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set(order)
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder || undefined;
  }

  async updateOrderStatus(
    id: number,
    status: string,
  ): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();

    // If order is paid, update table status to available
    if (order && status === "paid") {
      await this.updateTableStatus(order.tableId, "available");
    }

    return order || undefined;
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
  async getStoreSettings(): Promise<StoreSettings> {
    const [settings] = await db.select().from(storeSettings).limit(1);

    // If no settings exist, create default settings
    if (!settings) {
      const [newSettings] = await db
        .insert(storeSettings)
        .values({
          storeName: "EDPOS 레스토랑",
          storeCode: "STORE001",
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
  ): Promise<StoreSettings> {
    const currentSettings = await this.getStoreSettings();

    const [updatedSettings] = await db
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
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(customers.name);
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
    id: number,
    amount: number,
    points: number,
  ): Promise<Customer | undefined> {
    const customer = await this.getCustomer(id);
    if (!customer) return undefined;

    const newVisitCount = (customer.visitCount || 0) + 1;
    const newTotalSpent = parseFloat(customer.totalSpent || "0") + amount;
    const newPoints = (customer.points || 0) + points;

    // Determine membership level based on total spent
    let membershipLevel = "Bronze";
    if (newTotalSpent >= 1000000) membershipLevel = "Diamond";
    else if (newTotalSpent >= 500000) membershipLevel = "Platinum";
    else if (newTotalSpent >= 200000) membershipLevel = "Gold";
    else if (newTotalSpent >= 50000) membershipLevel = "Silver";

    const [result] = await db
      .update(customers)
      .set({
        visitCount: newVisitCount,
        totalSpent: newTotalSpent.toFixed(2),
        points: newPoints,
        membershipLevel,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id))
      .returning();

    return result || undefined;
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
}

export const storage = new DatabaseStorage();
