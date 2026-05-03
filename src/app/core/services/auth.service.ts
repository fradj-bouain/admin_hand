import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, map, tap } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  token: string;
  adminId: string;
  name: string;
  email: string;
  role: string;
  expiresIn: number;
}

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLogin: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<AdminLoginResponse | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {
    // Vérifier si un token existe au démarrage
    const token = localStorage.getItem('admin_token');
    const userData = localStorage.getItem('admin_user');
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        this.currentUserSubject.next(user);
      } catch (e) {
        this.logout();
      }
    }
  }

  login(request: AdminLoginRequest): Observable<ApiResponse<AdminLoginResponse>> {
    return this.apiService.post<AdminLoginResponse>('/admin-auth/login', request).pipe(
      tap(response => {
        if (response.success && response.data) {
          localStorage.setItem('admin_token', response.data.token);
          localStorage.setItem('admin_user', JSON.stringify(response.data));
          this.currentUserSubject.next(response.data);
        }
      })
    );
  }

  getProfile(): Observable<ApiResponse<AdminProfile>> {
    return this.apiService.get<AdminProfile>('/admin-auth/me');
  }

  logout(): void {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('admin_token');
  }

  getToken(): string | null {
    return localStorage.getItem('admin_token');
  }

  getCurrentUser(): AdminLoginResponse | null {
    return this.currentUserSubject.value;
  }
}
