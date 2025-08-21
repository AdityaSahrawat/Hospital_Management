import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Types based on backend schema
interface Medicine {
  id?: string;
  name: string;
  dosage: string;
  notes: string;
}

interface AgeGroup {
  id?: number;
  group: string;
  ageRange: string;
  medicines: Medicine[];
}

interface Subcategory {
  id?: number;
  name: string;
  ageGroups: AgeGroup[];
}

interface Disease {
  id: number;
  name: string;
  subcategories: Subcategory[];
}

interface CreateDiseaseRequest {
  name: string;
  subcategories: {
    name: string;
    age_groups: {
      group: string;
      age_range: string;
      medicines: { name: string; dosage: string; notes: string }[];
    }[];
  }[];
}

const DiseaseManagement: React.FC = () => {
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingDisease, setEditingDisease] = useState<Disease | null>(null);
  const [formData, setFormData] = useState<CreateDiseaseRequest>({
    name: '',
    subcategories: [{
      name: '',
      age_groups: [{
        group: '',
        age_range: '',
        medicines: [{ name: '', dosage: '', notes: '' }]
      }]
    }]
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

  const loadDiseases = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading diseases from:', `${API_BASE_URL}/diseases`);
      
      const response = await api.get('/diseases');
      console.log('Diseases response:', response.data);
      
      setDiseases(response.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load disease data';
      setError(errorMessage);
      console.error('Error loading diseases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiseases();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      // Validation
      if (!formData.name.trim()) {
        setError('Disease name is required');
        return;
      }

      if (formData.subcategories.length === 0) {
        setError('At least one subcategory is required');
        return;
      }

      console.log('Submitting form data:', formData);
      
      if (editingDisease) {
        const response = await api.put(`/diseases/${editingDisease.id}`, formData);
        console.log('Updated disease:', response.data);
        
        // Update disease in state
        setDiseases(diseases.map(d => d.id === editingDisease.id ? response.data : d));
      } else {
        const response = await api.post('/diseases', formData);
        console.log('Created disease:', response.data);
        
        // Add new disease to state (convert from website format back to internal format)
        const newDisease = {
          id: Math.random(), // Will be replaced by actual ID from server
          name: response.data.disease,
          subcategories: response.data.subcategories.map((sc: { name: string; age_groups: { group: string; age_range: string; medicines: Medicine[] }[] }) => ({
            name: sc.name,
            ageGroups: sc.age_groups.map((ag: { group: string; age_range: string; medicines: Medicine[] }) => ({
              group: ag.group,
              ageRange: ag.age_range,
              medicines: ag.medicines
            }))
          }))
        };
        
        setDiseases([...diseases, newDisease]);
      }
      closeModal();
      
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save disease';
      setError(errorMessage);
      console.error('Error saving disease:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number): Promise<void> => {
    if (!confirm('Are you sure you want to delete this disease?')) return;
    
    try {
      await api.delete(`/diseases/${id}`);
      setDiseases(diseases.filter(d => d.id !== id));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete disease';
      setError(errorMessage);
      console.error('Error deleting disease:', err);
    }
  };

  const openModal = (disease?: Disease): void => {
    setEditingDisease(disease || null);
    
    if (disease) {
      // Convert from internal format to form format
      setFormData({
        name: disease.name,
        subcategories: disease.subcategories.map(sc => ({
          name: sc.name,
          age_groups: sc.ageGroups.map(ag => ({
            group: ag.group,
            age_range: ag.ageRange,
            medicines: ag.medicines.map(m => ({
              name: m.name,
              dosage: m.dosage,
              notes: m.notes
            }))
          }))
        }))
      });
    } else {
      setFormData({
        name: '',
        subcategories: [{
          name: '',
          age_groups: [{
            group: '',
            age_range: '',
            medicines: [{ name: '', dosage: '', notes: '' }]
          }]
        }]
      });
    }
    
    setIsModalOpen(true);
    setError(null);
  };

  const closeModal = (): void => {
    setIsModalOpen(false);
    setEditingDisease(null);
    setFormData({
      name: '',
      subcategories: [{
        name: '',
        age_groups: [{
          group: '',
          age_range: '',
          medicines: [{ name: '', dosage: '', notes: '' }]
        }]
      }]
    });
    setError(null);
  };

  // Helper functions for dynamic form fields
  const addSubcategory = () => {
    setFormData(prev => ({
      ...prev,
      subcategories: [
        ...prev.subcategories,
        {
          name: '',
          age_groups: [{
            group: '',
            age_range: '',
            medicines: [{ name: '', dosage: '', notes: '' }]
          }]
        }
      ]
    }));
  };

  const removeSubcategory = (index: number) => {
    setFormData(prev => ({
      ...prev,
      subcategories: prev.subcategories.filter((_, i) => i !== index)
    }));
  };

  const addAgeGroup = (subcategoryIndex: number) => {
    setFormData(prev => ({
      ...prev,
      subcategories: prev.subcategories.map((sc, i) => 
        i === subcategoryIndex 
          ? {
              ...sc,
              age_groups: [
                ...sc.age_groups,
                {
                  group: '',
                  age_range: '',
                  medicines: [{ name: '', dosage: '', notes: '' }]
                }
              ]
            }
          : sc
      )
    }));
  };

  const removeAgeGroup = (subcategoryIndex: number, ageGroupIndex: number) => {
    setFormData(prev => ({
      ...prev,
      subcategories: prev.subcategories.map((sc, i) => 
        i === subcategoryIndex 
          ? {
              ...sc,
              age_groups: sc.age_groups.filter((_, j) => j !== ageGroupIndex)
            }
          : sc
      )
    }));
  };

  const addMedicine = (subcategoryIndex: number, ageGroupIndex: number) => {
    setFormData(prev => ({
      ...prev,
      subcategories: prev.subcategories.map((sc, i) => 
        i === subcategoryIndex 
          ? {
              ...sc,
              age_groups: sc.age_groups.map((ag, j) => 
                j === ageGroupIndex
                  ? {
                      ...ag,
                      medicines: [
                        ...ag.medicines,
                        { name: '', dosage: '', notes: '' }
                      ]
                    }
                  : ag
              )
            }
          : sc
      )
    }));
  };

  const removeMedicine = (subcategoryIndex: number, ageGroupIndex: number, medicineIndex: number) => {
    setFormData(prev => ({
      ...prev,
      subcategories: prev.subcategories.map((sc, i) => 
        i === subcategoryIndex 
          ? {
              ...sc,
              age_groups: sc.age_groups.map((ag, j) => 
                j === ageGroupIndex
                  ? {
                      ...ag,
                      medicines: ag.medicines.filter((_, k) => k !== medicineIndex)
                    }
                  : ag
              )
            }
          : sc
      )
    }));
  };

  const updateField = (path: string, value: string) => {
    const pathArray = path.split('.');
    setFormData(prev => {
      const newData = { ...prev };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let current: Record<string, any> = newData;
      
      for (let i = 0; i < pathArray.length - 1; i++) {
        const key = pathArray[i];
        if (key.includes('[') && key.includes(']')) {
          const [arrayKey, indexStr] = key.split('[');
          const index = parseInt(indexStr.replace(']', ''));
          current = current[arrayKey][index];
        } else {
          current = current[key];
        }
      }
      
      const lastKey = pathArray[pathArray.length - 1];
      current[lastKey] = value;
      
      return newData;
    });
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading diseases...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Disease Management</h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          Add New Disease
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Diseases List */}
      <div className="grid gap-6">
        {diseases.map((disease) => (
          <div key={disease.id} className="bg-white shadow-md rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{disease.name}</h2>
              <div className="space-x-2">
                <button
                  onClick={() => openModal(disease)}
                  className="text-blue-600 hover:text-blue-900"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(disease.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {disease.subcategories.map((subcategory, scIndex) => (
                <div key={scIndex} className="border-l-4 border-blue-200 pl-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">{subcategory.name}</h3>
                  
                  <div className="space-y-3">
                    {subcategory.ageGroups.map((ageGroup, agIndex) => (
                      <div key={agIndex} className="bg-gray-50 p-3 rounded">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-gray-700">{ageGroup.group}</span>
                          <span className="text-sm text-gray-500">{ageGroup.ageRange}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {ageGroup.medicines.map((medicine, mIndex) => (
                            <div key={mIndex} className="bg-white p-2 rounded border">
                              <div className="font-medium text-sm">{medicine.name}</div>
                              <div className="text-xs text-gray-600">{medicine.dosage}</div>
                              {medicine.notes && (
                                <div className="text-xs text-gray-500 mt-1">{medicine.notes}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {diseases.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No diseases found. Add one to get started.
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {editingDisease ? 'Edit Disease' : 'Add New Disease'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Disease Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Subcategories
                  </label>
                  <button
                    type="button"
                    onClick={addSubcategory}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Add Subcategory
                  </button>
                </div>

                {formData.subcategories.map((subcategory, scIndex) => (
                  <div key={scIndex} className="border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <input
                        type="text"
                        placeholder="Subcategory name"
                        value={subcategory.name}
                        onChange={(e) => updateField(`subcategories[${scIndex}].name`, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      {formData.subcategories.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSubcategory(scIndex)}
                          className="ml-2 text-red-600 hover:text-red-900"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="ml-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-600">Age Groups</span>
                        <button
                          type="button"
                          onClick={() => addAgeGroup(scIndex)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                        >
                          Add Age Group
                        </button>
                      </div>

                      {subcategory.age_groups.map((ageGroup, agIndex) => (
                        <div key={agIndex} className="border border-gray-100 rounded p-3 mb-3 bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <input
                              type="text"
                              placeholder="Age group (e.g., Adults)"
                              value={ageGroup.group}
                              onChange={(e) => updateField(`subcategories[${scIndex}].age_groups[${agIndex}].group`, e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                            <div className="flex">
                              <input
                                type="text"
                                placeholder="Age range (e.g., 18-65)"
                                value={ageGroup.age_range}
                                onChange={(e) => updateField(`subcategories[${scIndex}].age_groups[${agIndex}].age_range`, e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                              />
                              {subcategory.age_groups.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeAgeGroup(scIndex, agIndex)}
                                  className="ml-2 text-red-600 hover:text-red-900"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="ml-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-medium text-gray-600">Medicines</span>
                              <button
                                type="button"
                                onClick={() => addMedicine(scIndex, agIndex)}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs"
                              >
                                Add Medicine
                              </button>
                            </div>

                            {ageGroup.medicines.map((medicine, mIndex) => (
                              <div key={mIndex} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2 p-2 bg-white rounded border">
                                <input
                                  type="text"
                                  placeholder="Medicine name"
                                  value={medicine.name}
                                  onChange={(e) => updateField(`subcategories[${scIndex}].age_groups[${agIndex}].medicines[${mIndex}].name`, e.target.value)}
                                  className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                  required
                                />
                                <input
                                  type="text"
                                  placeholder="Dosage"
                                  value={medicine.dosage}
                                  onChange={(e) => updateField(`subcategories[${scIndex}].age_groups[${agIndex}].medicines[${mIndex}].dosage`, e.target.value)}
                                  className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                  required
                                />
                                <div className="flex">
                                  <input
                                    type="text"
                                    placeholder="Notes"
                                    value={medicine.notes}
                                    onChange={(e) => updateField(`subcategories[${scIndex}].age_groups[${agIndex}].medicines[${mIndex}].notes`, e.target.value)}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                  />
                                  {ageGroup.medicines.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeMedicine(scIndex, agIndex, mIndex)}
                                      className="ml-1 text-red-600 hover:text-red-900 text-xs"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
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
                  {submitting ? 'Saving...' : (editingDisease ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiseaseManagement;
   