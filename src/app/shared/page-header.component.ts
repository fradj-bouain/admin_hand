import { Component, Input } from '@angular/core';

/** En-tête de page : icône, titre, sous-titre et boutons d'action (contenu projeté). */
@Component({
  selector: 'app-page-header',
  template: `
    <header class="page-head">
      <div class="page-head-icon" *ngIf="icon"><mat-icon>{{ icon }}</mat-icon></div>
      <div class="page-head-text">
        <h1>{{ title }}</h1>
        <p *ngIf="subtitle">{{ subtitle }}</p>
      </div>
      <div class="page-head-actions"><ng-content></ng-content></div>
    </header>
  `,
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() icon = '';
}

/** Carte d'indicateur cliquable. */
@Component({
  selector: 'app-kpi',
  template: `
    <div class="kpi tone-{{ tone }}" [class.clickable]="clickable" [class.active]="active">
      <div class="kpi-icon"><mat-icon>{{ icon }}</mat-icon></div>
      <div class="kpi-text">
        <span class="kpi-value">{{ value }}</span>
        <span class="kpi-label">{{ label }}</span>
        <span class="kpi-hint" *ngIf="hint">{{ hint }}</span>
      </div>
    </div>
  `,
})
export class KpiComponent {
  @Input() icon = 'insights';
  @Input() label = '';
  @Input() value: string | number | null = '';
  @Input() hint = '';
  @Input() tone: 'primary' | 'info' | 'success' | 'warning' | 'danger' | 'violet' | 'neutral' = 'primary';
  @Input() clickable = false;
  @Input() active = false;
}
