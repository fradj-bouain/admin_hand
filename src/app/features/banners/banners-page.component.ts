import { Component } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { ConsolePage, ConsoleService, PageKpi } from '../../shared/console';
import { ColumnDef, FormField, Option, RowAction } from '../../shared/models';
import { BANNER_ACTION, BANNER_AUDIENCE, BANNER_STATE, GOVERNORATE_OPTIONS, labelOf } from '../../shared/labels';
import { fileUrl } from '../../shared/format';
import { UiService } from '../../shared/ui.service';

const ALL_TUNISIA = 'Toute la Tunisie';

@Component({
  selector: 'app-banners-page',
  template: `
    <div class="page">
      <app-page-header icon="view_carousel" title="Bannières"
                       subtitle="Vos publicités en haut de l'accueil des clients et des artisans. L'app en montre 5 au plus à la fois, dans l'ordre d'affichage.">
        <button mat-flat-button color="primary" (click)="create()"><mat-icon>add</mat-icon>Nouvelle bannière</button>
      </app-page-header>

      <div class="kpi-row">
        <app-kpi *ngFor="let k of kpis" [icon]="k.icon" [label]="k.label" [value]="counts[k.key] ?? '…'" [tone]="k.tone"
                 [clickable]="true" [active]="kpiActive(k)" (click)="applyKpi(k)"></app-kpi>
      </div>

      <app-data-table [endpoint]="endpoint" [columns]="columns" [actions]="actions" exportName="bannieres"
                      [defaultSort]="{ key: 'displayOrder', dir: 'asc' }" emptyIcon="view_carousel"
                      searchPlaceholder="Titre ou lien…" (rowClick)="edit($event)"></app-data-table>
    </div>
  `,
})
export class BannersPageComponent extends ConsolePage {
  readonly endpoint = '/admin/v2/banners';

  override readonly kpis: PageKpi[] = [
    { key: 'live', label: 'En ligne', icon: 'play_circle', tone: 'success', filter: { state: 'live' } },
    { key: 'scheduled', label: 'Programmées', icon: 'schedule', tone: 'info', filter: { state: 'scheduled' } },
    { key: 'ended', label: 'Terminées', icon: 'history', tone: 'neutral', filter: { state: 'ended' } },
    { key: 'off', label: 'Désactivées', icon: 'block', tone: 'danger', filter: { state: 'off' } },
    { key: 'all', label: 'Toutes', icon: 'view_carousel', tone: 'primary', filter: {} },
  ];

  readonly columns: ColumnDef[] = [
    { key: 'imageUrl', label: 'Bannière', type: 'image', wide: true, sortKey: false },
    { key: 'title', label: 'Titre', filter: { type: 'text' } },
    { key: 'state', label: 'État', type: 'status', options: BANNER_STATE, sortKey: false, filter: { type: 'select' } },
    {
      key: 'audience', label: 'Public', type: 'chips', sortKey: false,
      // Libellé court dans le tableau : « Visiteurs » (le formulaire précise « sans compte »)
      value: r => (r.audience ?? []).map((a: string) => (labelOf(BANNER_AUDIENCE, a)?.label ?? a).replace(/ \(.*\)$/, '')),
      filter: { type: 'multiselect', options: BANNER_AUDIENCE },
    },
    {
      key: 'governorates', label: 'Gouvernorats', type: 'chips', sortKey: false,
      value: r => (r.governorates?.length ? r.governorates : [ALL_TUNISIA]),
      filter: { type: 'multiselect', param: 'governorate', options: [{ value: 'ALL', label: ALL_TUNISIA }, ...GOVERNORATE_OPTIONS] },
    },
    {
      key: 'actionType', label: 'Au toucher', subKey: 'actionTarget',
      value: r => labelOf(BANNER_ACTION, r.actionType)?.label ?? r.actionType,
      filter: { type: 'multiselect', options: BANNER_ACTION },
    },
    { key: 'displayOrder', label: 'Ordre', type: 'number', align: 'end', filter: { type: 'number' } },
    { key: 'views', label: 'Affichages', type: 'number', align: 'end', filter: { type: 'number' } },
    { key: 'clicks', label: 'Appuis', type: 'number', align: 'end', filter: { type: 'number' } },
    { key: 'ctr', label: "Taux d'appui", type: 'number', suffix: '%', align: 'end' },
    { key: 'startsAt', label: 'Début', type: 'datetime', filter: { type: 'date' } },
    { key: 'endsAt', label: 'Fin', type: 'datetime', filter: { type: 'date' } },
    { key: 'active', label: 'Active', type: 'boolean', trueLabel: 'Oui', falseLabel: 'Non', filter: { type: 'boolean' }, hidden: true },
    { key: 'createdBy', label: 'Créée par', sortKey: false, hidden: true },
    { key: 'createdAt', label: 'Créée le', type: 'datetime', filter: { type: 'date' }, hidden: true },
  ];

  readonly actions: RowAction[] = [
    { icon: 'edit', label: 'Modifier', tone: 'primary', handler: r => this.edit(r) },
    { icon: 'image', label: "Voir l'image", handler: r => this.openImage(r) },
    { icon: 'toggle_off', label: 'Désactiver', tone: 'danger', visible: r => r.active, handler: r => this.setActive(r, false) },
    { icon: 'toggle_on', label: 'Activer', tone: 'success', visible: r => !r.active, handler: r => this.setActive(r, true) },
    { icon: 'delete', label: 'Supprimer', tone: 'danger', handler: r => this.remove(r) },
  ];

  constructor(console: ConsoleService, ui: UiService, api: ApiService) {
    super(console, ui, api);
  }

  private fields(categories: Option[]): FormField[] {
    const action = (...types: string[]) => (v: Record<string, any>) => types.includes(v['actionType']);
    return [
      {
        key: 'imageUrl', label: 'Image', type: 'image', wide: true, required: true,
        hint: "Format conseillé : 1200 × 500 px. L'image est recadrée au centre si son format est différent.",
      },
      { key: 'title', label: 'Titre (facultatif)', full: true, hint: "Écrit en bas de l'image. 80 caractères au maximum." },
      { key: 'audience', label: 'Montrer à', type: 'multiselect', options: BANNER_AUDIENCE, required: true },
      {
        key: 'governorates', label: 'Gouvernorats', type: 'multiselect', options: GOVERNORATE_OPTIONS,
        hint: 'Vide = toute la Tunisie. Les visiteurs sans compte ne voient que les bannières pour toute la Tunisie.',
      },
      { key: 'actionType', label: 'Au toucher, ouvrir', type: 'select', options: BANNER_ACTION, required: true, full: true },
      { key: 'url', label: 'Lien web', required: true, full: true, placeholder: 'https://…', visibleIf: action('URL') },
      {
        key: 'whatsapp', label: 'Numéro WhatsApp', type: 'tel', required: true, placeholder: '+216 98 123 456',
        hint: "Ouvre une discussion WhatsApp avec ce numéro.", visibleIf: action('WHATSAPP'),
      },
      { key: 'category', label: 'Métier', type: 'select', options: categories, required: true, visibleIf: action('CATEGORY') },
      {
        key: 'requestProfession', label: 'Métier pré-choisi (facultatif)', type: 'select', options: categories,
        visibleIf: action('CREATE_REQUEST'),
      },
      {
        key: 'artisan', label: 'Artisan', required: true, placeholder: '+216 98 123 456',
        hint: "Numéro de téléphone de l'artisan (ou son identifiant).", visibleIf: action('ARTISAN'),
      },
      { key: 'startsAt', label: 'Début', type: 'datetime', hint: 'Vide = dès maintenant' },
      { key: 'endsAt', label: 'Fin', type: 'datetime', hint: 'Vide = sans fin' },
      { key: 'displayOrder', label: "Ordre d'affichage", type: 'number', min: 0, max: 999, hint: 'Plus petit = montrée en premier' },
      { key: 'active', label: 'Bannière active', type: 'toggle' },
    ];
  }

  /** Valeurs du formulaire → saisie attendue par l'API (une seule valeur selon l'action). */
  private payload(v: any): any {
    const values: Record<string, any> = {
      URL: v.url, WHATSAPP: v.whatsapp, CATEGORY: v.category, CREATE_REQUEST: v.requestProfession, ARTISAN: v.artisan,
    };
    return {
      imageUrl: v.imageUrl, title: v.title, actionType: v.actionType, actionValue: values[v.actionType] || null,
      audience: v.audience, governorates: v.governorates, startsAt: v.startsAt, endsAt: v.endsAt,
      displayOrder: v.displayOrder, active: v.active,
    };
  }

  create(): void {
    this.console.categoryOptions().subscribe(categories => {
      this.ui.form({
        title: 'Nouvelle bannière', icon: 'add', fields: this.fields(categories), submitLabel: 'Créer',
        value: { audience: ['CLIENTS', 'VISITORS'], actionType: 'NONE', displayOrder: 0, active: true },
        submit: v => this.api.post('/admin/v2/banners', this.payload(v)),
      }).subscribe(r => r && (this.ui.toast('Bannière créée'), this.reload()));
    });
  }

  edit(row: any): void {
    const value = row.actionValue ?? '';
    this.console.categoryOptions().subscribe(categories => {
      this.ui.form({
        title: 'Modifier la bannière', subtitle: row.title || undefined, icon: 'edit', fields: this.fields(categories),
        value: {
          ...row,
          url: row.actionType === 'URL' ? value : '',
          whatsapp: row.actionType === 'WHATSAPP' && value ? '+' + value : '',
          category: row.actionType === 'CATEGORY' ? value : '',
          requestProfession: row.actionType === 'CREATE_REQUEST' ? value : '',
          artisan: row.actionType === 'ARTISAN' ? value : '',
        },
        submit: v => this.api.put(`/admin/v2/banners/${row.id}`, this.payload(v)),
      }).subscribe(r => r && (this.ui.toast('Bannière mise à jour'), this.reload()));
    });
  }

  openImage(row: any): void {
    const url = fileUrl(row.imageUrl);
    if (url) {
      window.open(url, '_blank', 'noopener');
    }
  }

  setActive(row: any, active: boolean): void {
    const name = row.title ? `« ${row.title} »` : 'Cette bannière';
    this.confirmThen(
      active
        ? { title: 'Activer cette bannière ?', message: `${name} sera montrée dans l'app pendant ses dates de diffusion.`, tone: 'success', confirmLabel: 'Activer' }
        : { title: 'Désactiver cette bannière ?', message: `${name} disparaît de l'app. Ses statistiques sont conservées.`, tone: 'danger', confirmLabel: 'Désactiver' },
      () => this.api.patch(`/admin/v2/banners/${row.id}/active`, { active }),
      active ? 'Bannière activée' : 'Bannière désactivée',
    );
  }

  remove(row: any): void {
    const name = row.title ? `« ${row.title} »` : 'Cette bannière';
    this.confirmThen(
      { title: 'Supprimer cette bannière ?', message: `${name} et ses statistiques seront supprimées définitivement. Pour la retirer de l'app sans rien perdre, désactivez-la plutôt.`, tone: 'danger', confirmLabel: 'Supprimer' },
      () => this.api.delete(`/admin/v2/banners/${row.id}`),
      'Bannière supprimée',
    );
  }
}
