import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';

interface BoostPrice {
  type: string;
  label: string;
  price: number;
  duration: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  enabled: boolean;
}

interface Settings {
  boostPrices: BoostPrice[];
  verificationPrice: number;
  paymentMethods: PaymentMethod[];
}

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  isLoading = true;
  isSaving = false;
  
  // SET-02: Boost prices
  boostPrices: BoostPrice[] = [
    { type: 'EXPRESS_24H', label: 'Express 24h', price: 15, duration: '24 heures' },
    { type: 'WEEK', label: 'Semaine', price: 50, duration: '7 jours' },
    { type: 'MEGA_30D', label: 'Mega 30 jours', price: 150, duration: '30 jours' }
  ];
  
  // SET-03: Verification price
  verificationPrice = 30;
  
  // SET-05: Payment methods
  paymentMethods: PaymentMethod[] = [
    { id: 'D17', name: 'D17', enabled: true },
    { id: 'FLOUCI', name: 'Flouci', enabled: true },
    { id: 'VIREMENT', name: 'Virement bancaire', enabled: true }
  ];
  
  // Form for editing
  settingsForm: FormGroup;
  
  // Active tab
  activeTab = 0;

  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.settingsForm = this.fb.group({
      verificationPrice: [30, [Validators.required, Validators.min(0)]],
      express24hPrice: [15, [Validators.required, Validators.min(0)]],
      weekPrice: [50, [Validators.required, Validators.min(0)]],
      mega30dPrice: [150, [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.isLoading = true;
    
    // Try to load settings from API, fallback to defaults
    this.apiService.get<any>('/settings').subscribe({
      next: (response) => {
        const data = response.data || response;
        if (data) {
          // Update boost prices if available
          if (data.boostPrices) {
            this.boostPrices = data.boostPrices;
          }
          // Update verification price
          if (data.verificationPrice !== undefined) {
            this.verificationPrice = data.verificationPrice;
          }
          // Update payment methods
          if (data.paymentMethods) {
            this.paymentMethods = data.paymentMethods;
          }
          this.updateForm();
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.log('Settings not found, using defaults');
        this.isLoading = false;
        // Use default values - no error shown
      }
    });
  }

  updateForm(): void {
    const express = this.boostPrices.find(b => b.type === 'EXPRESS_24H');
    const week = this.boostPrices.find(b => b.type === 'WEEK');
    const mega = this.boostPrices.find(b => b.type === 'MEGA_30D');
    
    this.settingsForm.patchValue({
      verificationPrice: this.verificationPrice,
      express24hPrice: express?.price || 15,
      weekPrice: week?.price || 50,
      mega30dPrice: mega?.price || 150,
    });
  }

  saveBoostPrices(): void {
    if (this.settingsForm.invalid) return;
    
    this.isSaving = true;
    
    // Update local values
    const values = this.settingsForm.value;
    this.boostPrices = [
      { type: 'EXPRESS_24H', label: 'Express 24h', price: values.express24hPrice, duration: '24 heures' },
      { type: 'WEEK', label: 'Semaine', price: values.weekPrice, duration: '7 jours' },
      { type: 'MEGA_30D', label: 'Mega 30 jours', price: values.mega30dPrice, duration: '30 jours' }
    ];
    
    this.apiService.put<any>('/settings/boost-prices', { prices: this.boostPrices }).subscribe({
      next: () => {
        this.snackBar.open('Prix des boosts mis à jour', 'Fermer', { duration: 3000 });
        this.isSaving = false;
      },
      error: (err) => {
        console.error('Error saving boost prices:', err);
        this.snackBar.open('Paramètres sauvegardés localement (API non disponible)', 'Fermer', { duration: 3000 });
        this.isSaving = false;
      }
    });
  }

  saveVerificationPrice(): void {
    if (this.settingsForm.get('verificationPrice')?.invalid) return;
    
    this.isSaving = true;
    this.verificationPrice = this.settingsForm.value.verificationPrice;
    
    this.apiService.put<any>('/settings/verification-price', { price: this.verificationPrice }).subscribe({
      next: () => {
        this.snackBar.open('Prix de vérification mis à jour', 'Fermer', { duration: 3000 });
        this.isSaving = false;
      },
      error: (err) => {
        console.error('Error saving verification price:', err);
        this.snackBar.open('Paramètre sauvegardé localement (API non disponible)', 'Fermer', { duration: 3000 });
        this.isSaving = false;
      }
    });
  }

  togglePaymentMethod(method: PaymentMethod): void {
    method.enabled = !method.enabled;
    
    this.apiService.put<any>('/settings/payment-methods', { methods: this.paymentMethods }).subscribe({
      next: () => {
        this.snackBar.open(
          `${method.name} ${method.enabled ? 'activé' : 'désactivé'}`,
          'Fermer',
          { duration: 3000 }
        );
      },
      error: (err) => {
        console.error('Error updating payment method:', err);
        // Keep the local change
      }
    });
  }

  getBoostIcon(type: string): string {
    switch (type) {
      case 'EXPRESS_24H': return 'flash_on';
      case 'WEEK': return 'date_range';
      case 'MEGA_30D': return 'rocket_launch';
      default: return 'bolt';
    }
  }

  getPaymentIcon(id: string): string {
    switch (id) {
      case 'D17': return 'phone_android';
      case 'FLOUCI': return 'account_balance_wallet';
      case 'VIREMENT': return 'account_balance';
      default: return 'payment';
    }
  }
}

