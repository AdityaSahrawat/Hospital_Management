"use client"
import React, { useState } from 'react';
import StaffManagement from './StaffManagement';
import BedManagement from './bedManagement';
import DiseaseManagement from './diseaseManagement';

type TabType = 'staff' | 'beds' | 'diseases';

const ManagePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('staff');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Hospital Management</h1>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'staff', label: 'Staff Management' },
              { key: 'beds', label: 'Bed Management' },
              { key: 'diseases', label: 'Disease Management' }
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
        </div>
      </div>
    </div>
  );
};

export default ManagePage;
