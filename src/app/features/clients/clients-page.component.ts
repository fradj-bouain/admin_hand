import { Component } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { ConsolePage, ConsoleService, PageKpi } from '../../shared/console';
import { ChatService } from '../messages/chat.service';
import { ColumnDef, DetailData, FormField, RowAction } from '../../shared/models';
import { GOVERNORATE_OPTIONS, RESERVATION_STATUS, REQUEST_STATUS } from '../../shared/labels';
import { UiService } from '../../shared/ui.service';

@Component({
  selector: 'app-clients-page',
  template: `
    <div class="page">
      <app-page-header icon="person" title="Clients"
                       subtitle="Comptes clients de l'application : activité, coordonnées, accès.">
        <button mat-flat-button color="primary" (click)="create()"><mat-icon>person_add</mat-icon>Nouveau client</button>
      </app-page-header>

      <div class="kpi-row">
        <app-kpi *ngFor="let k of kpis" [icon]="k.icon" [label]="k.label" [value]="counts[k.key] ?? '…'" [tone]="k.tone"
                 [clickable]="true" [active]="kpiActive(k)" (click)="applyKpi(k)"></app-kpi>
      </div>

      <app-data-table [endpoint]="endpoint" [columns]="columns" [actions]="actions" exportName="clients"
                      [defaultSort]="{ key: 'createdAt', dir: 'desc' }" emptyIcon="person_off"
                      searchPlaceholder="Nom, téléphone, email, ville…" (rowClick)="open($event)"></app-data-table>
    </div>
  `,
})
export class ClientsPageComponent extends ConsolePage {
  readonly endpoint = '/admin/v2/clients';

  override readonly kpis: PageKpi[] = [
    { key: 'all', label: 'Clients', icon: 'groups', tone: 'primary', filter: {} },
    { key: 'active', label: 'Comptes actifs', icon: 'how_to_reg', tone: 'success', filter: { active: 'true' } },
    { key: 'inactive', label: 'Comptes désactivés', icon: 'person_off', tone: 'neutral', filter: { active: 'false' } },
    { key: 'withRequests', label: 'Ont publié une demande', icon: 'assignment_ind', tone: 'info', filter: { requestsMin: '1' } },
  ];

  readonly columns: ColumnDef[] = [
    { key: 'name', label: 'Client', type: 'person', subKey: 'email', filter: { type: 'text' }, width: '220px' },
    { key: 'phone', label: 'Téléphone', type: 'phone', filter: { type: 'text' }, width: '160px' },
    { key: 'email', label: 'Email', filter: { type: 'text' }, hidden: true },
    { key: 'governorate', label: 'Gouvernorat', filter: { type: 'select', options: GOVERNORATE_OPTIONS } },
    { key: 'city', label: 'Ville', filter: { type: 'text' } },
    { key: 'requests', label: 'Demandes', type: 'number', align: 'end', filter: { type: 'number' } },
    { key: 'reservations', label: 'Réservations', type: 'number', align: 'end', filter: { type: 'number' } },
    { key: 'reviews', label: 'Avis donnés', type: 'number', align: 'end', filter: { type: 'number' }, hidden: true },
    { key: 'active', label: 'Compte', type: 'boolean', trueLabel: 'Actif', falseLabel: 'Désactivé', filter: { type: 'boolean' } },
    { key: 'createdAt', label: 'Inscription', type: 'datetime', filter: { type: 'date' } },
    { key: 'lastSeen', label: 'Dernière visite', type: 'datetime', filter: { type: 'date' } },
  ];

  readonly actions: RowAction[] = [
    { icon: 'visibility', label: 'Voir la fiche', tone: 'primary', handler: r => this.open(r) },
    { icon: 'chat', label: 'Écrire', tone: 'info', handler: r => this.chats.writeTo(r.id) },
    { icon: 'edit', label: 'Modifier', handler: r => this.edit(r) },
    { icon: 'block', label: 'Désactiver le compte', tone: 'danger', visible: r => r.active, handler: r => this.setActive(r, false) },
    { icon: 'check_circle', label: 'Réactiver le compte', tone: 'success', visible: r => !r.active, handler: r => this.setActive(r, true) },
    { icon: 'key', label: 'Nouveau mot de passe', handler: r => this.resetPassword(r) },
  ];

  constructor(console: ConsoleService, ui: UiService, api: ApiService, private chats: ChatService) {
    super(console, ui, api);
  }

  private fields(edit: boolean): FormField[] {
    const f: FormField[] = [
      { key: 'name', label: 'Nom complet', required: true },
      { key: 'phone', label: 'Téléphone', type: 'tel', placeholder: '+216 XX XXX XXX', hint: 'Identifiant de connexion' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'password', label: edit ? 'Nouveau mot de passe' : 'Mot de passe', type: 'password', hint: edit ? 'Laisser vide pour ne pas le changer' : 'À communiquer au client' },
      { key: 'governorate', label: 'Gouvernorat', type: 'select', options: GOVERNORATE_OPTIONS },
      { key: 'city', label: 'Ville' },
      { key: 'address', label: 'Adresse', full: true },
    ];
    if (edit) {
      f.push({ key: 'isActive', label: 'Compte actif', type: 'toggle' });
    }
    return f;
  }

  create(): void {
    this.ui.form({
      title: 'Nouveau client', icon: 'person_add', fields: this.fields(false), submitLabel: 'Créer le client',
      submit: v => this.api.post('/admin/clients', clean(v)),
    }).subscribe(r => r && (this.ui.toast('Client créé'), this.reload()));
  }

  edit(row: any): void {
    this.ui.form({
      title: 'Modifier le client', subtitle: row.name, icon: 'edit', fields: this.fields(true),
      value: { ...row, isActive: row.active },
      submit: v => this.api.put(`/admin/clients/${row.id}`, clean(v)),
    }).subscribe(r => r && (this.ui.toast('Client mis à jour'), this.reload()));
  }

  setActive(row: any, active: boolean): void {
    this.confirmThen(
      active
        ? { title: 'Réactiver ce compte ?', message: `${row.name} pourra de nouveau se connecter.`, confirmLabel: 'Réactiver', tone: 'success', icon: 'check_circle' }
        : { title: 'Désactiver ce compte ?', message: `${row.name} ne pourra plus se connecter. Ses données sont conservées.`, confirmLabel: 'Désactiver', tone: 'danger', icon: 'block' },
      () => this.api.patch(`/admin/users/${row.id}/status`, { isActive: active }),
      active ? 'Compte réactivé' : 'Compte désactivé',
    );
  }

  resetPassword(row: any): void {
    this.confirmThen(
      {
        title: 'Nouveau mot de passe', icon: 'key', tone: 'primary', confirmLabel: 'Enregistrer',
        message: `Vérifiez l'identité de ${row.name} (rappel au ${row.phone || 'numéro du compte'}) avant de lui communiquer le nouveau mot de passe.`,
        input: { label: 'Nouveau mot de passe', type: 'password', required: true, minLength: 4 },
      },
      v => this.api.post(`/admin/users/${row.id}/reset-password`, { newPassword: v }),
      'Mot de passe modifié',
    );
  }

  open(row: any): void {
    this.api.get<any>(`/admin/v2/clients/${row.id}`).subscribe({
      next: r => this.ui.detail(this.detail(r.data)),
      error: e => this.ui.error(e),
    });
  }

  private detail(c: any): DetailData {
    return {
      title: c.name, subtitle: [c.phone, c.email].filter(Boolean).join(' · '), avatar: c.photoUrl,
      badges: [c.active ? { label: 'Compte actif', tone: 'success' } : { label: 'Compte désactivé', tone: 'neutral' }],
      sections: [
        {
          title: 'Coordonnées',
          items: [
            { label: 'Téléphone', value: c.phone, type: 'phone', href: c.phone ? `tel:${c.phone}` : undefined },
            { label: 'Email', value: c.email, href: c.email ? `mailto:${c.email}` : undefined },
            { label: 'Gouvernorat', value: c.governorate },
            { label: 'Ville', value: c.city },
            { label: 'Adresse', value: c.address, full: true },
          ],
        },
        {
          title: 'Activité',
          items: [
            { label: 'Demandes publiées', value: c.requests, type: 'number' },
            { label: 'Réservations', value: c.reservations, type: 'number' },
            { label: 'Avis donnés', value: c.reviews, type: 'number' },
            { label: 'Score de confiance', value: c.trustScore, type: 'rating' },
            { label: 'Inscription', value: c.createdAt, type: 'datetime' },
            { label: 'Dernière visite', value: c.lastSeen, type: 'datetime' },
          ],
        },
      ],
      lists: [
        {
          title: 'Demandes', rows: c.requestsList ?? [], empty: 'Aucune demande',
          columns: [
            { key: 'createdAt', label: 'Date', type: 'datetime' },
            { key: 'profession', label: 'Métier' },
            { key: 'status', label: 'Statut', type: 'status', options: REQUEST_STATUS },
            { key: 'artisanName', label: 'Artisan' },
            { key: 'finalPrice', label: 'Prix', type: 'money' },
          ],
        },
        {
          title: 'Réservations', rows: c.reservationsList ?? [], empty: 'Aucune réservation',
          columns: [
            { key: 'reservationDate', label: 'Rendez-vous', type: 'datetime' },
            { key: 'service', label: 'Service' },
            { key: 'artisanName', label: 'Artisan' },
            { key: 'status', label: 'Statut', type: 'status', options: RESERVATION_STATUS },
          ],
        },
        {
          title: 'Avis donnés', rows: c.reviewsList ?? [], empty: 'Aucun avis',
          columns: [
            { key: 'createdAt', label: 'Date', type: 'date' },
            { key: 'artisanName', label: 'Artisan' },
            { key: 'rating', label: 'Note', type: 'stars' },
            { key: 'comment', label: 'Commentaire', type: 'longtext' },
          ],
        },
      ],
      actions: [
        { label: 'Écrire', icon: 'chat', tone: 'primary', handler: () => this.chats.writeTo(c.id) },
        { label: 'Modifier', icon: 'edit', handler: () => this.edit(c) },
        c.active
          ? { label: 'Désactiver', icon: 'block', tone: 'danger', handler: () => this.setActive(c, false) }
          : { label: 'Réactiver', icon: 'check_circle', tone: 'success', handler: () => this.setActive(c, true) },
        { label: 'Mot de passe', icon: 'key', handler: () => this.resetPassword(c) },
      ],
    };
  }
}

/** Retire les champs vides (le serveur ne modifie que ce qui est envoyé). */
export function clean(v: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, val] of Object.entries(v)) {
    if (val !== '' && val !== null && val !== undefined) {
      out[k] = val;
    }
  }
  return out;
}
