import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Edit2, Trash2, Plus, Bed, Zap, Wrench, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

// Bed Status Enum values matching the backend
const BED_STATUS_OPTIONS = [
  { value: 'FREE', label: 'Free' },
  { value: 'OCCUPIED', label: 'Occupied' },
  { value: 'MAINTENANCE', label: 'Maintenance' }
];

// Bed Type options for creation/edit
const BED_TYPE_OPTIONS = ['ward', 'icu', 'vip'] as const;

// Types based on backend schema
interface Department {
  id: number;
  name: string;
}

interface Bed {
  id: number;
  type: string;
  status: string;
  departmentId: number;
  department?: Department;
}

interface CreateBedRequest {
  type: string;
  status?: string;
  departmentId: number;
}

const BedManagement: React.FC = () => {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [filteredBeds, setFilteredBeds] = useState<Bed[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingBed, setEditingBed] = useState<Bed | null>(null);
  const [formData, setFormData] = useState<CreateBedRequest>({
  type: 'ward',
    status: 'FREE',
    departmentId: 0,
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  // API base URL (must be exposed to the browser)
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

  const loadBeds = async (): Promise<void> => {
    try {
      if (!API_BASE_URL) {
        setError('API base URL is not configured. Set NEXT_PUBLIC_API_BASE_URL in .env.local');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      console.log('Loading beds from:', `${API_BASE_URL}/beds`);
      
      const response = await axios.get(`${API_BASE_URL}/beds`);
      console.log('Beds response:', response.data);
      
      setBeds(response.data);
      setFilteredBeds(response.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load bed data';
      setError(errorMessage);
      console.error('Error loading beds:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async (): Promise<void> => {
    try {
      if (!API_BASE_URL) return;
      const response = await axios.get(`${API_BASE_URL}/departments`);
      console.log('Departments response:', response.data);
      setDepartments(response.data);
    } catch (err: unknown) {
      console.error('Error loading departments:', err);
    }
  };

  // Search functionality
  const handleSearchChange = (value: string): void => {
    setSearchTerm(value);
  };

  useEffect(() => {
    loadBeds();
    loadDepartments();
  }, []);

  useEffect(() => {
    const handleSearch = (): void => {
      if (!searchTerm.trim()) {
        setFilteredBeds(beds);
        return;
      }

      const filtered = beds.filter(bed =>
        bed.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bed.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bed.department?.name && bed.department.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredBeds(filtered);
    };

    handleSearch();
  }, [beds, searchTerm]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      // Validation based on backend rules
      if (!formData.type || !formData.departmentId) {
        setError('Type and Department are required');
        return;
      }

      console.log('Submitting form data:', formData);
      
      if (editingBed) {
        const response = await axios.put(`${API_BASE_URL}/beds/${editingBed.id}`, formData);
        console.log('Updated bed:', response.data);
        
        // Ensure department is populated for the updated bed
        const updatedBed = {
          ...response.data,
          department: response.data.departmentId 
            ? departments.find(d => d.id === response.data.departmentId) 
            : undefined
        };
        
        // Update bed in state
        setBeds(beds.map(b => b.id === editingBed.id ? updatedBed : b));
      } else {
        const response = await axios.post(`${API_BASE_URL}/beds`, formData);
        console.log('Created bed:', response.data);
        
        // Ensure department is populated for the new bed
        const newBed = {
          ...response.data,
          department: response.data.departmentId 
            ? departments.find(d => d.id === response.data.departmentId) 
            : undefined
        };
        
        // Add new bed to state
        setBeds([...beds, newBed]);
      }
      closeModal();
      
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save bed';
      setError(errorMessage);
      console.error('Error saving bed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number): Promise<void> => {
    if (!confirm('Are you sure you want to delete this bed?')) return;
    
    try {
      await axios.delete(`${API_BASE_URL}/beds/${id}`);
      setBeds(beds.filter(b => b.id !== id));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete bed';
      setError(errorMessage);
      console.error('Error deleting bed:', err);
    }
  };

  const openModal = (bed?: Bed): void => {
    setEditingBed(bed || null);
    setFormData(bed ? {
      type: bed.type,
      status: bed.status,
      departmentId: bed.departmentId,
    } : {
      type: 'ward',
      status: 'FREE',
      departmentId: 0,
    });
    setIsModalOpen(true);
    setError(null);
  };

  const closeModal = (): void => {
    setIsModalOpen(false);
    setEditingBed(null);
    setFormData({
      type: 'ward',
      status: 'FREE',
      departmentId: 0,
    });
    setError(null);
  };

  const handleInputChange = (field: keyof CreateBedRequest, value: string | number | undefined): void => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Helper function to get status badge color and icon
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FREE':
        return { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' };
      case 'OCCUPIED':
        return { variant: 'destructive' as const, icon: Zap, color: 'text-red-600' };
      case 'MAINTENANCE':
        return { variant: 'secondary' as const, icon: Wrench, color: 'text-yellow-600' };
      default:
        return { variant: 'secondary' as const, icon: CheckCircle, color: 'text-gray-600' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-pink-50 p-6 flex justify-center items-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <Bed className="h-8 w-8 text-teal-600" />
            <h1 className="text-3xl font-bold text-gray-900">Bed Management</h1>
          </div>
          <Button onClick={() => openModal()} className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Add New Bed</span>
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <SearchInput
            placeholder="Search beds by type, status, or department..."
            value={searchTerm}
            onSearch={handleSearchChange}
          />
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Bed Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBeds.map((bed) => {
            const statusInfo = getStatusBadge(bed.status);
            const StatusIcon = statusInfo.icon;
            
            return (
              <Card key={bed.id} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <Bed className="h-5 w-5 text-teal-600" />
                      <span>{bed.type}</span>
                    </span>
                    <Badge variant={statusInfo.variant}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {bed.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Bed ID</p>
                      <p className="font-medium">#{bed.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Department</p>
                      <p className="font-medium">{bed.department?.name || 'Unassigned'}</p>
                    </div>
                    
                    <div className="flex space-x-2 pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openModal(bed)}
                        className="flex-1 flex items-center justify-center space-x-1"
                      >
                        <Edit2 className="h-4 w-4" />
                        <span>Edit</span>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(bed.id)}
                        className="flex-1 flex items-center justify-center space-x-1"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredBeds.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Bed className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No beds found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'Try adjusting your search terms' : 'Add your first bed to get started'}
              </p>
              {!searchTerm && (
                <Button onClick={() => openModal()}>
                  <Plus className="h-5 w-5 mr-2" />
                  Add New Bed
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bed className="h-5 w-5 text-teal-600" />
                  <span>{editingBed ? 'Edit Bed' : 'Add New Bed'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bed Type
                    </label>
                    <select
                      value={formData.type || 'ward'}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      required
                    >
                      {BED_TYPE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status || 'FREE'}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      {BED_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department
                    </label>
                    <select
                      value={formData.departmentId || ''}
                      onChange={(e) => handleInputChange('departmentId', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeModal}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center space-x-2"
                    >
                      {submitting ? <LoadingSpinner /> : null}
                      <span>{submitting ? 'Saving...' : (editingBed ? 'Update' : 'Create')}</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default BedManagement