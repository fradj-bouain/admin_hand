import { Component } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { ConsolePage, ConsoleService, PageKpi } from '../../shared/console';
import { ChatService } from '../messages/chat.service';
import { ColumnDef, DetailData, FormField, Option, RowAction } from '../../shared/models';
import { APPLICANT_STATUS, BADGE_STATUS, BOOST_STATUS, BOOST_TYPE, EMPLOYEE_STATUS, GOVERNORATE_OPTIONS, REQUEST_STATUS, RESERVATION_STATUS, STORY_STATE, VERIFICATION_STATUS, labelOf } from '../../shared/labels';
import { UiService } from '../../shared/ui.service';
import { formatDate } from '../../shared/format';
import { clean } from '../clients/clients-page.component';

@Component({
  selector: 'app-artisans-page',
  template: `
    <div class="page">
      <app-page-header icon="engineering" title="Artisans"
                       subtitle="Profils, modération, réputation (note affichée = avis des clients + bonus d'appel + bonus SNAY3I), Boosts et vérifications.">
        <button mat-flat-button color="primary" (click)="create()"><mat-icon>person_add</mat-icon>Nouvel artisan</button>
      </app-page-header>

      <div class="kpi-row">
        <app-kpi *ngFor="let k of kpis" [icon]="k.icon" [label]="k.label" [value]="counts[k.key] ?? '…'" [tone]="k.tone"
                 [clickable]="true" [active]="kpiActive(k)" (click)="applyKpi(k)"></app-kpi>
      </div>

      <app-data-table [endpoint]="endpoint" [columns]="columns" [actions]="actions" [selectable]="true" exportName="artisans"
                      [defaultSort]="{ key: 'createdAt', dir: 'desc' }" emptyIcon="engineering"
                      searchPlaceholder="Nom, téléphone, métier, ville…" (rowClick)="open($event)"
                      (selectionChange)="selection = $event">
        <button dtActions mat-stroked-button *ngIf="selection.length" (click)="setSnay3iBonus(selection)">
          <mat-icon>workspace_premium</mat-icon>Bonus SNAY3I ({{ selection.length }})
        </button>
        <button dtActions mat-stroked-button *ngIf="selection.length" (click)="recalculate(selection)">
          <mat-icon>calculate</mat-icon>Recalculer la note ({{ selection.length }})
        </button>
        <button dtActions mat-stroked-button *ngIf="selection.length" (click)="resetBonus(selection)">
          <mat-icon>restart_alt</mat-icon>Remettre le bonus d'appel à 0 ({{ selection.length }})
        </button>
      </app-data-table>
    </div>
  `,
})
export class ArtisansPageComponent extends ConsolePage {
  readonly endpoint = '/admin/v2/employees';
  selection: any[] = [];
  private professions: Option[] = [];

  override readonly kpis: PageKpi[] = [
    { key: 'all', label: 'Artisans', icon: 'engineering', tone: 'primary', filter: {} },
    { key: 'active', label: 'Actifs', icon: 'check_circle', tone: 'success', filter: { status: 'ACTIVE' } },
    { key: 'moderation', label: 'En modération', icon: 'hourglass_top', tone: 'warning', filter: { status: 'PENDING_MODERATION' } },
    { key: 'suspended', label: 'Suspendus', icon: 'block', tone: 'danger', filter: { status: 'SUSPENDED' } },
    { key: 'verified', label: 'Vérifiés', icon: 'verified', tone: 'info', filter: { verified: 'true' } },
    { key: 'boosted', label: 'Boost en cours', icon: 'bolt', tone: 'violet', filter: { boost: 'active' } },
  ];

  readonly columns: ColumnDef[] = [
    { key: 'name', label: 'Artisan', type: 'person', subKey: 'email', filter: { type: 'text' }, width: '220px' },
    { key: 'phone', label: 'Téléphone', type: 'phone', filter: { type: 'text' }, width: '160px' },
    { key: 'professions', label: 'Métiers', type: 'chips', sortKey: 'profession', filter: { type: 'text', param: 'profession' } },
    { key: 'governorate', label: 'Gouvernorat', filter: { type: 'select', options: GOVERNORATE_OPTIONS } },
    { key: 'city', label: 'Ville', filter: { type: 'text' }, hidden: true },
    { key: 'status', label: 'Statut', type: 'status', options: EMPLOYEE_STATUS, filter: { type: 'multiselect' } },
    { key: 'verified', label: 'Vérifié', type: 'boolean', trueLabel: 'Vérifié', falseLabel: 'Non vérifié', filter: { type: 'boolean' } },
    { key: 'rating', label: 'Note affichée', type: 'rating', align: 'end', filter: { type: 'number' } },
    { key: 'realRating', label: 'Note réelle', type: 'rating', align: 'end', filter: { type: 'number' }, hidden: true },
    { key: 'reviewCount', label: 'Avis', type: 'number', align: 'end', filter: { type: 'number' } },
    { key: 'callBonus', label: "Bonus d'appel", type: 'number', align: 'end', filter: { type: 'number' } },
    { key: 'adminBonus', label: 'Bonus SNAY3I', type: 'number', align: 'end', filter: { type: 'number' } },
    {
      key: 'boostActive', label: 'Boost', type: 'boolean', trueLabel: 'En cours', falseLabel: 'Aucun', sortKey: 'boostEndsAt',
      filter: { type: 'select', param: 'boost', options: [{ value: 'active', label: 'En cours' }, { value: 'none', label: 'Aucun' }] },
    },
    { key: 'boostEndsAt', label: 'Fin du Boost', type: 'datetime', filter: { type: 'date' }, hidden: true },
    { key: 'experienceYears', label: 'Expérience', type: 'number', suffix: 'ans', align: 'end', filter: { type: 'number' }, hidden: true },
    { key: 'requests', label: 'Demandes', type: 'number', align: 'end', filter: { type: 'number' } },
    { key: 'applications', label: 'Candidatures', type: 'number', align: 'end', filter: { type: 'number' }, hidden: true },
    { key: 'active', label: 'Compte', type: 'boolean', trueLabel: 'Actif', falseLabel: 'Désactivé', filter: { type: 'boolean' }, hidden: true },
    { key: 'createdAt', label: 'Inscription', type: 'datetime', filter: { type: 'date' } },
    { key: 'lastSeen', label: 'Dernière visite', type: 'datetime', filter: { type: 'date' }, hidden: true },
  ];

  readonly actions: RowAction[] = [
    { icon: 'visibility', label: 'Voir la fiche', tone: 'primary', handler: r => this.open(r) },
    { icon: 'chat', label: 'Écrire', tone: 'info', visible: r => !!r.userId, handler: r => this.chats.writeTo(r.userId) },
    { icon: 'task_alt', label: 'Approuver le profil', tone: 'success', visible: r => r.status === 'PENDING_MODERATION', handler: r => this.setStatus(r, 'ACTIVE') },
    { icon: 'edit', label: 'Modifier', handler: r => this.edit(r) },
    { icon: 'verified', label: 'Marquer vérifié', tone: 'info', visible: r => !r.verified, handler: r => this.verify(r) },
    { icon: 'pause_circle', label: 'Suspendre', tone: 'danger', visible: r => r.status === 'ACTIVE' || r.status === 'PENDING_MODERATION', handler: r => this.setStatus(r, 'SUSPENDED') },
    { icon: 'play_circle', label: 'Réactiver', tone: 'success', visible: r => r.status === 'SUSPENDED' || r.status === 'INACTIVE', handler: r => this.setStatus(r, 'ACTIVE') },
    { icon: 'workspace_premium', label: 'Bonus SNAY3I', handler: r => this.setSnay3iBonus([r]) },
    { icon: 'calculate', label: 'Recalculer la note', handler: r => this.recalculate([r]) },
    { icon: 'restart_alt', label: "Bonus d'appel à 0", visible: r => Number(r.callBonus) > 0, handler: r => this.resetBonus([r]) },
    { icon: 'key', label: 'Nouveau mot de passe', handler: r => this.resetPassword(r) },
  ];

  constructor(console: ConsoleService, ui: UiService, api: ApiService, private chats: ChatService) {
    super(console, ui, api);
    console.categoryOptions().subscribe(o => (this.professions = o));
  }

  private fields(edit: boolean): FormField[] {
    const f: FormField[] = [
      { key: 'name', label: 'Nom complet', required: true },
      { key: 'phone', label: 'Téléphone', type: 'tel', placeholder: '+216 XX XXX XXX', hint: 'Identifiant de connexion' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'password', label: edit ? 'Nouveau mot de passe' : 'Mot de passe', type: 'password', hint: edit ? 'Laisser vide pour ne pas le changer' : undefined },
      { key: 'professions', label: 'Métiers (4 au maximum, le premier = principal)', type: 'multiselect', options: this.professions, required: true, maxItems: 4, full: true },
      { key: 'governorate', label: 'Gouvernorat', type: 'select', options: GOVERNORATE_OPTIONS, required: !edit },
      { key: 'city', label: 'Ville', required: !edit },
      { key: 'address', label: 'Adresse', full: true },
      { key: 'experienceYears', label: "Années d'expérience", type: 'number', min: 0, max: 60 },
      { key: 'minPrice', label: 'Prix minimum (DT)', type: 'number', min: 0 },
      { key: 'maxPrice', label: 'Prix maximum (DT)', type: 'number', min: 0 },
      { key: 'description', label: 'Présentation', type: 'textarea' },
    ];
    if (edit) {
      f.push(
        { key: 'status', label: 'Statut', type: 'select', options: EMPLOYEE_STATUS, required: true },
        { key: 'isVerified', label: 'Profil vérifié', type: 'toggle' },
        { key: 'isActive', label: 'Compte actif (connexion autorisée)', type: 'toggle' },
      );
    }
    return f;
  }

  private payload(v: any): any {
    const out = clean(v);
    if (Array.isArray(v.professions) && v.professions.length) {
      out['profession'] = v.professions[0];
    }
    for (const k of ['minPrice', 'maxPrice']) {
      if (out[k] !== undefined) {
        out[k] = String(out[k]);
      }
    }
    return out;
  }

  create(): void {
    this.ui.form({
      title: 'Nouvel artisan', subtitle: 'Créé par un admin : profil directement actif et vérifié.', icon: 'person_add',
      fields: this.fields(false), submitLabel: "Créer l'artisan",
      submit: v => this.api.post('/admin/employees', this.payload(v)),
    }).subscribe(r => r && (this.ui.toast('Artisan créé'), this.reload()));
  }

  edit(row: any): void {
    this.api.get<any>(`/admin/v2/employees/${row.id}`).subscribe({
      next: r => {
        const e = r.data;
        this.ui.form({
          title: "Modifier l'artisan", subtitle: e.name, icon: 'edit', fields: this.fields(true),
          value: { ...e, isVerified: e.verified, isActive: e.active },
          submit: v => this.api.put(`/admin/employees/${row.id}`, this.payload(v)),
        }).subscribe(res => res && (this.ui.toast('Artisan mis à jour'), this.reload()));
      },
      error: e => this.ui.error(e),
    });
  }

  setStatus(row: any, status: string): void {
    const label = labelOf(EMPLOYEE_STATUS, status)?.label ?? status;
    const texts: Record<string, any> = {
      ACTIVE: { title: row.status === 'PENDING_MODERATION' ? 'Approuver ce profil ?' : 'Réactiver cet artisan ?', message: `${row.name} sera visible des clients dans la recherche.`, tone: 'success', icon: 'task_alt', confirmLabel: row.status === 'PENDING_MODERATION' ? 'Approuver' : 'Réactiver' },
      SUSPENDED: { title: 'Suspendre cet artisan ?', message: `${row.name} n'apparaîtra plus dans la recherche ni dans l'accueil.`, tone: 'danger', icon: 'pause_circle', confirmLabel: 'Suspendre' },
    };
    this.confirmThen(
      texts[status] ?? { title: `Passer en « ${label} » ?`, confirmLabel: 'Confirmer' },
      () => this.api.patch(`/admin/employees/${row.id}/status`, { status }),
      `Statut : ${label}`,
    );
  }

  verify(row: any): void {
    this.confirmThen(
      { title: 'Marquer comme vérifié ?', message: `${row.name} recevra le badge « vérifié » et son profil sera actif.`, tone: 'info', icon: 'verified', confirmLabel: 'Vérifier' },
      () => this.api.post(`/admin/employees/${row.id}/verify`, {}),
      'Artisan vérifié',
    );
  }

  resetBonus(rows: any[]): void {
    this.ui.confirm({
      title: "Remettre le bonus d'appel à 0 ?", icon: 'restart_alt', tone: 'warning', confirmLabel: 'Remettre à 0',
      message: rows.length === 1
        ? `Le bonus de ${rows[0].name} repasse à 0 : sa note calculée redevient sa note réelle.`
        : `${rows.length} artisans sélectionnés : leur note calculée redevient leur note réelle.`,
    }).subscribe(ok => {
      if (ok) {
        this.act(this.api.post('/admin/employees/call-bonus/reset', { employeeIds: rows.map(r => r.id) }),
          "Bonus d'appel remis à 0", () => this.table?.clearSelection());
      }
    });
  }

  /** Bonus SNAY3I (0 à 3 étoiles) : ajouté aux étoiles affichées, expliqué sur le profil ; le nombre d'avis ne change pas. */
  setSnay3iBonus(rows: any[]): void {
    const one = rows.length === 1;
    this.ui.form({
      title: one ? `Bonus SNAY3I — ${rows[0].name}` : `Bonus SNAY3I pour ${rows.length} artisans`,
      subtitle: "Ajouté aux étoiles (5 au maximum) et expliqué sur le profil : « Profil et portfolio de qualité ». Le nombre d'avis ne change pas.",
      icon: 'workspace_premium',
      fields: [{ key: 'bonus', label: 'Bonus (0 à 3 étoiles)', type: 'number', min: 0, max: 3, required: true, hint: '0 = retirer le bonus. Exemple : 0,5 ou 1,5' }],
      value: { bonus: one ? Number(rows[0].adminBonus ?? 0) : 1 },
      submitLabel: 'Enregistrer',
      submit: v => this.api.post('/admin/v2/employees/snay3i-bonus', { employeeIds: rows.map(r => r.id), bonus: v.bonus }),
    }).subscribe(r => {
      if (r) {
        this.ui.toast(one ? 'Bonus SNAY3I enregistré' : `Bonus SNAY3I enregistré pour ${rows.length} artisans`);
        this.table?.clearSelection();
        this.reload();
      }
    });
  }

  /** Note réelle et nombre d'avis repris depuis les notes visibles des clients (ce que l'app montre). */
  recalculate(rows: any[]): void {
    this.ui.confirm({
      title: 'Recalculer la note ?', icon: 'calculate', tone: 'info', confirmLabel: 'Recalculer',
      message: rows.length === 1
        ? `La note et le nombre d'avis de ${rows[0].name} sont recalculés depuis les notes visibles de ses clients.`
        : `${rows.length} artisans : note et nombre d'avis recalculés depuis les notes visibles de leurs clients.`,
    }).subscribe(ok => {
      if (ok) {
        this.act(this.api.post('/admin/v2/employees/ratings/recalculate', { employeeIds: rows.map(r => r.id) }),
          'Notes recalculées', () => this.table?.clearSelection());
      }
    });
  }

  resetPassword(row: any): void {
    if (!row.userId) {
      return;
    }
    this.confirmThen(
      {
        title: 'Nouveau mot de passe', icon: 'key', tone: 'primary', confirmLabel: 'Enregistrer',
        message: `Vérifiez l'identité de ${row.name} (rappel au ${row.phone || 'numéro du compte'}) avant de lui communiquer le nouveau mot de passe.`,
        input: { label: 'Nouveau mot de passe', type: 'password', required: true, minLength: 4 },
      },
      v => this.api.post(`/admin/users/${row.userId}/reset-password`, { newPassword: v }),
      'Mot de passe modifié',
    );
  }

  open(row: any): void {
    this.api.get<any>(`/admin/v2/employees/${row.id}`).subscribe({
      next: r => this.ui.detail(this.detail(r.data)),
      error: e => this.ui.error(e),
    });
  }

  private detail(e: any): DetailData {
    const status = labelOf(EMPLOYEE_STATUS, e.status);
    const actions: DetailData['actions'] = [{ label: 'Modifier', icon: 'edit', handler: () => this.edit(e) }];
    if (e.userId) {
      actions.unshift({ label: 'Écrire', icon: 'chat', tone: 'primary', handler: () => this.chats.writeTo(e.userId) });
    }
    if (e.status === 'PENDING_MODERATION') {
      actions.unshift({ label: 'Approuver', icon: 'task_alt', tone: 'success', handler: () => this.setStatus(e, 'ACTIVE') });
    }
    if (!e.verified) {
      actions.push({ label: 'Vérifier', icon: 'verified', tone: 'primary', handler: () => this.verify(e) });
    }
    if (e.status === 'ACTIVE' || e.status === 'PENDING_MODERATION') {
      actions.push({ label: 'Suspendre', icon: 'pause_circle', tone: 'danger', handler: () => this.setStatus(e, 'SUSPENDED') });
    } else {
      actions.push({ label: 'Réactiver', icon: 'play_circle', tone: 'success', handler: () => this.setStatus(e, 'ACTIVE') });
    }
    return {
      title: e.name,
      subtitle: [(e.professions ?? []).join(' · '), [e.city, e.governorate].filter(Boolean).join(', ')].filter(Boolean).join(' — '),
      avatar: e.photoUrl,
      badges: [
        ...(status ? [{ label: status.label, tone: status.tone! }] : []),
        ...(e.verified ? [{ label: 'Vérifié', tone: 'info' as const }] : []),
        ...(e.boostActive ? [{ label: 'Boost en cours', tone: 'violet' as const }] : []),
      ],
      sections: [
        {
          title: 'Réputation',
          items: [
            { label: 'Note affichée aux clients', value: e.rating, type: 'rating' },
            { label: 'Note des clients (avis)', value: e.realRating, type: 'rating' },
            { label: "Bonus d'appel", value: e.callBonus, type: 'number' },
            { label: 'Bonus SNAY3I (profil et portfolio de qualité)', value: e.adminBonus, type: 'number' },
            { label: "Nombre d'avis", value: e.reviewCount, type: 'number' },
          ],
        },
        {
          title: 'Profil',
          items: [
            { label: 'Métiers', value: e.professions, type: 'chips', full: true },
            { label: 'Gouvernorat', value: e.governorate },
            { label: 'Ville', value: e.city },
            { label: 'Adresse', value: e.address, full: true },
            { label: 'Expérience', value: e.experienceYears != null ? `${e.experienceYears} ans` : null },
            { label: 'Prix', value: e.minPrice || e.maxPrice ? `${e.minPrice ?? '?'} – ${e.maxPrice ?? '?'} DT` : null },
            { label: 'Présentation', value: e.description, type: 'longtext', full: true },
          ],
        },
        {
          title: 'Compte et visibilité',
          items: [
            { label: 'Téléphone', value: e.phone, type: 'phone', href: e.phone ? `tel:${e.phone}` : undefined },
            { label: 'Email', value: e.email, href: e.email ? `mailto:${e.email}` : undefined },
            { label: 'Statut', value: e.status, type: 'status', options: EMPLOYEE_STATUS },
            { label: 'Connexion', value: e.active, type: 'boolean' },
            { label: 'Badge « vérifié »', value: e.verificationStatus, type: 'status', options: BADGE_STATUS },
            { label: 'Vérification valable jusqu’au', value: e.verificationExpiresAt, type: 'date' },
            { label: 'Boost en cours jusqu’au', value: e.boostEndsAt, type: 'datetime' },
            { label: 'Inscription', value: e.createdAt, type: 'datetime' },
            { label: 'Dernière visite', value: e.lastSeen, type: 'datetime' },
          ],
        },
      ],
      galleries: [
        {
          title: 'Portfolio',
          empty: "Aucun projet dans le portfolio",
          groups: (e.portfolio ?? []).map((p: any) => ({
            title: p.title ?? (p.id == null ? 'Photos sans projet' : null),
            subtitle: p.createdAt ? formatDate(p.createdAt) : null,
            text: p.description,
            photos: p.photos ?? [],
          })),
        },
      ],
      lists: [
        {
          title: 'Demandes attribuées', rows: e.assignedRequests ?? [],
          columns: [
            { key: 'createdAt', label: 'Date', type: 'datetime' },
            { key: 'profession', label: 'Métier' },
            { key: 'clientName', label: 'Client' },
            { key: 'status', label: 'Statut', type: 'status', options: REQUEST_STATUS },
            { key: 'finalPrice', label: 'Prix', type: 'money' },
          ],
        },
        {
          title: 'Candidatures', rows: e.applicationsList ?? [],
          columns: [
            { key: 'appliedAt', label: 'Date', type: 'datetime' },
            { key: 'requestProfession', label: 'Demande' },
            { key: 'proposedPrice', label: 'Prix proposé', type: 'money' },
            { key: 'status', label: 'Statut', type: 'status', options: APPLICANT_STATUS },
          ],
        },
        {
          title: 'Réservations', rows: e.reservationsList ?? [],
          columns: [
            { key: 'reservationDate', label: 'Rendez-vous', type: 'datetime' },
            { key: 'service', label: 'Service' },
            { key: 'clientName', label: 'Client' },
            { key: 'status', label: 'Statut', type: 'status', options: RESERVATION_STATUS },
          ],
        },
        {
          title: 'Avis reçus', rows: e.reviewsList ?? [],
          columns: [
            { key: 'createdAt', label: 'Date', type: 'date' },
            { key: 'clientName', label: 'Client' },
            { key: 'rating', label: 'Note', type: 'stars' },
            { key: 'comment', label: 'Commentaire', type: 'longtext' },
            { key: 'visible', label: 'Visible', type: 'boolean' },
          ],
        },
        {
          title: 'Boosts', rows: e.boostsList ?? [],
          columns: [
            { key: 'requestedAt', label: 'Demandé', type: 'datetime' },
            { key: 'type', label: 'Offre', type: 'status', options: BOOST_TYPE },
            { key: 'amount', label: 'Montant', type: 'money' },
            { key: 'status', label: 'Statut', type: 'status', options: BOOST_STATUS },
            { key: 'endsAt', label: 'Fin', type: 'datetime' },
          ],
        },
        {
          title: 'Vérifications', rows: e.verificationsList ?? [],
          columns: [
            { key: 'requestedAt', label: 'Demandée', type: 'datetime' },
            { key: 'amount', label: 'Montant', type: 'money' },
            { key: 'status', label: 'Statut', type: 'status', options: VERIFICATION_STATUS },
            { key: 'expiresAt', label: 'Expire', type: 'date' },
          ],
        },
        {
          title: 'Stories', rows: e.storiesList ?? [],
          columns: [
            { key: 'createdAt', label: 'Publiée', type: 'datetime' },
            { key: 'title', label: 'Titre' },
            { key: 'views', label: 'Vues', type: 'number' },
            { key: 'state', label: 'État', type: 'status', options: STORY_STATE },
          ],
        },
      ],
      actions,
    };
  }
}
