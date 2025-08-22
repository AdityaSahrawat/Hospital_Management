"use client"
import React, { useState } from 'react';
import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';
import StaffManagement from './StaffManagement';
import BedManagement from './bedManagement';
import DiseaseManagement from './diseaseManagement_new';
import MedicineManagement from './MedicineManagement';
import InventoryManagement from './InventoryManagement';

type TabType = 'staff' | 'beds' | 'diseases' | 'medicines' | 'inventory';

const ManagePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('staff');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Home Navigation */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Hospital Management</h1>
          <Link 
            href="/" 
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg"
          >
            <Home className="h-5 w-5" />
            <span>Back to Home</span>
            <ArrowLeft className="h-4 w-4 rotate-180" />
          </Link>
        </div>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'staff', label: 'Staff Management' },
              { key: 'beds', label: 'Bed Management' },
              { key: 'diseases', label: 'Disease Management' },
              { key: 'medicines', label: 'Medicine Management' },
              { key: 'inventory', label: 'Inventory Management' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as TabType)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'staff' && <StaffManagement />}
          {activeTab === 'beds' && <BedManagement/>}
          {activeTab === 'diseases' && <DiseaseManagement />}
          {activeTab === 'medicines' && <MedicineManagement />}
          {activeTab === 'inventory' && <InventoryManagement />}
        </div>
      </div>
    </div>
  );
};

export default ManagePage;
