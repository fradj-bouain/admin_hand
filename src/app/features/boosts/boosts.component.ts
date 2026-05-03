import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';

interface Boost {
  id: string;
  employeeId: string;
  employeeName: string;
  boostType: string;
  amount: number;
  currency: string;
  paymentReference: string;
  paymentMethod: string;
  status: string;
  requestedAt: string;
  validatedAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  remainingHours: number | null;
  isActive: boolean;
}

// BOOST-01: Extended interface with revenue stats
interface BoostStats {
  activeCount: number;
  pendingCount: number;
  totalRevenue?: number;
  totalCount?: number;
}

@Component({
  selector: 'app-boosts',
  templateUrl: './boosts.component.html',
  styleUrls: ['./boosts.component.scss']
})
export class BoostsComponent implements OnInit {
  pendingBoosts: Boost[] = [];
  historyBoosts: Boost[] = [];
  stats: BoostStats = { activeCount: 0, pendingCount: 0, totalRevenue: 0, totalCount: 0 };
  isLoading = true;
  isLoadingHistory = false;
  error: string | null = null;
  processingId: string | null = null;
  selectedTab = 0;
  historyFilter = '';

  displayedColumns: string[] = ['employee', 'type', 'amount', 'reference', 'payment', 'date', 'actions'];
  historyColumns: string[] = ['employee', 'type', 'amount', 'reference', 'status', 'date', 'actions'];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.error = null;

    this.apiService.get<any>('/boosts/pending').subscribe({
      next: (response) => {
        this.pendingBoosts = response.data || [];
        this.loadStats();
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des boosts';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  loadStats(): void {
    this.apiService.get<any>('/boosts/stats').subscribe({
      next: (response) => {
        this.stats = response.data || { activeCount: 0, pendingCount: 0 };
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  loadHistory(status?: string): void {
    this.isLoadingHistory = true;
    const params = status ? { status } : {};
    
    console.log('📊 Loading boost history with params:', params);
    
    this.apiService.get<any>('/boosts/all', params).subscribe({
      next: (response) => {
        console.log('✅ Boost history loaded:', response);
        this.historyBoosts = response.data || [];
        this.isLoadingHistory = false;
      },
      error: (err) => {
        console.error('❌ Error loading boost history:', err);
        this.isLoadingHistory = false;
        this.error = 'Erreur lors du chargement de l\'historique';
      }
    });
  }

  onTabChange(index: number): void {
    this.selectedTab = index;
    if (index === 1) {
      // Always reload history when switching to history tab
      this.loadHistory(this.historyFilter || undefined);
    }
  }

  onFilterChange(status: string): void {
    this.historyFilter = status;
    this.loadHistory(status || undefined);
  }

  validateBoost(boostId: string): void {
    if (this.processingId) return;
    
    if (!confirm('Êtes-vous sûr de vouloir valider ce boost ?')) return;

    this.processingId = boostId;
    this.apiService.put<any>(`/boosts/${boostId}/validate`, {}).subscribe({
      next: () => {
        this.processingId = null;
        this.loadData();
        if (this.selectedTab === 1) this.loadHistory(this.historyFilter || undefined);
      },
      error: (err) => {
        this.processingId = null;
        alert('Erreur lors de la validation: ' + (err.error?.message || 'Erreur inconnue'));
      }
    });
  }

  cancelBoost(boostId: string): void {
    if (this.processingId) return;
    
    if (!confirm('Êtes-vous sûr de vouloir annuler ce boost ?')) return;

    this.processingId = boostId;
    this.apiService.put<any>(`/boosts/${boostId}/cancel`, {}).subscribe({
      next: () => {
        this.processingId = null;
        this.loadData();
        if (this.selectedTab === 1) this.loadHistory(this.historyFilter || undefined);
      },
      error: (err) => {
        this.processingId = null;
        alert('Erreur lors de l\'annulation: ' + (err.error?.message || 'Erreur inconnue'));
      }
    });
  }

  deactivateBoost(boost: Boost): void {
    if (this.processingId) return;
    
    const employeeName = boost.employeeName || boost.employeeId;
    if (!confirm(`Êtes-vous sûr de vouloir désactiver le boost de "${employeeName}" ?\n\nCette action terminera immédiatement le boost actif.`)) return;

    this.processingId = boost.id;
    this.apiService.put<any>(`/boosts/${boost.id}/deactivate`, {}).subscribe({
      next: () => {
        this.processingId = null;
        alert('✅ Boost désactivé avec succès');
        this.loadData();
        this.loadHistory(this.historyFilter || undefined);
      },
      error: (err) => {
        this.processingId = null;
        alert('❌ Erreur lors de la désactivation: ' + (err.error?.message || 'Erreur inconnue'));
      }
    });
  }

  getBoostTypeLabel(type: string): string {
    switch (type?.toUpperCase()) {
      case 'EXPRESS_24H': return 'Express 24h';
      case 'WEEK': return 'Semaine';
      case 'MEGA_30D': return 'Mega 30j';
      default: return type || '-';
    }
  }

  getPaymentMethodLabel(method: string): string {
    switch (method?.toUpperCase()) {
      case 'D17': return 'D17';
      case 'FLOUCI': return 'Flouci';
      case 'VIREMENT': return 'Virement';
      default: return method || '-';
    }
  }

  getStatusLabel(status: string): string {
    switch (status?.toLowerCase()) {
      case 'pending': return 'En attente';
      case 'active': return 'Actif';
      case 'expired': return 'Expiré';
      case 'cancelled': return 'Annulé';
      default: return status || '-';
    }
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'pending': return 'status-pending';
      case 'active': return 'status-active';
      case 'expired': return 'status-expired';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  isActiveBoost(boost: Boost): boolean {
    return boost.status?.toLowerCase() === 'active';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
