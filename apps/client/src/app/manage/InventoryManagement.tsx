import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Edit2, Trash2, Plus, Package, Calendar, Hash, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SearchInput } from '../components/ui/SearchInput';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

// Types based on backend schema
interface Medicine {
  id: number;
  name: string;
  form: string;
  strength: string;
  unit: string;
}

interface Inventory {
  id: number;
  medicineId: number;
  availableQty: number;
  batchNumber?: string;
  expiryDate?: string;
  updatedAt: string;
  medicine?: Medicine;
}

interface CreateInventoryRequest {
  medicineId: number;
  availableQty: number;
  batchNumber?: string;
  expiryDate?: string;
}

const InventoryManagement: React.FC = () => {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<Inventory[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingInventory, setEditingInventory] = useState<Inventory | null>(null);
  const [formData, setFormData] = useState<CreateInventoryRequest>({
    medicineId: 0,
    availableQty: 0,
    batchNumber: '',
    expiryDate: '',
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  // API base URL
  const API_BASE_URL = 'http://localhost:3121/v1/web';
//   const API_BASE_URL = 'http://10.0.5.179:3121/v1/web';

  const loadInventory = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await axios.get<Inventory[]>(`${API_BASE_URL}/inventory`);
      setInventory(response.data);
      setFilteredInventory(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load inventory');
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMedicines = async (): Promise<void> => {
    try {
      const response = await axios.get<Medicine[]>(`${API_BASE_URL}/medicines`);
      setMedicines(response.data);
    } catch (err) {
      console.error('Error loading medicines:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await loadInventory();
      await loadMedicines();
    };
    loadData();
  }, []);

  // Filter inventory based on search term
  const handleSearchChange = (value: string): void => {
    setSearchTerm(value);
  };
  
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredInventory(inventory);
    } else {
      const filtered = inventory.filter(item =>
        (item.medicine?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.medicine?.form.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.medicine?.strength.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.batchNumber?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.availableQty.toString().includes(searchTerm))
      );
      setFilteredInventory(filtered);
    }
  }, [searchTerm, inventory]);

  const openModal = (inventoryItem?: Inventory): void => {
    setEditingInventory(inventoryItem || null);
    setFormData(inventoryItem ? {
      medicineId: inventoryItem.medicineId,
      availableQty: inventoryItem.availableQty,
      batchNumber: inventoryItem.batchNumber || '',
      expiryDate: inventoryItem.expiryDate ? new Date(inventoryItem.expiryDate).toISOString().split('T')[0] : '',
    } : {
      medicineId: 0,
      availableQty: 0,
      batchNumber: '',
      expiryDate: '',
    });
    setIsModalOpen(true);
    setError(null);
  };

  const closeModal = (): void => {
    setIsModalOpen(false);
    setEditingInventory(null);
    setFormData({
      medicineId: 0,
      availableQty: 0,
      batchNumber: '',
      expiryDate: '',
    });
    setError(null);
  };

  const handleInputChange = (field: keyof CreateInventoryRequest, value: string | number): void => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : undefined,
        batchNumber: formData.batchNumber || undefined,
      };

      if (editingInventory) {
        // Update existing inventory item
        await axios.put(`${API_BASE_URL}/inventory/${editingInventory.id}`, payload);
      } else {
        // Create new inventory item
        await axios.post(`${API_BASE_URL}/inventory`, payload);
      }
      
      await loadInventory();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save inventory item');
      console.error('Error saving inventory item:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (inventoryId: number): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this inventory item? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/inventory/${inventoryId}`);
      await loadInventory();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete inventory item';
      setError(errorMessage);
      console.error('Error deleting inventory item:', err);
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const isExpiringSoon = (expiryDate?: string): boolean => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    return expiry <= thirtyDaysFromNow;
  };

  const isExpired = (expiryDate?: string): boolean => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry < today;
  };

  // Helper functions to determine status
  const getStatusInfo = (item: Inventory) => {
    if (isExpired(item.expiryDate)) {
      return { 
        status: 'Expired', 
        variant: 'destructive' as const, 
        icon: AlertTriangle,
        color: 'text-red-600' 
      };
    }
    if (isExpiringSoon(item.expiryDate)) {
      return { 
        status: 'Expiring Soon', 
        variant: 'secondary' as const, 
        icon: Calendar,
        color: 'text-yellow-600' 
      };
    }
    if (item.availableQty <= 10) {
      return { 
        status: 'Low Stock', 
        variant: 'secondary' as const, 
        icon: AlertTriangle,
        color: 'text-orange-600' 
      };
    }
    return { 
      status: 'Good', 
      variant: 'default' as const, 
      icon: Package,
      color: 'text-green-600' 
    };
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
            <Package className="h-8 w-8 text-teal-600" />
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          </div>
          <Button onClick={() => openModal()} className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Add Inventory Item</span>
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <SearchInput
            placeholder="Search inventory by medicine name, form, strength, or batch number..."
            value={searchTerm}
            onSearch={handleSearchChange}
          />
        </div>

        {/* Search Results Info */}
        {searchTerm && (
          <div className="mb-4 text-sm text-gray-600">
            {filteredInventory.length} result{filteredInventory.length !== 1 ? 's' : ''} found
            {searchTerm && ` for "${searchTerm}"`}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Inventory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInventory.map((item) => {
            const statusInfo = getStatusInfo(item);
            const StatusIcon = statusInfo.icon;
            
            return (
              <Card key={item.id} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <Package className="h-5 w-5 text-teal-600" />
                      <span className="truncate">{item.medicine?.name || 'Unknown Medicine'}</span>
                    </span>
                    <Badge variant={statusInfo.variant}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusInfo.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Form & Strength</p>
                      <p className="font-medium">
                        {item.medicine 
                          ? `${item.medicine.form} - ${item.medicine.strength}${item.medicine.unit}` 
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Available Qty</p>
                        <p className={`font-medium ${
                          item.availableQty <= 10 ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {item.availableQty}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Batch Number</p>
                        <p className="font-medium text-gray-700 flex items-center">
                          <Hash className="h-3 w-3 mr-1" />
                          {item.batchNumber || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Expiry Date</p>
                      <p className={`font-medium flex items-center ${
                        isExpired(item.expiryDate) ? 'text-red-600' :
                        isExpiringSoon(item.expiryDate) ? 'text-yellow-600' : 'text-gray-900'
                      }`}>
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(item.expiryDate)}
                      </p>
                    </div>
                    
                    <div className="flex space-x-2 pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openModal(item)}
                        className="flex-1 flex items-center justify-center space-x-1"
                      >
                        <Edit2 className="h-4 w-4" />
                        <span>Edit</span>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
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

        {filteredInventory.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No inventory items found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'Try adjusting your search terms' : 'Add your first inventory item to get started'}
              </p>
              {!searchTerm && (
                <Button onClick={() => openModal()}>
                  <Plus className="h-5 w-5 mr-2" />
                  Add Inventory Item
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
                  <Package className="h-5 w-5 text-teal-600" />
                  <span>{editingInventory ? 'Edit Inventory Item' : 'Add Inventory Item'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Medicine
                    </label>
                    <select
                      value={formData.medicineId}
                      onChange={(e) => handleInputChange('medicineId', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      required
                      disabled={!!editingInventory}
                    >
                      <option value={0}>Select Medicine</option>
                      {medicines.map((medicine) => (
                        <option key={medicine.id} value={medicine.id}>
                          {medicine.name} - {medicine.form} ({medicine.strength}{medicine.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Quantity
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.availableQty}
                      onChange={(e) => handleInputChange('availableQty', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Batch Number (Optional)
                    </label>
                    <Input
                      type="text"
                      value={formData.batchNumber}
                      onChange={(e) => handleInputChange('batchNumber', e.target.value)}
                      placeholder="Batch number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expiry Date (Optional)
                    </label>
                    <Input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeModal}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center space-x-2"
                    >
                      {submitting ? <LoadingSpinner /> : null}
                      <span>{submitting ? 'Saving...' : (editingInventory ? 'Update' : 'Create')}</span>
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

export default InventoryManagement;
