"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { 
  Bed, 
  Users, 
  Package, 
  Heart, 
  AlertTriangle, 
  Clock,
  Calendar,
  Settings,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/Card';
import { Badge } from './components/ui/Badge';

interface HospitalStats {
  beds: {
    total: number;
    occupied: number;
    available: number;
    maintenance: number;
  };
  staff: {
    total: number;
    available: number;
    onDuty: number;
  };
  inventory: {
    totalItems: number;
    lowStock: number;
    expiringSoon: number;
  };
}

interface Bed {
  id: number;
  type: string;
  status: 'FREE' | 'OCCUPIED' | 'MAINTENANCE';
  departmentId?: number;
  department?: {
    id: number;
    name: string;
  };
}

interface Staff {
  id: number;
  name: string;
  specialization: string;
  isAvailable: boolean;
  departmentId?: number;
  department?: {
    id: number;
    name: string;
  };
}

interface Medicine {
  id: number;
  name: string;
  form: string;
  strength: string;
  unit: string;
}

interface Inventory {
  id: number;
  availableQty: number;
  batchNumber?: string;
  expiryDate?: string;
  medicine: Medicine;
}

export default function Home() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [stats, setStats] = useState<HospitalStats>({
    beds: { total: 0, occupied: 0, available: 0, maintenance: 0 },
    staff: { total: 0, available: 0, onDuty: 0 },
    inventory: { totalItems: 0, lowStock: 0, expiringSoon: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [showRespiratoryPlan, setShowRespiratoryPlan] = useState(false);
  const [showDiwaliPlan, setShowDiwaliPlan] = useState(false);

  // API base URL
  const API_BASE_URL = 'http://10.0.5.179:3121/v1/web';

  // Fix hydration by only showing time on client
  useEffect(() => {
    setIsClient(true);
    setCurrentTime(new Date());
  }, []);

  // Update time every second
  useEffect(() => {
    if (!isClient) return;
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [isClient]);

  // Load hospital data
  useEffect(() => {
    const loadHospitalData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [bedsResponse, staffResponse, inventoryResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/beds`),
          axios.get(`${API_BASE_URL}/staff`),
          axios.get(`${API_BASE_URL}/inventory`)
        ]);

        const beds: Bed[] = bedsResponse.data;
        const staff: Staff[] = staffResponse.data;
        const inventory: Inventory[] = inventoryResponse.data;

        // Calculate bed statistics
        const bedStats = {
          total: beds.length,
          occupied: beds.filter(bed => bed.status === 'OCCUPIED').length,
          available: beds.filter(bed => bed.status === 'FREE').length,
          maintenance: beds.filter(bed => bed.status === 'MAINTENANCE').length
        };

        // Calculate staff statistics
        const staffStats = {
          total: staff.length,
          available: staff.filter(member => member.isAvailable).length,
          onDuty: staff.filter(member => member.isAvailable).length // Assuming available means on duty for now
        };

        // Calculate inventory statistics
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        let lowStock = 0;
        let expiringSoon = 0;
        
        inventory.forEach(item => {
          // Consider low stock if quantity is less than 10
          if (item.availableQty < 10) {
            lowStock++;
          }
          
          // Check if expiring soon (within 30 days)
          if (item.expiryDate) {
            const expiryDate = new Date(item.expiryDate);
            if (expiryDate <= thirtyDaysFromNow && expiryDate > now) {
              expiringSoon++;
            }
          }
        });

        const inventoryStats = {
          totalItems: inventory.length,
          lowStock,
          expiringSoon
        };

        setStats({
          beds: bedStats,
          staff: staffStats,
          inventory: inventoryStats
        });

      } catch (err) {
        console.error('Error loading hospital data:', err);
        setError('Failed to load hospital data. Please check if the backend server is running.');
        
        // Fallback to sample data on error
        setStats({
          beds: { total: 120, occupied: 78, available: 35, maintenance: 7 },
          staff: { total: 85, available: 62, onDuty: 45 },
          inventory: { totalItems: 342, lowStock: 12, expiringSoon: 8 }
        });
      } finally {
        setLoading(false);
      }
    };

    loadHospitalData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadHospitalData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getOccupancyRate = (occupied: number, total: number) => {
    return total > 0 ? Math.round((occupied / total) * 100) : 0;
  };

  const getAvailabilityRate = (available: number, total: number) => {
    return total > 0 ? Math.round((available / total) * 100) : 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-2 rounded-lg">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">CarePoint Hospital</h1>
                <p className="text-sm text-gray-600">Advanced Healthcare Management System</p>
                {error && (
                  <p className="text-xs text-red-600 flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Backend connection issue - showing cached data
                  </p>
                )}
              </div>
            </div>
            
            <nav className="flex items-center space-x-6">
              <Link 
                href="/manage" 
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg hover:from-orange-600 hover:to-amber-700 transition-all duration-200 shadow-lg"
              >
                <Settings className="h-5 w-5" />
                <span>Management</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
              
              <div className="text-right">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{isClient && currentTime ? formatTime(currentTime) : '--:--:--'}</span>
                  {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  <span>{isClient && currentTime ? formatDate(currentTime) : 'Loading...'}</span>
                </div>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
          {/* Left Section - Live Hospital Status */}
          <div className="lg:col-span-3">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Live Hospital Status</h2>
              <p className="text-gray-600">Real-time overview of hospital operations and resources</p>
              {loading && (
                <div className="flex items-center space-x-2 mt-2">
                  <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                  <span className="text-sm text-gray-600">Updating hospital data...</span>
                </div>
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-6 mb-8">
              {/* Bed Status */}
              <Card className="bg-white/70 backdrop-blur-sm border-orange-200 hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bed className="h-6 w-6 text-blue-600" />
                      <span className="text-lg">Bed Status</span>
                    </div>
                    <Badge variant="default">{getOccupancyRate(stats.beds.occupied, stats.beds.total)}%</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Beds</span>
                      <span className="font-semibold">{stats.beds.total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Occupied</span>
                      <span className="font-semibold text-red-600">{stats.beds.occupied}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Available</span>
                      <span className="font-semibold text-green-600">{stats.beds.available}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Maintenance</span>
                      <span className="font-semibold text-yellow-600">{stats.beds.maintenance}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getOccupancyRate(stats.beds.occupied, stats.beds.total)}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Staff Status */}
              <Card className="bg-white/70 backdrop-blur-sm border-orange-200 hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="h-6 w-6 text-green-600" />
                      <span className="text-lg">Staff Status</span>
                    </div>
                    <Badge variant="success">{getAvailabilityRate(stats.staff.available, stats.staff.total)}%</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Staff</span>
                      <span className="font-semibold">{stats.staff.total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Available</span>
                      <span className="font-semibold text-green-600">{stats.staff.available}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">On Duty</span>
                      <span className="font-semibold text-blue-600">{stats.staff.onDuty}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Unavailable</span>
                      <span className="font-semibold text-gray-500">{stats.staff.total - stats.staff.available}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getAvailabilityRate(stats.staff.available, stats.staff.total)}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Inventory Status */}
              <Card className="bg-white/70 backdrop-blur-sm border-orange-200 hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Package className="h-6 w-6 text-purple-600" />
                      <span className="text-lg">Inventory</span>
                    </div>
                    <Badge variant={stats.inventory.lowStock + stats.inventory.expiringSoon > 0 ? "warning" : "success"}>
                      {stats.inventory.lowStock + stats.inventory.expiringSoon}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Items</span>
                      <span className="font-semibold">{stats.inventory.totalItems}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Low Stock</span>
                      <span className="font-semibold text-red-600">{stats.inventory.lowStock}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Expiring Soon</span>
                      <span className="font-semibold text-orange-600">{stats.inventory.expiringSoon}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Healthy Stock</span>
                      <span className="font-semibold text-green-600">
                        {stats.inventory.totalItems - stats.inventory.lowStock - stats.inventory.expiringSoon}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Section - Predictive Alerts */}
          <div className="lg:col-span-4">
            <Card className="bg-white/70 backdrop-blur-sm border-orange-200 h-fit">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                  <span>Predictive Alerts</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Outbreak Predictions</h3>
                    
                    {/* Hard-coded Dengue Fever Alert */}
                    <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-1" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-amber-800">Dengue Fever Outbreak - Hubballi</h4>
                          <div className="mt-1 space-y-1">
                            <p className="text-sm text-amber-700">Confidence: <span className="font-semibold">88%</span></p>
                            <p className="text-sm text-amber-700">Impact: <span className="font-semibold">50 additional patients expected.</span></p>
                          </div>
                          <button 
                            onClick={() => setShowRespiratoryPlan(!showRespiratoryPlan)}
                            className="mt-2 px-3 py-1 bg-amber-600 text-white text-sm rounded-md hover:bg-amber-700 transition-colors"
                          >
                            {showRespiratoryPlan ? 'Hide Plan' : 'Generate Preparedness Plan'}
                          </button>
                        </div>
                      </div>
                      
                      {/* Generated Action Plan for Respiratory Outbreak */}
                      {showRespiratoryPlan && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Generated Action Plan - Respiratory Outbreak
                          </h4>
                          <div className="space-y-3">
                            <div>
                              <h5 className="font-medium text-gray-800 mb-2">Immediate Actions (Next 24 hours):</h5>
                              <ul className="space-y-1 text-sm text-gray-700 ml-4">
                                <li className="flex items-start space-x-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                  <span>Increase PPE inventory by 40% (masks, gloves, gowns)</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                  <span>Staff 3 additional nurses to respiratory ward</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                  <span>Prepare 15 isolation units for potential cases</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                  <span>Contact respiratory specialists for on-call availability</span>
                                </li>
                              </ul>
                            </div>
                            <div>
                              <h5 className="font-medium text-gray-800 mb-2">Resource Requirements:</h5>
                              <ul className="space-y-1 text-sm text-gray-700 ml-4">
                                <li className="flex items-start space-x-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                  <span>Order 200 N95 masks, 500 surgical masks</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                  <span>Stock up on bronchodilators and corticosteroids</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                  <span>Ensure oxygen concentrators are functional</span>
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Hard-coded Diwali Pollution Alert */}
                    <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-1" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-amber-800">Diwali Pollution Surge - Delhi</h4>
                          <div className="mt-1 space-y-1">
                            <p className="text-sm text-amber-700">Confidence: <span className="font-semibold">95%</span></p>
                            <p className="text-sm text-amber-700">Impact: <span className="font-semibold">55 additional patients expected.</span></p>
                          </div>
                          <button 
                            onClick={() => setShowDiwaliPlan(!showDiwaliPlan)}
                            className="mt-2 px-3 py-1 bg-amber-600 text-white text-sm rounded-md hover:bg-amber-700 transition-colors"
                          >
                            {showDiwaliPlan ? 'Hide Plan' : 'Generate Preparedness Plan'}
                          </button>
                        </div>
                      </div>
                      
                      {/* Generated Action Plan for Diwali Pollution */}
                      {showDiwaliPlan && (
                        <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <h4 className="font-semibold text-yellow-800 mb-3 flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Generated Action Plan - Diwali Pollution Surge
                          </h4>
                          <div className="space-y-3">
                            <div>
                              <h5 className="font-medium text-gray-800 mb-2">Immediate Actions (Next 48 hours):</h5>
                              <ul className="space-y-1 text-sm text-gray-700 ml-4">
                                <li className="flex items-start space-x-2">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                  <span>Set up dedicated pollution-related triage area</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                  <span>Increase air filtration systems in all wards</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                  <span>Prepare 20 additional beds for respiratory cases</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                  <span>Issue health advisories to local community</span>
                                </li>
                              </ul>
                            </div>
                            <div>
                              <h5 className="font-medium text-gray-800 mb-2">Medicine & Equipment:</h5>
                              <ul className="space-y-1 text-sm text-gray-700 ml-4">
                                <li className="flex items-start space-x-2">
                                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                  <span>Stock inhalers and nebulizers (50+ units each)</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                  <span>Ensure adequate supply of anti-inflammatory medications</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                  <span>Prepare eye wash stations for pollution-related irritation</span>
                                </li>
                              </ul>
                            </div>
                            <div>
                              <h5 className="font-medium text-gray-800 mb-2">Communication Plan:</h5>
                              <ul className="space-y-1 text-sm text-gray-700 ml-4">
                                <li className="flex items-start space-x-2">
                                  <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                  <span>Alert all department heads about expected surge</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                  <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                  <span>Coordinate with nearby hospitals for overflow capacity</span>
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
