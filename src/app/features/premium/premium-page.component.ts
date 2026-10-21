import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ConsolePage, ConsoleService, PageKpi } from '../../shared/console';
import { ColumnDef, RowAction } from '../../shared/models';
import { PREMIUM_PLAN, PREMIUM_STATUS } from '../../shared/labels';
import { UiService } from '../../shared/ui.service';
import { ChatService } from '../messages/chat.service';

/** Abonnés SNAY3I Premium (sans publicité), achetés avec Google Play et vérifiés par le serveur. */
@Component({
  selector: 'app-premium-page',
  template: `
    <div class="page">
      <app-page-header icon="workspace_premium" title="Premium"
                       subtitle="Clients abonnés à SNAY3I Premium (sans publicité). Paiements et remboursements se gèrent dans la Play Console."></app-page-header>

      <div class="kpi-row">
        <app-kpi *ngFor="let k of kpis" [icon]="k.icon" [label]="k.label" [value]="counts[k.key] ?? '…'" [tone]="k.tone"
                 [clickable]="true" [active]="kpiActive(k)" (click)="applyKpi(k)"></app-kpi>
      </div>

      <app-data-table [endpoint]="endpoint" [columns]="columns" [actions]="actions" exportName="premium"
                      [defaultSort]="{ key: 'createdAt', dir: 'desc' }" emptyIcon="workspace_premium"
                      emptyText="Aucun abonnement pour l'instant" searchPlaceholder="Client, téléphone, n° de commande…"
                      (rowClick)="openClient($event)"></app-data-table>
    </div>
  `,
})
export class PremiumPageComponent extends ConsolePage {
  readonly endpoint = '/admin/v2/subscriptions';

  override readonly kpis: PageKpi[] = [
    { key: 'active', label: 'Abonnés actifs', icon: 'workspace_premium', tone: 'success', filter: { active: 'true' } },
    { key: 'trial', label: 'En essai gratuit', icon: 'hourglass_top', tone: 'info', filter: { active: 'true', trial: 'true' } },
    { key: 'stopping', label: 'Renouvellement arrêté', icon: 'event_busy', tone: 'warning', filter: { active: 'true', status: 'CANCELED' } },
    { key: 'problem', label: 'Paiement refusé', icon: 'credit_card_off', tone: 'danger', filter: { status: 'ON_HOLD,IN_GRACE_PERIOD' } },
    { key: 'ended', label: 'Expirés', icon: 'history', tone: 'neutral', filter: { status: 'EXPIRED' } },
  ];

  readonly columns: ColumnDef[] = [
    { key: 'name', label: 'Client', type: 'person', subKey: 'email', filter: { type: 'text' }, width: '200px' },
    { key: 'phone', label: 'Téléphone', type: 'phone', filter: { type: 'text' }, width: '160px' },
    { key: 'basePlanId', label: 'Formule', type: 'status', options: PREMIUM_PLAN, filter: { type: 'select' } },
    { key: 'status', label: 'État Google', type: 'status', options: PREMIUM_STATUS, filter: { type: 'multiselect' } },
    { key: 'active', label: 'Premium', type: 'boolean', trueLabel: 'En cours', falseLabel: 'Terminé', sortKey: false, filter: { type: 'boolean' } },
    { key: 'trial', label: 'Essai gratuit', type: 'boolean', trueLabel: 'Oui', falseLabel: 'Non', filter: { type: 'boolean' } },
    { key: 'autoRenewing', label: 'Renouvellement', type: 'boolean', trueLabel: 'Automatique', falseLabel: 'Arrêté', filter: { type: 'boolean' } },
    { key: 'startedAt', label: 'Début', type: 'datetime', filter: { type: 'date' } },
    { key: 'expiresAt', label: 'Échéance', type: 'datetime', filter: { type: 'date' } },
    { key: 'testPurchase', label: 'Achat de test', type: 'boolean', trueLabel: 'Test', falseLabel: 'Réel', sortKey: false, filter: { type: 'boolean' } },
    { key: 'orderId', label: 'Commande Google', filter: { type: 'text' }, hidden: true },
    { key: 'lastVerifiedAt', label: 'Vérifié chez Google', type: 'datetime', filter: { type: 'date' }, hidden: true },
    { key: 'createdAt', label: 'Abonné le', type: 'datetime', filter: { type: 'date' } },
  ];

  readonly actions: RowAction[] = [
    { icon: 'person', label: 'Voir le client', tone: 'primary', handler: r => this.openClient(r) },
    { icon: 'chat', label: 'Écrire', tone: 'info', visible: r => !!r.userId, handler: r => this.chats.writeTo(r.userId) },
  ];

  constructor(console: ConsoleService, ui: UiService, api: ApiService, private chats: ChatService, private router: Router) {
    super(console, ui, api);
  }

  openClient(row: any): void {
    this.router.navigate(['/clients'], { queryParams: row.phone ? { phone: row.phone } : { name: row.name } });
  }
}
