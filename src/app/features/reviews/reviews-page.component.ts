import { Component } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { ConsolePage, ConsoleService, PageKpi } from '../../shared/console';
import { ColumnDef, DetailData, RowAction } from '../../shared/models';
import { REVIEW_SOURCE } from '../../shared/labels';
import { UiService } from '../../shared/ui.service';

@Component({
  selector: 'app-reviews-page',
  template: `
    <div class="page">
      <app-page-header icon="reviews" title="Avis"
                       subtitle="Avis laissés par les clients. Masquer un avis le retire du profil public de l'artisan."></app-page-header>

      <div class="kpi-row">
        <app-kpi *ngFor="let k of kpis" [icon]="k.icon" [label]="k.label" [value]="counts[k.key] ?? '…'" [tone]="k.tone"
                 [clickable]="true" [active]="kpiActive(k)" (click)="applyKpi(k)"></app-kpi>
      </div>

      <app-data-table [endpoint]="endpoint" [columns]="columns" [actions]="actions" exportName="avis"
                      [defaultSort]="{ key: 'createdAt', dir: 'desc' }" emptyIcon="rate_review"
                      searchPlaceholder="Commentaire, artisan, client…" (rowClick)="open($event)"></app-data-table>
    </div>
  `,
})
export class ReviewsPageComponent extends ConsolePage {
  readonly endpoint = '/admin/v2/reviews';

  override readonly kpis: PageKpi[] = [
    { key: 'all', label: 'Avis', icon: 'reviews', tone: 'primary', filter: {} },
    { key: 'good', label: '4 et 5 étoiles', icon: 'sentiment_satisfied', tone: 'success', filter: { ratingMin: '4' } },
    { key: 'bad', label: '1 et 2 étoiles', icon: 'sentiment_dissatisfied', tone: 'danger', filter: { ratingMax: '2' } },
    { key: 'hidden', label: 'Masqués', icon: 'visibility_off', tone: 'neutral', filter: { visible: 'false' } },
  ];

  readonly columns: ColumnDef[] = [
    { key: 'createdAt', label: 'Date', type: 'datetime', filter: { type: 'date' } },
    { key: 'artisanName', label: 'Artisan', type: 'person', sortKey: 'artisan', filter: { type: 'text', param: 'artisan' }, width: '190px' },
    { key: 'clientName', label: 'Client', sortKey: 'client', filter: { type: 'text', param: 'client' } },
    { key: 'rating', label: 'Note', type: 'stars', filter: { type: 'number' } },
    { key: 'comment', label: 'Commentaire', type: 'longtext', sortKey: false, filter: { type: 'text' } },
    { key: 'source', label: 'Lié à', type: 'status', options: REVIEW_SOURCE, sortKey: false, filter: { type: 'select' } },
    { key: 'visible', label: 'Visibilité', type: 'boolean', trueLabel: 'Visible', falseLabel: 'Masqué', filter: { type: 'boolean' } },
  ];

  readonly actions: RowAction[] = [
    { icon: 'visibility', label: "Voir l'avis", tone: 'primary', handler: r => this.open(r) },
    { icon: 'visibility_off', label: 'Masquer', tone: 'danger', visible: r => r.visible, handler: r => this.setVisible(r, false) },
    { icon: 'restore', label: 'Réafficher', tone: 'success', visible: r => !r.visible, handler: r => this.setVisible(r, true) },
  ];

  constructor(console: ConsoleService, ui: UiService, api: ApiService) {
    super(console, ui, api);
  }

  setVisible(row: any, visible: boolean): void {
    this.confirmThen(
      visible
        ? { title: 'Réafficher cet avis ?', message: "Il sera de nouveau visible sur le profil de l'artisan.", tone: 'success', confirmLabel: 'Réafficher' }
        : { title: 'Masquer cet avis ?', message: "Il ne sera plus visible sur le profil de l'artisan. Rien n'est supprimé.", tone: 'danger', confirmLabel: 'Masquer' },
      () => this.api.patch(`/admin/v2/reviews/${row.id}/visible`, { visible }),
      visible ? 'Avis réaffiché' : 'Avis masqué',
    );
  }

  open(r: any): void {
    const data: DetailData = {
      title: `Avis de ${r.clientName ?? 'client'}`,
      subtitle: `Pour ${r.artisanName ?? 'artisan'}`,
      icon: 'reviews',
      badges: [r.visible ? { label: 'Visible', tone: 'success' } : { label: 'Masqué', tone: 'neutral' }],
      sections: [
        {
          title: 'Avis',
          items: [
            { label: 'Note', value: r.rating, type: 'stars' },
            { label: 'Date', value: r.createdAt, type: 'datetime' },
            { label: 'Commentaire', value: r.comment, type: 'longtext', full: true },
            { label: 'Étiquettes', value: r.tags, type: 'chips', full: true },
            { label: 'Lié à', value: r.source, type: 'status', options: REVIEW_SOURCE },
          ],
        },
      ],
      images: (r.photos ?? []).map((p: string, i: number) => ({ label: `Photo ${i + 1}`, url: p })),
      actions: [
        r.visible
          ? { label: 'Masquer', icon: 'visibility_off', tone: 'danger', handler: () => this.setVisible(r, false) }
          : { label: 'Réafficher', icon: 'restore', tone: 'success', handler: () => this.setVisible(r, true) },
      ],
    };
    this.ui.detail(data);
  }
}
