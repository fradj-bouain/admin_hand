import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { ConfirmData, ConfirmDialogComponent, ConfirmResult } from './dialogs/confirm-dialog.component';
import { FormDialogComponent, FormDialogData } from './dialogs/form-dialog.component';
import { DetailSheetComponent } from './dialogs/detail-sheet.component';
import { DetailData, Tone } from './models';

/** Message d'erreur lisible d'une réponse de l'API. */
export function apiError(err: any, fallback = 'Une erreur est survenue'): string {
  if (err?.error?.message) {
    return err.error.message;
  }
  // Pas de réponse lisible du serveur : message clair plutôt que le texte technique d'Angular
  if (err?.status === 0) {
    return 'Serveur injoignable ou réponse interrompue. Vérifiez la connexion puis actualisez.';
  }
  if (err?.status === 403) {
    return "Action non autorisée pour votre compte.";
  }
  if (err?.status >= 500) {
    return 'Erreur du serveur. Réessayez dans un instant.';
  }
  return err?.error?.error || fallback;
}

/** Fenêtres et notifications de la console. */
@Injectable({ providedIn: 'root' })
export class UiService {
  constructor(private dialog: MatDialog, private snack: MatSnackBar) {}

  toast(message: string, tone: Tone = 'success'): void {
    this.snack.open(message, 'OK', { duration: 3500, panelClass: ['toast', `toast-${tone}`], horizontalPosition: 'end' });
  }

  error(err: any, fallback?: string): void {
    this.toast(apiError(err, fallback), 'danger');
  }

  confirm(data: ConfirmData): Observable<ConfirmResult | undefined> {
    return this.dialog
      .open<ConfirmDialogComponent, ConfirmData, ConfirmResult>(ConfirmDialogComponent, {
        data, width: '440px', maxWidth: '94vw', autoFocus: data.input ? 'input' : 'dialog', panelClass: 'app-dialog',
      })
      .afterClosed();
  }

  form<T = any>(data: FormDialogData): Observable<T | undefined> {
    return this.dialog
      .open(FormDialogComponent, { data, width: '720px', maxWidth: '96vw', maxHeight: '92vh', panelClass: 'app-dialog', autoFocus: 'first-tabbable' })
      .afterClosed();
  }

  detail(data: DetailData): MatDialogRef<DetailSheetComponent> {
    return this.dialog.open(DetailSheetComponent, {
      data,
      panelClass: 'side-sheet',
      position: { right: '0', top: '0' },
      height: '100vh',
      width: '760px',
      maxWidth: '100vw',
      autoFocus: false,
    });
  }
}
