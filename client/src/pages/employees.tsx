import { useState } from "react";
import { POSHeader } from "@/components/pos/header";
import { RightSidebar } from "@/components/ui/right-sidebar";
import { EmployeeList } from "@/components/employees/employee-list";
import { EmployeeFormModal } from "@/components/employees/employee-form-modal";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { Link } from "wouter";

export default function EmployeesPage() {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="min-h-screen bg-green-50 grocery-bg">
      {/* Header */}
      <POSHeader />
      
      {/* Right Sidebar */}
      <RightSidebar />
      
      <div className="main-content pt-16 px-6">
        <div className="max-w-5xl mx-auto py-8">
          {/* Page Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">직원 관리</h1>
              <p className="mt-2 text-gray-600">직원 정보를 관리하고 추가/수정할 수 있습니다.</p>
            </div>
            <div className="flex gap-4">
              <Link href="/">
                <Button variant="outline">
                  POS로 돌아가기
                </Button>
              </Link>
              <Button onClick={() => setShowAddModal(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                직원 추가
              </Button>
            </div>
          </div>

          {/* Employee List */}
          <EmployeeList />

          {/* Add Employee Modal */}
          <EmployeeFormModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            mode="create"
          />
        </div>
      </div>
    </div>
  );
}