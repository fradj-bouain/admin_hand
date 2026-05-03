import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit, OnDestroy {
  // NOTIF-02: Pending counts for sidebar badges
  pendingBoostsCount = 0;
  pendingVerificationsCount = 0;
  
  // NOTIF-01: Notification dropdown
  showNotifications = false;
  notifications: any[] = [];
  
  // Auto-refresh subscription
  private refreshSubscription?: Subscription;
  private readonly REFRESH_INTERVAL = 60000; // 1 minute

  constructor(
    public authService: AuthService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    // Load initial counts
    this.loadPendingCounts();
    
    // NOTIF-02: Auto-refresh pending counts every minute
    this.refreshSubscription = interval(this.REFRESH_INTERVAL).subscribe(() => {
      this.loadPendingCounts();
    });
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  // NOTIF-02: Load pending boosts and verifications counts
  loadPendingCounts(): void {
    // Load boost stats
    this.apiService.get<any>('/boosts/stats').subscribe({
      next: (response) => {
        const data = response.data || response;
        this.pendingBoostsCount = data.pendingCount || 0;
        this.updateNotifications();
      },
      error: (err) => console.error('Error loading boost stats:', err)
    });

    // Load verification stats
    this.apiService.get<any>('/verifications/stats').subscribe({
      next: (response) => {
        const data = response.data || response;
        this.pendingVerificationsCount = data.pendingCount || 0;
        this.updateNotifications();
      },
      error: (err) => console.error('Error loading verification stats:', err)
    });
  }

  // NOTIF-01: Update notifications list
  updateNotifications(): void {
    this.notifications = [];
    
    if (this.pendingBoostsCount > 0) {
      this.notifications.push({
        type: 'boost',
        icon: 'bolt',
        message: `${this.pendingBoostsCount} boost${this.pendingBoostsCount > 1 ? 's' : ''} en attente de validation`,
        link: '/boosts',
        color: 'warning'
      });
    }
    
    if (this.pendingVerificationsCount > 0) {
      this.notifications.push({
        type: 'verification',
        icon: 'verified',
        message: `${this.pendingVerificationsCount} vérification${this.pendingVerificationsCount > 1 ? 's' : ''} en attente`,
        link: '/verifications',
        color: 'success'
      });
    }
  }

  // NOTIF-01: Toggle notifications dropdown
  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  // NOTIF-01: Close notifications dropdown
  closeNotifications(): void {
    this.showNotifications = false;
  }

  // Get total pending count for notification badge
  get totalPendingCount(): number {
    return this.pendingBoostsCount + this.pendingVerificationsCount;
  }

  logout(): void {
    this.authService.logout();
  }
}





