"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Client } from "@gradio/client";
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
  Loader2,
  RefreshCw,
  Timer,
  TrendingUp,
  Activity,
  Shield,
  CheckCircle,
  XCircle,
  Pill,
  Stethoscope
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/Card';
import { Badge } from './components/ui/Badge';

// Types for the dashboard
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
    expired: number;
  };
}

interface DashboardBed {
  id: number;
  type: string;
  status: 'FREE' | 'OCCUPIED' | 'MAINTENANCE';
  departmentId?: number;
  department?: {
    id: number;
    name: string;
  };
}

interface DashboardStaff {
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

interface PredictionData {
  predictions?: string[];
  message?: string;
}

// Function to parse structured prediction text
interface ParsedPrediction {
  summary?: {
    totalInflow: string;
    situation: string;
  };
  alerts?: string[];
  bedStatus?: {
    totalFree: string;
    ward: string;
    icu: string;
    ventilator: string;
  };
  medicineInventory?: string[];
  actionPlan?: {
    immediate: string[];
    resources: string[];
  };
}

const parsePredictionText = (text: string): ParsedPrediction => {
  const parsed: ParsedPrediction = {};
  
  // Extract total predicted inflow
  const inflowMatch = text.match(/Total Predicted Inflow.*?(\d+)\s*patients/i);
  const situationMatch = text.match(/Total Predicted Inflow.*?patients\.\s*([^-#]+)/);
  
  if (inflowMatch || situationMatch) {
    parsed.summary = {
      totalInflow: inflowMatch ? inflowMatch[1] : 'N/A',
      situation: situationMatch ? situationMatch[1].trim() : ''
    };
  }

  // Extract predictive alerts
  const alertsSection = text.match(/### ⚠️ Predictive Alerts([^#]+)/);
  if (alertsSection) {
    const alerts = alertsSection[1]
      .split('*')
      .map(alert => alert.trim())
      .filter(alert => alert && !alert.toLowerCase().includes('none'));
    parsed.alerts = alerts.length > 0 ? alerts : ['No significant alerts at this time'];
  }

  // Extract bed status
  const bedMatch = text.match(/Total Free:\s*(\d+).*?Ward:\s*(\d+).*?ICU:\s*(\d+).*?Ventilator:\s*(\d+)/);
  if (bedMatch) {
    parsed.bedStatus = {
      totalFree: bedMatch[1],
      ward: bedMatch[2],
      icu: bedMatch[3],
      ventilator: bedMatch[4]
    };
  }

  // Extract action plan
  const immediateSection = text.match(/Immediate Actions:([^*]+?)(?=\* Resource Requirements|\*\* Resource Requirements|$)/);
  const resourcesSection = text.match(/Resource Requirements:([^$]+)$/);

  if (immediateSection || resourcesSection) {
    parsed.actionPlan = { immediate: [], resources: [] };
    
    if (immediateSection) {
      const immediate = immediateSection[1]
        .split(/\d+\./)
        .map(item => item.trim())
        .filter(item => item && item.length > 5);
      parsed.actionPlan.immediate = immediate;
    }

    if (resourcesSection) {
      const resources = resourcesSection[1]
        .split(/\d+\./)
        .map(item => item.trim())
        .filter(item => item && item.length > 5);
      parsed.actionPlan.resources = resources;
    }
  }

  return parsed;
};

export default function Home() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [stats, setStats] = useState<HospitalStats>({
    beds: { total: 0, occupied: 0, available: 0, maintenance: 0 },
    staff: { total: 0, available: 0, onDuty: 0 },
    inventory: { totalItems: 0, lowStock: 0, expiringSoon: 0, expired: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [showRespiratoryPlan, setShowRespiratoryPlan] = useState(false);
  const [showExpiredItems, setShowExpiredItems] = useState(false);
  const [predictions, setPredictions] = useState<PredictionData | null>(null);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [predictionsError, setPredictionsError] = useState<string | null>(null);
  
  // New state for timer functionality
  const [nextPredictionTime, setNextPredictionTime] = useState<Date | null>(null);
  const [timeUntilNextPrediction, setTimeUntilNextPrediction] = useState<string>('');
  const [predictionInterval, setPredictionInterval] = useState<NodeJS.Timeout | null>(null);
  const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null);

  // API base URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  // Function to format time remaining
  const formatTimeRemaining = (targetTime: Date): string => {
    const now = new Date();
    const diff = targetTime.getTime() - now.getTime();
    
    if (diff <= 0) {
      return '00:00:00';
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Function to fetch predictions from Gradio API
  const fetchPredictions = useCallback(async () => {
    try {
      setPredictionsLoading(true);
      setPredictionsError(null);
      
      const client = await Client.connect("shreyaspb/AGENT_3");
      const result = await client.predict("/predict", { 		
        user_query: "forecast for today", 
      });
      
      console.log("Prediction result:", result.data);
      
      // Handle the array format from Gradio API
      if (Array.isArray(result.data) && result.data.length > 0) {
        setPredictions({ 
          predictions: result.data as string[],
          message: "Predictions loaded successfully" 
        });
      } else {
        setPredictions({ 
          predictions: [],
          message: "No predictions available" 
        });
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
      setPredictionsError('Failed to load predictions');
    } finally {
      setPredictionsLoading(false);
    }
  }, []);

  // Function to schedule next prediction
  const scheduleNextPrediction = useCallback(() => {
    const nextTime = new Date();
    nextTime.setHours(nextTime.getHours() + 1);
    setNextPredictionTime(nextTime);

    // Clear existing interval
    if (predictionInterval) {
      clearTimeout(predictionInterval);
    }

    // Schedule next prediction
    const timeout = setTimeout(() => {
      fetchPredictions();
      scheduleNextPrediction(); // Schedule the next one
    }, 60 * 60 * 1000); // 1 hour in milliseconds

    setPredictionInterval(timeout);
  }, [fetchPredictions, predictionInterval]);

  // Function to manually fetch predictions and reset timer
  const manualFetchPredictions = useCallback(() => {
    fetchPredictions();
    scheduleNextPrediction(); // Reset the 1-hour timer
  }, [fetchPredictions, scheduleNextPrediction]);

  // Fix hydration by only showing time on client
  useEffect(() => {
    setIsClient(true);
    setCurrentTime(new Date());
  }, []);

  // Update time every second and countdown timer
  useEffect(() => {
    if (!isClient) return;
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      
      // Update countdown timer
      if (nextPredictionTime) {
        setTimeUntilNextPrediction(formatTimeRemaining(nextPredictionTime));
      }
    }, 1000);

    setCountdownInterval(timer);
    return () => clearInterval(timer);
  }, [isClient, nextPredictionTime]);

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

        const beds: DashboardBed[] = bedsResponse.data;
        const staff: DashboardStaff[] = staffResponse.data;
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
        let expired = 0;
        
        inventory.forEach(item => {
          // Consider low stock if quantity is less than 10
          if (item.availableQty < 10) {
            lowStock++;
          }
          
          // Check expiry status
          if (item.expiryDate) {
            const expiryDate = new Date(item.expiryDate);
            if (expiryDate < now) {
              expired++;
            } else if (expiryDate <= thirtyDaysFromNow) {
              expiringSoon++;
            }
          }
        });

        const inventoryStats = {
          totalItems: inventory.length,
          lowStock,
          expiringSoon,
          expired
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
          inventory: { totalItems: 342, lowStock: 12, expiringSoon: 8, expired: 5 }
        });
      } finally {
        setLoading(false);
      }
    };

    loadHospitalData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadHospitalData, 30000);
    return () => clearInterval(interval);
  }, [API_BASE_URL]);

  // Initial prediction fetch and schedule
  useEffect(() => {
    fetchPredictions();
    scheduleNextPrediction();

    // Cleanup on unmount
    return () => {
      if (predictionInterval) {
        clearTimeout(predictionInterval);
      }
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
    // eslint-disable-next-line
  }, []); // Empty dependency to run only once on mount

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
                    <div className="flex items-center space-x-2">
                      <Badge variant={stats.inventory.lowStock + stats.inventory.expiringSoon + stats.inventory.expired > 0 ? "warning" : "success"}>
                        {stats.inventory.lowStock + stats.inventory.expiringSoon + stats.inventory.expired}
                      </Badge>
                      {stats.inventory.expired > 0 && (
                        <button
                          onClick={() => setShowExpiredItems(!showExpiredItems)}
                          className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-md hover:bg-red-200 transition-colors"
                        >
                          {showExpiredItems ? 'Hide' : 'Show'} Expired
                        </button>
                      )}
                    </div>
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
                      <span className="text-sm text-gray-600">Expired</span>
                      <span className="font-semibold text-red-700">{stats.inventory.expired}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Healthy Stock</span>
                      <span className="font-semibold text-green-600">
                        {stats.inventory.totalItems - stats.inventory.lowStock - stats.inventory.expiringSoon - stats.inventory.expired}
                      </span>
                    </div>
                    
                    {/* Expired Items Details */}
                    {showExpiredItems && stats.inventory.expired > 0 && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <h5 className="font-medium text-red-800 mb-2 flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Expired Items Alert
                        </h5>
                        <p className="text-sm text-red-700 mb-2">
                          {stats.inventory.expired} items have expired and need immediate attention.
                        </p>
                        <div className="text-xs text-red-600">
                          <p>• Remove from active inventory immediately</p>
                          <p>• Follow proper disposal protocols</p>
                          <p>• Update inventory records</p>
                          <p>• Consider reordering if necessary</p>
                        </div>
                        <Link 
                          href="/manage"
                          className="inline-block mt-2 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                        >
                          Manage Inventory
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Section - Predictive Alerts */}
          <div className="lg:col-span-4">
            <Card className="bg-white/70 backdrop-blur-sm border-orange-200 h-fit">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                    <span>Predictive Alerts</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    {/* Timer Display */}
                    <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
                      <Timer className="h-4 w-4" />
                      <span className="font-mono">{timeUntilNextPrediction || '01:00:00'}</span>
                    </div>
                    {/* Manual Refresh Button */}
                    <button
                      onClick={manualFetchPredictions}
                      disabled={predictionsLoading}
                      className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <RefreshCw className={`h-4 w-4 ${predictionsLoading ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">Outbreak Predictions</h3>
                    {predictionsLoading && (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                        <span className="text-sm text-gray-600">Loading predictions...</span>
                      </div>
                    )}
                  </div>
                    
                  {predictionsError && (
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <p className="text-sm text-red-700">{predictionsError}</p>
                      </div>
                    </div>
                  )}

                  {predictions && predictions.predictions && predictions.predictions.length > 0 ? (
                    predictions.predictions.map((predictionText: string, index: number) => {
                      const parsedData = parsePredictionText(predictionText);
                      
                      return (
                        <div key={index} className="space-y-4">
                          {/* Summary Card */}
                          {parsedData.summary && (
                            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                              <div className="flex items-start space-x-3">
                                <TrendingUp className="h-6 w-6 text-blue-600 mt-1" />
                                <div className="flex-1">
                                  <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
                                    <Activity className="h-4 w-4 mr-2" />
                                    Overall Situation Summary
                                  </h4>
                                  <div className="bg-white/70 p-3 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm text-gray-600">Total Predicted Inflow:</span>
                                      <span className="font-bold text-2xl text-blue-700">{parsedData.summary.totalInflow} patients</span>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed">{parsedData.summary.situation}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Alerts Card */}
                          {parsedData.alerts && (
                            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                              <div className="flex items-start space-x-3">
                                <AlertTriangle className="h-6 w-6 text-amber-600 mt-1" />
                                <div className="flex-1">
                                  <h4 className="font-semibold text-amber-800 mb-3 flex items-center">
                                    <Shield className="h-4 w-4 mr-2" />
                                    Predictive Alerts
                                  </h4>
                                  <div className="space-y-2">
                                    {parsedData.alerts.map((alert, alertIndex) => (
                                      <div key={alertIndex} className="flex items-start space-x-2 bg-white/70 p-2 rounded">
                                        {alert.toLowerCase().includes('none') || alert.toLowerCase().includes('no significant') ? (
                                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        ) : (
                                          <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                        )}
                                        <span className="text-sm text-gray-700">{alert}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Resource Status Card */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Bed Status */}
                            {parsedData.bedStatus && (
                              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                                <h4 className="font-semibold text-purple-800 mb-3 flex items-center">
                                  <Bed className="h-4 w-4 mr-2" />
                                  Bed Availability
                                </h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center bg-white/70 p-2 rounded">
                                    <span className="text-sm text-gray-600">Total Free:</span>
                                    <span className={`font-semibold ${parsedData.bedStatus.totalFree === '0' ? 'text-red-600' : 'text-green-600'}`}>
                                      {parsedData.bedStatus.totalFree}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center bg-white/70 p-2 rounded">
                                    <span className="text-sm text-gray-600">Ward:</span>
                                    <span className={`font-semibold ${parsedData.bedStatus.ward === '0' ? 'text-red-600' : 'text-green-600'}`}>
                                      {parsedData.bedStatus.ward}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center bg-white/70 p-2 rounded">
                                    <span className="text-sm text-gray-600">ICU:</span>
                                    <span className={`font-semibold ${parsedData.bedStatus.icu === '0' ? 'text-red-600' : 'text-green-600'}`}>
                                      {parsedData.bedStatus.icu}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center bg-white/70 p-2 rounded">
                                    <span className="text-sm text-gray-600">Ventilator:</span>
                                    <span className={`font-semibold ${parsedData.bedStatus.ventilator === '0' ? 'text-red-600' : 'text-green-600'}`}>
                                      {parsedData.bedStatus.ventilator}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Medicine Inventory */}
                            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                              <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                                <Pill className="h-4 w-4 mr-2" />
                                Medicine Inventory
                              </h4>
                              <div className="bg-white/70 p-3 rounded">
                                <div className="flex items-center space-x-2">
                                  <Stethoscope className="h-4 w-4 text-green-600" />
                                  <span className="text-sm text-gray-600">
                                    {parsedData.medicineInventory && parsedData.medicineInventory.length > 0 
                                      ? parsedData.medicineInventory.join(', ')
                                      : 'No specific medicines reported for predicted conditions'
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Fallback: Raw Text Display if parsing fails */}
                          {!parsedData.summary && !parsedData.alerts && !parsedData.bedStatus && (
                            <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-amber-200">
                              <div className="flex items-start space-x-3">
                                <AlertTriangle className="h-5 w-5 text-amber-600 mt-1" />
                                <div className="flex-1">
                                  <h4 className="font-semibold text-amber-800 mb-3">
                                    Today&apos;s Forecast & Predictions
                                  </h4>
                                  <div className="text-sm text-amber-800 whitespace-pre-wrap leading-relaxed bg-white/70 p-3 rounded">
                                    {predictionText}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Action Plan Button */}
                          <div className="flex justify-center">
                            <button 
                              onClick={() => setShowRespiratoryPlan(!showRespiratoryPlan)}
                              className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-medium rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all duration-200 shadow-lg flex items-center space-x-2"
                            >
                              <Settings className="h-5 w-5" />
                              <span>{showRespiratoryPlan ? 'Hide Action Plan' : 'Generate Action Plan'}</span>
                            </button>
                          </div>
                        
                          {/* Generated Action Plan */}
                          {showRespiratoryPlan && (
                            <div className="mt-4 p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200 shadow-lg">
                              <h4 className="font-bold text-blue-800 mb-4 flex items-center text-lg">
                                <AlertTriangle className="h-5 w-5 mr-2" />
                                Generated Action Plan
                              </h4>
                              
                              {parsedData.actionPlan && (parsedData.actionPlan.immediate?.length > 0 || parsedData.actionPlan.resources?.length > 0) ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  {/* Immediate Actions */}
                                  {parsedData.actionPlan.immediate && parsedData.actionPlan.immediate.length > 0 && (
                                    <div className="bg-white/80 p-4 rounded-lg">
                                      <h5 className="font-semibold text-gray-800 mb-3 flex items-center">
                                        <Clock className="h-4 w-4 mr-2 text-red-500" />
                                        Immediate Actions (Next 24 hours)
                                      </h5>
                                      <ul className="space-y-3">
                                        {parsedData.actionPlan.immediate.map((action, actionIndex) => (
                                          <li key={actionIndex} className="flex items-start space-x-3">
                                            <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                                            <span className="text-sm text-gray-700 leading-relaxed">{action}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Resource Requirements */}
                                  {parsedData.actionPlan.resources && parsedData.actionPlan.resources.length > 0 && (
                                    <div className="bg-white/80 p-4 rounded-lg">
                                      <h5 className="font-semibold text-gray-800 mb-3 flex items-center">
                                        <Package className="h-4 w-4 mr-2 text-green-500" />
                                        Resource Requirements
                                      </h5>
                                      <ul className="space-y-3">
                                        {parsedData.actionPlan.resources.map((resource, resourceIndex) => (
                                          <li key={resourceIndex} className="flex items-start space-x-3">
                                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                            <span className="text-sm text-gray-700 leading-relaxed">{resource}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                /* Fallback Action Plan */
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  {/* Default Immediate Actions */}
                                  <div className="bg-white/80 p-4 rounded-lg">
                                    <h5 className="font-semibold text-gray-800 mb-3 flex items-center">
                                      <Clock className="h-4 w-4 mr-2 text-red-500" />
                                      Immediate Actions (Next 24 hours)
                                    </h5>
                                    <ul className="space-y-3">
                                      <li className="flex items-start space-x-3">
                                        <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                                        <span className="text-sm text-gray-700 leading-relaxed">Review bed allocation based on predicted patient inflow</span>
                                      </li>
                                      <li className="flex items-start space-x-3">
                                        <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                                        <span className="text-sm text-gray-700 leading-relaxed">Ensure adequate staffing for predicted patient volume</span>
                                      </li>
                                      <li className="flex items-start space-x-3">
                                        <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                                        <span className="text-sm text-gray-700 leading-relaxed">Activate emergency protocols if bed capacity is critical</span>
                                      </li>
                                      <li className="flex items-start space-x-3">
                                        <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                                        <span className="text-sm text-gray-700 leading-relaxed">Coordinate with departments for patient triaging</span>
                                      </li>
                                    </ul>
                                  </div>

                                  {/* Default Resource Requirements */}
                                  <div className="bg-white/80 p-4 rounded-lg">
                                    <h5 className="font-semibold text-gray-800 mb-3 flex items-center">
                                      <Package className="h-4 w-4 mr-2 text-green-500" />
                                      Resource Requirements
                                    </h5>
                                    <ul className="space-y-3">
                                      <li className="flex items-start space-x-3">
                                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                        <span className="text-sm text-gray-700 leading-relaxed">Monitor bed availability across all wards and ICUs</span>
                                      </li>
                                      <li className="flex items-start space-x-3">
                                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                        <span className="text-sm text-gray-700 leading-relaxed">Check medical supply inventory for essential items</span>
                                      </li>
                                      <li className="flex items-start space-x-3">
                                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                        <span className="text-sm text-gray-700 leading-relaxed">Ensure ventilator and ICU equipment readiness</span>
                                      </li>
                                      <li className="flex items-start space-x-3">
                                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                        <span className="text-sm text-gray-700 leading-relaxed">Prepare overflow plans for high patient volume scenarios</span>
                                      </li>
                                    </ul>
                                  </div>
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="mt-6 flex flex-wrap gap-3">
                                <Link 
                                  href="/manage"
                                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <Settings className="h-4 w-4" />
                                  <span>Manage Resources</span>
                                </Link>
                                <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                                  <CheckCircle className="h-4 w-4" />
                                  <span>Mark as Reviewed</span>
                                </button>
                                <button className="flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
                                  <AlertTriangle className="h-4 w-4" />
                                  <span>Send Alert</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    !predictionsLoading && !predictionsError && (
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-5 w-5 text-gray-500" />
                          <p className="text-sm text-gray-600">
                            {predictions?.message || 'No predictions available at this time.'}
                          </p>
                        </div>
                      </div>
                    )
                  )}

                  {/* Next Prediction Timer Info */}
                  {nextPredictionTime && (
                    <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">Next automatic prediction:</span>
                        </div>
                        <span className="text-sm text-blue-600 font-mono">
                          {nextPredictionTime.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            hour12: true 
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        Predictions are automatically fetched every hour. Use the refresh button to get new predictions manually.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
