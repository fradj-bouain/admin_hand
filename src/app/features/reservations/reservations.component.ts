import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { AdminService } from '../../core/services/admin.service';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface Reservation {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  employeeId: string;
  employeeName?: string;
  service: string;
  reservationDateTime: string;
  proposedDateTime?: string;
  status: string;
  governorate?: string;
  city?: string;
  address?: string;
  price?: number;
  notes?: string;
  employeeMessage?: string;
  createdAt: string;
}

@Component({
  selector: 'app-reservations',
  templateUrl: './reservations.component.html',
  styleUrls: ['./reservations.component.scss']
})
export class ReservationsComponent implements OnInit {
  displayedColumns: string[] = ['id', 'userName', 'employeeName', 'service', 'dateTime', 'status', 'price', 'createdAt', 'actions'];
  dataSource = new MatTableDataSource<Reservation>([]);
  allReservations: Reservation[] = [];
  isLoading = false;
  totalElements = 0;
  pageSize = 20;
  currentPage = 0;

  // RES-01: Status filter
  filterStatus = '';
  
  // RES-02: Date filter
  filterStartDate: Date | null = null;
  filterEndDate: Date | null = null;
  
  // RES-03: Employee filter
  filterEmployee = '';

  // Pour la modal d'édition
  showEditDialog = false;
  editingReservation: Reservation | null = null;
  selectedStatus = '';

  statusOptions = [
    { value: 'PENDING', label: 'En attente' },
    { value: 'ACCEPTED', label: 'Acceptée' },
    { value: 'REJECTED', label: 'Refusée' },
    { value: 'MODIFIED', label: 'Modifiée' },
    { value: 'CONFIRMED', label: 'Confirmée' },
    { value: 'COMPLETED', label: 'Terminée' },
    { value: 'CANCELLED', label: 'Annulée' },
  ];

  // Filter status options (includes "all")
  filterStatusOptions = [
    { value: '', label: 'Tous les statuts' },
    ...this.statusOptions
  ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private adminService: AdminService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadReservations();
  }

  loadReservations(): void {
    this.isLoading = true;
    this.adminService.getReservations(this.currentPage, this.pageSize).subscribe({
      next: (data: any) => {
        console.log('Reservations data received:', data);
        let reservations: Reservation[] = [];
        if (data?.content) {
          reservations = data.content;
          this.totalElements = data.totalElements || 0;
        } else if (Array.isArray(data)) {
          reservations = data;
          this.totalElements = data.length;
        }
        
        this.allReservations = reservations;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading reservations:', error);
        this.isLoading = false;
        this.snackBar.open('Erreur lors du chargement des réservations', 'Fermer', {
          duration: 3000,
        });
      },
    });
  }

  // RES-01, RES-02: Apply all filters
  applyFilters(): void {
    let filtered = [...this.allReservations];

    // RES-01: Status filter
    if (this.filterStatus) {
      filtered = filtered.filter(r => 
        r.status?.toUpperCase() === this.filterStatus.toUpperCase()
      );
    }

    // RES-02: Date filter (reservation date)
    if (this.filterStartDate) {
      const start = new Date(this.filterStartDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(r => {
        const resDate = new Date(r.reservationDateTime);
        return resDate >= start;
      });
    }
    if (this.filterEndDate) {
      const end = new Date(this.filterEndDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => {
        const resDate = new Date(r.reservationDateTime);
        return resDate <= end;
      });
    }

    // RES-03: Employee filter (search by name)
    if (this.filterEmployee) {
      const query = this.filterEmployee.toLowerCase().trim();
      filtered = filtered.filter(r => 
        r.employeeName?.toLowerCase().includes(query)
      );
    }

    this.dataSource.data = filtered;
  }

  // Handle filter changes
  onFilterChange(): void {
    this.applyFilters();
  }

  // Clear all filters
  clearFilters(): void {
    this.filterStatus = '';
    this.filterStartDate = null;
    this.filterEndDate = null;
    this.filterEmployee = '';
    this.applyFilters();
  }

  // Check if any filter is active
  hasActiveFilters(): boolean {
    return !!(this.filterStatus || this.filterStartDate || 
              this.filterEndDate || this.filterEmployee);
  }

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadReservations();
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': 'En attente',
      'PENDING': 'En attente',
      'accepted': 'Acceptée',
      'ACCEPTED': 'Acceptée',
      'rejected': 'Refusée',
      'REJECTED': 'Refusée',
      'modified': 'Modifiée',
      'MODIFIED': 'Modifiée',
      'confirmed': 'Confirmée',
      'CONFIRMED': 'Confirmée',
      'completed': 'Terminée',
      'COMPLETED': 'Terminée',
      'cancelled': 'Annulée',
      'CANCELLED': 'Annulée',
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const statusLower = status?.toLowerCase() || '';
    return 'status-' + statusLower;
  }

  // Ouvrir la modal d'édition
  openEditDialog(reservation: Reservation): void {
    this.editingReservation = { ...reservation };
    this.selectedStatus = reservation.status?.toUpperCase() || 'PENDING';
    this.showEditDialog = true;
  }

  // Fermer la modal
  closeEditDialog(): void {
    this.showEditDialog = false;
    this.editingReservation = null;
  }

  // Sauvegarder les modifications
  saveReservation(): void {
    if (!this.editingReservation) return;

    const updateData = {
      status: this.selectedStatus,
      notes: this.editingReservation.notes,
      price: this.editingReservation.price,
    };

    this.adminService.updateReservation(this.editingReservation.id, updateData).subscribe({
      next: () => {
        this.snackBar.open('Réservation mise à jour avec succès', 'Fermer', {
          duration: 3000,
        });
        this.closeEditDialog();
        this.loadReservations();
      },
      error: (error) => {
        console.error('Error updating reservation:', error);
        this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', {
          duration: 3000,
        });
      },
    });
  }

  // Changer le statut rapidement
  changeStatus(reservation: Reservation, newStatus: string): void {
    this.adminService.updateReservationStatus(reservation.id, newStatus).subscribe({
      next: () => {
        this.snackBar.open(`Statut changé en "${this.getStatusLabel(newStatus)}"`, 'Fermer', {
          duration: 3000,
        });
        this.loadReservations();
      },
      error: (error) => {
        console.error('Error updating status:', error);
        this.snackBar.open('Erreur lors du changement de statut', 'Fermer', {
          duration: 3000,
        });
      },
    });
  }

  // Supprimer une réservation
  deleteReservation(reservation: Reservation): void {
    if (confirm(`Voulez-vous vraiment supprimer cette réservation ?`)) {
      this.adminService.deleteReservation(reservation.id).subscribe({
        next: () => {
          this.snackBar.open('Réservation supprimée avec succès', 'Fermer', {
            duration: 3000,
          });
          this.loadReservations();
        },
        error: (error) => {
          console.error('Error deleting reservation:', error);
          this.snackBar.open('Erreur lors de la suppression', 'Fermer', {
            duration: 3000,
          });
        },
      });
    }
  }

  // Voir les détails
  viewDetails(reservation: Reservation): void {
    this.openEditDialog(reservation);
  }
}
