import { Component } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { ConsolePage, ConsoleService, PageKpi } from '../../shared/console';
import { ChatService } from '../messages/chat.service';
import { ColumnDef, RowAction } from '../../shared/models';
import { SUPPORT_CATEGORY, SUPPORT_STATUS, labelOf } from '../../shared/labels';
import { UiService } from '../../shared/ui.service';

@Component({
  selector: 'app-support-page',
  template: `
    <div class="page">
      <app-page-header icon="support_agent" title="Signalements"
                       subtitle="Problèmes et suggestions envoyés depuis l'application. Suivez-les jusqu'à leur résolution."></app-page-header>

      <div class="kpi-row">
        <app-kpi *ngFor="let k of kpis" [icon]="k.icon" [label]="k.label" [value]="counts[k.key] ?? '…'" [tone]="k.tone"
                 [clickable]="true" [active]="kpiActive(k)" (click)="applyKpi(k)"></app-kpi>
      </div>

      <app-data-table [endpoint]="endpoint" [columns]="columns" [actions]="actions" exportName="signalements"
                      [defaultSort]="{ key: 'createdAt', dir: 'desc' }" emptyIcon="support_agent"
                      searchPlaceholder="Sujet, description, nom, email, téléphone…" (rowClick)="open($event)"></app-data-table>
    </div>
  `,
})
export class SupportPageComponent extends ConsolePage {
  readonly endpoint = '/admin/v2/support-reports';

  override readonly kpis: PageKpi[] = [
    { key: 'new', label: 'Nouveaux', icon: 'mark_email_unread', tone: 'danger', filter: { status: 'NEW' } },
    { key: 'progress', label: 'En cours', icon: 'pending_actions', tone: 'warning', filter: { status: 'IN_PROGRESS' } },
    { key: 'resolved', label: 'Résolus', icon: 'task_alt', tone: 'success', filter: { status: 'RESOLVED' } },
    { key: 'bugs', label: 'Bugs', icon: 'bug_report', tone: 'violet', filter: { category: 'BUG' } },
  ];

  readonly columns: ColumnDef[] = [
    { key: 'createdAt', label: 'Reçu', type: 'datetime', filter: { type: 'date' } },
    { key: 'category', label: 'Type', type: 'status', options: SUPPORT_CATEGORY, filter: { type: 'multiselect' } },
    { key: 'subject', label: 'Sujet', filter: { type: 'text' } },
    { key: 'description', label: 'Description', type: 'longtext', sortKey: false, filter: { type: 'text' } },
    { key: 'reporterName', label: 'Envoyé par', type: 'person', subKey: 'reporterEmail', sortKey: 'reporter', filter: { type: 'text', param: 'reporter', placeholder: 'Nom ou email…' } },
    { key: 'reporterPhone', label: 'Téléphone', type: 'phone', filter: { type: 'text' }, width: '160px' },
    { key: 'platform', label: 'Plateforme', filter: { type: 'text' } },
    { key: 'appVersion', label: 'Version', filter: { type: 'text' } },
    { key: 'status', label: 'Statut', type: 'status', options: SUPPORT_STATUS, filter: { type: 'multiselect' } },
  ];

  readonly actions: RowAction[] = [
    { icon: 'visibility', label: 'Lire', tone: 'primary', handler: r => this.open(r) },
    { icon: 'chat', label: 'Répondre dans Messages', tone: 'info', visible: r => !!r.userId, handler: r => this.chats.writeTo(r.userId) },
    { icon: 'pending_actions', label: 'Prendre en charge', tone: 'warning', visible: r => r.status === 'NEW', handler: r => this.setStatus(r, 'IN_PROGRESS') },
    { icon: 'task_alt', label: 'Marquer résolu', tone: 'success', visible: r => r.status !== 'RESOLVED', handler: r => this.setStatus(r, 'RESOLVED') },
    { icon: 'replay', label: 'Rouvrir', visible: r => r.status === 'RESOLVED', handler: r => this.setStatus(r, 'NEW') },
  ];

  constructor(console: ConsoleService, ui: UiService, api: ApiService, private chats: ChatService) {
    super(console, ui, api);
  }

  setStatus(row: any, status: string): void {
    this.act(this.api.patch(`/admin/v2/support-reports/${row.id}/status`, { status }),
      `Signalement : ${labelOf(SUPPORT_STATUS, status)?.label ?? status}`);
  }

  open(s: any): void {
    const status = labelOf(SUPPORT_STATUS, s.status);
    const category = labelOf(SUPPORT_CATEGORY, s.category);
    const whatsapp = s.reporterPhone ? `https://wa.me/${String(s.reporterPhone).replace(/[^\d]/g, '')}` : undefined;
    this.ui.detail({
      title: s.subject || 'Signalement',
      subtitle: [s.reporterName, s.reporterPhone, s.reporterEmail].filter(Boolean).join(' · '),
      icon: 'support_agent',
      badges: [
        ...(status ? [{ label: status.label, tone: status.tone! }] : []),
        ...(category ? [{ label: category.label, tone: category.tone! }] : []),
      ],
      sections: [
        { title: 'Message', items: [{ label: 'Description', value: s.description, type: 'longtext', full: true }] },
        {
          title: 'Contact',
          items: [
            { label: 'Nom', value: s.reporterName },
            { label: 'Téléphone', value: s.reporterPhone, type: 'phone', href: s.reporterPhone ? `tel:${s.reporterPhone}` : undefined },
            { label: 'WhatsApp', value: whatsapp ? 'Ouvrir la conversation' : null, href: whatsapp },
            { label: 'Email', value: s.reporterEmail, href: s.reporterEmail ? `mailto:${s.reporterEmail}?subject=${encodeURIComponent('Re: ' + (s.subject || 'votre signalement'))}` : undefined },
          ],
        },
        {
          title: 'Contexte',
          items: [
            { label: 'Reçu', value: s.createdAt, type: 'datetime' },
            { label: 'Plateforme', value: s.platform },
            { label: "Version de l'app", value: s.appVersion },
          ],
        },
      ],
      actions: [
        ...(s.userId ? [{ label: 'Répondre dans Messages', icon: 'chat', tone: 'primary' as const, handler: () => this.chats.writeTo(s.userId) }] : []),
        ...(s.status === 'NEW' ? [{ label: 'Prendre en charge', icon: 'pending_actions', tone: 'warning' as const, handler: () => this.setStatus(s, 'IN_PROGRESS') }] : []),
        ...(s.status !== 'RESOLVED'
          ? [{ label: 'Marquer résolu', icon: 'task_alt', tone: 'success' as const, handler: () => this.setStatus(s, 'RESOLVED') }]
          : [{ label: 'Rouvrir', icon: 'replay', handler: () => this.setStatus(s, 'NEW') }]),
      ],
    });
  }
}
