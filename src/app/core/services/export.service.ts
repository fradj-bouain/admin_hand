import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor() { }

  /**
   * Export data to CSV file
   * @param data Array of objects to export
   * @param filename Name of the file (without extension)
   * @param columns Optional: Custom column mapping { key: 'Header Label' }
   */
  exportToCsv(data: any[], filename: string, columns?: { [key: string]: string }): void {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    // Get headers from first object or use custom columns
    const headers = columns ? Object.keys(columns) : Object.keys(data[0]);
    const headerLabels = columns ? Object.values(columns) : headers;

    // Build CSV content
    const csvRows: string[] = [];
    
    // Add header row
    csvRows.push(headerLabels.map(h => this.escapeCsvValue(h)).join(','));

    // Add data rows
    for (const row of data) {
      const values = headers.map(header => {
        let value = row[header];
        
        // Handle nested objects (e.g., location.governorate)
        if (header.includes('.')) {
          const parts = header.split('.');
          value = parts.reduce((obj, key) => obj?.[key], row);
        }
        
        // Format dates
        if (value instanceof Date) {
          value = value.toLocaleDateString('fr-TN');
        }
        
        // Handle null/undefined
        if (value === null || value === undefined) {
          value = '';
        }
        
        return this.escapeCsvValue(String(value));
      });
      csvRows.push(values.join(','));
    }

    // Create CSV blob and download
    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, `${filename}.csv`);
  }

  /**
   * Export users data
   */
  exportUsers(users: any[], type: 'clients' | 'employees'): void {
    if (type === 'clients') {
      const columns: { [key: string]: string } = {
        'name': 'Nom',
        'email': 'Email',
        'phone': 'Téléphone',
        'governorate': 'Gouvernorat',
        'city': 'Ville',
        'isActive': 'Actif',
        'createdAt': 'Date inscription'
      };
      this.exportToCsv(users, `export_clients_${this.getDateString()}`, columns);
    } else {
      const columns: { [key: string]: string } = {
        'name': 'Nom',
        'email': 'Email',
        'phone': 'Téléphone',
        'profession': 'Profession',
        'governorate': 'Gouvernorat',
        'city': 'Ville',
        'status': 'Statut',
        'isVerified': 'Vérifié',
        'rating': 'Note',
        'createdAt': 'Date inscription'
      };
      this.exportToCsv(users, `export_employees_${this.getDateString()}`, columns);
    }
  }

  /**
   * Export requests data
   */
  exportRequests(requests: any[]): void {
    const formattedData = requests.map(r => ({
      id: r.id,
      clientName: r.client?.name || 'N/A',
      clientEmail: r.client?.email || '',
      profession: r.profession,
      governorate: r.location?.governorate || '',
      city: r.location?.city || '',
      status: r.status,
      urgency: r.urgency,
      estimatedPrice: r.estimatedPrice || '',
      finalPrice: r.finalPrice || '',
      createdAt: r.createdAt
    }));

    const columns = {
      'id': 'ID',
      'clientName': 'Client',
      'clientEmail': 'Email',
      'profession': 'Profession',
      'governorate': 'Gouvernorat',
      'city': 'Ville',
      'status': 'Statut',
      'urgency': 'Urgence',
      'estimatedPrice': 'Prix estimé (TND)',
      'finalPrice': 'Prix final (TND)',
      'createdAt': 'Date création'
    };

    this.exportToCsv(formattedData, `export_demandes_${this.getDateString()}`, columns);
  }

  /**
   * Export reservations data
   */
  exportReservations(reservations: any[]): void {
    const columns = {
      'id': 'ID',
      'userName': 'Client',
      'userPhone': 'Téléphone',
      'employeeName': 'Employé',
      'service': 'Service',
      'reservationDateTime': 'Date réservation',
      'status': 'Statut',
      'price': 'Prix (TND)',
      'governorate': 'Gouvernorat',
      'city': 'Ville',
      'createdAt': 'Date création'
    };

    this.exportToCsv(reservations, `export_reservations_${this.getDateString()}`, columns);
  }

  /**
   * Export boosts data
   */
  exportBoosts(boosts: any[]): void {
    const columns = {
      'employeeName': 'Employé',
      'boostType': 'Type',
      'amount': 'Montant (TND)',
      'paymentMethod': 'Paiement',
      'paymentReference': 'Référence',
      'status': 'Statut',
      'requestedAt': 'Date demande',
      'validatedAt': 'Date validation',
      'startsAt': 'Début',
      'endsAt': 'Fin'
    };

    this.exportToCsv(boosts, `export_boosts_${this.getDateString()}`, columns);
  }

  /**
   * Export reviews data
   */
  exportReviews(reviews: any[]): void {
    const columns = {
      'userName': 'Utilisateur',
      'employeeName': 'Employé',
      'rating': 'Note',
      'comment': 'Commentaire',
      'isVisible': 'Visible',
      'createdAt': 'Date'
    };

    this.exportToCsv(reviews, `export_avis_${this.getDateString()}`, columns);
  }

  // Helper methods
  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  private getDateString(): string {
    return new Date().toISOString().split('T')[0];
  }
}

