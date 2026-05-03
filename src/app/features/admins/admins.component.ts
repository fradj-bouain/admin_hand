import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService, AdminUser, CreateAdminRequest } from '../../core/services/admin.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-admins',
  templateUrl: './admins.component.html',
  styleUrls: ['./admins.component.scss']
})
export class AdminsComponent implements OnInit {
  displayedColumns: string[] = ['name', 'email', 'role', 'status', 'lastLogin', 'actions'];
  dataSource = new MatTableDataSource<AdminUser>([]);
  isLoading = false;
  isSaving = false;
  totalElements = 0;
  pageSize = 20;
  
  isAddingAdmin = false;
  adminForm: FormGroup;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private adminService: AdminService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.adminForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['admin', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadAdmins();
  }

  loadAdmins(): void {
    this.isLoading = true;
    this.adminService.getAdmins().subscribe({
      next: (admins: AdminUser[]) => {
        console.log('Admins received:', admins);
        this.dataSource.data = admins || [];
        this.totalElements = admins?.length || 0;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading admins:', error);
        this.isLoading = false;
        this.snackBar.open('Erreur lors du chargement des administrateurs', 'Fermer', {
          duration: 3000,
        });
      },
    });
  }

  toggleAddAdmin(): void {
    this.isAddingAdmin = !this.isAddingAdmin;
    if (!this.isAddingAdmin) {
      this.adminForm.reset({ role: 'admin' });
    }
  }

  saveAdmin(): void {
    if (this.adminForm.invalid) {
      return;
    }

    this.isSaving = true;
    const adminData: CreateAdminRequest = this.adminForm.value;

    this.adminService.createAdmin(adminData).subscribe({
      next: () => {
        this.snackBar.open('Administrateur créé avec succès', 'Fermer', {
          duration: 3000,
        });
        this.toggleAddAdmin();
        this.loadAdmins();
        this.isSaving = false;
      },
      error: (err) => {
        console.error('Error creating admin:', err);
        this.isSaving = false;
        this.snackBar.open(
          err.error?.message || 'Erreur lors de la création de l\'administrateur', 
          'Fermer', 
          { duration: 3000 }
        );
      }
    });
  }

  toggleAdminStatus(admin: AdminUser): void {
    this.adminService.toggleAdminStatus(admin.id, !admin.isActive).subscribe({
      next: () => {
        admin.isActive = !admin.isActive;
        this.snackBar.open(
          `Administrateur ${admin.isActive ? 'activé' : 'désactivé'}`,
          'Fermer',
          { duration: 3000 }
        );
      },
      error: () => {
        this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', {
          duration: 3000,
        });
      },
    });
  }

  deleteAdmin(admin: AdminUser): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'administrateur "${admin.name}" ?`)) {
      this.adminService.deleteAdmin(admin.id).subscribe({
        next: () => {
          this.snackBar.open('Administrateur supprimé', 'Fermer', { duration: 3000 });
          this.loadAdmins();
        },
        error: () => {
          this.snackBar.open('Erreur lors de la suppression', 'Fermer', {
            duration: 3000,
          });
        },
      });
    }
  }

  getAvatarColor(name: string): string {
    if (!name) return '#9ca3af';
    const colors = [
      '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  getRoleLabel(role: string): string {
    switch (role?.toLowerCase()) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Administrateur';
      case 'moderator': return 'Modérateur';
      default: return 'Admin';
    }
  }

  getRoleClass(role: string): string {
    switch (role?.toLowerCase()) {
      case 'super_admin': return 'super-admin';
      case 'admin': return 'admin';
      case 'moderator': return 'moderator';
      default: return '';
    }
  }
}
