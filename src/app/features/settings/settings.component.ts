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

/** Config app mobile (versions Play Store) — stockée en base, sans restart serveur */
export interface AppMobileConfig {
  minSupportedVersion: string;
  latestVersion?: string | null;
  androidStoreUrl: string;
  iosStoreUrl?: string | null;
  updatedAt?: string;
}

/** Publicités Google (AdMob) : interrupteur et blocs d'annonces, lus par l'app à chaque ouverture. */
export interface AdsConfig {
  adsEnabled: boolean;
  bannerUnitId?: string | null;
  nativeUnitId?: string | null;
  publisherId?: string | null;
  updatedAt?: string | null;
}

/** ID d'un bloc d'annonces AdMob (avec « / ») ; le serveur vérifie aussi le compte et refuse les ID de test. */
export const AD_UNIT_PATTERN = '^\\s*ca-app-pub-\\d{10,20}/\\d{6,14}\\s*$';

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
    { type: 'EXPRESS_24H', label: 'Express', price: 15, duration: '3 jours' },
    { type: 'WEEK', label: 'Medium', price: 50, duration: '12 jours' },
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

  appMobileConfig: AppMobileConfig = {
    minSupportedVersion: '1.0.0',
    latestVersion: '',
    androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.fluttiris.handy',
    iosStoreUrl: '',
  };
  appConfigForm: FormGroup;

  /** App ID AdMob : fixe, dans l'app (android/app/build.gradle) ; affiché pour information. */
  readonly admobAppId = 'ca-app-pub-9289618120553401~7852914097';
  adsConfig: AdsConfig = { adsEnabled: true };
  adsForm: FormGroup;
  adsSaving = false;
  adsError: string | null = null;

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
    this.appConfigForm = this.fb.group({
      minSupportedVersion: ['1.0.0', Validators.required],
      latestVersion: [''],
      androidStoreUrl: ['', Validators.required],
      iosStoreUrl: [''],
    });
    this.adsForm = this.fb.group({
      adsEnabled: [true],
      bannerUnitId: ['', Validators.pattern(AD_UNIT_PATTERN)],
      nativeUnitId: ['', Validators.pattern(AD_UNIT_PATTERN)],
    });
  }

  ngOnInit(): void {
    this.loadSettings();
    this.loadAppMobileConfig();
    this.loadAds();
  }

  loadAds(): void {
    this.apiService.get<AdsConfig>('/admin/app-mobile-config/ads').subscribe({
      next: response => {
        if (response.data) {
          this.adsConfig = response.data;
          this.adsForm.reset({
            adsEnabled: response.data.adsEnabled,
            bannerUnitId: response.data.bannerUnitId ?? '',
            nativeUnitId: response.data.nativeUnitId ?? '',
          });
        }
      },
      error: () => console.log('Publicités : réglages indisponibles'),
    });
  }

  saveAds(): void {
    this.adsForm.markAllAsTouched();
    if (this.adsForm.invalid || this.adsSaving) return;
    this.adsSaving = true;
    this.adsError = null;
    const v = this.adsForm.value;
    const body = {
      adsEnabled: !!v.adsEnabled,
      bannerUnitId: (v.bannerUnitId || '').trim(),
      nativeUnitId: (v.nativeUnitId || '').trim(),
    };
    this.apiService.put<AdsConfig>('/admin/app-mobile-config/ads', body).subscribe({
      next: response => {
        if (response.data) {
          this.adsConfig = response.data;
          this.adsForm.markAsPristine();
        }
        this.snackBar.open("Publicités enregistrées : appliquées à la prochaine ouverture de l'app", 'Fermer', { duration: 5000 });
        this.adsSaving = false;
      },
      error: err => {
        this.adsError = err?.error?.message || "L'enregistrement a échoué";
        this.adsSaving = false;
      },
    });
  }

  adsFieldError(key: 'bannerUnitId' | 'nativeUnitId'): string | null {
    const c = this.adsForm.get(key);
    if (!c || !c.touched || !c.errors) return null;
    const value = String(c.value || '');
    if (value.includes('~')) return "C'est l'ID de l'application (avec « ~ ») : ici il faut l'ID du bloc d'annonces (avec « / »)";
    return 'Format attendu : ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';
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
      { type: 'EXPRESS_24H', label: 'Express', price: values.express24hPrice, duration: '3 jours' },
      { type: 'WEEK', label: 'Medium', price: values.weekPrice, duration: '12 jours' },
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

  loadAppMobileConfig(): void {
    this.apiService.get<AppMobileConfig>('/admin/app-mobile-config').subscribe({
      next: (response) => {
        const data = response.data;
        if (data) {
          this.appMobileConfig = data;
          this.appConfigForm.patchValue({
            minSupportedVersion: data.minSupportedVersion ?? '1.0.0',
            latestVersion: data.latestVersion ?? '',
            androidStoreUrl: data.androidStoreUrl ?? '',
            iosStoreUrl: data.iosStoreUrl ?? '',
          });
        }
      },
      error: () => {
        console.log('App mobile config: using form defaults');
      },
    });
  }

  saveAppMobileConfig(): void {
    if (this.appConfigForm.invalid) return;
    this.isSaving = true;
    const body = {
      minSupportedVersion: this.appConfigForm.value.minSupportedVersion?.trim(),
      latestVersion: this.appConfigForm.value.latestVersion?.trim() || null,
      androidStoreUrl: this.appConfigForm.value.androidStoreUrl?.trim(),
      iosStoreUrl: this.appConfigForm.value.iosStoreUrl?.trim() || null,
    };
    this.apiService.put<AppMobileConfig>('/admin/app-mobile-config', body).subscribe({
      next: (response) => {
        if (response.data) {
          this.appMobileConfig = response.data;
        }
        this.snackBar.open(
          'Versions app enregistrées — effet immédiat sur les mobiles (sans redémarrage serveur)',
          'Fermer',
          { duration: 5000 }
        );
        this.isSaving = false;
      },
      error: (err) => {
        console.error('Error saving app mobile config:', err);
        this.snackBar.open('Erreur lors de la sauvegarde', 'Fermer', { duration: 4000 });
        this.isSaving = false;
      },
    });
  }
}

