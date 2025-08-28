// API Response Types
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  success?: boolean;
  error?: string;
}

// Staff Types
export interface Staff {
  _id: string;
  name: string;
  role: 'Doctor' | 'Nurse' | 'Administrator' | 'Receptionist' | 'Pharmacist' | 'Technician';
  department: string;
  email: string;
  phone: string;
  joinDate: string;
  employeeId?: string;
  salary?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStaffRequest {
  name: string;
  role: Staff['role'];
  department: string;
  email: string;
  phone: string;
  employeeId?: string;
  salary?: number;
}

export interface UpdateStaffRequest extends Partial<CreateStaffRequest> {}

// Bed Types
export interface Bed {
  _id: string;
  number: string;
  ward: string;
  type: 'Standard' | 'ICU Bed' | 'Private Room' | 'Emergency' | 'Pediatric' | 'Maternity';
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  patient?: {
    name: string;
    id: string;
  };
  assignedDate?: string;
  floor?: number;
  capacity?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBedRequest {
  number: string;
  ward: string;
  type: Bed['type'];
  status?: Bed['status'];
  floor?: number;
  capacity?: number;
}

export interface UpdateBedRequest extends Partial<CreateBedRequest> {
  patient?: {
    name: string;
    id: string;
  };
  assignedDate?: string;
}

// Disease Types
export interface Disease {
  _id: string;
  name: string;
  category: 'Cardiovascular' | 'Respiratory' | 'Endocrine' | 'Neurological' | 'Gastrointestinal' | 'Infectious' | 'Musculoskeletal' | 'Mental Health' | 'Other';
  symptoms: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  treatment: string;
  description: string;
  icdCode?: string;
  contagious?: boolean;
  chronicCondition?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDiseaseRequest {
  name: string;
  category: Disease['category'];
  symptoms: string[];
  severity: Disease['severity'];
  treatment: string;
  description: string;
  icdCode?: string;
  contagious?: boolean;
  chronicCondition?: boolean;
}

export interface UpdateDiseaseRequest extends Partial<CreateDiseaseRequest> {}

// Hospital Types
export interface HospitalInfo {
  _id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  totalBeds?: number;
  availableBeds?: number;
  departments?: string[];
}

// Dashboard/Statistics Types
export interface HospitalStats {
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

// Alternative Bed Type (used in dashboard)
export interface DashboardBed {
  id: number;
  type: string;
  status: 'FREE' | 'OCCUPIED' | 'MAINTENANCE';
  departmentId?: number;
  department?: {
    id: number;
    name: string;
  };
}

// Alternative Staff Type (used in dashboard)
export interface DashboardStaff {
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

// Medicine Types
export interface Medicine {
  id: number;
  name: string;
  form: string;
  strength: string;
  unit: string;
}

// Inventory Types
export interface Inventory {
  id: number;
  availableQty: number;
  batchNumber?: string;
  expiryDate?: string;
  medicine: Medicine;
}

// Prediction Types
export interface PredictionData {
  predictions?: string[];
  message?: string;
}



