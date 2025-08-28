import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Edit2, Trash2, Plus, Heart, User, Pill, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

// Types based on backend schema
interface Medicine {
  id?: string;
  medicineId?: number;
  name: string;
  dosage: string;
  notes: string;
}

interface PrescribedMedicine {
  id: number;
  dosage: string;
  notes: string;
  medicine: {
    id: number;
    name: string;
    form: string;
    strength: string;
    unit: string;
  };
}

interface AgeGroup {
  id?: number;
  group: string;
  ageRange: string;
  medicines?: Medicine[]; // For form data
  prescribed?: PrescribedMedicine[]; // For display data from API
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

const DiseaseManagement: React.FC = () => {
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [filteredDiseases, setFilteredDiseases] = useState<Disease[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingDisease, setEditingDisease] = useState<Disease | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    subcategories: [
      {
        name: '',
        ageGroups: [
          {
            group: '',
            ageRange: '',
            medicines: [
              {
                name: '',
                dosage: '',
                notes: ''
              }
            ]
          }
        ]
      }
    ]
  });

  // API base URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  const loadDiseases = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading diseases from:', `${API_BASE_URL}/diseases`);
      
      const response = await axios.get(`${API_BASE_URL}/diseases`);
      console.log('Diseases response:', response.data);
      
      setDiseases(response.data);
      setFilteredDiseases(response.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load disease data';
      setError(errorMessage);
      console.error('Error loading diseases:', err);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    loadDiseases();
  }, [loadDiseases]);

  // Filter diseases based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredDiseases(diseases);
    } else {
      const filtered = diseases.filter(disease =>
        disease.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        disease.subcategories.some(subcategory =>
          subcategory.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          subcategory.ageGroups.some(ageGroup =>
            ageGroup.group.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (ageGroup.prescribed || []).some(prescribed =>
              prescribed.medicine.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
          )
        )
      );
      setFilteredDiseases(filtered);
    }
  }, [searchTerm, diseases]);

  const handleDelete = async (id: number): Promise<void> => {
    if (!confirm('Are you sure you want to delete this disease?')) return;
    
    try {
      await axios.delete(`${API_BASE_URL}/diseases/${id}`);
      setDiseases(diseases.filter(d => d.id !== id));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete disease';
      setError(errorMessage);
      console.error('Error deleting disease:', err);
    }
  };

  const openModal = (disease?: Disease): void => {
    if (disease) {
      // Populate form for editing
      setFormData({
        name: disease.name,
        subcategories: disease.subcategories.map(sub => ({
          name: sub.name,
          ageGroups: sub.ageGroups.map(age => ({
            group: age.group,
            ageRange: age.ageRange,
            medicines: age.medicines && age.medicines.length > 0 
              ? age.medicines.map(med => ({
                  name: med.name,
                  dosage: med.dosage,
                  notes: med.notes
                }))
              : [{
                  name: '',
                  dosage: '',
                  notes: ''
                }]
          }))
        }))
      });
      setEditingDisease(disease);
    } else {
      // Reset form for new disease
      setFormData({
        name: '',
        subcategories: [
          {
            name: '',
            ageGroups: [
              {
                group: '',
                ageRange: '',
                medicines: [
                  {
                    name: '',
                    dosage: '',
                    notes: ''
                  }
                ]
              }
            ]
          }
        ]
      });
      setEditingDisease(null);
    }
    setIsModalOpen(true);
    setError(null);
  };

  const closeModal = (): void => {
    setIsModalOpen(false);
    setEditingDisease(null);
    setError(null);
    setFormData({
      name: '',
      subcategories: [
        {
          name: '',
          ageGroups: [
            {
              group: '',
              ageRange: '',
              medicines: [
                {
                  name: '',
                  dosage: '',
                  notes: ''
                }
              ]
            }
          ]
        }
      ]
    });
  };

  const handleSave = async (): Promise<void> => {
    try {
      setSaving(true);
      setError(null);

      // Validate form
      if (!formData.name.trim()) {
        setError('Disease name is required');
        return;
      }

      if (formData.subcategories.some(sub => !sub.name.trim())) {
        setError('All subcategory names are required');
        return;
      }

      if (formData.subcategories.some(sub => 
        sub.ageGroups.some(age => !age.group.trim() || !age.ageRange.trim())
      )) {
        setError('All age group fields are required');
        return;
      }

      const payload = {
        name: formData.name,
        subcategories: formData.subcategories.map(sub => ({
          name: sub.name,
          ageGroups: sub.ageGroups.map(age => ({
            group: age.group,
            ageRange: age.ageRange,
            medicines: age.medicines.filter(med => med.name.trim()) // Only include medicines with names
          }))
        }))
      };

      if (editingDisease) {
        // Update existing disease
        await axios.put(`${API_BASE_URL}/diseases/${editingDisease.id}`, payload);
      } else {
        // Create new disease
        await axios.post(`${API_BASE_URL}/diseases`, payload);
      }

      await loadDiseases();
      closeModal();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save disease';
      setError(errorMessage);
      console.error('Error saving disease:', err);
    } finally {
      setSaving(false);
    }
  };

  const addSubcategory = (): void => {
    setFormData(prev => ({
      ...prev,
      subcategories: [
        ...prev.subcategories,
        {
          name: '',
          ageGroups: [
            {
              group: '',
              ageRange: '',
              medicines: [
                {
                  name: '',
                  dosage: '',
                  notes: ''
                }
              ]
            }
          ]
        }
      ]
    }));
  };

  const removeSubcategory = (index: number): void => {
    if (formData.subcategories.length > 1) {
      setFormData(prev => ({
        ...prev,
        subcategories: prev.subcategories.filter((_, i) => i !== index)
      }));
    }
  };

  const addAgeGroup = (subcategoryIndex: number): void => {
    setFormData(prev => ({
      ...prev,
      subcategories: prev.subcategories.map((sub, i) =>
        i === subcategoryIndex
          ? {
              ...sub,
              ageGroups: [
                ...sub.ageGroups,
                {
                  group: '',
                  ageRange: '',
                  medicines: [
                    {
                      name: '',
                      dosage: '',
                      notes: ''
                    }
                  ]
                }
              ]
            }
          : sub
      )
    }));
  };

  const removeAgeGroup = (subcategoryIndex: number, ageGroupIndex: number): void => {
    if (formData.subcategories[subcategoryIndex].ageGroups.length > 1) {
      setFormData(prev => ({
        ...prev,
        subcategories: prev.subcategories.map((sub, i) =>
          i === subcategoryIndex
            ? {
                ...sub,
                ageGroups: sub.ageGroups.filter((_, j) => j !== ageGroupIndex)
              }
            : sub
        )
      }));
    }
  };

  const addMedicine = (subcategoryIndex: number, ageGroupIndex: number): void => {
    setFormData(prev => ({
      ...prev,
      subcategories: prev.subcategories.map((sub, i) =>
        i === subcategoryIndex
          ? {
              ...sub,
              ageGroups: sub.ageGroups.map((age, j) =>
                j === ageGroupIndex
                  ? {
                      ...age,
                      medicines: [
                        ...age.medicines,
                        {
                          name: '',
                          dosage: '',
                          notes: ''
                        }
                      ]
                    }
                  : age
              )
            }
          : sub
      )
    }));
  };

  const removeMedicine = (subcategoryIndex: number, ageGroupIndex: number, medicineIndex: number): void => {
    if (formData.subcategories[subcategoryIndex].ageGroups[ageGroupIndex].medicines.length > 1) {
      setFormData(prev => ({
        ...prev,
        subcategories: prev.subcategories.map((sub, i) =>
          i === subcategoryIndex
            ? {
                ...sub,
                ageGroups: sub.ageGroups.map((age, j) =>
                  j === ageGroupIndex
                    ? {
                        ...age,
                        medicines: age.medicines.filter((_, k) => k !== medicineIndex)
                      }
                    : age
                )
              }
            : sub
        )
      }));
    }
  };

  const updateFormField = (path: string, value: string): void => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current: Record<string, unknown> = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (key.includes('[') && key.includes(']')) {
          const arrayKey = key.split('[')[0];
          const index = parseInt(key.split('[')[1].split(']')[0]);
          current = (current[arrayKey] as Record<string, unknown>[])[index];
        } else {
          current = current[key] as Record<string, unknown>;
        }
      }
      
      const lastKey = keys[keys.length - 1];
      current[lastKey] = value;
      
      return newData;
    });
  };

  // Helper functions
  const handleSearchChange = (value: string): void => {
    setSearchTerm(value);
  };

  const toggleCardExpansion = (diseaseId: number): void => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(diseaseId)) {
        newSet.delete(diseaseId);
      } else {
        newSet.add(diseaseId);
      }
      return newSet;
    });
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
            <Heart className="h-8 w-8 text-teal-600" />
            <h1 className="text-3xl font-bold text-gray-900">Disease Management</h1>
          </div>
          <Button onClick={() => openModal()} className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Add New Disease</span>
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <SearchInput
            placeholder="Search diseases, subcategories, age groups, or medicines..."
            value={searchTerm}
            onSearch={handleSearchChange}
          />
        </div>

        {/* Search Results Info */}
        {searchTerm && (
          <div className="mb-4 text-sm text-gray-600">
            {filteredDiseases.length} result{filteredDiseases.length !== 1 ? 's' : ''} found
            {searchTerm && ` for "${searchTerm}"`}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Disease Cards */}
        <div className="space-y-6">
          {filteredDiseases.map((disease) => (
            <Card key={disease.id} className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Heart className="h-6 w-6 text-teal-600" />
                    <span className="text-xl">{disease.name}</span>
                    <Badge variant="secondary">{disease.subcategories.length} subcategories</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCardExpansion(disease.id)}
                    >
                      {expandedCards.has(disease.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openModal(disease)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(disease.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              
              {expandedCards.has(disease.id) && (
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {disease.subcategories.map((subcategory, scIndex) => (
                      <div key={scIndex} className="border-l-4 border-teal-200 pl-4">
                        <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center space-x-2">
                          <span>{subcategory.name}</span>
                          <Badge variant="secondary">{subcategory.ageGroups.length} age groups</Badge>
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {subcategory.ageGroups.map((ageGroup, agIndex) => (
                            <Card key={agIndex} className="border border-gray-200">
                              <CardHeader className="pb-3">
                                <CardTitle className="flex items-center justify-between text-base">
                                  <div className="flex items-center space-x-2">
                                    <User className="h-4 w-4 text-blue-600" />
                                    <span>{ageGroup.group}</span>
                                  </div>
                                  <Badge variant="success" className="text-xs">
                                    {ageGroup.ageRange}
                                  </Badge>
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-gray-600 flex items-center">
                                    <Pill className="h-4 w-4 mr-1" />
                                    Prescribed Medicines:
                                  </p>
                                  <div className="space-y-2">
                                    {(ageGroup.prescribed || []).map((prescribed, mIndex) => (
                                      <div key={mIndex} className="bg-gray-50 p-3 rounded-lg border">
                                        <div className="font-medium text-sm text-gray-900">
                                          {prescribed.medicine.name}
                                        </div>
                                        <div className="text-xs text-blue-600 font-medium">
                                          {prescribed.dosage}
                                        </div>
                                        {prescribed.notes && (
                                          <div className="text-xs text-gray-600 mt-1 italic">
                                            {prescribed.notes}
                                          </div>
                                        )}
                                        <div className="text-xs text-gray-500 mt-1">
                                          {prescribed.medicine.form} • {prescribed.medicine.strength} {prescribed.medicine.unit}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {filteredDiseases.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No diseases found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'Try adjusting your search terms' : 'Add your first disease to get started'}
              </p>
              {!searchTerm && (
                <Button onClick={() => openModal()}>
                  <Plus className="h-5 w-5 mr-2" />
                  Add New Disease
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Heart className="h-5 w-5 text-teal-600" />
                    <span>{editingDisease ? 'Edit Disease' : 'Add New Disease'}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={closeModal}>
                    <Plus className="h-4 w-4 rotate-45" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                  {/* Disease Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Disease Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="Enter disease name"
                      required
                    />
                  </div>

                  {/* Subcategories */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Subcategories</h3>
                      <Button type="button" onClick={addSubcategory} size="sm" className="bg-teal-600 hover:bg-teal-700">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Subcategory
                      </Button>
                    </div>

                    {formData.subcategories.map((subcategory, subIndex) => (
                      <Card key={subIndex} className="mb-4 bg-gray-50">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-800">Subcategory {subIndex + 1}</h4>
                            {formData.subcategories.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSubcategory(subIndex)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={subcategory.name}
                            onChange={(e) => updateFormField(`subcategories[${subIndex}].name`, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="Subcategory name"
                            required
                          />
                        </CardHeader>
                        <CardContent>
                          {/* Age Groups */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="text-sm font-medium text-gray-700">Age Groups</h5>
                              <Button
                                type="button"
                                onClick={() => addAgeGroup(subIndex)}
                                size="sm"
                                variant="outline"
                                className="text-teal-600 border-teal-600 hover:bg-teal-50"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Age Group
                              </Button>
                            </div>
  
                            {subcategory.ageGroups.map((ageGroup, ageIndex) => (
                              <Card key={ageIndex} className="mb-3 bg-white">
                                <CardContent className="pt-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <h6 className="text-sm font-medium text-gray-600">Age Group {ageIndex + 1}</h6>
                                    {subcategory.ageGroups.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeAgeGroup(subIndex, ageIndex)}
                                        className="text-red-500 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">
                                        Group Name <span className="text-red-500">*</span>
                                      </label>
                                      <input
                                        type="text"
                                        value={ageGroup.group}
                                        onChange={(e) => updateFormField(`subcategories[${subIndex}].ageGroups[${ageIndex}].group`, e.target.value)}
                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:border-transparent"
                                        placeholder="e.g., Adults, Children"
                                        required
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">
                                        Age Range <span className="text-red-500">*</span>
                                      </label>
                                      <input
                                        type="text"
                                        value={ageGroup.ageRange}
                                        onChange={(e) => updateFormField(`subcategories[${subIndex}].ageGroups[${ageIndex}].ageRange`, e.target.value)}
                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:border-transparent"
                                        placeholder="e.g., 18-65 years"
                                        required
                                      />
                                    </div>
                                  </div>

                                  {/* Medicines */}
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <label className="text-xs font-medium text-gray-600">Medicines</label>
                                      <Button
                                        type="button"
                                        onClick={() => addMedicine(subIndex, ageIndex)}
                                        size="sm"
                                        variant="outline"
                                        className="text-xs px-2 py-1 h-6"
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add Medicine
                                      </Button>
                                    </div>

                                    {ageGroup.medicines.map((medicine, medIndex) => (
                                      <div key={medIndex} className="grid grid-cols-12 gap-2 mb-2 items-start">
                                        <div className="col-span-4">
                                          <input
                                            type="text"
                                            value={medicine.name}
                                            onChange={(e) => updateFormField(`subcategories[${subIndex}].ageGroups[${ageIndex}].medicines[${medIndex}].name`, e.target.value)}
                                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-teal-500"
                                            placeholder="Medicine name"
                                          />
                                        </div>
                                        <div className="col-span-3">
                                          <input
                                            type="text"
                                            value={medicine.dosage}
                                            onChange={(e) => updateFormField(`subcategories[${subIndex}].ageGroups[${ageIndex}].medicines[${medIndex}].dosage`, e.target.value)}
                                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-teal-500"
                                            placeholder="Dosage"
                                          />
                                        </div>
                                        <div className="col-span-4">
                                          <input
                                            type="text"
                                            value={medicine.notes}
                                            onChange={(e) => updateFormField(`subcategories[${subIndex}].ageGroups[${ageIndex}].medicines[${medIndex}].notes`, e.target.value)}
                                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-teal-500"
                                            placeholder="Notes"
                                          />
                                        </div>
                                        <div className="col-span-1 flex justify-center">
                                          {ageGroup.medicines.length > 1 && (
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => removeMedicine(subIndex, ageIndex, medIndex)}
                                              className="p-1 h-6 w-6 text-red-500 hover:bg-red-50"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={closeModal}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-teal-600 hover:bg-teal-700"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <LoadingSpinner />
                          Saving...
                        </>
                      ) : (
                        <>Save Disease</>
                      )}
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

export default DiseaseManagement;
