import { Component } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { ConsolePage, ConsoleService, PageKpi } from '../../shared/console';
import { ColumnDef, FormField, RowAction } from '../../shared/models';
import { UiService } from '../../shared/ui.service';

@Component({
  selector: 'app-categories-page',
  template: `
    <div class="page">
      <app-page-header icon="category" title="Catégories"
                       subtitle="Métiers proposés dans l'application (ordre d'affichage, noms en français et en arabe, visuel).">
        <button mat-flat-button color="primary" (click)="create()"><mat-icon>add</mat-icon>Nouvelle catégorie</button>
      </app-page-header>

      <div class="kpi-row">
        <app-kpi *ngFor="let k of kpis" [icon]="k.icon" [label]="k.label" [value]="counts[k.key] ?? '…'" [tone]="k.tone"
                 [clickable]="true" [active]="kpiActive(k)" (click)="applyKpi(k)"></app-kpi>
      </div>

      <app-data-table [endpoint]="endpoint" [columns]="columns" [actions]="actions" exportName="categories"
                      [defaultSort]="{ key: 'displayOrder', dir: 'asc' }" emptyIcon="category"
                      searchPlaceholder="Nom en français ou en arabe…" (rowClick)="edit($event)"></app-data-table>
    </div>
  `,
})
export class CategoriesPageComponent extends ConsolePage {
  readonly endpoint = '/admin/v2/categories';

  override readonly kpis: PageKpi[] = [
    { key: 'all', label: 'Catégories', icon: 'category', tone: 'primary', filter: {} },
    { key: 'active', label: 'Actives', icon: 'check_circle', tone: 'success', filter: { active: 'true' } },
    { key: 'inactive', label: 'Désactivées', icon: 'block', tone: 'neutral', filter: { active: 'false' } },
    { key: 'empty', label: 'Sans artisan', icon: 'person_off', tone: 'warning', filter: { artisansMax: '0' } },
  ];

  readonly columns: ColumnDef[] = [
    { key: 'displayOrder', label: 'Ordre', type: 'number', align: 'end', filter: { type: 'number' } },
    { key: 'name', label: 'Nom', type: 'person', photoKey: 'imageUrl', subKey: 'nameAr', filter: { type: 'text' }, width: '220px' },
    { key: 'nameAr', label: 'Nom arabe', filter: { type: 'text' } },
    { key: 'icon', label: 'Icône', sortKey: false, filter: { type: 'text' }, hidden: true },
    { key: 'color', label: 'Couleur', type: 'color', sortKey: false, filter: { type: 'text' } },
    { key: 'artisans', label: 'Artisans', type: 'number', align: 'end', filter: { type: 'number' } },
    { key: 'requests', label: 'Demandes', type: 'number', align: 'end', filter: { type: 'number' } },
    { key: 'active', label: 'Statut', type: 'boolean', trueLabel: 'Active', falseLabel: 'Désactivée', filter: { type: 'boolean' } },
    { key: 'createdAt', label: 'Créée le', type: 'date', filter: { type: 'date' } },
  ];

  readonly actions: RowAction[] = [
    { icon: 'edit', label: 'Modifier', tone: 'primary', handler: r => this.edit(r) },
    { icon: 'toggle_off', label: 'Désactiver', tone: 'danger', visible: r => r.active, handler: r => this.setActive(r, false) },
    { icon: 'toggle_on', label: 'Activer', tone: 'success', visible: r => !r.active, handler: r => this.setActive(r, true) },
  ];

  constructor(console: ConsoleService, ui: UiService, api: ApiService) {
    super(console, ui, api);
  }

  private fields(edit: boolean): FormField[] {
    const f: FormField[] = [
      { key: 'name', label: 'Nom (français)', required: true, hint: "Doit correspondre au métier choisi par les artisans" },
      { key: 'nameAr', label: 'Nom (arabe)', required: true },
      { key: 'displayOrder', label: "Ordre d'affichage", type: 'number', min: 0 },
      { key: 'color', label: 'Couleur', type: 'color' },
      { key: 'icon', label: 'Icône (nom Material)', placeholder: 'plumbing', hint: 'Facultatif, utilisé si aucune image' },
      { key: 'imageUrl', label: 'Image', type: 'image' },
    ];
    if (edit) {
      f.push({ key: 'isActive', label: 'Catégorie active (visible dans l’app)', type: 'toggle' });
    }
    return f;
  }

  create(): void {
    this.ui.form({
      title: 'Nouvelle catégorie', icon: 'add', fields: this.fields(false), value: { color: '#0099CC' }, submitLabel: 'Créer',
      submit: v => this.api.post('/categories', v),
    }).subscribe(r => r && (this.ui.toast('Catégorie créée'), this.console.resetCategories(), this.reload()));
  }

  edit(row: any): void {
    this.ui.form({
      title: 'Modifier la catégorie', subtitle: row.name, icon: 'edit', fields: this.fields(true),
      value: { ...row, isActive: row.active },
      submit: v => this.api.put(`/categories/${row.id}`, v),
    }).subscribe(r => r && (this.ui.toast('Catégorie mise à jour'), this.console.resetCategories(), this.reload()));
  }

  setActive(row: any, active: boolean): void {
    this.confirmThen(
      active
        ? { title: 'Activer cette catégorie ?', message: `« ${row.name} » sera de nouveau proposée dans l'application.`, tone: 'success', confirmLabel: 'Activer' }
        : { title: 'Désactiver cette catégorie ?', message: `« ${row.name} » ne sera plus proposée dans l'application. Les artisans gardent leur métier.`, tone: 'danger', confirmLabel: 'Désactiver' },
      () => this.api.patch(`/categories/${row.id}/status`, {}, { isActive: active }),
      active ? 'Catégorie activée' : 'Catégorie désactivée',
    );
  }
}
