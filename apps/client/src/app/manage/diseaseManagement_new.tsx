import React, { useState, useEffect } from 'react';
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

  // API base URL
  // const API_BASE_URL = 'http://localhost:3121/v1/web';
  const API_BASE_URL = 'http://10.0.5.179:3121/v1/web';

  const loadDiseases = async (): Promise<void> => {
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
  };

  useEffect(() => {
    loadDiseases();
  }, []);

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
    setEditingDisease(disease || null);
    setIsModalOpen(true);
    setError(null);
  };

  const closeModal = (): void => {
    setIsModalOpen(false);
    setEditingDisease(null);
    setError(null);
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
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
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
                <div className="text-sm text-gray-600 mb-4">
                  Note: This is a complex form. Please fill out all required fields.
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <Button type="button" variant="outline" onClick={closeModal}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={closeModal} className="bg-teal-600 hover:bg-teal-700">
                    Save (Simplified)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiseaseManagement;
