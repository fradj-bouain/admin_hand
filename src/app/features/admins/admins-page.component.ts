import { Component } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ConsolePage, ConsoleService, PageKpi } from '../../shared/console';
import { ColumnDef, FormField, Option, RowAction } from '../../shared/models';
import { ADMIN_ROLE } from '../../shared/labels';
import { UiService } from '../../shared/ui.service';
import { clean } from '../clients/clients-page.component';

/** Rôles tels que les attend /admin-auth/admins (valeurs en minuscules). */
const ROLE_INPUT: Option[] = ADMIN_ROLE.map(r => ({ value: r.value.toLowerCase(), label: r.label }));

@Component({
  selector: 'app-admins-page',
  template: `
    <div class="page">
      <app-page-header icon="admin_panel_settings" title="Administrateurs"
                       subtitle="Comptes ayant accès à cette console. Une session dure 24 heures.">
        <button mat-flat-button color="primary" (click)="create()"><mat-icon>person_add</mat-icon>Nouvel administrateur</button>
      </app-page-header>

      <div class="kpi-row">
        <app-kpi *ngFor="let k of kpis" [icon]="k.icon" [label]="k.label" [value]="counts[k.key] ?? '…'" [tone]="k.tone"
                 [clickable]="true" [active]="kpiActive(k)" (click)="applyKpi(k)"></app-kpi>
      </div>

      <app-data-table [endpoint]="endpoint" [columns]="columns" [actions]="actions" exportName="administrateurs"
                      [defaultSort]="{ key: 'createdAt', dir: 'desc' }" [clickable]="false" emptyIcon="admin_panel_settings"
                      searchPlaceholder="Nom ou email…"></app-data-table>
    </div>
  `,
})
export class AdminsPageComponent extends ConsolePage {
  readonly endpoint = '/admin/v2/admins';

  override readonly kpis: PageKpi[] = [
    { key: 'all', label: 'Administrateurs', icon: 'groups', tone: 'primary', filter: {} },
    { key: 'active', label: 'Actifs', icon: 'check_circle', tone: 'success', filter: { active: 'true' } },
    { key: 'inactive', label: 'Désactivés', icon: 'block', tone: 'neutral', filter: { active: 'false' } },
  ];

  readonly columns: ColumnDef[] = [
    { key: 'name', label: 'Nom', type: 'person', subKey: 'email', filter: { type: 'text' }, width: '220px' },
    { key: 'email', label: 'Email', filter: { type: 'text' } },
    { key: 'role', label: 'Rôle', type: 'status', options: ADMIN_ROLE, filter: { type: 'multiselect' } },
    { key: 'active', label: 'Accès', type: 'boolean', trueLabel: 'Actif', falseLabel: 'Désactivé', filter: { type: 'boolean' } },
    { key: 'lastLogin', label: 'Dernière connexion', type: 'datetime', filter: { type: 'date' } },
    { key: 'createdAt', label: 'Créé le', type: 'datetime', filter: { type: 'date' } },
  ];

  readonly actions: RowAction[] = [
    { icon: 'edit', label: 'Modifier', handler: r => this.edit(r) },
    { icon: 'block', label: "Désactiver l'accès", tone: 'danger', visible: r => r.active && !this.isMe(r), handler: r => this.setActive(r, false) },
    { icon: 'check_circle', label: "Réactiver l'accès", tone: 'success', visible: r => !r.active, handler: r => this.setActive(r, true) },
    { icon: 'delete', label: 'Supprimer', tone: 'danger', visible: r => !this.isMe(r), handler: r => this.remove(r) },
  ];

  constructor(console: ConsoleService, ui: UiService, api: ApiService, private auth: AuthService) {
    super(console, ui, api);
  }

  isMe(row: any): boolean {
    return row.id === this.auth.getCurrentUser()?.adminId;
  }

  private fields(edit: boolean): FormField[] {
    const f: FormField[] = [
      { key: 'name', label: 'Nom complet', required: true },
      { key: 'email', label: 'Email (identifiant)', type: 'email', required: true },
      { key: 'password', label: edit ? 'Nouveau mot de passe' : 'Mot de passe', type: 'password', required: !edit, hint: edit ? 'Laisser vide pour ne pas le changer' : undefined },
      { key: 'role', label: 'Rôle', type: 'select', options: ROLE_INPUT, required: true },
    ];
    if (edit) {
      f.push({ key: 'isActive', label: 'Accès autorisé', type: 'toggle' });
    }
    return f;
  }

  create(): void {
    this.ui.form({
      title: 'Nouvel administrateur', icon: 'person_add', fields: this.fields(false), value: { role: 'admin' },
      submitLabel: 'Créer', submit: v => this.api.post('/admin-auth/admins', clean(v)),
    }).subscribe(r => r && (this.ui.toast('Administrateur créé'), this.reload()));
  }

  edit(row: any): void {
    this.ui.form({
      title: "Modifier l'administrateur", subtitle: row.name, icon: 'edit', fields: this.fields(true),
      value: { ...row, role: (row.role || 'ADMIN').toLowerCase(), isActive: row.active },
      submit: v => this.api.put(`/admin-auth/admins/${row.id}`, clean(v)),
    }).subscribe(r => r && (this.ui.toast('Administrateur mis à jour'), this.reload()));
  }

  setActive(row: any, active: boolean): void {
    this.confirmThen(
      active
        ? { title: "Réactiver l'accès ?", message: `${row.name} pourra de nouveau se connecter à la console.`, tone: 'success', confirmLabel: 'Réactiver' }
        : { title: "Désactiver l'accès ?", message: `${row.name} ne pourra plus se connecter à la console.`, tone: 'danger', confirmLabel: 'Désactiver' },
      () => this.api.patch(`/admin-auth/admins/${row.id}/status`, { isActive: active }),
      active ? 'Accès réactivé' : 'Accès désactivé',
    );
  }

  remove(row: any): void {
    this.confirmThen(
      { title: 'Supprimer cet administrateur ?', message: `Le compte de ${row.name} sera supprimé définitivement.`, tone: 'danger', icon: 'delete', confirmLabel: 'Supprimer' },
      () => this.api.delete(`/admin-auth/admins/${row.id}`),
      'Administrateur supprimé',
    );
  }
}
