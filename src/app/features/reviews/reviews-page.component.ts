import { Component } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ConsolePage, ConsoleService, PageKpi } from '../../shared/console';
import { ColumnDef, DetailData, RowAction } from '../../shared/models';
import { RATING_SOURCE } from '../../shared/labels';
import { UiService } from '../../shared/ui.service';

@Component({
  selector: 'app-reviews-page',
  template: `
    <div class="page">
      <app-page-header icon="reviews" title="Avis"
                       subtitle="Toutes les notes des clients (demandes, réservations, avis écrits). Masquer ou supprimer une note recalcule aussitôt la note et le nombre d'avis de l'artisan."></app-page-header>

      <div class="kpi-row">
        <app-kpi *ngFor="let k of kpis" [icon]="k.icon" [label]="k.label" [value]="counts[k.key] ?? '…'" [tone]="k.tone"
                 [clickable]="true" [active]="kpiActive(k)" (click)="applyKpi(k)"></app-kpi>
      </div>

      <app-data-table [endpoint]="endpoint" [columns]="columns" [actions]="actions" exportName="avis"
                      [defaultSort]="{ key: 'ratedAt', dir: 'desc' }" emptyIcon="rate_review"
                      searchPlaceholder="Commentaire, artisan, client, téléphone…" (rowClick)="open($event)"></app-data-table>
    </div>
  `,
})
export class ReviewsPageComponent extends ConsolePage {
  readonly endpoint = '/admin/v2/ratings';
  /** Suppression définitive : Super Admin seulement (vérifié aussi par le serveur). */
  readonly isSuperAdmin: boolean;

  override readonly kpis: PageKpi[] = [
    { key: 'all', label: 'Notes', icon: 'reviews', tone: 'primary', filter: {} },
    { key: 'good', label: '4 et 5 étoiles', icon: 'sentiment_satisfied', tone: 'success', filter: { ratingMin: '4' } },
    { key: 'bad', label: '1 et 2 étoiles', icon: 'sentiment_dissatisfied', tone: 'danger', filter: { ratingMax: '2' } },
    { key: 'hidden', label: 'Masquées', icon: 'visibility_off', tone: 'neutral', filter: { visible: 'false' } },
  ];

  readonly columns: ColumnDef[] = [
    { key: 'ratedAt', label: 'Date', type: 'datetime', filter: { type: 'date' } },
    { key: 'source', label: 'Source', type: 'status', options: RATING_SOURCE, filter: { type: 'multiselect' } },
    { key: 'artisanName', label: 'Artisan', type: 'person', sortKey: 'artisan', filter: { type: 'text', param: 'artisan' }, width: '190px' },
    { key: 'artisanPhone', label: 'Tél. artisan', type: 'phone', filter: { type: 'text' }, width: '160px' },
    { key: 'clientName', label: 'Client', sortKey: 'client', filter: { type: 'text', param: 'client' } },
    { key: 'clientPhone', label: 'Tél. client', type: 'phone', filter: { type: 'text' }, width: '160px' },
    { key: 'rating', label: 'Note', type: 'stars', filter: { type: 'number' } },
    { key: 'comment', label: 'Commentaire', type: 'longtext', sortKey: false, filter: { type: 'text' } },
    { key: 'visible', label: 'Visibilité', type: 'boolean', trueLabel: 'Comptée', falseLabel: 'Masquée', filter: { type: 'boolean' } },
  ];

  readonly actions: RowAction[] = [
    { icon: 'visibility', label: 'Voir la note', tone: 'primary', handler: r => this.open(r) },
    { icon: 'visibility_off', label: 'Masquer', tone: 'danger', visible: r => r.visible, handler: r => this.setVisible(r, false) },
    { icon: 'restore', label: 'Réafficher', tone: 'success', visible: r => !r.visible, handler: r => this.setVisible(r, true) },
    { icon: 'delete_forever', label: 'Supprimer définitivement', tone: 'danger', visible: () => this.isSuperAdmin, handler: r => this.remove(r) },
  ];

  constructor(console: ConsoleService, ui: UiService, api: ApiService, auth: AuthService) {
    super(console, ui, api);
    this.isSuperAdmin = (auth.getCurrentUser()?.role || '').toLowerCase() === 'super_admin';
  }

  setVisible(row: any, visible: boolean): void {
    this.confirmThen(
      visible
        ? { title: 'Réafficher cette note ?', message: `Elle revient sur le profil de ${row.artisanName} et compte de nouveau dans sa note et son nombre d'avis.`, tone: 'success', confirmLabel: 'Réafficher' }
        : { title: 'Masquer cette note ?', message: `Elle disparaît du profil de ${row.artisanName} et ne compte plus dans sa note ni son nombre d'avis. Rien n'est supprimé.`, tone: 'danger', confirmLabel: 'Masquer' },
      () => this.api.patch(`/admin/v2/ratings/${row.id}/visible`, { visible }),
      visible ? 'Note réaffichée, note de l\'artisan recalculée' : 'Note masquée, note de l\'artisan recalculée',
    );
  }

  remove(row: any): void {
    this.confirmThen(
      {
        title: 'Supprimer définitivement cette note ?',
        message: `La note ${row.rating}★ de ${row.clientName ?? 'ce client'} et son commentaire sont effacés pour toujours, puis la note de ${row.artisanName} est recalculée. Pour seulement la retirer, utilisez « Masquer ».`,
        tone: 'danger', confirmLabel: 'Supprimer définitivement',
      },
      () => this.api.delete(`/admin/v2/ratings/${row.id}`),
      'Note supprimée, note de l\'artisan recalculée',
    );
  }

  open(r: any): void {
    const data: DetailData = {
      title: `Note de ${r.clientName ?? 'client'}`,
      subtitle: `Pour ${r.artisanName ?? 'artisan'}`,
      icon: 'reviews',
      badges: [r.visible ? { label: 'Comptée', tone: 'success' } : { label: 'Masquée', tone: 'neutral' }],
      sections: [
        {
          title: 'Note',
          items: [
            { label: 'Note', value: r.rating, type: 'stars' },
            { label: 'Date', value: r.ratedAt, type: 'datetime' },
            { label: 'Source', value: r.source, type: 'status', options: RATING_SOURCE },
            { label: 'Client', value: r.clientName },
            { label: 'Tél. client', value: r.clientPhone, type: 'phone' },
            { label: 'Commentaire', value: r.comment, type: 'longtext', full: true },
          ],
        },
      ],
      actions: [
        r.visible
          ? { label: 'Masquer', icon: 'visibility_off', tone: 'danger', closeFirst: true, handler: () => this.setVisible(r, false) }
          : { label: 'Réafficher', icon: 'restore', tone: 'success', closeFirst: true, handler: () => this.setVisible(r, true) },
        ...(this.isSuperAdmin
          ? [{ label: 'Supprimer définitivement', icon: 'delete_forever', tone: 'danger' as const, closeFirst: true, handler: () => this.remove(r) }]
          : []),
      ],
    };
    this.ui.detail(data);
  }
}
