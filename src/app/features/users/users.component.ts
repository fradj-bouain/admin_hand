import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService, User, Employee, CreateClientRequest, CreateEmployeeRequest, EmployeeRatingInfo } from '../../core/services/admin.service';
import { ApiService } from '../../core/services/api.service';
import { ExportService } from '../../core/services/export.service';
import { MatSnackBar } from '@angular/material/snack-bar';

interface Category {
  id: string;
  name: string;
  nameAr: string;
  icon?: string;
  isActive: boolean;
}

// USER-04: Extended Employee interface with service zones
interface EmployeeWithZones extends Employee {
  serviceZones?: string[];
}

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  // Clients
  clientColumns: string[] = ['name', 'email', 'phone', 'location', 'status', 'createdAt', 'actions'];
  clientsDataSource = new MatTableDataSource<User>([]);
  clientCount = 0;
  isLoading = false;
  searchQuery = '';
  allClients: User[] = [];

  // Employees
  employeeColumns: string[] = ['select', 'name', 'profession', 'email', 'calculatedRating', 'rating', 'callBonus', 'status', 'verified', 'actions'];
  employeesDataSource = new MatTableDataSource<EmployeeWithZones>([]);
  employeeCount = 0;
  isLoadingEmployees = false;
  searchQueryEmployee = '';
  allEmployees: EmployeeWithZones[] = [];

  // Bonus d'appel : note réelle / bonus / note calculée (endpoint admin), sélection pour la remise à 0.
  // La sélection ne couvre que les employés affichés : elle est vidée à chaque changement de liste.
  employeeRatings: Record<string, EmployeeRatingInfo> = {};
  selectedEmployeeIds = new Set<string>();
  isResettingBonus = false;

  // USER-01, USER-02, USER-03: Filter variables
  selectedStatusFilter = '';
  selectedGovernorateFilter = '';
  selectedProfessionFilter = '';
  
  // Status options for filter
  statusOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'active', label: 'Actif' },
    { value: 'pending_moderation', label: 'En attente' },
    { value: 'suspended', label: 'Suspendu' },
    { value: 'inactive', label: 'Inactif' }
  ];

  // USER-04: Service zones modal
  showZonesModal = false;
  selectedEmployeeForZones: EmployeeWithZones | null = null;
  selectedServiceZones: string[] = [];
  isSavingZones = false;

  pageSize = 20;
  currentPage = 0;
  currentTab = 0;

  // Forms
  isAddingClient = false;
  isEditingClient = false;
  editingClientId: string | null = null;
  clientForm: FormGroup;
  isSavingClient = false;

  isAddingEmployee = false;
  isEditingEmployee = false;
  editingEmployeeId: string | null = null;
  employeeForm: FormGroup;
  isSavingEmployee = false;

  // Tunisian governorates
  governorates = [
    'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa',
    'Jendouba', 'Kairouan', 'Kasserine', 'Kébili', 'Kef', 'Mahdia',
    'Manouba', 'Médenine', 'Monastir', 'Nabeul', 'Sfax', 'Sidi Bouzid',
    'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan'
  ];

  // Categories for profession selection
  categories: Category[] = [];
  isLoadingCategories = false;

  @ViewChild('clientPaginator') clientPaginator!: MatPaginator;
  @ViewChild('employeePaginator') employeePaginator!: MatPaginator;

  constructor(
    private adminService: AdminService,
    private apiService: ApiService,
    private exportService: ExportService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.clientForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', Validators.email],
      phone: [''],
      password: [''],
      governorate: [''],
      city: [''],
      address: [''],
    });

    this.employeeForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', Validators.email],
      phone: [''],
      password: [''],
      // Jusqu'à 4 métiers ; le premier choisi est le métier principal.
      professions: [[] as string[], [Validators.required, Validators.maxLength(4)]],
      description: [''],
      governorate: ['', Validators.required],
      city: ['', Validators.required],
      address: [''],
      experienceYears: [null],
      minPrice: [''],
      maxPrice: [''],
    });
  }

  ngOnInit(): void {
    this.loadClients();
    this.loadEmployees();
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoadingCategories = true;
    this.adminService.getCategories().subscribe({
      next: (data: any) => {
        // Filter only active categories
        if (Array.isArray(data)) {
          this.categories = data.filter((c: Category) => c.isActive !== false);
        } else {
          this.categories = [];
        }
        this.isLoadingCategories = false;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.isLoadingCategories = false;
      }
    });
  }

  onTabChange(event: MatTabChangeEvent): void {
    this.currentTab = event.index;
    this.cancelClientForm();
    this.cancelEmployeeForm();
  }

  // ===== CLIENT CRUD =====

  loadClients(): void {
    this.isLoading = true;
    // `type: 'CLIENT'` filtre déjà côté serveur (voir admin.service.ts) : plus besoin de refiltrer
    // ici, et `totalElements` reflète maintenant le vrai total de clients, pas celui de tous les
    // utilisateurs confondus (ce qui faussait avant `clientCount`, donc la pagination).
    this.adminService.getUsers(this.currentPage, this.pageSize, 'CLIENT').subscribe({
      next: (data: any) => {
        let users: User[] = [];

        if (data?.content) {
          users = data.content;
        } else if (Array.isArray(data)) {
          users = data;
        }

        this.allClients = users;
        this.clientsDataSource.data = this.allClients;
        this.clientCount = data?.totalElements ?? this.allClients.length;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.isLoading = false;
        this.snackBar.open('Erreur lors du chargement des clients', 'Fermer', {
          duration: 3000,
        });
      },
    });
  }

  toggleAddClient(): void {
    this.isAddingClient = !this.isAddingClient;
    this.isEditingClient = false;
    this.editingClientId = null;
    if (!this.isAddingClient) {
      this.clientForm.reset();
    }
  }

  editClient(client: User): void {
    this.isEditingClient = true;
    this.isAddingClient = true;
    this.editingClientId = client.id;
    this.clientForm.patchValue({
      name: client.name,
      email: client.email,
      phone: client.phone,
      governorate: client.governorate,
      city: client.city,
      address: client.address,
    });
  }

  cancelClientForm(): void {
    this.isAddingClient = false;
    this.isEditingClient = false;
    this.editingClientId = null;
    this.clientForm.reset();
  }

  saveClient(): void {
    if (this.clientForm.invalid) {
      return;
    }

    this.isSavingClient = true;
    const clientData: CreateClientRequest = this.clientForm.value;

    if (this.isEditingClient && this.editingClientId) {
      this.adminService.updateClient(this.editingClientId, clientData).subscribe({
        next: () => {
          this.snackBar.open('Client mis à jour avec succès', 'Fermer', { duration: 3000 });
          this.cancelClientForm();
          this.loadClients();
          this.isSavingClient = false;
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Erreur lors de la mise à jour', 'Fermer', { duration: 3000 });
          this.isSavingClient = false;
        }
      });
    } else {
      this.adminService.createClient(clientData).subscribe({
        next: () => {
          this.snackBar.open('Client créé avec succès', 'Fermer', { duration: 3000 });
          this.cancelClientForm();
          this.loadClients();
          this.isSavingClient = false;
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Erreur lors de la création', 'Fermer', { duration: 3000 });
          this.isSavingClient = false;
        }
      });
    }
  }

  deleteClient(client: User): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le client "${client.name}" ?`)) {
      this.adminService.deleteClient(client.id).subscribe({
        next: () => {
          this.snackBar.open('Client supprimé', 'Fermer', { duration: 3000 });
          this.loadClients();
        },
        error: () => {
          this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  // ===== BONUS D'APPEL =====

  loadEmployeeRatings(ids: string[]): void {
    this.adminService.getEmployeeRatings(ids).subscribe({
      next: (infos) => {
        this.employeeRatings = {};
        for (const info of infos ?? []) {
          this.employeeRatings[info.employeeId] = info;
        }
      },
      error: () => {
        this.employeeRatings = {};
        this.snackBar.open('Erreur lors du chargement des bonus d\'appel', 'Fermer', { duration: 3000 });
      },
    });
  }

  ratingInfo(emp: Employee): EmployeeRatingInfo | undefined {
    return this.employeeRatings[emp.id];
  }

  /** Note principale : la note calculée (la liste des employés la renvoie déjà en `rating`). */
  calculatedRating(emp: Employee): number {
    return this.ratingInfo(emp)?.calculatedRating ?? emp.rating ?? 0;
  }

  isEmployeeSelected(emp: Employee): boolean {
    return this.selectedEmployeeIds.has(emp.id);
  }

  toggleEmployeeSelection(emp: Employee): void {
    if (this.selectedEmployeeIds.has(emp.id)) {
      this.selectedEmployeeIds.delete(emp.id);
    } else {
      this.selectedEmployeeIds.add(emp.id);
    }
  }

  /** Tous les employés affichés sur la page sont-ils sélectionnés ? */
  allPageEmployeesSelected(): boolean {
    const page = this.employeesDataSource.data;
    return page.length > 0 && page.every(e => this.selectedEmployeeIds.has(e.id));
  }

  somePageEmployeesSelected(): boolean {
    return this.selectedEmployeeIds.size > 0 && !this.allPageEmployeesSelected();
  }

  toggleSelectAllPageEmployees(): void {
    if (this.allPageEmployeesSelected()) {
      this.selectedEmployeeIds.clear();
    } else {
      this.employeesDataSource.data.forEach(e => this.selectedEmployeeIds.add(e.id));
    }
  }

  /** Remet à 0 le bonus des SEULS employés sélectionnés, après confirmation ; aucune note n'est modifiée. */
  resetSelectedCallBonus(): void {
    const ids = Array.from(this.selectedEmployeeIds);
    if (ids.length === 0 || this.isResettingBonus) return;
    if (!confirm(`Remettre à 0 le bonus d'appel de ${ids.length} employé(s) ? Les notes réelles et les avis ne changent pas.`)) {
      return;
    }
    this.isResettingBonus = true;
    this.adminService.resetCallBonus(ids).subscribe({
      next: (result) => {
        this.isResettingBonus = false;
        this.snackBar.open(`Bonus d'appel remis à 0 pour ${result?.reset ?? ids.length} employé(s)`, 'Fermer', { duration: 3000 });
        this.selectedEmployeeIds.clear();
        this.loadEmployees();
      },
      error: (err) => {
        this.isResettingBonus = false;
        // La sélection est conservée pour pouvoir réessayer
        this.snackBar.open(err.error?.message || 'Erreur lors de la remise à zéro du bonus', 'Fermer', { duration: 3000 });
      },
    });
  }

  // ===== EMPLOYEE CRUD =====

  loadEmployees(): void {
    this.isLoadingEmployees = true;
    this.adminService.getEmployees(this.currentPage, this.pageSize).subscribe({
      next: (data: any) => {
        let employees: Employee[] = [];
        
        if (data?.content) {
          employees = data.content;
        } else if (Array.isArray(data)) {
          employees = data;
        }
        
        this.allEmployees = employees;
        this.employeesDataSource.data = employees;
        this.selectedEmployeeIds.clear();
        this.loadEmployeeRatings(employees.map(e => e.id));
        // Même correctif que loadClients() : le vrai total serveur, pas la taille de la seule
        // page reçue — sans ça le paginateur se désactivait dès que le total dépassait pageSize.
        this.employeeCount = data?.totalElements ?? employees.length;
        this.isLoadingEmployees = false;
      },
      error: (error) => {
        console.error('Error loading employees:', error);
        this.isLoadingEmployees = false;
        this.snackBar.open('Erreur lors du chargement des employés', 'Fermer', {
          duration: 3000,
        });
      },
    });
  }

  toggleAddEmployee(): void {
    this.isAddingEmployee = !this.isAddingEmployee;
    this.isEditingEmployee = false;
    this.editingEmployeeId = null;
    if (!this.isAddingEmployee) {
      this.employeeForm.reset();
    }
  }

  editEmployee(employee: Employee): void {
    this.isEditingEmployee = true;
    this.isAddingEmployee = true;
    this.editingEmployeeId = employee.id;
    this.employeeForm.patchValue({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      professions: employee.professions?.length ? [...employee.professions] : [employee.profession],
      description: employee.description,
      // Une ancienne valeur hors des 24 laisse le champ vide : "requis" oblige alors à choisir.
      governorate: this.officialGovernorate(employee.location?.governorate) ?? '',
      city: employee.location?.city,
      address: employee.location?.address,
    });
  }

  /**
   * Nom officiel d'un gouvernorat enregistré (majuscules, espaces, accents, nom arabe ou alias
   * tolérés), sinon null. Mêmes règles que GovernorateNormalizer (backend) et
   * officialGovernorate (app).
   */
  private officialGovernorate(value?: string | null): string | null {
    if (!value || !value.trim()) return null;
    const key = (s: string) => s.trim().toLowerCase().normalize('NFD')
      .replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
    const arabic: Record<string, string> = {
      'Ariana': 'أريانة', 'Béja': 'باجة', 'Ben Arous': 'بن عروس', 'Bizerte': 'بنزرت',
      'Gabès': 'قابس', 'Gafsa': 'قفصة', 'Jendouba': 'جندوبة', 'Kairouan': 'القيروان',
      'Kasserine': 'القصرين', 'Kébili': 'قبلي', 'Kef': 'الكاف', 'Mahdia': 'المهدية',
      'Manouba': 'منوبة', 'Médenine': 'مدنين', 'Monastir': 'المنستير', 'Nabeul': 'نابل',
      'Sfax': 'صفاقس', 'Sidi Bouzid': 'سيدي بوزيد', 'Siliana': 'سليانة', 'Sousse': 'سوسة',
      'Tataouine': 'تطاوين', 'Tozeur': 'توزر', 'Tunis': 'تونس', 'Zaghouan': 'زغوان',
    };
    const aliases: Record<string, string[]> = {
      'Kef': ['Le Kef', 'El Kef'], 'Manouba': ['La Manouba'], 'Sidi Bouzid': ['Sidi Bou Zid'],
    };
    const wanted = key(value);
    return this.governorates.find(gov =>
      [gov, arabic[gov], ...(aliases[gov] ?? [])].some(name => !!name && key(name) === wanted)
    ) ?? null;
  }

  /** Catégories + anciens métiers libres déjà détenus (sinon ils disparaîtraient de la liste). */
  get professionOptions(): { name: string; icon?: string }[] {
    const selected: string[] = this.employeeForm.get('professions')?.value ?? [];
    const known = new Set(this.categories.map(c => c.name.toLowerCase()));
    return [
      ...this.categories.map(c => ({ name: c.name, icon: c.icon })),
      ...selected.filter(n => !known.has(n.toLowerCase())).map(n => ({ name: n })),
    ];
  }

  trackByProfession(_: number, option: { name: string }): string {
    return option.name;
  }

  isProfessionDisabled(name: string): boolean {
    const selected: string[] = this.employeeForm.get('professions')?.value ?? [];
    return selected.length >= 4 && !selected.includes(name);
  }

  /** "Plombier · Peintre" — tous les métiers pour l'affichage en tableau. */
  professionsLabel(emp: Employee): string {
    return emp.professions?.length ? emp.professions.join(' · ') : (emp.profession || '-');
  }

  cancelEmployeeForm(): void {
    this.isAddingEmployee = false;
    this.isEditingEmployee = false;
    this.editingEmployeeId = null;
    this.employeeForm.reset();
  }

  saveEmployee(): void {
    if (this.employeeForm.invalid) {
      return;
    }

    this.isSavingEmployee = true;
    const formValue = this.employeeForm.value;
    const employeeData: CreateEmployeeRequest = {
      ...formValue,
      // profession (unique) = principale, gardée pour les anciens clients de l'API.
      profession: formValue.professions[0],
      professions: formValue.professions,
    };

    if (this.isEditingEmployee && this.editingEmployeeId) {
      this.adminService.updateEmployee(this.editingEmployeeId, employeeData).subscribe({
        next: () => {
          this.snackBar.open('Employé mis à jour avec succès', 'Fermer', { duration: 3000 });
          this.cancelEmployeeForm();
          this.loadEmployees();
          this.isSavingEmployee = false;
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Erreur lors de la mise à jour', 'Fermer', { duration: 3000 });
          this.isSavingEmployee = false;
        }
      });
    } else {
      this.adminService.createEmployee(employeeData).subscribe({
        next: () => {
          this.snackBar.open('Employé créé avec succès', 'Fermer', { duration: 3000 });
          this.cancelEmployeeForm();
          this.loadEmployees();
          this.isSavingEmployee = false;
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Erreur lors de la création', 'Fermer', { duration: 3000 });
          this.isSavingEmployee = false;
        }
      });
    }
  }

  deleteEmployee(employee: Employee): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'employé "${employee.name}" ?`)) {
      this.adminService.deleteEmployee(employee.id).subscribe({
        next: () => {
          this.snackBar.open('Employé supprimé', 'Fermer', { duration: 3000 });
          this.loadEmployees();
        },
        error: () => {
          this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 3000 });
        }
      });
    }
  }

  // ===== FILTERS =====

  filterUsers(): void {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) {
      this.clientsDataSource.data = this.allClients;
    } else {
      this.clientsDataSource.data = this.allClients.filter(user =>
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phone?.includes(query)
      );
    }
  }

  // USER-01, USER-02, USER-03: Enhanced employee filter with multiple criteria
  filterEmployees(): void {
    let filtered = [...this.allEmployees];

    // Text search filter
    const query = this.searchQueryEmployee.toLowerCase().trim();
    if (query) {
      filtered = filtered.filter(emp =>
        emp.name?.toLowerCase().includes(query) ||
        emp.profession?.toLowerCase().includes(query) ||
        emp.professions?.some(p => p.toLowerCase().includes(query)) ||
        emp.email?.toLowerCase().includes(query) ||
        emp.phone?.includes(query)
      );
    }

    // USER-01: Status filter
    if (this.selectedStatusFilter) {
      filtered = filtered.filter(emp => 
        emp.status?.toLowerCase() === this.selectedStatusFilter.toLowerCase()
      );
    }

    // USER-02: Governorate filter
    if (this.selectedGovernorateFilter) {
      filtered = filtered.filter(emp => 
        emp.location?.governorate === this.selectedGovernorateFilter
      );
    }

    // USER-03: Profession filter
    if (this.selectedProfessionFilter) {
      filtered = filtered.filter(emp => 
        emp.profession === this.selectedProfessionFilter ||
        emp.professions?.includes(this.selectedProfessionFilter)
      );
    }

    this.employeesDataSource.data = filtered;
    // Jamais de remise à 0 sur des employés qui ne sont plus affichés
    this.selectedEmployeeIds.clear();
  }

  // USER-01, USER-02, USER-03: Handle filter changes
  onEmployeeFilterChange(): void {
    this.filterEmployees();
  }

  // Clear all employee filters
  clearEmployeeFilters(): void {
    this.searchQueryEmployee = '';
    this.selectedStatusFilter = '';
    this.selectedGovernorateFilter = '';
    this.selectedProfessionFilter = '';
    this.filterEmployees();
  }

  // Check if any filter is active
  hasActiveFilters(): boolean {
    return !!(this.searchQueryEmployee || this.selectedStatusFilter || 
              this.selectedGovernorateFilter || this.selectedProfessionFilter);
  }

  // ===== USER-04: SERVICE ZONES MANAGEMENT =====

  openZonesModal(employee: EmployeeWithZones): void {
    this.selectedEmployeeForZones = employee;
    this.selectedServiceZones = [...(employee.serviceZones || [])];
    
    // If no zones loaded yet, try to fetch them
    if (!employee.serviceZones) {
      this.loadEmployeeZones(employee.id);
    }
    
    this.showZonesModal = true;
  }

  closeZonesModal(): void {
    this.showZonesModal = false;
    this.selectedEmployeeForZones = null;
    this.selectedServiceZones = [];
  }

  loadEmployeeZones(employeeId: string): void {
    this.apiService.get<any>(`/employees/${employeeId}/service-zones`).subscribe({
      next: (response) => {
        const zones = response.data || response || [];
        this.selectedServiceZones = zones;
        if (this.selectedEmployeeForZones) {
          this.selectedEmployeeForZones.serviceZones = zones;
        }
      },
      error: (err) => {
        console.error('Error loading service zones:', err);
        // Default to employee's location governorate if no zones
        if (this.selectedEmployeeForZones?.location?.governorate) {
          this.selectedServiceZones = [this.selectedEmployeeForZones.location.governorate];
        }
      }
    });
  }

  toggleZone(zone: string): void {
    const index = this.selectedServiceZones.indexOf(zone);
    if (index > -1) {
      this.selectedServiceZones.splice(index, 1);
    } else {
      this.selectedServiceZones.push(zone);
    }
  }

  isZoneSelected(zone: string): boolean {
    return this.selectedServiceZones.includes(zone);
  }

  saveServiceZones(): void {
    if (!this.selectedEmployeeForZones) return;

    this.isSavingZones = true;
    this.apiService.put<any>(
      `/employees/${this.selectedEmployeeForZones.id}/service-zones`,
      { zones: this.selectedServiceZones }
    ).subscribe({
      next: () => {
        this.snackBar.open('Zones de service mises à jour', 'Fermer', { duration: 3000 });
        if (this.selectedEmployeeForZones) {
          this.selectedEmployeeForZones.serviceZones = [...this.selectedServiceZones];
        }
        this.isSavingZones = false;
        this.closeZonesModal();
      },
      error: (err) => {
        console.error('Error saving service zones:', err);
        this.snackBar.open('Erreur lors de la sauvegarde', 'Fermer', { duration: 3000 });
        this.isSavingZones = false;
      }
    });
  }

  // ===== STATUS UPDATES =====

  toggleUserStatus(user: User): void {
    this.adminService.updateUserStatus(user.id, !user.isActive).subscribe({
      next: () => {
        user.isActive = !user.isActive;
        this.snackBar.open(
          `Utilisateur ${user.isActive ? 'activé' : 'désactivé'}`,
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

  verifyEmployee(employee: Employee): void {
    this.adminService.verifyEmployee(employee.id).subscribe({
      next: () => {
        employee.isVerified = true;
        employee.status = 'active';
        this.snackBar.open('Employé vérifié avec succès', 'Fermer', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Erreur lors de la vérification', 'Fermer', {
          duration: 3000,
        });
      },
    });
  }

  updateEmployeeStatus(employee: Employee, status: string): void {
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

  // ===== HELPERS =====

  onPageChange(event: any, type: string): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    if (type === 'CLIENT') {
      this.loadClients();
    } else {
      this.loadEmployees();
    }
  }

  getAvatarColor(name: string): string {
    if (!name) return '#9ca3af';
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
      '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
      '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  getEmployeeStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'active': return 'active';
      case 'pending_moderation': return 'pending';
      case 'suspended': return 'suspended';
      case 'inactive': return 'inactive';
      default: return '';
    }
  }

  getEmployeeStatusLabel(status: string): string {
    switch (status?.toLowerCase()) {
      case 'active': return 'Actif';
      case 'pending_moderation': return 'En attente';
      case 'suspended': return 'Suspendu';
      case 'inactive': return 'Inactif';
      default: return status || '-';
    }
  }

  // USER-07: Export clients to CSV
  exportClients(): void {
    if (this.allClients.length === 0) {
      this.snackBar.open('Aucun client à exporter', 'Fermer', { duration: 3000 });
      return;
    }
    this.exportService.exportUsers(this.allClients, 'clients');
    this.snackBar.open('Export des clients en cours...', 'Fermer', { duration: 2000 });
  }

  // USER-07: Export employees to CSV
  exportEmployees(): void {
    if (this.allEmployees.length === 0) {
      this.snackBar.open('Aucun employé à exporter', 'Fermer', { duration: 3000 });
      return;
    }
    
    // Flatten location for export
    const data = this.allEmployees.map(emp => ({
      ...emp,
      governorate: emp.location?.governorate || '',
      city: emp.location?.city || ''
    }));
    
    this.exportService.exportUsers(data, 'employees');
    this.snackBar.open('Export des employés en cours...', 'Fermer', { duration: 2000 });
  }
}
