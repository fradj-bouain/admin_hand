import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { AdminService, Employee } from '../../core/services/admin.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-employees',
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.scss']
})
export class EmployeesComponent implements OnInit {
  displayedColumns: string[] = ['name', 'profession', 'rating', 'status', 'verified', 'actions'];
  dataSource = new MatTableDataSource<Employee>([]);
  isLoading = false;
  totalElements = 0;
  pageSize = 20;
  currentPage = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private adminService: AdminService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.isLoading = true;
    this.adminService.getEmployees(this.currentPage, this.pageSize).subscribe({
      next: (data: any) => {
        console.log('Employees data received:', data);
        // Handle both paginated and non-paginated responses
        if (data?.content) {
          this.dataSource.data = data.content;
          this.totalElements = data.totalElements || 0;
        } else if (Array.isArray(data)) {
          this.dataSource.data = data;
          this.totalElements = data.length;
        } else {
          this.dataSource.data = [];
          this.totalElements = 0;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading employees:', error);
        this.isLoading = false;
        this.snackBar.open('Erreur lors du chargement des employés', 'Fermer', {
          duration: 3000,
        });
      },
    });
  }

  updateStatus(employee: Employee, status: string): void {
    this.adminService.updateEmployeeStatus(employee.id, status).subscribe({
      next: () => {
        employee.status = status as any;
        this.snackBar.open('Statut mis à jour', 'Fermer', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', {
          duration: 3000,
        });
      },
    });
  }

  verifyEmployee(employee: Employee): void {
    this.adminService.verifyEmployee(employee.id).subscribe({
      next: () => {
        employee.isVerified = true;
        this.snackBar.open('Employé vérifié', 'Fermer', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Erreur lors de la vérification', 'Fermer', {
          duration: 3000,
        });
      },
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'active';
      case 'pending_moderation':
        return 'pending';
      case 'suspended':
        return 'suspended';
      case 'inactive':
        return 'inactive';
      default:
        return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'pending_moderation':
        return 'En attente';
      case 'suspended':
        return 'Suspendu';
      case 'inactive':
        return 'Inactif';
      default:
        return status;
    }
  }

  onPageChange(event: any): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadEmployees();
  }
}
