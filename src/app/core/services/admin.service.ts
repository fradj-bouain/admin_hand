import { Injectable } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService, ApiResponse } from './api.service';

export interface User {
  id: string;
  email: string;
  phone?: string;
  name: string;
  type: 'client' | 'employee' | 'admin';
  photoUrl?: string;
  governorate?: string;
  city?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  lastSeen?: string;
  role?: string;
}

export interface Location {
  governorate: string;
  city: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface Employee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  profession: string;
  professions: string[];
  description: string;
  location: Location;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isTopRated: boolean;
  status: 'active' | 'pending_moderation' | 'suspended' | 'inactive';
  createdAt: string;
}

export interface Request {
  id: string;
  userId: string;
  employeeId?: string;
  profession: string;
  description: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  urgency: 'normal' | 'urgent' | 'very_urgent';
  createdAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalEmployees: number;
  totalRequests: number;
  totalReservations: number;
  pendingRequests: number;
  activeEmployees: number;
  totalRevenue?: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface CreateAdminRequest {
  name: string;
  email: string;
  password: string;
  role: string;
}

export interface CreateClientRequest {
  name: string;
  email?: string;
  phone?: string;
  password?: string;
  governorate?: string;
  city?: string;
  address?: string;
}

export interface CreateEmployeeRequest {
  name: string;
  email?: string;
  phone?: string;
  password?: string;
  profession: string;
  description?: string;
  governorate: string;
  city: string;
  address?: string;
  experienceYears?: number;
  minPrice?: string;
  maxPrice?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  constructor(private apiService: ApiService) {}

  private extractData<T>(response: ApiResponse<T>): T {
    if (response && response.success && response.data !== undefined) {
      return response.data;
    }
    if (response && !response.hasOwnProperty('success')) {
      return response as unknown as T;
    }
    throw new Error(response?.message || 'Erreur lors de la récupération des données');
  }

  // Dashboard
  getDashboardStats(): Observable<DashboardStats> {
    return this.apiService.get<DashboardStats>('/admin/dashboard/stats').pipe(
      map(response => this.extractData(response)),
      catchError(err => {
        console.error('Error getting dashboard stats:', err);
        return of({
          totalUsers: 0,
          totalEmployees: 0,
          totalRequests: 0,
          totalReservations: 0,
          pendingRequests: 0,
          activeEmployees: 0,
          totalRevenue: 0
        });
      })
    );
  }

  // Cleanup database
  cleanupDatabase(): Observable<any> {
    return this.apiService.delete('/admin/cleanup').pipe(
      map(response => this.extractData(response))
    );
  }

  // ===== ADMIN USERS (nouvelle table admins) =====

  getAdmins(): Observable<AdminUser[]> {
    return this.apiService.get<AdminUser[]>('/admin-auth/admins').pipe(
      map(response => this.extractData(response)),
      catchError(err => {
        console.error('Error getting admins:', err);
        return of([]);
      })
    );
  }

  createAdmin(admin: CreateAdminRequest): Observable<any> {
    return this.apiService.post('/admin-auth/admins', admin).pipe(
      map(response => this.extractData(response))
    );
  }

  updateAdmin(id: string, admin: any): Observable<any> {
    return this.apiService.put(`/admin-auth/admins/${id}`, admin).pipe(
      map(response => this.extractData(response))
    );
  }

  deleteAdmin(id: string): Observable<any> {
    return this.apiService.delete(`/admin-auth/admins/${id}`).pipe(
      map(response => this.extractData(response))
    );
  }

  toggleAdminStatus(id: string, isActive: boolean): Observable<any> {
    return this.apiService.patch(`/admin-auth/admins/${id}/status`, { isActive }).pipe(
      map(response => this.extractData(response))
    );
  }

  // ===== Users (clients) =====

  getUsers(page: number = 0, size: number = 20): Observable<any> {
    return this.apiService.get('/users', { page, size }).pipe(
      map(response => this.extractData(response)),
      catchError(err => {
        console.error('Error getting users:', err);
        return of({ content: [], totalElements: 0 });
      })
    );
  }

  getUserById(id: string): Observable<User> {
    return this.apiService.get<User>(`/users/${id}`).pipe(
      map(response => this.extractData(response))
    );
  }

  createClient(client: CreateClientRequest): Observable<any> {
    return this.apiService.post('/admin/clients', client).pipe(
      map(response => this.extractData(response))
    );
  }

  updateClient(id: string, client: any): Observable<any> {
    return this.apiService.put(`/admin/clients/${id}`, client).pipe(
      map(response => this.extractData(response))
    );
  }

  deleteClient(id: string): Observable<any> {
    return this.apiService.delete(`/admin/clients/${id}`).pipe(
      map(response => this.extractData(response))
    );
  }

  updateUserStatus(id: string, isActive: boolean): Observable<any> {
    return this.apiService.patch(`/admin/users/${id}/status`, { isActive }).pipe(
      map(response => this.extractData(response))
    );
  }

  // ===== Employees =====

  getEmployees(page: number = 0, size: number = 20): Observable<any> {
    return this.apiService.get('/employees', { page, size }).pipe(
      map(response => this.extractData(response)),
      catchError(err => {
        console.error('Error getting employees:', err);
        return of({ content: [], totalElements: 0 });
      })
    );
  }

  getEmployeeById(id: string): Observable<Employee> {
    return this.apiService.get<Employee>(`/employees/${id}`).pipe(
      map(response => this.extractData(response))
    );
  }

  createEmployee(employee: CreateEmployeeRequest): Observable<any> {
    return this.apiService.post('/admin/employees', employee).pipe(
      map(response => this.extractData(response))
    );
  }

  updateEmployee(id: string, employee: any): Observable<any> {
    return this.apiService.put(`/admin/employees/${id}`, employee).pipe(
      map(response => this.extractData(response))
    );
  }

  deleteEmployee(id: string): Observable<any> {
    return this.apiService.delete(`/admin/employees/${id}`).pipe(
      map(response => this.extractData(response))
    );
  }

  updateEmployeeStatus(id: string, status: string): Observable<any> {
    return this.apiService.patch(`/admin/employees/${id}/status`, { status }).pipe(
      map(response => this.extractData(response))
    );
  }

  verifyEmployee(id: string): Observable<any> {
    return this.apiService.post(`/admin/employees/${id}/verify`).pipe(
      map(response => this.extractData(response))
    );
  }

  // ===== Requests =====

  getRequests(page: number = 0, size: number = 20, status?: string): Observable<any> {
    const params: any = { page, size };
    if (status) params.status = status;
    return this.apiService.get('/requests/all', params).pipe(
      map(response => this.extractData(response)),
      catchError(err => {
        console.error('Error getting requests:', err);
        return of({ content: [], totalElements: 0 });
      })
    );
  }

  getRequestById(id: string): Observable<Request> {
    return this.apiService.get<Request>(`/requests/${id}`).pipe(
      map(response => this.extractData(response))
    );
  }

  updateRequestStatus(id: string, status: string): Observable<any> {
    return this.apiService.put(`/requests/${id}/status`, null, { status: status.toUpperCase() }).pipe(
      map(response => this.extractData(response)),
      catchError(err => {
        console.error('Error updating request status:', err);
        throw err;
      })
    );
  }

  updateRequest(id: string, data: any): Observable<any> {
    return this.apiService.put(`/admin/requests/${id}`, data).pipe(
      map(response => this.extractData(response)),
      catchError(err => {
        console.error('Error updating request:', err);
        throw err;
      })
    );
  }

  deleteRequest(id: string): Observable<any> {
    return this.apiService.delete(`/admin/requests/${id}`).pipe(
      map(response => this.extractData(response)),
      catchError(err => {
        console.error('Error deleting request:', err);
        throw err;
      })
    );
  }

  // ===== Reservations =====

  getReservations(page: number = 0, size: number = 20): Observable<any> {
    return this.apiService.get('/reservations/all', { page, size }).pipe(
      map(response => this.extractData(response)),
      catchError(err => {
        console.error('Error getting reservations:', err);
        return of({ content: [], totalElements: 0 });
      })
    );
  }

  getReservationById(id: string): Observable<any> {
    return this.apiService.get(`/reservations/${id}`).pipe(
      map(response => this.extractData(response))
    );
  }

  updateReservation(id: string, data: any): Observable<any> {
    return this.apiService.put(`/reservations/admin/${id}`, data).pipe(
      map(response => this.extractData(response)),
      catchError(err => {
        console.error('Error updating reservation:', err);
        throw err;
      })
    );
  }

  updateReservationStatus(id: string, status: string): Observable<any> {
    return this.apiService.put(`/reservations/admin/${id}/status`, null, { status: status.toUpperCase() }).pipe(
      map(response => this.extractData(response)),
      catchError(err => {
        console.error('Error updating reservation status:', err);
        throw err;
      })
    );
  }

  deleteReservation(id: string): Observable<any> {
    return this.apiService.delete(`/reservations/admin/${id}`).pipe(
      map(response => this.extractData(response)),
      catchError(err => {
        console.error('Error deleting reservation:', err);
        throw err;
      })
    );
  }

  // ===== Reviews =====

  getReviews(page: number = 0, size: number = 20): Observable<any> {
    return this.apiService.get('/reviews', { page, size }).pipe(
      map(response => this.extractData(response)),
      catchError(err => {
        console.error('Error getting reviews:', err);
        return of({ content: [], totalElements: 0 });
      })
    );
  }

  toggleReviewVisibility(id: string, isVisible: boolean): Observable<any> {
    return this.apiService.patch(`/admin/reviews/${id}/visibility`, { isVisible }).pipe(
      map(response => this.extractData(response))
    );
  }

  // ===== Categories =====

  getCategories(): Observable<any> {
    return this.apiService.get('/categories/all').pipe(
      map(response => this.extractData(response)),
      catchError(err => {
        console.error('Error getting categories:', err);
        return of([]);
      })
    );
  }

  createCategory(category: any): Observable<any> {
    return this.apiService.post('/categories', category).pipe(
      map(response => this.extractData(response))
    );
  }

  updateCategory(id: string, category: any): Observable<any> {
    return this.apiService.put(`/categories/${id}`, category).pipe(
      map(response => this.extractData(response))
    );
  }

  deleteCategory(id: string): Observable<any> {
    return this.apiService.delete(`/categories/${id}`).pipe(
      map(response => this.extractData(response))
    );
  }

  toggleCategoryStatus(id: string, isActive: boolean): Observable<any> {
    return this.apiService.patch(`/categories/${id}/status`, null, { isActive }).pipe(
      map(response => this.extractData(response))
    );
  }

  /** Upload an image to server storage. Returns { url, path }. Use path when saving category (image stored in server storage). */
  uploadImage(file: File): Observable<{ url: string; path: string }> {
    return this.apiService.uploadImage(file).pipe(
      map(response => {
        const data = response.data as any;
        if (data?.path) {
          return { url: data.url || '', path: data.path };
        }
        throw new Error('Réponse upload invalide');
      })
    );
  }
}
