import { Component } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { ConsolePage, ConsoleService, PageKpi } from '../../shared/console';
import { ColumnDef, DetailData, RowAction } from '../../shared/models';
import { PAYMENT_METHOD, VERIFICATION_STATUS, labelOf } from '../../shared/labels';
import { formatMoney } from '../../shared/format';
import { UiService } from '../../shared/ui.service';

@Component({
  selector: 'app-verifications-page',
  template: `
    <div class="page">
      <app-page-header icon="verified" title="Vérifications"
                       subtitle="Badge « vérifié » : contrôlez les pièces d'identité et la réception du paiement avant d'approuver."></app-page-header>

      <div class="kpi-row">
        <app-kpi *ngFor="let k of kpis" [icon]="k.icon" [label]="k.label" [value]="counts[k.key] ?? '…'" [tone]="k.tone"
                 [clickable]="true" [active]="kpiActive(k)" (click)="applyKpi(k)"></app-kpi>
      </div>

      <app-data-table [endpoint]="endpoint" [columns]="columns" [actions]="actions" exportName="verifications"
                      [defaultSort]="{ key: 'requestedAt', dir: 'desc' }" emptyIcon="verified"
                      searchPlaceholder="Artisan, téléphone, référence…" (rowClick)="open($event)"></app-data-table>
    </div>
  `,
})
export class VerificationsPageComponent extends ConsolePage {
  readonly endpoint = '/admin/v2/verifications';

  override readonly kpis: PageKpi[] = [
    { key: 'pending', label: 'À vérifier', icon: 'hourglass_top', tone: 'warning', filter: { status: 'PENDING' } },
    { key: 'approved', label: 'Approuvées', icon: 'verified', tone: 'success', filter: { status: 'APPROVED' } },
    { key: 'rejected', label: 'Refusées', icon: 'gpp_bad', tone: 'danger', filter: { status: 'REJECTED' } },
    { key: 'all', label: 'Toutes', icon: 'fact_check', tone: 'primary', filter: {} },
  ];

  readonly columns: ColumnDef[] = [
    { key: 'requestedAt', label: 'Demandée', type: 'datetime', filter: { type: 'date' } },
    { key: 'artisanName', label: 'Artisan', type: 'person', sortKey: 'artisan', filter: { type: 'text', param: 'artisan' }, width: '190px' },
    { key: 'artisanPhone', label: 'Tél. artisan', type: 'phone', filter: { type: 'text' }, width: '160px' },
    { key: 'amount', label: 'Montant', type: 'money', align: 'end', filter: { type: 'number' } },
    { key: 'paymentMethod', label: 'Paiement', type: 'status', options: PAYMENT_METHOD, filter: { type: 'multiselect' } },
    { key: 'reference', label: 'Référence', filter: { type: 'text' } },
    { key: 'status', label: 'Statut', type: 'status', options: VERIFICATION_STATUS, filter: { type: 'multiselect' } },
    { key: 'reviewedAt', label: 'Traitée le', type: 'datetime', filter: { type: 'date' } },
    { key: 'reviewedBy', label: 'Traitée par', sortKey: false, hidden: true },
    { key: 'expiresAt', label: 'Valable jusqu’au', type: 'date', filter: { type: 'date' } },
    { key: 'rejectionReason', label: 'Motif du refus', type: 'longtext', sortKey: false, filter: { type: 'text' }, hidden: true },
  ];

  readonly actions: RowAction[] = [
    { icon: 'visibility', label: 'Voir les documents', tone: 'primary', handler: r => this.open(r) },
    { icon: 'verified', label: 'Approuver', tone: 'success', visible: r => r.status === 'PENDING', handler: r => this.approve(r) },
    { icon: 'gpp_bad', label: 'Refuser', tone: 'danger', visible: r => r.status === 'PENDING', handler: r => this.reject(r) },
  ];

  constructor(console: ConsoleService, ui: UiService, api: ApiService) {
    super(console, ui, api);
  }

  approve(row: any): void {
    this.confirmThen(
      {
        title: 'Approuver la vérification ?', icon: 'verified', tone: 'success', confirmLabel: 'Approuver',
        message: `Pièces conformes et ${formatMoney(row.amount)} reçus (référence ${row.reference}) : ${row.artisanName} obtient le badge « vérifié ».`,
      },
      () => this.api.put(`/verifications/${row.id}/approve`, {}),
      'Vérification approuvée',
    );
  }

  reject(row: any): void {
    this.confirmThen(
      {
        title: 'Refuser la vérification ?', icon: 'gpp_bad', tone: 'danger', confirmLabel: 'Refuser',
        message: `Le motif sera visible par ${row.artisanName}.`,
        input: { label: 'Motif du refus', type: 'textarea', required: true, placeholder: 'Ex. : photo de la carte illisible, paiement non reçu…' },
      },
      reason => this.api.put(`/verifications/${row.id}/reject`, {}, { reason }),
      'Vérification refusée',
    );
  }

  open(v: any): void {
    const status = labelOf(VERIFICATION_STATUS, v.status);
    const actions: DetailData['actions'] = v.status === 'PENDING'
      ? [
          { label: 'Approuver', icon: 'verified', tone: 'success', handler: () => this.approve(v) },
          { label: 'Refuser', icon: 'gpp_bad', tone: 'danger', handler: () => this.reject(v) },
        ]
      : [];
    this.ui.detail({
      title: v.artisanName ?? 'Vérification',
      subtitle: `Référence ${v.reference ?? '—'}`,
      icon: 'verified',
      badges: status ? [{ label: status.label, tone: status.tone! }] : [],
      sections: [
        {
          title: 'Demande',
          items: [
            { label: 'Montant', value: v.amount, type: 'money' },
            { label: 'Moyen choisi', value: v.paymentMethod, type: 'status', options: PAYMENT_METHOD },
            { label: 'Téléphone', value: v.artisanPhone, type: 'phone', href: v.artisanPhone ? `tel:${v.artisanPhone}` : undefined },
            { label: 'Demandée', value: v.requestedAt, type: 'datetime' },
            { label: 'Traitée le', value: v.reviewedAt, type: 'datetime' },
            { label: 'Traitée par', value: v.reviewedBy },
            { label: 'Valable jusqu’au', value: v.expiresAt, type: 'date' },
            { label: 'Motif du refus', value: v.rejectionReason, type: 'longtext', full: true },
          ],
        },
      ],
      images: [
        { label: "Carte d'identité (recto)", url: v.documentCinFront },
        { label: "Carte d'identité (verso)", url: v.documentCinBack },
        { label: 'Selfie', url: v.documentSelfie },
        { label: 'Diplôme', url: v.documentDiploma },
      ],
      actions,
    });
  }
}
