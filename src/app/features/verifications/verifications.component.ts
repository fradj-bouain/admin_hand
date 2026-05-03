import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';

interface Verification {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  paymentReference: string;
  paymentMethod: string;
  documentCinFront: string;
  documentCinBack: string;
  documentSelfie: string;
  documentDiploma: string | null;
  status: string;
  rejectionReason: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  expiresAt: string | null;
}

interface VerificationStats {
  pendingCount: number;
}

@Component({
  selector: 'app-verifications',
  templateUrl: './verifications.component.html',
  styleUrls: ['./verifications.component.scss']
})
export class VerificationsComponent implements OnInit {
  pendingVerifications: Verification[] = [];
  historyVerifications: Verification[] = [];
  stats: VerificationStats = { pendingCount: 0 };
  isLoading = true;
  isLoadingHistory = false;
  error: string | null = null;
  processingId: string | null = null;
  selectedVerification: Verification | null = null;
  rejectionReason = '';
  showRejectModal = false;
  showDocumentsModal = false;
  selectedTab = 0;
  historyFilter = '';

  displayedColumns: string[] = ['employee', 'amount', 'reference', 'payment', 'date', 'actions'];
  historyColumns: string[] = ['employee', 'amount', 'reference', 'status', 'date'];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.error = null;

    this.apiService.get<any>('/verifications/pending').subscribe({
      next: (response) => {
        this.pendingVerifications = response.data || [];
        this.loadStats();
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des vérifications';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  loadStats(): void {
    this.apiService.get<any>('/verifications/stats').subscribe({
      next: (response) => {
        this.stats = response.data || { pendingCount: 0 };
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
    
    console.log('📊 Loading verification history with params:', params);
    
    this.apiService.get<any>('/verifications/all', params).subscribe({
      next: (response) => {
        console.log('✅ Verification history loaded:', response);
        this.historyVerifications = response.data || [];
        this.isLoadingHistory = false;
      },
      error: (err) => {
        console.error('❌ Error loading verification history:', err);
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

  viewDocuments(verification: Verification): void {
    this.selectedVerification = verification;
    this.showDocumentsModal = true;
  }

  closeDocumentsModal(): void {
    this.showDocumentsModal = false;
    this.selectedVerification = null;
  }

  approveVerification(verificationId: string): void {
    if (this.processingId) return;
    
    if (!confirm('Êtes-vous sûr de vouloir approuver cette vérification ?')) return;

    this.processingId = verificationId;
    this.apiService.put<any>(`/verifications/${verificationId}/approve`, {}).subscribe({
      next: () => {
        this.processingId = null;
        this.showDocumentsModal = false;
        this.loadData();
        if (this.selectedTab === 1) this.loadHistory(this.historyFilter || undefined);
      },
      error: (err) => {
        this.processingId = null;
        alert('Erreur lors de l\'approbation: ' + (err.error?.message || 'Erreur inconnue'));
      }
    });
  }

  openRejectModal(verification: Verification): void {
    this.selectedVerification = verification;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.selectedVerification = null;
    this.rejectionReason = '';
  }

  confirmReject(): void {
    if (!this.selectedVerification || !this.rejectionReason.trim()) {
      alert('Veuillez indiquer le motif du refus');
      return;
    }

    this.processingId = this.selectedVerification.id;
    const reason = encodeURIComponent(this.rejectionReason.trim());
    
    this.apiService.put<any>(`/verifications/${this.selectedVerification.id}/reject?reason=${reason}`, {}).subscribe({
      next: () => {
        this.processingId = null;
        this.closeRejectModal();
        this.showDocumentsModal = false;
        this.loadData();
        if (this.selectedTab === 1) this.loadHistory(this.historyFilter || undefined);
      },
      error: (err) => {
        this.processingId = null;
        alert('Erreur lors du refus: ' + (err.error?.message || 'Erreur inconnue'));
      }
    });
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
    switch (status?.toUpperCase()) {
      case 'PENDING': return 'En attente';
      case 'APPROVED': return 'Approuvé';
      case 'REJECTED': return 'Refusé';
      default: return status || '-';
    }
  }

  getStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'PENDING': return 'status-pending';
      case 'APPROVED': return 'status-approved';
      case 'REJECTED': return 'status-rejected';
      default: return '';
    }
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
