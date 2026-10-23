import { Component } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ConsolePage, ConsoleService, PageKpi } from '../../shared/console';
import { ColumnDef, RowAction } from '../../shared/models';
import { STORY_REACTIONS, STORY_STATE, STORY_STATE_DISPLAY, labelOf } from '../../shared/labels';
import { fileUrl } from '../../shared/format';
import { UiService } from '../../shared/ui.service';

@Component({
  selector: 'app-stories-page',
  template: `
    <div class="page">
      <app-page-header icon="smart_display" title="Stories"
                       subtitle="Vidéos publiées par les artisans sur l'accueil. Masquez une vidéo inappropriée, republiez-en une pour 24 h, ou supprimez-les définitivement."></app-page-header>

      <div class="kpi-row">
        <app-kpi *ngFor="let k of kpis" [icon]="k.icon" [label]="k.label" [value]="counts[k.key] ?? '…'" [tone]="k.tone"
                 [clickable]="true" [active]="kpiActive(k)" (click)="applyKpi(k)"></app-kpi>
      </div>

      <app-data-table [endpoint]="endpoint" [columns]="columns" [actions]="actions" exportName="stories"
                      [selectable]="isSuperAdmin" (selectionChange)="selection = $event"
                      [defaultSort]="{ key: 'createdAt', dir: 'desc' }" emptyIcon="smart_display"
                      searchPlaceholder="Titre, artisan ou téléphone…" (rowClick)="watch($event)">
        <button dtActions mat-stroked-button class="tone-danger" *ngIf="isSuperAdmin && selection.length" (click)="deleteForever(selection)">
          <mat-icon>delete_forever</mat-icon>Supprimer définitivement ({{ selection.length }})
        </button>
      </app-data-table>
    </div>
  `,
})
export class StoriesPageComponent extends ConsolePage {
  readonly endpoint = '/admin/v2/stories';
  /** Suppression définitive (base et fichiers) : Super Admin seulement, vérifié aussi par le serveur. */
  readonly isSuperAdmin: boolean;
  selection: any[] = [];

  override readonly kpis: PageKpi[] = [
    { key: 'active', label: 'Visibles', icon: 'play_circle', tone: 'success', filter: { state: 'active' } },
    { key: 'expired', label: 'Expirées', icon: 'history', tone: 'neutral', filter: { state: 'expired' } },
    { key: 'disabled', label: 'Masquées ou retirées', icon: 'visibility_off', tone: 'danger', filter: { state: 'disabled' } },
    { key: 'all', label: 'Toutes', icon: 'video_library', tone: 'primary', filter: {} },
  ];

  readonly columns: ColumnDef[] = [
    { key: 'thumbnailUrl', label: 'Aperçu', type: 'image', sortKey: false },
    { key: 'artisanName', label: 'Artisan', type: 'person', sortKey: 'artisan', filter: { type: 'text', param: 'artisan' }, width: '190px' },
    { key: 'artisanPhone', label: 'Tél. artisan', type: 'phone', filter: { type: 'text' }, width: '160px' },
    { key: 'title', label: 'Titre', filter: { type: 'text' } },
    {
      key: 'state', label: 'État', type: 'status', options: STORY_STATE_DISPLAY, sortKey: false,
      value: r => (r.state === 'disabled' && !r.hiddenByAdmin ? 'removed' : r.state),
      filter: { type: 'select', options: STORY_STATE },
    },
    {
      key: 'reactionsTotal', label: 'Réactions', sortKey: 'reactions', align: 'end', filter: { type: 'number', param: 'reactions' },
      // Seulement les réactions reçues : « ❤️ 5  👍 2 » (vide = aucune)
      value: r => STORY_REACTIONS.filter(x => (r.reactions?.[x.key] ?? 0) > 0).map(x => `${x.emoji} ${r.reactions[x.key]}`).join('  '),
    },
    { key: 'views', label: 'Vues', type: 'number', align: 'end', filter: { type: 'number' } },
    { key: 'duration', label: 'Durée', type: 'number', suffix: 's', align: 'end', filter: { type: 'number' } },
    { key: 'createdAt', label: 'Publiée', type: 'datetime', filter: { type: 'date' } },
    { key: 'expiresAt', label: 'Expire', type: 'datetime', filter: { type: 'date' } },
    { key: 'republishedAt', label: 'Republiée le', type: 'datetime', sortKey: false, hidden: true },
    { key: 'firstPublishedAt', label: 'Première publication', type: 'datetime', sortKey: false, hidden: true },
  ];

  readonly actions: RowAction[] = [
    { icon: 'play_circle', label: 'Regarder la vidéo', tone: 'primary', handler: r => this.watch(r) },
    { icon: 'restart_alt', label: 'Republier 24 h', tone: 'success', visible: r => r.canRepublish, handler: r => this.republish(r) },
    { icon: 'visibility_off', label: 'Masquer', tone: 'danger', visible: r => r.enabled, handler: r => this.setEnabled(r, false) },
    { icon: 'visibility', label: 'Réafficher', tone: 'success', visible: r => !r.enabled && r.hiddenByAdmin, handler: r => this.setEnabled(r, true) },
  ];

  constructor(console: ConsoleService, ui: UiService, api: ApiService, auth: AuthService) {
    super(console, ui, api);
    this.isSuperAdmin = (auth.getCurrentUser()?.role || '').toLowerCase() === 'super_admin';
  }

  watch(row: any): void {
    const url = fileUrl(row.videoUrl);
    if (url) {
      window.open(url, '_blank', 'noopener');
    }
  }

  republish(row: any): void {
    this.confirmThen(
      {
        title: 'Republier cette story pour 24 h ?',
        message: `La vidéo de ${row.artisanName} revient sur l'accueil dès maintenant, pour 24 h, comme une nouvelle story. Ses vues et réactions sont gardées.`,
        tone: 'success', confirmLabel: 'Republier 24 h',
      },
      () => this.api.post(`/admin/v2/stories/${row.id}/republish`, {}),
      'Story republiée pour 24 h',
    );
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

  deleteForever(rows: any[]): void {
    const n = rows.length;
    this.ui.confirm({
      title: `Supprimer définitivement ${n} stor${n > 1 ? 'ies' : 'y'} ?`,
      message: `Les vidéos, miniatures, vues et réactions sont effacées de la base de données et du serveur. C'est irréversible : pour seulement les retirer de l'accueil, utilisez « Masquer ».`,
      tone: 'danger', confirmLabel: 'Supprimer définitivement',
    }).subscribe(ok => {
      if (!ok) {
        return;
      }
      this.api.post<any>('/admin/v2/stories/delete', { ids: rows.map(r => r.id) }).subscribe({
        next: r => {
          const d = r.data ?? {};
          this.ui.toast(`${d.stories ?? 0} stor${(d.stories ?? 0) > 1 ? 'ies supprimées' : 'y supprimée'} définitivement (${d.files ?? 0} fichier(s) effacé(s))`);
          this.selection = [];
          this.table?.clearSelection();
          this.reload();
        },
        error: e => this.ui.error(e),
      });
    });
  }
}
