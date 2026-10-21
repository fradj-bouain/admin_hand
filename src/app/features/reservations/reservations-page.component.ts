import { Component } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { ConsolePage, ConsoleService, PageKpi } from '../../shared/console';
import { ColumnDef, DetailData, FormField, RowAction } from '../../shared/models';
import { GOVERNORATE_OPTIONS, RESERVATION_STATUS, labelOf } from '../../shared/labels';
import { UiService } from '../../shared/ui.service';

@Component({
  selector: 'app-reservations-page',
  template: `
    <div class="page">
      <app-page-header icon="event_available" title="Réservations"
                       subtitle="Rendez-vous pris directement auprès d'un artisan."></app-page-header>

      <div class="kpi-row">
        <app-kpi *ngFor="let k of kpis" [icon]="k.icon" [label]="k.label" [value]="counts[k.key] ?? '…'" [tone]="k.tone"
                 [clickable]="true" [active]="kpiActive(k)" (click)="applyKpi(k)"></app-kpi>
      </div>

      <app-data-table [endpoint]="endpoint" [columns]="columns" [actions]="actions" exportName="reservations"
                      [defaultSort]="{ key: 'createdAt', dir: 'desc' }" emptyIcon="event_busy"
                      searchPlaceholder="Service, client, artisan, téléphone, ville…" (rowClick)="open($event)"></app-data-table>
    </div>
  `,
})
export class ReservationsPageComponent extends ConsolePage {
  readonly endpoint = '/admin/v2/reservations';

  override readonly kpis: PageKpi[] = [
    { key: 'all', label: 'Réservations', icon: 'event_available', tone: 'primary', filter: {} },
    { key: 'pending', label: 'En attente', icon: 'hourglass_top', tone: 'warning', filter: { status: 'PENDING,MODIFIED' } },
    { key: 'confirmed', label: 'Acceptées / confirmées', icon: 'event', tone: 'info', filter: { status: 'ACCEPTED,CONFIRMED,AWAITING_REVIEW' } },
    { key: 'done', label: 'Terminées', icon: 'task_alt', tone: 'success', filter: { status: 'COMPLETED' } },
    { key: 'lost', label: 'Refusées / annulées', icon: 'cancel', tone: 'danger', filter: { status: 'REJECTED,CANCELLED' } },
  ];

  readonly columns: ColumnDef[] = [
    { key: 'createdAt', label: 'Créée', type: 'datetime', filter: { type: 'date' } },
    { key: 'clientName', label: 'Client', type: 'person', sortKey: 'client', filter: { type: 'text', param: 'client' }, width: '190px' },
    { key: 'clientPhone', label: 'Tél. client', type: 'phone', filter: { type: 'text' }, width: '160px' },
    { key: 'artisanName', label: 'Artisan', sortKey: 'artisan', filter: { type: 'text', param: 'artisan' } },
    { key: 'artisanPhone', label: 'Tél. artisan', type: 'phone', filter: { type: 'text' }, width: '160px' },
    { key: 'service', label: 'Service', filter: { type: 'text' } },
    { key: 'reservationDate', label: 'Rendez-vous', type: 'datetime', filter: { type: 'date' } },
    { key: 'governorate', label: 'Gouvernorat', filter: { type: 'select', options: GOVERNORATE_OPTIONS } },
    { key: 'city', label: 'Ville', filter: { type: 'text' }, hidden: true },
    { key: 'status', label: 'Statut', type: 'status', options: RESERVATION_STATUS, filter: { type: 'multiselect' } },
    { key: 'price', label: 'Prix', type: 'money', align: 'end', filter: { type: 'number' } },
    { key: 'clientRating', label: 'Note client', type: 'stars', filter: { type: 'number' } },
    { key: 'completedAt', label: 'Terminée', type: 'datetime', filter: { type: 'date' }, hidden: true },
    { key: 'cancelledAt', label: 'Annulée', type: 'datetime', filter: { type: 'date' }, hidden: true },
  ];

  readonly actions: RowAction[] = [
    { icon: 'visibility', label: 'Voir la réservation', tone: 'primary', handler: r => this.open(r) },
    { icon: 'edit', label: 'Modifier', handler: r => this.edit(r) },
    { icon: 'swap_horiz', label: 'Changer le statut', tone: 'info', handler: r => this.changeStatus(r) },
    { icon: 'delete', label: 'Supprimer', tone: 'danger', handler: r => this.remove(r) },
  ];

  constructor(console: ConsoleService, ui: UiService, api: ApiService) {
    super(console, ui, api);
  }

  open(row: any): void {
    this.ui.detail(this.detail(row));
  }

  edit(row: any): void {
    const fields: FormField[] = [
      { key: 'service', label: 'Service', required: true },
      { key: 'reservationDateTime', label: 'Rendez-vous (heure de Tunisie)', type: 'datetime', required: true },
      { key: 'governorate', label: 'Gouvernorat', type: 'select', options: GOVERNORATE_OPTIONS },
      { key: 'city', label: 'Ville' },
      { key: 'address', label: 'Adresse', full: true },
      { key: 'price', label: 'Prix (DT)', type: 'number', min: 0 },
      { key: 'notes', label: 'Notes du client', type: 'textarea' },
      { key: 'employeeMessage', label: "Message de l'artisan", type: 'textarea' },
    ];
    this.ui.form({
      title: 'Modifier la réservation', subtitle: `${row.service} — ${row.clientName ?? ''}`, icon: 'edit', fields,
      value: { ...row, reservationDateTime: row.reservationDate },
      submit: v => this.api.put(`/reservations/admin/${row.id}`, v),
    }).subscribe(r => r && (this.ui.toast('Réservation mise à jour'), this.reload()));
  }

  changeStatus(row: any): void {
    this.ui.form({
      title: 'Changer le statut', subtitle: `${row.service} — ${row.clientName ?? ''}`, icon: 'swap_horiz',
      fields: [{ key: 'status', label: 'Nouveau statut', type: 'select', options: RESERVATION_STATUS, required: true, full: true }],
      value: { status: row.status }, submitLabel: 'Appliquer',
      submit: v => this.api.put(`/reservations/admin/${row.id}/status`, {}, { status: v.status }),
    }).subscribe(r => r && (this.ui.toast('Statut modifié'), this.reload()));
  }

  remove(row: any): void {
    this.confirmThen(
      { title: 'Supprimer cette réservation ?', message: `${row.service} — ${row.clientName ?? ''}. Action définitive.`, tone: 'danger', icon: 'delete', confirmLabel: 'Supprimer' },
      () => this.api.delete(`/reservations/admin/${row.id}`),
      'Réservation supprimée',
    );
  }

  private detail(r: any): DetailData {
    const status = labelOf(RESERVATION_STATUS, r.status);
    return {
      title: r.service || 'Réservation',
      subtitle: [r.city, r.governorate].filter(Boolean).join(', '),
      icon: 'event_available',
      badges: status ? [{ label: status.label, tone: status.tone! }] : [],
      sections: [
        {
          title: 'Rendez-vous',
          items: [
            { label: 'Date prévue', value: r.reservationDate, type: 'datetime' },
            { label: 'Nouvelle date proposée', value: r.proposedDate, type: 'datetime' },
            { label: 'Prix', value: r.price, type: 'money' },
            { label: 'Adresse', value: [r.address, r.city, r.governorate].filter(Boolean).join(', '), full: true },
            { label: 'Notes du client', value: r.notes, type: 'longtext', full: true },
            { label: "Message de l'artisan", value: r.employeeMessage, type: 'longtext', full: true },
            { label: "Motif d'annulation", value: r.cancellationReason, type: 'longtext', full: true },
          ],
        },
        {
          title: 'Personnes',
          items: [
            { label: 'Client', value: r.clientName },
            { label: 'Téléphone du client', value: r.clientPhone, type: 'phone', href: r.clientPhone ? `tel:${r.clientPhone}` : undefined },
            { label: 'Artisan', value: r.artisanName },
          ],
        },
        {
          title: 'Suivi',
          items: [
            { label: 'Créée', value: r.createdAt, type: 'datetime' },
            { label: 'Acceptée', value: r.acceptedAt, type: 'datetime' },
            { label: 'Refusée', value: r.rejectedAt, type: 'datetime' },
            { label: 'Terminée', value: r.completedAt, type: 'datetime' },
            { label: 'Confirmée par le client', value: r.clientConfirmedAt, type: 'datetime' },
            { label: 'Annulée', value: r.cancelledAt, type: 'datetime' },
            { label: 'Note du client', value: r.clientRating, type: 'stars' },
            { label: 'Commentaire du client', value: r.clientFeedback, type: 'longtext', full: true },
          ],
        },
      ],
      actions: [
        { label: 'Modifier', icon: 'edit', handler: () => this.edit(r) },
        { label: 'Changer le statut', icon: 'swap_horiz', tone: 'primary', handler: () => this.changeStatus(r) },
        { label: 'Supprimer', icon: 'delete', tone: 'danger', handler: () => this.remove(r) },
      ],
    };
  }
}
