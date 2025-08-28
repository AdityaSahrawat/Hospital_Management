import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Edit2, Trash2, Plus, Pill } from 'lucide-react';
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

interface CreateMedicineRequest {
  name: string;
  form: string;
  strength: string;
  unit: string;
}

const MedicineManagement: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [filteredMedicines, setFilteredMedicines] = useState<Medicine[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [formData, setFormData] = useState<CreateMedicineRequest>({
    name: '',
    form: '',
    strength: '',
    unit: '',
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  // API base URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

  const loadMedicines = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await axios.get<Medicine[]>(`${API_BASE_URL}/medicines`);
      setMedicines(response.data);
      setFilteredMedicines(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load medicines');
      console.error('Error loading medicines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedicines();
  }, []);

  // Filter medicines based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredMedicines(medicines);
    } else {
      const filtered = medicines.filter(medicine =>
        medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        medicine.form.toLowerCase().includes(searchTerm.toLowerCase()) ||
        medicine.strength.toLowerCase().includes(searchTerm.toLowerCase()) ||
        medicine.unit.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMedicines(filtered);
    }
  }, [searchTerm, medicines]);

  const openModal = (medicine?: Medicine): void => {
    setEditingMedicine(medicine || null);
    setFormData(medicine ? {
      name: medicine.name,
      form: medicine.form,
      strength: medicine.strength,
      unit: medicine.unit,
    } : {
      name: '',
      form: '',
      strength: '',
      unit: '',
    });
    setIsModalOpen(true);
    setError(null);
  };

  const closeModal = (): void => {
    setIsModalOpen(false);
    setEditingMedicine(null);
    setFormData({
      name: '',
      form: '',
      strength: '',
      unit: '',
    });
    setError(null);
  };

  const handleInputChange = (field: keyof CreateMedicineRequest, value: string): void => {
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
      if (editingMedicine) {
        // Update existing medicine
        await axios.put(`${API_BASE_URL}/medicines/${editingMedicine.id}`, formData);
      } else {
        // Create new medicine
        await axios.post(`${API_BASE_URL}/medicines`, formData);
      }
      
      await loadMedicines();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save medicine');
      console.error('Error saving medicine:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (medicineId: number): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this medicine? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/medicines/${medicineId}`);
      await loadMedicines();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete medicine';
      setError(errorMessage);
      console.error('Error deleting medicine:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex justify-center items-center">
        <LoadingSpinner size="lg" text="Loading medicines..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Pill className="h-8 w-8 text-blue-600" />
              Medicine Management
            </h1>
            <p className="text-gray-600">Manage your hospital&apos;s medicine inventory</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <SearchInput
              placeholder="Search medicines..."
              value={searchTerm}
              onSearch={setSearchTerm}
            />
            <Button onClick={() => openModal()} className="whitespace-nowrap">
              <Plus className="h-4 w-4 mr-2" />
              Add Medicine
            </Button>
          </div>
        </div>

        {/* Search Results Info */}
        {searchTerm && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              {filteredMedicines.length} result{filteredMedicines.length !== 1 ? 's' : ''} found
              {searchTerm && ` for "${searchTerm}"`}
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Medicines Grid */}
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>All Medicines</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredMedicines.length === 0 ? (
                <div className="text-center py-12">
                  <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg font-medium">
                    {searchTerm ? 'No medicines found matching your search.' : 'No medicines found.'}
                  </p>
                  <p className="text-gray-500 mt-1">
                    {!searchTerm && 'Add your first medicine to get started.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <table className="w-full">
                    <thead className="border-b border-gray-200">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Form</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Strength</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Unit</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredMedicines.map((medicine) => (
                        <tr key={medicine.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-2">
                              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <Pill className="h-4 w-4 text-blue-600" />
                              </div>
                              <span className="font-medium text-gray-900">{medicine.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant="secondary">{medicine.form}</Badge>
                          </td>
                          <td className="py-4 px-4 text-gray-700">{medicine.strength}</td>
                          <td className="py-4 px-4 text-gray-700">{medicine.unit}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openModal(medicine)}
                              >
                                <Edit2 className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(medicine.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                {editingMedicine ? 'Edit Medicine' : 'Add Medicine'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Medicine name"
                  required
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Form</label>
                  <select
                    value={formData.form}
                    onChange={(e) => handleInputChange('form', e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select form</option>
                    <option value="tablet">Tablet</option>
                    <option value="capsule">Capsule</option>
                    <option value="syrup">Syrup</option>
                    <option value="injection">Injection</option>
                    <option value="cream">Cream</option>
                    <option value="drops">Drops</option>
                    <option value="inhaler">Inhaler</option>
                    <option value="patch">Patch</option>
                    <option value="patch">sachet (per 1L solution)</option>
                  </select>
                </div>

                <Input
                  label="Strength"
                  value={formData.strength}
                  onChange={(e) => handleInputChange('strength', e.target.value)}
                  placeholder="e.g., 500, 25, 100"
                  required
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => handleInputChange('unit', e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                  <option value="">Select unit</option>
                  <option value="mg">mg (milligrams)</option>
                  <option value="g">g (grams)</option>
                  <option value="ml">ml (milliliters)</option>
                  <option value="l">l (liters)</option>
                  <option value="IU">IU (International Units)</option>
                  <option value="mcg">mcg (micrograms)</option>
                  <option value="%">% (percentage)</option>
                </select>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : (editingMedicine ? 'Update' : 'Create')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )}
    </div>
  );
};

export default MedicineManagement;
