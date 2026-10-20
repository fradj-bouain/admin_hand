import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { ConsolePage, ConsoleService, PageKpi } from '../../shared/console';
import { ColumnDef, DetailData, RowAction } from '../../shared/models';
import { BOOST_STATUS, BOOST_TYPE, PAYMENT_METHOD, labelOf } from '../../shared/labels';
import { formatMoney } from '../../shared/format';
import { UiService } from '../../shared/ui.service';

@Component({
  selector: 'app-boosts-page',
  template: `
    <div class="page">
      <app-page-header icon="bolt" title="Boosts"
                       subtitle="Paiement manuel : vérifiez la réception de l'argent (Flouci 29344941, preuve par WhatsApp) avant de valider."></app-page-header>

      <div class="kpi-row">
        <app-kpi *ngFor="let k of kpis" [icon]="k.icon" [label]="k.label" [value]="counts[k.key] ?? '…'" [tone]="k.tone"
                 [clickable]="true" [active]="kpiActive(k)" (click)="applyKpi(k)"></app-kpi>
        <app-kpi icon="payments" label="Revenus validés" [value]="revenue" hint="Boosts actifs ou expirés" tone="success"></app-kpi>
      </div>

      <app-data-table [endpoint]="endpoint" [columns]="columns" [actions]="actions" exportName="boosts"
                      [defaultSort]="{ key: 'requestedAt', dir: 'desc' }" emptyIcon="bolt"
                      searchPlaceholder="Artisan, téléphone, référence…" (rowClick)="open($event)"></app-data-table>
    </div>
  `,
})
export class BoostsPageComponent extends ConsolePage implements OnInit {
  readonly endpoint = '/admin/v2/boosts';
  revenue = '…';

  override readonly kpis: PageKpi[] = [
    { key: 'pending', label: 'À valider', icon: 'hourglass_top', tone: 'warning', filter: { status: 'PENDING' } },
    { key: 'active', label: 'Actifs', icon: 'bolt', tone: 'violet', filter: { status: 'ACTIVE' } },
    { key: 'expired', label: 'Expirés', icon: 'history', tone: 'neutral', filter: { status: 'EXPIRED' } },
    { key: 'cancelled', label: 'Annulés', icon: 'cancel', tone: 'danger', filter: { status: 'CANCELLED,REFUNDED' } },
  ];

  readonly columns: ColumnDef[] = [
    { key: 'requestedAt', label: 'Demandé', type: 'datetime', filter: { type: 'date' } },
    { key: 'artisanName', label: 'Artisan', type: 'person', subKey: 'artisanPhone', sortKey: 'artisan', filter: { type: 'text', param: 'artisan' }, width: '200px' },
    { key: 'type', label: 'Offre', type: 'status', options: BOOST_TYPE, filter: { type: 'multiselect' } },
    { key: 'amount', label: 'Montant', type: 'money', align: 'end', filter: { type: 'number' } },
    { key: 'paymentMethod', label: 'Paiement', type: 'status', options: PAYMENT_METHOD, filter: { type: 'multiselect' } },
    { key: 'reference', label: 'Référence', filter: { type: 'text' } },
    { key: 'status', label: 'Statut', type: 'status', options: BOOST_STATUS, filter: { type: 'multiselect' } },
    { key: 'validatedAt', label: 'Validé le', type: 'datetime', filter: { type: 'date' } },
    { key: 'validatedBy', label: 'Validé par', sortKey: false, hidden: true },
    { key: 'startsAt', label: 'Début', type: 'datetime', filter: { type: 'date' }, hidden: true },
    { key: 'endsAt', label: 'Fin', type: 'datetime', filter: { type: 'date' } },
  ];

  readonly actions: RowAction[] = [
    { icon: 'task_alt', label: 'Valider (paiement reçu)', tone: 'success', visible: r => r.status === 'PENDING', handler: r => this.validate(r) },
    { icon: 'cancel', label: 'Annuler la demande', tone: 'danger', visible: r => r.status === 'PENDING', handler: r => this.cancel(r) },
    { icon: 'stop_circle', label: 'Arrêter le Boost', tone: 'warning', visible: r => r.status === 'ACTIVE', handler: r => this.deactivate(r) },
    { icon: 'visibility', label: 'Voir', tone: 'primary', handler: r => this.open(r) },
  ];

  constructor(console: ConsoleService, ui: UiService, api: ApiService) {
    super(console, ui, api);
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadRevenue();
  }

  override reload(): void {
    super.reload();
    this.loadRevenue();
  }

  private loadRevenue(): void {
    this.api.get<any>('/admin/v2/dashboard').subscribe({
      next: r => (this.revenue = formatMoney(r.data?.kpis?.revenueBoosts ?? 0)),
      error: () => (this.revenue = '—'),
    });
  }

  validate(row: any): void {
    this.confirmThen(
      {
        title: 'Valider ce Boost ?', icon: 'task_alt', tone: 'success', confirmLabel: 'Paiement reçu, valider',
        message: `Validez seulement si ${formatMoney(row.amount)} (référence ${row.reference}) sont bien arrivés. ` +
          `Le Boost de ${row.artisanName} démarre immédiatement pour ${labelOf(BOOST_TYPE, row.type)?.label ?? row.type}.`,
      },
      () => this.api.put(`/boosts/${row.id}/validate`, {}),
      'Boost validé et activé',
    );
  }

  cancel(row: any): void {
    this.confirmThen(
      { title: 'Annuler cette demande ?', message: `Paiement non reçu ou incorrect : la demande de ${row.artisanName} sera annulée sans activer de Boost.`, tone: 'danger', icon: 'cancel', confirmLabel: 'Annuler la demande', cancelLabel: 'Retour' },
      () => this.api.put(`/boosts/${row.id}/cancel`, {}),
      'Demande annulée',
    );
  }

  deactivate(row: any): void {
    this.confirmThen(
      { title: 'Arrêter ce Boost maintenant ?', message: `${row.artisanName} perd sa mise en avant immédiatement.`, tone: 'warning', icon: 'stop_circle', confirmLabel: 'Arrêter', cancelLabel: 'Retour' },
      () => this.api.put(`/boosts/${row.id}/deactivate`, {}),
      'Boost arrêté',
    );
  }

  open(b: any): void {
    const status = labelOf(BOOST_STATUS, b.status);
    const actions: DetailData['actions'] = [];
    if (b.status === 'PENDING') {
      actions.push({ label: 'Valider', icon: 'task_alt', tone: 'success', handler: () => this.validate(b) });
      actions.push({ label: 'Annuler', icon: 'cancel', tone: 'danger', handler: () => this.cancel(b) });
    } else if (b.status === 'ACTIVE') {
      actions.push({ label: 'Arrêter', icon: 'stop_circle', tone: 'warning', handler: () => this.deactivate(b) });
    }
    this.ui.detail({
      title: `${b.offer ?? 'Boost'} — ${b.artisanName ?? ''}`,
      subtitle: `Référence ${b.reference ?? '—'}`,
      icon: 'bolt',
      badges: status ? [{ label: status.label, tone: status.tone! }] : [],
      sections: [
        {
          title: 'Paiement',
          items: [
            { label: 'Montant', value: b.amount, type: 'money' },
            { label: 'Moyen choisi', value: b.paymentMethod, type: 'status', options: PAYMENT_METHOD },
            { label: 'Référence', value: b.reference },
            { label: 'Offre', value: b.type, type: 'status', options: BOOST_TYPE },
          ],
        },
        {
          title: 'Artisan',
          items: [
            { label: 'Nom', value: b.artisanName },
            { label: 'Téléphone', value: b.artisanPhone, type: 'phone', href: b.artisanPhone ? `tel:${b.artisanPhone}` : undefined },
          ],
        },
        {
          title: 'Suivi',
          items: [
            { label: 'Demandé', value: b.requestedAt, type: 'datetime' },
            { label: 'Validé le', value: b.validatedAt, type: 'datetime' },
            { label: 'Validé par', value: b.validatedBy },
            { label: 'Début', value: b.startsAt, type: 'datetime' },
            { label: 'Fin', value: b.endsAt, type: 'datetime' },
          ],
        },
      ],
      actions,
    });
  }
}
