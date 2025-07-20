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
  type Category, 
  type Product, 
  type Transaction, 
  type TransactionItem,
  type Employee,
  type AttendanceRecord,
  type Table,
  type Order,
  type OrderItem,
  type InsertCategory, 
  type InsertProduct, 
  type InsertTransaction, 
  type InsertTransactionItem,
  type InsertEmployee,
  type InsertAttendance,
  type InsertTable,
  type InsertOrder,
  type InsertOrderItem,
  type Receipt
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, and, gte, lte } from "drizzle-orm";

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
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  updateProductStock(id: number, quantity: number): Promise<Product | undefined>;

  // Transactions
  createTransaction(transaction: InsertTransaction, items: InsertTransactionItem[]): Promise<Receipt>;
  getTransaction(id: number): Promise<Receipt | undefined>;
  getTransactionByTransactionId(transactionId: string): Promise<Receipt | undefined>;
  getTransactions(): Promise<Transaction[]>;

  // Employees
  getEmployees(): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: number): Promise<boolean>;

  // Attendance
  getAttendanceRecords(employeeId?: number, date?: string): Promise<AttendanceRecord[]>;
  getAttendanceRecord(id: number): Promise<AttendanceRecord | undefined>;
  getTodayAttendance(employeeId: number): Promise<AttendanceRecord | undefined>;
  clockIn(employeeId: number, notes?: string): Promise<AttendanceRecord>;
  clockOut(attendanceId: number): Promise<AttendanceRecord | undefined>;
  startBreak(attendanceId: number): Promise<AttendanceRecord | undefined>;
  endBreak(attendanceId: number): Promise<AttendanceRecord | undefined>;
  updateAttendanceStatus(id: number, status: string): Promise<AttendanceRecord | undefined>;

  // Tables
  getTables(): Promise<Table[]>;
  getTable(id: number): Promise<Table | undefined>;
  getTableByNumber(tableNumber: string): Promise<Table | undefined>;
  createTable(table: InsertTable): Promise<Table>;
  updateTable(id: number, table: Partial<InsertTable>): Promise<Table | undefined>;
  updateTableStatus(id: number, status: string): Promise<Table | undefined>;
  deleteTable(id: number): Promise<boolean>;

  // Orders
  getOrders(tableId?: number, status?: string): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order | undefined>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
  addOrderItems(orderId: number, items: InsertOrderItem[]): Promise<OrderItem[]>;
  removeOrderItem(itemId: number): Promise<boolean>;
  getOrderItems(orderId: number): Promise<OrderItem[]>;
}

export class MemStorage implements IStorage {
  private categories: Map<number, Category>;
  private products: Map<number, Product>;
  private transactions: Map<number, Transaction>;
  private transactionItems: Map<number, TransactionItem>;
  private categoriesCurrentId: number;
  private productsCurrentId: number;
  private transactionsCurrentId: number;
  private transactionItemsCurrentId: number;

  constructor() {
    this.categories = new Map();
    this.products = new Map();
    this.transactions = new Map();
    this.transactionItems = new Map();
    this.categoriesCurrentId = 1;
    this.productsCurrentId = 1;
    this.transactionsCurrentId = 1;
    this.transactionItemsCurrentId = 1;

    // Initialize with sample data
    this.initializeData();
  }

  private initializeData() {
    // Create categories
    const categoryData = [
      { name: "Beverages", icon: "fas fa-coffee" },
      { name: "Snacks", icon: "fas fa-cookie-bite" },
      { name: "Electronics", icon: "fas fa-mobile-alt" },
      { name: "Household", icon: "fas fa-home" },
      { name: "Personal Care", icon: "fas fa-user" },
    ];

    categoryData.forEach(cat => {
      const category: Category = { ...cat, id: this.categoriesCurrentId++ };
      this.categories.set(category.id, category);
    });

    // Create products
    const productData = [
      { name: "Premium Coffee", sku: "BEV001", price: "4.99", stock: 24, categoryId: 1, imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" },
      { name: "Fresh Orange Juice", sku: "BEV002", price: "3.49", stock: 8, categoryId: 1, imageUrl: "https://images.unsplash.com/photo-1613478223719-2ab802602423?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" },
      { name: "Herbal Tea Collection", sku: "BEV003", price: "12.99", stock: 15, categoryId: 1, imageUrl: "https://images.unsplash.com/photo-1594631661960-1c2c9c955cd6?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" },
      { name: "Sparkling Water", sku: "BEV004", price: "1.99", stock: 32, categoryId: 1, imageUrl: "https://images.unsplash.com/photo-1523362628745-0c100150b504?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" },
      { name: "Energy Drink", sku: "BEV005", price: "2.79", stock: 3, categoryId: 1, imageUrl: "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" },
      { name: "Green Smoothie", sku: "BEV006", price: "5.99", stock: 12, categoryId: 1, imageUrl: "https://images.unsplash.com/photo-1570197788417-0e82375c9371?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" },
      { name: "Cold Brew Coffee", sku: "BEV007", price: "4.49", stock: 18, categoryId: 1, imageUrl: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" },
      { name: "Coconut Water", sku: "BEV008", price: "3.99", stock: 22, categoryId: 1, imageUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" },
      { name: "Chocolate Chips", sku: "SNK001", price: "2.99", stock: 45, categoryId: 2 },
      { name: "Potato Chips", sku: "SNK002", price: "1.79", stock: 67, categoryId: 2 },
      { name: "Wireless Earbuds", sku: "ELC001", price: "89.99", stock: 12, categoryId: 3 },
      { name: "Phone Charger", sku: "ELC002", price: "19.99", stock: 34, categoryId: 3 },
    ];

    productData.forEach(prod => {
      const product: Product = { 
        ...prod, 
        id: this.productsCurrentId++, 
        isActive: true,
        imageUrl: prod.imageUrl || null
      };
      this.products.set(product.id, product);
    });
  }

  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const category: Category = { ...insertCategory, id: this.categoriesCurrentId++ };
    this.categories.set(category.id, category);
    return category;
  }

  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values()).filter(p => p.isActive);
  }

  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    return Array.from(this.products.values()).filter(p => p.categoryId === categoryId && p.isActive);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const product = this.products.get(id);
    return product?.isActive ? product : undefined;
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    return Array.from(this.products.values()).find(p => p.sku === sku && p.isActive);
  }

  async searchProducts(query: string): Promise<Product[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.products.values()).filter(p => 
      p.isActive && (
        p.name.toLowerCase().includes(lowerQuery) || 
        p.sku.toLowerCase().includes(lowerQuery)
      )
    );
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const product: Product = { 
      ...insertProduct, 
      id: this.productsCurrentId++, 
      isActive: true,
      imageUrl: insertProduct.imageUrl || null
    };
    this.products.set(product.id, product);
    return product;
  }

  async updateProduct(id: number, updateData: Partial<InsertProduct>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product || !product.isActive) return undefined;

    const updatedProduct = { ...product, ...updateData };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const product = this.products.get(id);
    if (!product) return false;

    product.isActive = false;
    this.products.set(id, product);
    return true;
  }

  async updateProductStock(id: number, quantity: number): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product || !product.isActive) return undefined;

    product.stock = Math.max(0, product.stock + quantity);
    this.products.set(id, product);
    return product;
  }

  async createTransaction(insertTransaction: InsertTransaction, items: InsertTransactionItem[]): Promise<Receipt> {
    const transaction: Transaction = { 
      ...insertTransaction, 
      id: this.transactionsCurrentId++,
      createdAt: new Date(),
      amountReceived: insertTransaction.amountReceived || null,
      change: insertTransaction.change || null
    };
    this.transactions.set(transaction.id, transaction);

    const transactionItemsWithIds: TransactionItem[] = items.map(item => ({
      ...item,
      id: this.transactionItemsCurrentId++,
      transactionId: transaction.id
    }));

    transactionItemsWithIds.forEach(item => {
      this.transactionItems.set(item.id, item);
      // Update product stock
      this.updateProductStock(item.productId, -item.quantity);
    });

    return {
      ...transaction,
      items: transactionItemsWithIds
    };
  }

  async getTransaction(id: number): Promise<Receipt | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;

    const items = Array.from(this.transactionItems.values())
      .filter(item => item.transactionId === id);

    return { ...transaction, items };
  }

  async getTransactionByTransactionId(transactionId: string): Promise<Receipt | undefined> {
    const transaction = Array.from(this.transactions.values())
      .find(t => t.transactionId === transactionId);
    if (!transaction) return undefined;

    const items = Array.from(this.transactionItems.values())
      .filter(item => item.transactionId === transaction.id);

    return { ...transaction, items };
  }

  async getTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

// Database storage implementation
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
      .where(and(eq(products.categoryId, categoryId), eq(products.isActive, true)));
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
        and(
          eq(products.isActive, true),
          ilike(products.name, `%${query}%`)
        )
      );
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values({
        ...insertProduct,
        imageUrl: insertProduct.imageUrl || null
      })
      .returning();
    return product;
  }

  async updateProduct(id: number, updateData: Partial<InsertProduct>): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set({
        ...updateData,
        imageUrl: updateData.imageUrl || null
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

  async updateProductStock(id: number, quantity: number): Promise<Product | undefined> {
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

  async createTransaction(insertTransaction: InsertTransaction, items: InsertTransactionItem[]): Promise<Receipt> {
    const [transaction] = await db
      .insert(transactions)
      .values({
        ...insertTransaction,
        amountReceived: insertTransaction.amountReceived || null,
        change: insertTransaction.change || null
      })
      .returning();

    const transactionItemsWithIds: TransactionItem[] = [];
    for (const item of items) {
      const [transactionItem] = await db
        .insert(transactionItems)
        .values({
          ...item,
          transactionId: transaction.id
        })
        .returning();
      
      // Update product stock
      await this.updateProductStock(item.productId, -item.quantity);
      transactionItemsWithIds.push(transactionItem);
    }

    return {
      ...transaction,
      items: transactionItemsWithIds
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

  async getTransactionByTransactionId(transactionId: string): Promise<Receipt | undefined> {
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
    return await db
      .select()
      .from(transactions)
      .orderBy(transactions.createdAt);
  }

  async getEmployees(): Promise<Employee[]> {
    return await db.select().from(employees).where(eq(employees.isActive, true));
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db
      .select()
      .from(employees)
      .where(and(eq(employees.id, id), eq(employees.isActive, true)));
    return employee || undefined;
  }

  async getEmployeeByEmployeeId(employeeId: string): Promise<Employee | undefined> {
    const [employee] = await db
      .select()
      .from(employees)
      .where(and(eq(employees.employeeId, employeeId), eq(employees.isActive, true)));
    return employee || undefined;
  }

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const [employee] = await db
      .insert(employees)
      .values(insertEmployee)
      .returning();
    return employee;
  }

  async updateEmployee(id: number, updateData: Partial<InsertEmployee>): Promise<Employee | undefined> {
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

  async getAttendanceRecords(employeeId?: number, date?: string): Promise<AttendanceRecord[]> {
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
        lte(attendanceRecords.clockIn, endDate)
      );
    }
    
    let query = db.select().from(attendanceRecords);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(attendanceRecords.clockIn);
  }

  async getAttendanceRecord(id: number): Promise<AttendanceRecord | undefined> {
    const [record] = await db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.id, id));
    return record || undefined;
  }

  async getTodayAttendance(employeeId: number): Promise<AttendanceRecord | undefined> {
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
          lte(attendanceRecords.clockIn, tomorrow)
        )
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
    const totalMinutes = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60);
    let totalHours = totalMinutes / 60;

    // Subtract break time if any
    if (record.breakStart && record.breakEnd) {
      const breakMinutes = (new Date(record.breakEnd).getTime() - new Date(record.breakStart).getTime()) / (1000 * 60);
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

  async startBreak(attendanceId: number): Promise<AttendanceRecord | undefined> {
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

  async updateAttendanceStatus(id: number, status: string): Promise<AttendanceRecord | undefined> {
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
    const [table] = await db.select().from(tables).where(eq(tables.tableNumber, tableNumber));
    return table || undefined;
  }

  async createTable(table: InsertTable): Promise<Table> {
    const [newTable] = await db.insert(tables).values(table).returning();
    return newTable;
  }

  async updateTable(id: number, table: Partial<InsertTable>): Promise<Table | undefined> {
    const [updatedTable] = await db
      .update(tables)
      .set(table)
      .where(eq(tables.id, id))
      .returning();
    return updatedTable || undefined;
  }

  async updateTableStatus(id: number, status: string): Promise<Table | undefined> {
    const [table] = await db
      .update(tables)
      .set({ status })
      .where(eq(tables.id, id))
      .returning();
    return table || undefined;
  }

  async deleteTable(id: number): Promise<boolean> {
    const result = await db.delete(tables).where(eq(tables.id, id));
    return result.rowCount > 0;
  }

  // Orders
  async getOrders(tableId?: number, status?: string): Promise<Order[]> {
    let query = db.select().from(orders);
    const conditions = [];

    if (tableId) {
      conditions.push(eq(orders.tableId, tableId));
    }
    if (status) {
      conditions.push(eq(orders.status, status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(orders.orderedAt);
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
    return order || undefined;
  }

  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    
    if (items.length > 0) {
      const itemsWithOrderId = items.map(item => ({ ...item, orderId: newOrder.id }));
      await db.insert(orderItems).values(itemsWithOrderId);
    }

    // Update table status to occupied
    await this.updateTableStatus(newOrder.tableId, "occupied");

    return newOrder;
  }

  async updateOrder(id: number, order: Partial<InsertOrder>): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set(order)
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder || undefined;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
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

  async addOrderItems(orderId: number, items: InsertOrderItem[]): Promise<OrderItem[]> {
    const itemsWithOrderId = items.map(item => ({ ...item, orderId }));
    return await db.insert(orderItems).values(itemsWithOrderId).returning();
  }

  async removeOrderItem(itemId: number): Promise<boolean> {
    const result = await db.delete(orderItems).where(eq(orderItems.id, itemId));
    return result.rowCount > 0;
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }
}

export const storage = new DatabaseStorage();
