import { 
  categories, 
  products, 
  transactions, 
  transactionItems,
  employees,
  type Category, 
  type Product, 
  type Transaction, 
  type TransactionItem,
  type Employee,
  type InsertCategory, 
  type InsertProduct, 
  type InsertTransaction, 
  type InsertTransactionItem,
  type InsertEmployee,
  type Receipt
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, and } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
