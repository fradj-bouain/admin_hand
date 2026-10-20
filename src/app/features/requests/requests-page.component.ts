import { Component } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { ConsolePage, ConsoleService, PageKpi } from '../../shared/console';
import { ColumnDef, DetailData, FormField, Option, RowAction } from '../../shared/models';
import { APPLICANT_STATUS, GOVERNORATE_OPTIONS, REQUEST_STATUS, URGENCY, labelOf } from '../../shared/labels';
import { UiService } from '../../shared/ui.service';

@Component({
  selector: 'app-requests-page',
  template: `
    <div class="page">
      <app-page-header icon="assignment" title="Demandes"
                       subtitle="Demandes publiées par les clients : candidatures, artisan choisi, prix, suivi jusqu'à la clôture."></app-page-header>

      <div class="kpi-row">
        <app-kpi *ngFor="let k of kpis" [icon]="k.icon" [label]="k.label" [value]="counts[k.key] ?? '…'" [tone]="k.tone"
                 [clickable]="true" [active]="kpiActive(k)" (click)="applyKpi(k)"></app-kpi>
      </div>

      <app-data-table [endpoint]="endpoint" [columns]="columns" [actions]="actions" exportName="demandes"
                      [defaultSort]="{ key: 'createdAt', dir: 'desc' }" emptyIcon="assignment"
                      searchPlaceholder="Description, métier, client, artisan, ville…" (rowClick)="open($event)"></app-data-table>
    </div>
  `,
})
export class RequestsPageComponent extends ConsolePage {
  readonly endpoint = '/admin/v2/requests';
  private professions: Option[] = [];

  override readonly kpis: PageKpi[] = [
    { key: 'all', label: 'Demandes', icon: 'assignment', tone: 'primary', filter: {} },
    { key: 'open', label: 'Ouvertes', icon: 'campaign', tone: 'info', filter: { status: 'PENDING,HAS_APPLICANTS' } },
    { key: 'progress', label: 'En cours', icon: 'construction', tone: 'warning', filter: { status: 'EMPLOYEE_SELECTED,PRICE_PROPOSED,ACCEPTED,IN_PROGRESS,AWAITING_REVIEW' } },
    { key: 'done', label: 'Terminées', icon: 'task_alt', tone: 'success', filter: { status: 'COMPLETED' } },
    { key: 'cancelled', label: 'Annulées', icon: 'cancel', tone: 'danger', filter: { status: 'CANCELLED' } },
    { key: 'unassigned', label: 'Sans artisan', icon: 'person_search', tone: 'violet', filter: { assigned: 'false' } },
  ];

  readonly columns: ColumnDef[] = [
    { key: 'createdAt', label: 'Publiée', type: 'datetime', filter: { type: 'date' } },
    { key: 'clientName', label: 'Client', type: 'person', subKey: 'clientPhone', sortKey: 'client', filter: { type: 'text', param: 'client' }, width: '200px' },
    { key: 'profession', label: 'Métier', filter: { type: 'text' } },
    { key: 'description', label: 'Description', type: 'longtext', sortKey: false, filter: { type: 'text' }, hidden: true },
    { key: 'governorate', label: 'Gouvernorat', filter: { type: 'select', options: GOVERNORATE_OPTIONS } },
    { key: 'city', label: 'Ville', filter: { type: 'text' }, hidden: true },
    { key: 'urgency', label: 'Urgence', type: 'status', options: URGENCY, filter: { type: 'multiselect' } },
    { key: 'status', label: 'Statut', type: 'status', options: REQUEST_STATUS, filter: { type: 'multiselect' } },
    { key: 'applicants', label: 'Candidats', type: 'number', align: 'end', filter: { type: 'number' } },
    { key: 'artisanName', label: 'Artisan', sortKey: 'artisan', subKey: 'artisanPhone', filter: { type: 'text', param: 'artisan' } },
    { key: 'estimatedPrice', label: 'Prix estimé', type: 'money', align: 'end', filter: { type: 'number' }, hidden: true },
    { key: 'finalPrice', label: 'Prix final', type: 'money', align: 'end', filter: { type: 'number' } },
    { key: 'clientRating', label: 'Note client', type: 'stars', filter: { type: 'number' } },
    { key: 'acceptedAt', label: 'Acceptée', type: 'datetime', filter: { type: 'date' }, hidden: true },
    { key: 'completedAt', label: 'Terminée', type: 'datetime', filter: { type: 'date' } },
    { key: 'cancelledAt', label: 'Annulée', type: 'datetime', filter: { type: 'date' }, hidden: true },
  ];

  readonly actions: RowAction[] = [
    { icon: 'visibility', label: 'Voir la demande', tone: 'primary', handler: r => this.open(r) },
    { icon: 'edit', label: 'Modifier', handler: r => this.edit(r) },
    { icon: 'delete', label: 'Supprimer', tone: 'danger', handler: r => this.remove(r) },
  ];

  constructor(console: ConsoleService, ui: UiService, api: ApiService) {
    super(console, ui, api);
    console.categoryOptions().subscribe(o => (this.professions = o));
  }

  open(row: any): void {
    this.api.get<any>(`/admin/v2/requests/${row.id}`).subscribe({
      next: r => this.ui.detail(this.detail(r.data)),
      error: e => this.ui.error(e),
    });
  }

  edit(row: any): void {
    this.api.get<any>(`/admin/v2/requests/${row.id}`).subscribe({
      next: r => {
        const d = r.data;
        const artisans: Option[] = [{ value: '', label: '— Aucun artisan —' }];
        if (d.artisanId) {
          artisans.push({ value: d.artisanId, label: `${d.artisanName} (actuel)` });
        }
        for (const a of d.applicantsList ?? []) {
          if (a.artisanId && a.artisanId !== d.artisanId) {
            artisans.push({ value: a.artisanId, label: `${a.artisanName}${a.proposedPrice ? ' — ' + a.proposedPrice + ' DT' : ''}` });
          }
        }
        const professions = this.professions.some(p => p.value === d.profession)
          ? this.professions : [{ value: d.profession, label: d.profession }, ...this.professions];
        const fields: FormField[] = [
          { key: 'profession', label: 'Métier', type: 'select', options: professions, required: true },
          { key: 'urgency', label: 'Urgence', type: 'select', options: URGENCY, required: true },
          { key: 'status', label: 'Statut', type: 'select', options: REQUEST_STATUS, required: true,
            hint: 'Une demande terminée ne peut plus changer de statut ; « À confirmer » ne se choisit pas ici.' },
          { key: 'employeeId', label: 'Artisan assigné', type: 'select', options: artisans, required: false },
          { key: 'governorate', label: 'Gouvernorat', type: 'select', options: GOVERNORATE_OPTIONS },
          { key: 'city', label: 'Ville' },
          { key: 'address', label: 'Adresse', full: true },
          { key: 'estimatedPrice', label: 'Prix estimé (DT)', type: 'number', min: 0 },
          { key: 'finalPrice', label: 'Prix final (DT)', type: 'number', min: 0 },
          { key: 'description', label: 'Description', type: 'textarea', required: true },
          { key: 'notes', label: 'Notes internes', type: 'textarea' },
        ];
        this.ui.form({
          title: 'Modifier la demande', subtitle: `${d.profession} — ${d.clientName ?? ''}`, icon: 'edit', fields,
          value: { ...d, employeeId: d.artisanId ?? '' },
          submit: v => {
            const body: any = { ...v };
            body.employeeId = v.employeeId ?? '';
            for (const k of ['estimatedPrice', 'finalPrice']) {
              if (body[k] === null) {
                delete body[k];
              }
            }
            return this.api.put(`/admin/requests/${row.id}`, body);
          },
        }).subscribe(res => res && (this.ui.toast('Demande mise à jour'), this.reload()));
      },
      error: e => this.ui.error(e),
    });
  }

  remove(row: any): void {
    this.confirmThen(
      { title: 'Supprimer cette demande ?', message: `Demande « ${row.profession} » de ${row.clientName ?? 'ce client'}, avec ses candidatures et ses photos. Action définitive.`, tone: 'danger', icon: 'delete', confirmLabel: 'Supprimer' },
      () => this.api.delete(`/admin/requests/${row.id}`),
      'Demande supprimée',
    );
  }

  private detail(d: any): DetailData {
    const status = labelOf(REQUEST_STATUS, d.status);
    const urgency = labelOf(URGENCY, d.urgency);
    return {
      title: d.profession || 'Demande',
      subtitle: [d.city, d.governorate].filter(Boolean).join(', '),
      icon: 'assignment',
      badges: [
        ...(status ? [{ label: status.label, tone: status.tone! }] : []),
        ...(urgency && d.urgency !== 'NORMAL' ? [{ label: urgency.label, tone: urgency.tone! }] : []),
      ],
      sections: [
        {
          title: 'La demande',
          items: [
            { label: 'Description', value: d.description, type: 'longtext', full: true },
            { label: 'Adresse', value: [d.address, d.city, d.governorate].filter(Boolean).join(', '), full: true },
            { label: 'Notes internes', value: d.notes, type: 'longtext', full: true },
          ],
        },
        {
          title: 'Personnes',
          items: [
            { label: 'Client', value: d.clientName },
            { label: 'Téléphone du client', value: d.clientPhone, type: 'phone', href: d.clientPhone ? `tel:${d.clientPhone}` : undefined },
            { label: 'Artisan', value: d.artisanName },
            { label: "Téléphone de l'artisan", value: d.artisanPhone, type: 'phone', href: d.artisanPhone ? `tel:${d.artisanPhone}` : undefined },
          ],
        },
        {
          title: 'Prix et avis',
          items: [
            { label: 'Prix estimé', value: d.estimatedPrice, type: 'money' },
            { label: 'Prix final', value: d.finalPrice, type: 'money' },
            { label: 'Note du client', value: d.clientRating, type: 'stars' },
            { label: 'Commentaire du client', value: d.clientFeedback, type: 'longtext', full: true },
          ],
        },
        {
          title: 'Suivi',
          items: [
            { label: 'Publiée', value: d.createdAt, type: 'datetime' },
            { label: 'Prix proposé', value: d.priceProposedAt, type: 'datetime' },
            { label: 'Prix accepté', value: d.priceAcceptedAt, type: 'datetime' },
            { label: 'Acceptée', value: d.acceptedAt, type: 'datetime' },
            { label: 'Terminée', value: d.completedAt, type: 'datetime' },
            { label: 'Confirmée par le client', value: d.clientConfirmedAt, type: 'datetime' },
            { label: 'Annulée', value: d.cancelledAt, type: 'datetime' },
          ],
        },
      ],
      images: (d.photos ?? []).map((p: string, i: number) => ({ label: `Photo ${i + 1}`, url: p })),
      lists: [
        {
          title: 'Candidatures', rows: d.applicantsList ?? [], empty: "Aucun artisan n'a encore postulé",
          columns: [
            { key: 'artisanName', label: 'Artisan', type: 'person', subKey: 'artisanPhone' },
            { key: 'artisanRating', label: 'Note', type: 'rating' },
            { key: 'proposedPrice', label: 'Prix proposé', type: 'money' },
            { key: 'message', label: 'Message', type: 'longtext' },
            { key: 'status', label: 'Statut', type: 'status', options: APPLICANT_STATUS },
            { key: 'appliedAt', label: 'Date', type: 'datetime' },
          ],
        },
        {
          title: 'Avis', rows: d.reviewsList ?? [], empty: 'Aucun avis',
          columns: [
            { key: 'createdAt', label: 'Date', type: 'date' },
            { key: 'rating', label: 'Note', type: 'stars' },
            { key: 'comment', label: 'Commentaire', type: 'longtext' },
            { key: 'visible', label: 'Visible', type: 'boolean' },
          ],
        },
      ],
      actions: [
        { label: 'Modifier', icon: 'edit', handler: () => this.edit(d) },
        { label: 'Supprimer', icon: 'delete', tone: 'danger', handler: () => this.remove(d) },
      ],
    };
  }
}
