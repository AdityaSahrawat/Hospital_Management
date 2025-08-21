import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingBed, setEditingBed] = useState<Bed | null>(null);
  const [formData, setFormData] = useState<CreateBedRequest>({
    type: '',
    status: 'free',
    departmentId: 0,
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  // API base URL
  // const API_BASE_URL = 'http://localhost:3121/v1/web';
   const API_BASE_URL = 'http://10.0.5.179:3121/v1/web';

  // Create axios instance
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const loadBeds = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading beds from:', `${API_BASE_URL}/beds`);
      
      const response = await api.get('/beds');
      console.log('Beds response:', response.data);
      
      setBeds(response.data);
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
      const response = await api.get('/departments');
      console.log('Departments response:', response.data);
      setDepartments(response.data);
    } catch (err: unknown) {
      console.error('Error loading departments:', err);
    }
  };

  useEffect(() => {
    loadBeds();
    loadDepartments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        const response = await api.put(`/beds/${editingBed.id}`, formData);
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
        const response = await api.post('/beds', formData);
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
      await api.delete(`/beds/${id}`);
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
      type: '',
      status: 'free',
      departmentId: 0,
    });
    setIsModalOpen(true);
    setError(null);
  };

  const closeModal = (): void => {
    setIsModalOpen(false);
    setEditingBed(null);
    setFormData({
      type: '',
      status: 'free',
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

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading beds...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bed Management</h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          Add New Bed
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Beds List */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="w-full table-auto">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {beds.map((bed) => (
              <tr key={bed.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {bed.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {bed.type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    bed.status === 'free'
                      ? 'bg-green-100 text-green-800' 
                      : bed.status === 'occupied'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {bed.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {bed.department?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => openModal(bed)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(bed.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {beds.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No beds found. Add one to get started.
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {editingBed ? 'Edit Bed' : 'Add New Bed'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bed Type
                </label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Standard, ICU, VIP"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status || 'free'}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="free">Free</option>
                  <option value="occupied">Occupied</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  value={formData.departmentId || ''}
                  onChange={(e) => handleInputChange('departmentId', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : (editingBed ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BedManagement