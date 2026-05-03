import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { AdminService, Employee } from '../../core/services/admin.service';
import { ExportService } from '../../core/services/export.service';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface ClientInfo {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
}

export interface EmployeeInfo {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  profession?: string;
  photoUrl?: string;
  isVerified?: boolean;
}

export interface Request {
  id: string;
  userId: string;
  employeeId?: string;
  profession: string;
  description: string;
  photos?: string[];
  location?: {
    governorate?: string;
    city?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  urgency: string;
  status: string;
  estimatedPrice?: number;
  finalPrice?: number;
  notes?: string;
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
  client?: ClientInfo;
  employee?: EmployeeInfo;
}

@Component({
  selector: 'app-requests',
  templateUrl: './requests.component.html',
  styleUrls: ['./requests.component.scss']
})
export class RequestsComponent implements OnInit {
  displayedColumns: string[] = ['id', 'client', 'profession', 'location', 'status', 'urgency', 'price', 'createdAt', 'actions'];
  dataSource = new MatTableDataSource<Request>([]);
  allRequests: Request[] = [];
  isLoading = false;
  totalElements = 0;
  pageSize = 20;
  currentPage = 0;
  selectedStatus: string = '';
  
  // REQ-01: Governorate filter
  selectedGovernorate: string = '';
  
  // REQ-02: Date filter
  startDate: Date | null = null;
  endDate: Date | null = null;
  
  // REQ-03: Profession filter
  selectedProfession: string = '';
  
  selectedRequest: Request | null = null;
  isEditing = false;
  
  // REQ-04: Employee list for assignment
  employees: Employee[] = [];
  isLoadingEmployees = false;
  employeeSearchQuery = '';
  filteredEmployees: Employee[] = [];
  
  // Edit form fields
  editForm = {
    profession: '',
    description: '',
    governorate: '',
    city: '',
    address: '',
    urgency: '',
    status: '',
    estimatedPrice: null as number | null,
    finalPrice: null as number | null,
    notes: '',
    employeeId: ''
  };

  governorates = [
    'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa', 'Jendouba',
    'Kairouan', 'Kasserine', 'Kébili', 'Kef', 'Mahdia', 'Manouba', 'Médenine',
    'Monastir', 'Nabeul', 'Sfax', 'Sidi Bouzid', 'Siliana', 'Sousse', 'Tataouine',
    'Tozeur', 'Tunis', 'Zaghouan'
  ];

  categories: any[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private adminService: AdminService,
    private exportService: ExportService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadRequests();
    this.loadCategories();
    this.loadEmployees(); // REQ-04: Load employees for assignment
  }

  loadCategories(): void {
    this.adminService.getCategories().subscribe({
      next: (data: any) => {
        this.categories = Array.isArray(data) ? data : (data?.content || []);
      },
      error: (err) => console.error('Error loading categories:', err)
    });
  }

  // REQ-04: Load employees for assignment dropdown
  loadEmployees(): void {
    this.isLoadingEmployees = true;
    this.adminService.getEmployees(0, 200).subscribe({
      next: (data: any) => {
        const employees = data?.content || (Array.isArray(data) ? data : []);
        this.employees = employees.filter((e: Employee) => e.status === 'active');
        this.filteredEmployees = [...this.employees];
        this.isLoadingEmployees = false;
      },
      error: (err) => {
        console.error('Error loading employees:', err);
        this.isLoadingEmployees = false;
      }
    });
  }

  // REQ-04: Filter employees in dropdown
  filterEmployeeList(): void {
    const query = this.employeeSearchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredEmployees = [...this.employees];
    } else {
      this.filteredEmployees = this.employees.filter(emp =>
        emp.name?.toLowerCase().includes(query) ||
        emp.profession?.toLowerCase().includes(query)
      );
    }
  }

  loadRequests(): void {
    this.isLoading = true;
    this.adminService.getRequests(this.currentPage, this.pageSize, this.selectedStatus || undefined).subscribe({
      next: (data: any) => {
        console.log('Requests data received:', data);
        let requests: Request[] = [];
        if (data?.content) {
          requests = data.content;
          this.totalElements = data.totalElements || 0;
        } else if (Array.isArray(data)) {
          requests = data;
          this.totalElements = data.length;
        }
        
        this.allRequests = requests;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading requests:', error);
        this.isLoading = false;
        this.snackBar.open('Erreur lors du chargement des demandes', 'Fermer', {
          duration: 3000,
        });
      },
    });
  }

  // REQ-01, REQ-02, REQ-03: Apply all filters
  applyFilters(): void {
    let filtered = [...this.allRequests];

    // REQ-01: Governorate filter
    if (this.selectedGovernorate) {
      filtered = filtered.filter(r => 
        r.location?.governorate === this.selectedGovernorate
      );
    }

    // REQ-02: Date filter
    if (this.startDate) {
      const start = new Date(this.startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(r => new Date(r.createdAt) >= start);
    }
    if (this.endDate) {
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => new Date(r.createdAt) <= end);
    }

    // REQ-03: Profession filter
    if (this.selectedProfession) {
      filtered = filtered.filter(r => r.profession === this.selectedProfession);
    }

    this.dataSource.data = filtered;
  }

  onStatusFilterChange(): void {
    this.currentPage = 0;
    this.loadRequests();
  }

  // REQ-01, REQ-02, REQ-03: Handle filter changes
  onFilterChange(): void {
    this.applyFilters();
  }

  // Clear all filters
  clearFilters(): void {
    this.selectedStatus = '';
    this.selectedGovernorate = '';
    this.selectedProfession = '';
    this.startDate = null;
    this.endDate = null;
    this.loadRequests();
  }

  // Check if any filter is active
  hasActiveFilters(): boolean {
    return !!(this.selectedStatus || this.selectedGovernorate || 
              this.selectedProfession || this.startDate || this.endDate);
  }

  // REQ-05: Export requests to CSV
  exportRequests(): void {
    if (this.dataSource.data.length === 0) {
      this.snackBar.open('Aucune demande à exporter', 'Fermer', { duration: 3000 });
      return;
    }
    this.exportService.exportRequests(this.dataSource.data);
    this.snackBar.open('Export des demandes en cours...', 'Fermer', { duration: 2000 });
  }

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadRequests();
  }

  viewDetails(request: Request): void {
    this.selectedRequest = request;
    this.isEditing = false;
    this.populateEditForm(request);
  }

  populateEditForm(request: Request): void {
    this.editForm = {
      profession: request.profession || '',
      description: request.description || '',
      governorate: request.location?.governorate || '',
      city: request.location?.city || '',
      address: request.location?.address || '',
      urgency: request.urgency || 'normal',
      status: request.status || 'pending',
      estimatedPrice: request.estimatedPrice || null,
      finalPrice: request.finalPrice || null,
      notes: request.notes || '',
      employeeId: request.employeeId || ''
    };
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (this.isEditing && this.selectedRequest) {
      this.populateEditForm(this.selectedRequest);
    }
  }

  closeDetails(): void {
    this.selectedRequest = null;
    this.isEditing = false;
  }

  saveChanges(): void {
    if (!this.selectedRequest) return;

    const updateData = {
      profession: this.editForm.profession,
      description: this.editForm.description,
      governorate: this.editForm.governorate,
      city: this.editForm.city,
      address: this.editForm.address,
      urgency: this.editForm.urgency.toUpperCase(),
      status: this.editForm.status.toUpperCase(),
      estimatedPrice: this.editForm.estimatedPrice,
      finalPrice: this.editForm.finalPrice,
      notes: this.editForm.notes,
      employeeId: this.editForm.employeeId || null
    };

    this.adminService.updateRequest(this.selectedRequest.id, updateData).subscribe({
      next: (response: any) => {
        this.snackBar.open('Demande mise à jour avec succès', 'Fermer', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.isEditing = false;
        this.loadRequests();
        // Update selected request with new data
        if (response) {
          this.selectedRequest = response;
        }
      },
      error: (error) => {
        console.error('Error updating request:', error);
        this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  deleteRequest(): void {
    if (!this.selectedRequest) return;
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer cette demande ?\nID: ${this.selectedRequest.id}`)) {
      this.adminService.deleteRequest(this.selectedRequest.id).subscribe({
        next: () => {
          this.snackBar.open('Demande supprimée avec succès', 'Fermer', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.closeDetails();
          this.loadRequests();
        },
        error: (error) => {
          console.error('Error deleting request:', error);
          this.snackBar.open('Erreur lors de la suppression', 'Fermer', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  confirmDelete(request: Request): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer cette demande ?\nProfession: ${request.profession}\nID: ${request.id}`)) {
      this.adminService.deleteRequest(request.id).subscribe({
        next: () => {
          this.snackBar.open('Demande supprimée avec succès', 'Fermer', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.loadRequests();
        },
        error: (error) => {
          console.error('Error deleting request:', error);
          this.snackBar.open('Erreur lors de la suppression', 'Fermer', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': 'En attente',
      'accepted': 'Acceptée',
      'in_progress': 'En cours',
      'completed': 'Terminée',
      'cancelled': 'Annulée',
    };
    return labels[status?.toLowerCase()] || status;
  }

  getUrgencyLabel(urgency: string): string {
    const labels: { [key: string]: string } = {
      'normal': 'Normale',
      'urgent': 'Urgente',
      'very_urgent': 'Très urgente',
    };
    return labels[urgency?.toLowerCase()] || urgency;
  }

  getClientName(request: Request): string {
    return request.client?.name || 'Client #' + (request.userId?.substring(0, 6) || 'N/A');
  }
}
