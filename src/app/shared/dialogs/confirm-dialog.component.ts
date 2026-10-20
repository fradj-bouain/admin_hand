import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Tone } from '../models';

export interface ConfirmData {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  icon?: string;
  /** Champ à saisir avant de confirmer (motif, nouveau mot de passe…). */
  input?: {
    label: string;
    type?: 'text' | 'password' | 'textarea';
    required?: boolean;
    placeholder?: string;
    value?: string;
    minLength?: number;
    hint?: string;
  };
}

export interface ConfirmResult {
  value?: string;
}

/** Confirmation d'une action (avec saisie facultative). */
@Component({
  selector: 'app-confirm-dialog',
  template: `
    <div class="dialog confirm-dialog">
      <div class="dialog-icon tone-{{ data.tone || 'primary' }}">
        <mat-icon>{{ data.icon || (data.tone === 'danger' ? 'warning' : 'help') }}</mat-icon>
      </div>
      <h2>{{ data.title }}</h2>
      <p *ngIf="data.message" class="dialog-message">{{ data.message }}</p>
      <label class="field full" *ngIf="data.input as inp">
        <span class="field-label">{{ inp.label }}<i *ngIf="inp.required">*</i></span>
        <textarea *ngIf="inp.type === 'textarea'; else line" rows="3" [(ngModel)]="value" [placeholder]="inp.placeholder || ''"></textarea>
        <ng-template #line>
          <input [type]="inp.type === 'password' ? 'text' : (inp.type || 'text')" [(ngModel)]="value"
                 [placeholder]="inp.placeholder || ''" (keydown.enter)="ok()" autocomplete="off" />
        </ng-template>
        <span class="field-hint" *ngIf="inp.hint">{{ inp.hint }}</span>
      </label>
      <div class="dialog-actions">
        <button mat-button mat-dialog-close>{{ data.cancelLabel || 'Annuler' }}</button>
        <button mat-flat-button class="btn-{{ data.tone || 'primary' }}" [disabled]="!valid" (click)="ok()">
          {{ data.confirmLabel || 'Confirmer' }}
        </button>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent {
  value = '';

  constructor(@Inject(MAT_DIALOG_DATA) public data: ConfirmData, private ref: MatDialogRef<ConfirmDialogComponent, ConfirmResult>) {
    this.value = data.input?.value ?? '';
  }

  get valid(): boolean {
    const inp = this.data.input;
    if (!inp) {
      return true;
    }
    const v = this.value.trim();
    if (inp.required && !v) {
      return false;
    }
    return !inp.minLength || v.length >= inp.minLength;
  }

  ok(): void {
    if (this.valid) {
      this.ref.close({ value: this.value.trim() });
    }
  }
}
