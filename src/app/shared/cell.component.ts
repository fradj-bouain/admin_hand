import { Component, Input, OnChanges } from '@angular/core';
import { ColumnDef, Option } from './models';
import { labelOf } from './labels';
import { cellText, fileUrl, formatDate, formatDateTime, formatMoney, formatNumber, initials, rawValue, relative } from './format';

/** Une cellule de tableau, rendue selon le type de sa colonne. */
@Component({
  selector: 'app-cell',
  template: `
    <ng-container [ngSwitch]="column.type">
      <span *ngSwitchCase="'person'" class="cell-person">
        <span class="avatar" [class.has-photo]="photo">
          <img *ngIf="photo" [src]="photo" alt="" loading="lazy" (error)="photo = null" />
          <ng-container *ngIf="!photo">{{ initialsOf(value) }}</ng-container>
        </span>
        <span class="person-text">
          <span class="primary">{{ value || '—' }}</span>
          <span class="secondary" *ngIf="sub">{{ sub }}</span>
        </span>
      </span>
      <span *ngSwitchCase="'status'">
        <app-chip *ngIf="option as opt; else raw" [label]="opt.label" [tone]="opt.tone"></app-chip>
        <ng-template #raw><span class="muted">{{ value || '—' }}</span></ng-template>
      </span>
      <span *ngSwitchCase="'boolean'">
        <app-chip *ngIf="value !== null && value !== undefined; else dash"
                  [label]="value ? (column.trueLabel || 'Oui') : (column.falseLabel || 'Non')"
                  [tone]="value ? 'success' : 'neutral'"></app-chip>
      </span>
      <span *ngSwitchCase="'datetime'" [matTooltip]="ago" (mouseenter)="ago = relativeOf(value)" class="nowrap">
        <ng-container *ngIf="value; else dash">{{ dateTime(value) }}</ng-container>
      </span>
      <span *ngSwitchCase="'date'" class="nowrap"><ng-container *ngIf="value; else dash">{{ date(value) }}</ng-container></span>
      <span *ngSwitchCase="'money'" class="nowrap num"><ng-container *ngIf="value !== null && value !== undefined; else dash">{{ money(value) }}</ng-container></span>
      <span *ngSwitchCase="'rating'" class="cell-rating">
        <ng-container *ngIf="value !== null && value !== undefined; else dash">
          <mat-icon>star</mat-icon>{{ number(value, 1) }}
        </ng-container>
      </span>
      <span *ngSwitchCase="'stars'" class="cell-stars">
        <ng-container *ngIf="value; else dash">
          <mat-icon *ngFor="let s of [1,2,3,4,5]" [class.off]="s > value">star</mat-icon>
        </ng-container>
      </span>
      <span *ngSwitchCase="'chips'" class="cell-chips">
        <span class="mini-chip" *ngFor="let c of asArray(value)">{{ c }}</span>
        <span class="muted" *ngIf="!asArray(value).length">—</span>
      </span>
      <span *ngSwitchCase="'longtext'" class="cell-long" [matTooltip]="value || ''">{{ value || '—' }}</span>
      <span *ngSwitchCase="'image'">
        <img *ngIf="url(value) as u; else dash" class="cell-thumb" [src]="u" alt="" loading="lazy" />
      </span>
      <span *ngSwitchCase="'color'" class="cell-color">
        <i [style.background]="value || 'transparent'"></i>{{ value || '—' }}
      </span>
      <span *ngSwitchCase="'number'" class="num">
        <ng-container *ngIf="value !== null && value !== undefined; else dash">{{ number(value, 2) }}{{ column.suffix ? ' ' + column.suffix : '' }}</ng-container>
      </span>
      <span *ngSwitchCase="'phone'" class="nowrap"><ng-container *ngIf="value; else dash">{{ value }}</ng-container></span>
      <span *ngSwitchDefault>
        {{ text || '—' }}
        <span class="secondary block" *ngIf="sub">{{ sub }}</span>
      </span>
    </ng-container>
    <ng-template #dash><span class="muted">—</span></ng-template>
  `,
})
export class CellComponent implements OnChanges {
  @Input() column!: ColumnDef;
  @Input() row: any;
  photo: string | null = null;
  /** « il y a 3 h » : calculé au survol, jamais pendant la détection de changements. */
  ago = '';

  ngOnChanges(): void {
    this.photo = this.column?.type === 'person' ? fileUrl(this.row?.[this.column.photoKey ?? 'photoUrl'] ?? null) : null;
  }

  get value(): any {
    return rawValue(this.column, this.row);
  }

  get sub(): string | null {
    return this.column.subKey ? this.row?.[this.column.subKey] ?? null : null;
  }

  get option(): Option | undefined {
    return labelOf(this.column.options, this.value);
  }

  get text(): string {
    return cellText(this.column, this.row);
  }

  initialsOf = initials;
  dateTime = formatDateTime;
  date = formatDate;
  money = formatMoney;
  relativeOf = relative;
  url = fileUrl;

  number(v: any, digits: number): string {
    return formatNumber(v, digits);
  }

  asArray(v: any): any[] {
    return Array.isArray(v) ? v : v ? [v] : [];
  }
}
