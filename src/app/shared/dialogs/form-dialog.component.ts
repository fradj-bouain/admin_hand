import { Component, Inject, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { FormField } from '../models';
import { fileUrl, toDate } from '../format';

export interface FormDialogData {
  title: string;
  subtitle?: string;
  icon?: string;
  fields: FormField[];
  value?: any;
  submitLabel?: string;
  /** Envoi au serveur ; la fenêtre reste ouverte et affiche l'erreur si l'API refuse. */
  submit: (value: any) => Observable<any>;
}

/** Formulaire de création / modification construit à partir d'une liste de champs. */
@Component({
  selector: 'app-form-dialog',
  templateUrl: './form-dialog.component.html',
})
export class FormDialogComponent implements OnInit {
  form = new FormGroup<Record<string, AbstractControl>>({});
  saving = false;
  error: string | null = null;
  uploading: Record<string, boolean> = {};

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: FormDialogData,
    private ref: MatDialogRef<FormDialogComponent>,
    private api: ApiService,
  ) {}

  ngOnInit(): void {
    for (const f of this.data.fields) {
      const validators = [];
      if (f.required && f.type !== 'toggle') {
        validators.push(f.type === 'multiselect' ? requiredList : Validators.required);
      }
      if (f.type === 'email') {
        validators.push(Validators.email);
      }
      if (f.pattern) {
        validators.push(Validators.pattern(f.pattern));
      }
      if (f.type === 'number' && f.min !== undefined) {
        validators.push(Validators.min(f.min));
      }
      if (f.type === 'number' && f.max !== undefined) {
        validators.push(Validators.max(f.max));
      }
      if (f.type === 'multiselect' && f.maxItems) {
        validators.push(maxItems(f.maxItems));
      }
      this.form.addControl(f.key, new FormControl(this.initial(f), validators));
    }
    if (this.data.fields.some(f => f.visibleIf)) {
      this.syncVisibility();
      this.form.valueChanges.subscribe(() => this.syncVisibility());
    }
  }

  /** Champs conditionnels : un champ masqué est désactivé (ni vérifié, ni envoyé). */
  private syncVisibility(): void {
    const values = this.form.getRawValue();
    for (const f of this.data.fields) {
      if (!f.visibleIf) {
        continue;
      }
      const c = this.control(f.key);
      const show = f.visibleIf(values);
      if (show && c.disabled) {
        c.enable({ emitEvent: false });
      } else if (!show && c.enabled) {
        c.disable({ emitEvent: false });
      }
    }
  }

  shown(f: FormField): boolean {
    return !f.visibleIf || this.control(f.key).enabled;
  }

  private initial(f: FormField): any {
    const v = this.data.value?.[f.key];
    switch (f.type) {
      case 'toggle':
        return !!v;
      case 'multiselect':
        return Array.isArray(v) ? [...v] : v ? [v] : [];
      case 'datetime':
        return toLocalInput(v);
      default:
        return v ?? '';
    }
  }

  control(key: string): AbstractControl {
    return this.form.get(key)!;
  }

  errorOf(f: FormField): string | null {
    const c = this.control(f.key);
    if (!c.touched || !c.errors) {
      return null;
    }
    if (c.errors['required']) {
      return 'Champ obligatoire';
    }
    if (c.errors['email']) {
      return 'Adresse email invalide';
    }
    if (c.errors['pattern']) {
      return f.patternMessage || 'Format invalide';
    }
    if (c.errors['min']) {
      return `Minimum ${f.min}`;
    }
    if (c.errors['max']) {
      return `Maximum ${f.max}`;
    }
    if (c.errors['maxItems']) {
      return `${f.maxItems} choix au maximum`;
    }
    return 'Valeur invalide';
  }

  preview(key: string): string | null {
    return fileUrl(this.control(key).value);
  }

  upload(f: FormField, event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    this.uploading[f.key] = true;
    this.api.uploadImage(file).subscribe({
      next: r => {
        this.uploading[f.key] = false;
        this.control(f.key).setValue(r.data?.url ?? r.data?.path ?? '');
        this.control(f.key).markAsDirty();
      },
      error: err => {
        this.uploading[f.key] = false;
        this.error = err?.error?.message || "Échec de l'envoi de l'image";
      },
    });
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving) {
      return;
    }
    const value: Record<string, any> = {};
    for (const f of this.data.fields) {
      if (this.control(f.key).disabled) {
        value[f.key] = null;
        continue;
      }
      let v = this.control(f.key).value;
      if (f.type === 'number') {
        v = v === '' || v === null || v === undefined ? null : Number(v);
      } else if (f.type === 'datetime') {
        v = fromLocalInput(v);
      } else if (typeof v === 'string') {
        v = v.trim();
      }
      value[f.key] = v;
    }
    this.saving = true;
    this.error = null;
    this.data.submit(value).subscribe({
      next: result => {
        this.saving = false;
        this.ref.close(result ?? true);
      },
      error: err => {
        this.saving = false;
        this.error = err?.error?.message || err?.message || "L'enregistrement a échoué";
      },
    });
  }
}

function requiredList(c: AbstractControl): ValidationErrors | null {
  return Array.isArray(c.value) && c.value.length > 0 ? null : { required: true };
}

function maxItems(max: number) {
  return (c: AbstractControl): ValidationErrors | null =>
    Array.isArray(c.value) && c.value.length > max ? { maxItems: true } : null;
}

/** Date de l'API → « yyyy-MM-ddTHH:mm » à l'heure de Tunisie (UTC+1 toute l'année). */
function toLocalInput(v: any): string {
  const d = toDate(v);
  if (!d) {
    return '';
  }
  const tunis = new Date(d.getTime() + 3600_000);
  return tunis.toISOString().slice(0, 16);
}

/** Saisie à l'heure de Tunisie → date du serveur (UTC, sans fuseau, comme ses LocalDateTime). */
function fromLocalInput(v: string): string | null {
  if (!v) {
    return null;
  }
  const utc = new Date(new Date(v + ':00Z').getTime() - 3600_000);
  return utc.toISOString().slice(0, 19);
}
