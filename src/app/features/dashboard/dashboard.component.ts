import { Component, OnInit } from '@angular/core';
import { AdminService, DashboardStats } from '../../core/services/admin.service';
import { ApiService } from '../../core/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';

// Extended stats interface for dashboard
interface ExtendedDashboardStats extends DashboardStats {
  pendingBoosts?: number;
  pendingVerifications?: number;
  activeBoosts?: number;
  totalBoostRevenue?: number;
  totalVerificationRevenue?: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  stats: ExtendedDashboardStats | null = null;
  isLoading = true;
  isCleaning = false;
  
  // DASH-01: Environment flag to hide cleanup button in production
  isProduction = environment.production;

  constructor(
    private adminService: AdminService,
    private apiService: ApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.isLoading = true;
    this.adminService.getDashboardStats().subscribe({
      next: (data: any) => {
        console.log('Dashboard stats received:', data);
        this.stats = data;
        // DASH-02: Load boost and verification stats
        this.loadBoostAndVerificationStats();
      },
      error: (error) => {
        console.error('Error loading dashboard stats:', error);
        this.isLoading = false;
        // Fallback to mock data if API fails
        this.stats = {
          totalUsers: 0,
          totalEmployees: 0,
          totalRequests: 0,
          totalReservations: 0,
          pendingRequests: 0,
          activeEmployees: 0,
          totalRevenue: 0,
          pendingBoosts: 0,
          pendingVerifications: 0,
          activeBoosts: 0,
        };
        this.snackBar.open('Erreur lors du chargement des statistiques', 'Fermer', {
          duration: 3000,
        });
      },
    });
  }

  // DASH-02: Load boost and verification stats
  loadBoostAndVerificationStats(): void {
    // Load boost stats
    this.apiService.get<any>('/boosts/stats').subscribe({
      next: (response) => {
        if (this.stats) {
          const boostStats = response.data || response;
          this.stats.pendingBoosts = boostStats.pendingCount || 0;
          this.stats.activeBoosts = boostStats.activeCount || 0;
          this.stats.totalBoostRevenue = boostStats.totalRevenue || 0;
        }
      },
      error: (err) => console.error('Error loading boost stats:', err)
    });

    // Load verification stats
    this.apiService.get<any>('/verifications/stats').subscribe({
      next: (response) => {
        if (this.stats) {
          const verificationStats = response.data || response;
          this.stats.pendingVerifications = verificationStats.pendingCount || 0;
          this.stats.totalVerificationRevenue = verificationStats.totalRevenue || 0;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading verification stats:', err);
        this.isLoading = false;
      }
    });
  }

  cleanupDatabase(): void {
    const confirmMessage = 'ATTENTION: Cette action va supprimer TOUTES les données (utilisateurs, employés, demandes, etc.) sauf les catégories et les administrateurs.\n\nÊtes-vous sûr de vouloir continuer ?';
    
    if (confirm(confirmMessage)) {
      this.isCleaning = true;
      this.adminService.cleanupDatabase().subscribe({
        next: (result) => {
          console.log('Cleanup result:', result);
          this.snackBar.open('Base de données nettoyée avec succès !', 'Fermer', {
            duration: 5000,
          });
          this.isCleaning = false;
          this.loadStats(); // Recharger les stats
        },
        error: (error) => {
          console.error('Cleanup error:', error);
          this.snackBar.open('Erreur lors du nettoyage: ' + (error.message || 'Erreur inconnue'), 'Fermer', {
            duration: 5000,
          });
          this.isCleaning = false;
        }
      });
    }
  }
}
