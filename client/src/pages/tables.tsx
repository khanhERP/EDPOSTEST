import { useState, useEffect } from "react";
import { POSHeader } from "@/components/pos/header";
import { RightSidebar } from "@/components/ui/right-sidebar";
import { TableGrid } from "@/components/tables/table-grid";
import { OrderManagement } from "@/components/orders/order-management";
import { TableManagement } from "@/components/tables/table-management";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Utensils, Settings, ClipboardList, ShoppingCart } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";

export default function TablesPage() {
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Add WebSocket listener for data refresh
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let shouldReconnect = true;

    const connectWebSocket = () => {
      if (!shouldReconnect) return;
      
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        console.log("📡 Tables: Attempting WebSocket connection to:", wsUrl);
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("📡 Tables: WebSocket connected successfully");
          
          // Clear any pending reconnect timer
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }
          
          // Register as table management client
          try {
            ws?.send(
              JSON.stringify({
                type: "register_table_management",
                timestamp: new Date().toISOString(),
              }),
            );
          } catch (sendError) {
            console.error("❌ Tables: Error sending registration message:", sendError);
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("📩 Tables: Received WebSocket message:", data);

            if (
              data.type === "popup_close" ||
              data.type === "payment_success" ||
              data.type === "force_refresh" ||
              data.type === "einvoice_published" ||
              data.type === "einvoice_saved_for_later"
            ) {
              console.log(
                "🔄 Tables: Refreshing data due to WebSocket signal:",
                data.type,
              );

              // Clear cache and force refresh
              queryClient.clear();
              queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
              queryClient.invalidateQueries({ queryKey: ["/api/orders"] });

              // Dispatch custom events for TableGrid component
              window.dispatchEvent(
                new CustomEvent("refreshTableData", {
                  detail: {
                    source: "tables_websocket",
                    reason: data.type,
                    timestamp: new Date().toISOString(),
                  },
                }),
              );
            }
          } catch (error) {
            console.error(
              "❌ Tables: Error processing WebSocket message:",
              error,
            );
          }
        };

        ws.onclose = (event) => {
          console.log("📡 Tables: WebSocket connection closed:", {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          
          if (shouldReconnect) {
            console.log("📡 Tables: Scheduling reconnect in 3 seconds...");
            reconnectTimer = setTimeout(() => {
              connectWebSocket();
            }, 3000);
          }
        };

        ws.onerror = (error) => {
          console.error("❌ Tables: WebSocket error occurred:", {
            error,
            readyState: ws?.readyState,
            url: wsUrl
          });
          
          // Don't immediately reconnect on error, let onclose handle it
          if (ws) {
            ws.close();
          }
        };
      } catch (error) {
        console.error("❌ Tables: Failed to create WebSocket connection:", error);
        
        if (shouldReconnect) {
          reconnectTimer = setTimeout(() => {
            connectWebSocket();
          }, 5000);
        }
      }
    };

    // Add custom event listeners for e-invoice events
    const handleEInvoiceEvents = (event: CustomEvent) => {
      console.log(
        "📧 Tables: E-invoice event received:",
        event.type,
        event.detail,
      );

      // Force data refresh for any e-invoice related events
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });

      // Dispatch refresh event for TableGrid
      window.dispatchEvent(
        new CustomEvent("refreshTableData", {
          detail: {
            source: "tables_einvoice_event",
            reason: event.type,
            timestamp: new Date().toISOString(),
          },
        }),
      );
    };

    // Listen for e-invoice related events
    window.addEventListener("einvoicePublished", handleEInvoiceEvents);
    window.addEventListener("einvoiceSavedForLater", handleEInvoiceEvents);
    window.addEventListener("forceDataRefresh", handleEInvoiceEvents);

    connectWebSocket();

    return () => {
      console.log("🧹 Tables: Cleaning up WebSocket and event listeners");
      shouldReconnect = false;
      
      // Clear reconnect timer
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      
      // Close WebSocket connection properly
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.close(1000, "Component unmounting");
        } catch (error) {
          console.error("❌ Tables: Error closing WebSocket:", error);
        }
      }
      
      // Clean up event listeners
      window.removeEventListener("einvoicePublished", handleEInvoiceEvents);
      window.removeEventListener("einvoiceSavedForLater", handleEInvoiceEvents);
      window.removeEventListener("forceDataRefresh", handleEInvoiceEvents);
    };
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-green-50 grocery-bg">
      {/* Header */}
      <POSHeader />

      {/* Right Sidebar */}
      <RightSidebar />

      <div className="main-content pt-16 px-6">
        <div className="mx-auto py-8">
          {/* Page Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t("tables.title")}
              </h1>
              <p className="mt-2 text-gray-600">{t("tables.description")}</p>
            </div>
          </div>

          <Tabs defaultValue="tables" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tables" className="flex items-center gap-2">
                <Utensils className="w-4 h-4" />
                {t("tables.tableStatus")}
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                {t("tables.orderManagement")}
              </TabsTrigger>
              <TabsTrigger
                value="management"
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                {t("tables.tableSettings")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tables">
              <TableGrid
                onTableSelect={setSelectedTableId}
                selectedTableId={selectedTableId}
              />
            </TabsContent>

            <TabsContent value="orders">
              <OrderManagement />
            </TabsContent>

            <TabsContent value="management">
              <TableManagement />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
