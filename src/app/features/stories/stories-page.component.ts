import { Component } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { ConsolePage, ConsoleService, PageKpi } from '../../shared/console';
import { ColumnDef, RowAction } from '../../shared/models';
import { STORY_STATE, labelOf } from '../../shared/labels';
import { fileUrl } from '../../shared/format';
import { UiService } from '../../shared/ui.service';

@Component({
  selector: 'app-stories-page',
  template: `
    <div class="page">
      <app-page-header icon="smart_display" title="Stories"
                       subtitle="Vidéos publiées par les artisans sur l'accueil. Masquez une vidéo inappropriée en un clic."></app-page-header>

      <div class="kpi-row">
        <app-kpi *ngFor="let k of kpis" [icon]="k.icon" [label]="k.label" [value]="counts[k.key] ?? '…'" [tone]="k.tone"
                 [clickable]="true" [active]="kpiActive(k)" (click)="applyKpi(k)"></app-kpi>
      </div>

      <app-data-table [endpoint]="endpoint" [columns]="columns" [actions]="actions" exportName="stories"
                      [defaultSort]="{ key: 'createdAt', dir: 'desc' }" emptyIcon="smart_display"
                      searchPlaceholder="Titre ou artisan…" (rowClick)="watch($event)"></app-data-table>
    </div>
  `,
})
export class StoriesPageComponent extends ConsolePage {
  readonly endpoint = '/admin/v2/stories';

  override readonly kpis: PageKpi[] = [
    { key: 'active', label: 'Visibles', icon: 'play_circle', tone: 'success', filter: { state: 'active' } },
    { key: 'expired', label: 'Expirées', icon: 'history', tone: 'neutral', filter: { state: 'expired' } },
    { key: 'disabled', label: 'Masquées', icon: 'visibility_off', tone: 'danger', filter: { state: 'disabled' } },
    { key: 'all', label: 'Toutes', icon: 'video_library', tone: 'primary', filter: {} },
  ];

  readonly columns: ColumnDef[] = [
    { key: 'thumbnailUrl', label: 'Aperçu', type: 'image', sortKey: false },
    { key: 'artisanName', label: 'Artisan', type: 'person', subKey: 'artisanPhone', sortKey: 'artisan', filter: { type: 'text', param: 'artisan' }, width: '200px' },
    { key: 'title', label: 'Titre', filter: { type: 'text' } },
    { key: 'state', label: 'État', type: 'status', options: STORY_STATE, sortKey: false, filter: { type: 'select' } },
    { key: 'views', label: 'Vues', type: 'number', align: 'end', filter: { type: 'number' } },
    { key: 'duration', label: 'Durée', type: 'number', suffix: 's', align: 'end', filter: { type: 'number' } },
    { key: 'createdAt', label: 'Publiée', type: 'datetime', filter: { type: 'date' } },
    { key: 'expiresAt', label: 'Expire', type: 'datetime', filter: { type: 'date' } },
  ];

  readonly actions: RowAction[] = [
    { icon: 'play_circle', label: 'Regarder la vidéo', tone: 'primary', handler: r => this.watch(r) },
    { icon: 'visibility_off', label: 'Masquer', tone: 'danger', visible: r => r.enabled, handler: r => this.setEnabled(r, false) },
    { icon: 'visibility', label: 'Réafficher', tone: 'success', visible: r => !r.enabled, handler: r => this.setEnabled(r, true) },
  ];

  constructor(console: ConsoleService, ui: UiService, api: ApiService) {
    super(console, ui, api);
  }

  watch(row: any): void {
    const url = fileUrl(row.videoUrl);
    if (url) {
      window.open(url, '_blank', 'noopener');
    }
  }

  setEnabled(row: any, enabled: boolean): void {
    this.confirmThen(
      enabled
        ? { title: 'Réafficher cette story ?', message: `Elle redeviendra visible sur l'accueil jusqu'à son expiration.`, tone: 'success', confirmLabel: 'Réafficher' }
        : { title: 'Masquer cette story ?', message: `La vidéo de ${row.artisanName} disparaît de l'accueil. Elle n'est pas supprimée.`, tone: 'danger', confirmLabel: 'Masquer' },
      () => this.api.patch(`/admin/v2/stories/${row.id}/enabled`, { enabled }),
      enabled ? 'Story réaffichée' : `Story masquée (${labelOf(STORY_STATE, 'disabled')?.label})`,
    );
  }
}
