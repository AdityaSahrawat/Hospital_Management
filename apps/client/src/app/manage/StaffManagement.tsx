import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Types based on backend schema
interface Department {
  id: number;
  name: string;
}

interface Staff {
  id: number;
  specialization: string;
  departmentId?: number;
  isAvailable: boolean;
  department?: Department;
}

interface CreateStaffRequest {
  specialization: string;
  departmentId?: number;
  isAvailable?: boolean;
}

const StaffManagement: React.FC = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState<CreateStaffRequest>({
    specialization: '',
    isAvailable: true,
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

  const loadStaff = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading staff from:', `${API_BASE_URL}/staff`);
      
      const response = await api.get('/staff');
      console.log('Staff response:', response.data);
      
      setStaff(response.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load staff data';
      setError(errorMessage);
      console.error('Error loading staff:', err);
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
    loadStaff();
    loadDepartments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      // Validation based on backend rules
      if (formData.specialization !== 'nurse' && !formData.departmentId) {
        setError('Department is required for non-nurse staff');
        return;
      }
      
      if (formData.specialization === 'nurse' && formData.departmentId) {
        setError('Nurses cannot be linked to a department');
        return;
      }

      console.log('Submitting form data:', formData);
      
      if (editingStaff) {
        const response = await api.put(`/staff/${editingStaff.id}`, formData);
        console.log('Updated staff:', response.data);
        
        // Ensure department is populated for the updated staff
        const updatedStaff = {
          ...response.data,
          department: response.data.departmentId 
            ? departments.find(d => d.id === response.data.departmentId) 
            : undefined
        };
        
        // Update staff in state
        setStaff(staff.map(s => s.id === editingStaff.id ? updatedStaff : s));
      } else {
        const response = await api.post('/staff', formData);
        console.log('Created staff:', response.data);
        
        // Ensure department is populated for the new staff
        const newStaff = {
          ...response.data,
          department: response.data.departmentId 
            ? departments.find(d => d.id === response.data.departmentId) 
            : undefined
        };
        
        // Add new staff to state
        setStaff([...staff, newStaff]);
      }
      closeModal();
      
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save staff member';
      setError(errorMessage);
      console.error('Error saving staff:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number): Promise<void> => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    
    try {
      await api.delete(`/staff/${id}`);
      setStaff(staff.filter(s => s.id !== id));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete staff member';
      setError(errorMessage);
      console.error('Error deleting staff:', err);
    }
  };

  const openModal = (staffMember?: Staff): void => {
    setEditingStaff(staffMember || null);
    setFormData(staffMember ? {
      specialization: staffMember.specialization,
      departmentId: staffMember.departmentId,
      isAvailable: staffMember.isAvailable,
    } : {
      specialization: '',
      isAvailable: true,
    });
    setIsModalOpen(true);
    setError(null);
  };

  const closeModal = (): void => {
    setIsModalOpen(false);
    setEditingStaff(null);
    setFormData({
      specialization: '',
      isAvailable: true,
    });
    setError(null);
  };

  const handleInputChange = (field: keyof CreateStaffRequest, value: string | number | boolean | undefined): void => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading staff...</span>
      </div>
    );
  }

  // Calculate staff availability counts
  const availableStaff = staff.filter(s => s.isAvailable).length;
  const unavailableStaff = staff.filter(s => !s.isAvailable).length;
  const totalStaff = staff.length;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          Add New Staff
        </button>
      </div>

      {/* Staff Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Staff</p>
              <p className="text-2xl font-bold text-gray-900">{totalStaff}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Available Staff</p>
              <p className="text-2xl font-bold text-green-600">{availableStaff}</p>
              <p className="text-xs text-gray-500">
                {totalStaff > 0 ? `${Math.round((availableStaff / totalStaff) * 100)}%` : '0%'} of total
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-100">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unavailable Staff</p>
              <p className="text-2xl font-bold text-red-600">{unavailableStaff}</p>
              <p className="text-xs text-gray-500">
                {totalStaff > 0 ? `${Math.round((unavailableStaff / totalStaff) * 100)}%` : '0%'} of total
              </p>
            </div>
            <div className="p-3 rounded-full bg-red-100">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Staff List */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="w-full table-auto">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Specialization
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {staff.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {member.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {member.specialization}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {member.department?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    member.isAvailable 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {member.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => openModal(member)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {staff.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No staff members found. Add one to get started.
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialization
                </label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => handleInputChange('specialization', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., doctor, nurse, surgeon"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  value={formData.departmentId || ''}
                  onChange={(e) => handleInputChange('departmentId', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={formData.specialization === 'nurse'}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                {formData.specialization === 'nurse' && (
                  <p className="text-sm text-gray-500 mt-1">Nurses cannot be assigned to departments</p>
                )}
              </div>

              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isAvailable || false}
                    onChange={(e) => handleInputChange('isAvailable', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Available</span>
                </label>
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
                  {submitting ? 'Saving...' : (editingStaff ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;