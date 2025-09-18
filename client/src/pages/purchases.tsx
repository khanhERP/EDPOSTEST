import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Plus, Search, Filter, BarChart3 } from "lucide-react";

interface PurchasesPageProps {
  onLogout?: () => void;
}

export default function PurchasesPage({ onLogout }: PurchasesPageProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-green-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ClipboardCheck className="w-8 h-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">{t("purchases.title")}</h1>
          </div>
          <p className="text-gray-600">{t("purchases.dashboard")}</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t("purchases.totalOrders")}
              </CardTitle>
              <ClipboardCheck className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">0</div>
              <p className="text-xs text-gray-500">+0% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t("purchases.pendingOrders")}
              </CardTitle>
              <ClipboardCheck className="w-4 h-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">0</div>
              <p className="text-xs text-gray-500">+0% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t("purchases.completedOrders")}
              </CardTitle>
              <ClipboardCheck className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">0</div>
              <p className="text-xs text-gray-500">+0% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t("purchases.totalValue")}
              </CardTitle>
              <BarChart3 className="w-4 h-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">₩0</div>
              <p className="text-xs text-gray-500">+0% from last month</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button className="bg-green-600 hover:bg-green-700" data-testid="button-create-purchase-order">
            <Plus className="w-4 h-4 mr-2" />
            {t("purchases.newPurchaseOrder")}
          </Button>
          <Button variant="outline" data-testid="button-search-purchases">
            <Search className="w-4 h-4 mr-2" />
            {t("purchases.searchPurchaseOrders")}
          </Button>
          <Button variant="outline" data-testid="button-filter-purchases">
            <Filter className="w-4 h-4 mr-2" />
            {t("purchases.filterBy")}
          </Button>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>{t("purchases.purchaseOrders")}</CardTitle>
            <CardDescription>
              {t("purchases.overview")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <ClipboardCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {t("purchases.noOrders")}
              </h3>
              <p className="text-gray-500 mb-6">
                Create your first purchase order to get started
              </p>
              <Button className="bg-green-600 hover:bg-green-700" data-testid="button-create-first-order">
                <Plus className="w-4 h-4 mr-2" />
                {t("purchases.createPurchaseOrder")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}