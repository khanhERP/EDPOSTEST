
import express from "express";
import { db } from "./db";
import {
  categories,
  products,
  employees,
  tables,
  orders,
  orderItems,
  transactions,
  transactionItems,
  attendanceRecords,
  storeSettings,
  suppliers,
  customers,
} from "@shared/schema";
import { sql, eq, desc, and, gte, lte } from "drizzle-orm";

export function registerRoutes(app: express.Application) {
  // Categories endpoints
  app.get("/api/categories", async (req, res) => {
    try {
      const result = await db.select().from(categories);
      res.json(result);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Products endpoints
  app.get("/api/products", async (req, res) => {
    try {
      const result = await db.select().from(products);
      res.json(result);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Orders endpoints
  app.get("/api/orders", async (req, res) => {
    try {
      const result = await db.select().from(orders).orderBy(desc(orders.createdAt));
      res.json(result);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders/:orderId/items", async (req, res) => {
    const { orderId } = req.params;
    const { items } = req.body;

    try {
      // Insert new order items
      if (items && items.length > 0) {
        await db.insert(orderItems).values(
          items.map((item: any) => ({
            orderId: parseInt(orderId),
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toString(),
            total: item.total.toString(),
            productName: item.productName,
          }))
        );
      }

      // Update order total using accurate tax calculation
      const allOrderItems = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, parseInt(orderId)));

      let calculatedSubtotal = 0;
      let calculatedTax = 0;

      // Calculate totals using accurate tax calculation
      for (const orderItem of allOrderItems) {
        const basePrice = Number(orderItem.unitPrice || 0);
        const quantity = Number(orderItem.quantity || 0);
        
        // Get product for tax calculation
        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, orderItem.productId));

        // Calculate subtotal (base price without tax)
        calculatedSubtotal += basePrice * quantity;

        // Calculate tax using afterTaxPrice if available
        if (product?.afterTaxPrice && product.afterTaxPrice !== null && product.afterTaxPrice !== "") {
          const afterTaxPrice = parseFloat(product.afterTaxPrice);
          const taxPerUnit = Math.max(0, afterTaxPrice - basePrice);
          calculatedTax += Math.floor(taxPerUnit * quantity);
        }
      }

      const calculatedTotal = calculatedSubtotal + calculatedTax;

      await db
        .update(orders)
        .set({
          subtotal: calculatedSubtotal.toFixed(2),
          tax: calculatedTax.toFixed(2),
          total: calculatedTotal.toFixed(2),
        })
        .where(eq(orders.id, parseInt(orderId)));

      res.json({ 
        message: "Order items added successfully",
        subtotal: calculatedSubtotal.toFixed(2),
        tax: calculatedTax.toFixed(2),
        total: calculatedTotal.toFixed(2)
      });
    } catch (error) {
      console.error("Error adding order items:", error);
      res.status(500).json({ error: "Failed to add order items" });
    }
  });

  // Tables endpoints
  app.get("/api/tables", async (req, res) => {
    try {
      const result = await db.select().from(tables);
      res.json(result);
    } catch (error) {
      console.error("Error fetching tables:", error);
      res.status(500).json({ error: "Failed to fetch tables" });
    }
  });

  // Basic CRUD operations for other entities
  app.get("/api/employees", async (req, res) => {
    try {
      const result = await db.select().from(employees);
      res.json(result);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  app.get("/api/transactions", async (req, res) => {
    try {
      const result = await db.select().from(transactions).orderBy(desc(transactions.createdAt));
      res.json(result);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.get("/api/suppliers", async (req, res) => {
    try {
      const result = await db.select().from(suppliers);
      res.json(result);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ error: "Failed to fetch suppliers" });
    }
  });

  app.get("/api/customers", async (req, res) => {
    try {
      const result = await db.select().from(customers);
      res.json(result);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/settings", async (req, res) => {
    try {
      const result = await db.select().from(storeSettings);
      res.json(result[0] || {});
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
  });

  return app;
}
