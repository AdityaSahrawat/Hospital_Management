import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Edit2, Trash2, Plus, Users, UserCheck, UserX } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SearchInput } from '../components/ui/SearchInput';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

// Types based on backend schema
interface Department {
  id: number;
  name: string;
}

interface Staff {
  id: number;
  name: string;
  specialization: string;
  departmentId?: number;
  isAvailable: boolean;
  department?: Department;
}

interface CreateStaffRequest {
  name: string;
  specialization: string;
  departmentId?: number;
  isAvailable?: boolean;
}

const StaffManagement: React.FC = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState<CreateStaffRequest>({
    name: '',
    specialization: '',
    isAvailable: true,
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  // API base URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

  const loadStaff = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading staff from:', `${API_BASE_URL}/staff`);
      
      const response = await axios.get(`${API_BASE_URL}/staff`);
      console.log('Staff response:', response.data);
      
      setStaff(response.data);
      setFilteredStaff(response.data);
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
    loadStaff();
    loadDepartments();
  }, []);

  useEffect(() => {
    const handleSearch = (): void => {
      if (!searchTerm.trim()) {
        setFilteredStaff(staff);
        return;
      }

      const filtered = staff.filter(staffMember =>
        staffMember.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staffMember.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (staffMember.department?.name && staffMember.department.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredStaff(filtered);
    };

    handleSearch();
  }, [staff, searchTerm]);

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
        const response = await axios.put(`${API_BASE_URL}/staff/${editingStaff.id}`, formData);
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
        const response = await axios.post(`${API_BASE_URL}/staff`, formData);
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
      await axios.delete(`${API_BASE_URL}/staff/${id}`);
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
      name: staffMember.name,
      specialization: staffMember.specialization,
      departmentId: staffMember.departmentId,
      isAvailable: staffMember.isAvailable,
    } : {
      name: '',
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
      name: '',
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
            <Users className="h-8 w-8 text-teal-600" />
            <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
          </div>
          <Button onClick={() => openModal()} className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Add New Staff</span>
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <SearchInput
            placeholder="Search staff by name, specialization, or department..."
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

        {/* Staff Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map((member) => (
            <Card key={member.id} className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-teal-600" />
                    <span className="truncate">{member.name}</span>
                  </span>
                  <Badge variant={member.isAvailable ? "default" : "secondary"}>
                    {member.isAvailable ? (
                      <UserCheck className="h-3 w-3 mr-1" />
                    ) : (
                      <UserX className="h-3 w-3 mr-1" />
                    )}
                    {member.isAvailable ? 'Available' : 'Unavailable'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">ID</p>
                    <p className="font-medium">#{member.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Specialization</p>
                    <p className="font-medium capitalize">{member.specialization}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Department</p>
                    <p className="font-medium">{member.department?.name || 'No Department'}</p>
                  </div>
                  
                  <div className="flex space-x-2 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openModal(member)}
                      className="flex-1 flex items-center justify-center space-x-1"
                    >
                      <Edit2 className="h-4 w-4" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(member.id)}
                      className="flex-1 flex items-center justify-center space-x-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredStaff.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No staff members found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'Try adjusting your search terms' : 'Add your first staff member to get started'}
              </p>
              {!searchTerm && (
                <Button onClick={() => openModal()}>
                  <Plus className="h-5 w-5 mr-2" />
                  Add New Staff
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
                  <Users className="h-5 w-5 text-teal-600" />
                  <span>{editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name
                    </label>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Staff member name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specialization
                    </label>
                    <Input
                      type="text"
                      value={formData.specialization}
                      onChange={(e) => handleInputChange('specialization', e.target.value)}
                      placeholder="e.g., doctor, nurse, surgeon"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department
                    </label>
                    <select
                      value={formData.departmentId || ''}
                      onChange={(e) => handleInputChange('departmentId', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.isAvailable || false}
                        onChange={(e) => handleInputChange('isAvailable', e.target.checked)}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">Available</span>
                    </label>
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
                      <span>{submitting ? 'Saving...' : (editingStaff ? 'Update' : 'Create')}</span>
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

export default StaffManagement;