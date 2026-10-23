import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ColumnDef, DetailAction, DetailData, DetailItem } from '../models';
import { fileUrl, initials } from '../format';

interface PreparedItem {
  label: string;
  column: ColumnDef;
  row: Record<string, any>;
  full: boolean;
  href?: string;
}

/** Fiche détail affichée dans un panneau latéral. */
@Component({
  selector: 'app-detail-sheet',
  template: `
    <div class="sheet">
      <header class="sheet-head">
        <div class="sheet-avatar">
          <img *ngIf="avatar" [src]="avatar" alt="" (error)="avatar = null" />
          <mat-icon *ngIf="!avatar && data.icon">{{ data.icon }}</mat-icon>
          <span *ngIf="!avatar && !data.icon">{{ initialsOf(data.title) }}</span>
        </div>
        <div class="sheet-title">
          <h2>{{ data.title }}</h2>
          <p *ngIf="data.subtitle">{{ data.subtitle }}</p>
          <div class="sheet-badges" *ngIf="data.badges?.length">
            <app-chip *ngFor="let b of data.badges" [label]="b.label" [tone]="b.tone"></app-chip>
          </div>
        </div>
        <button mat-icon-button class="sheet-close" (click)="close()"><mat-icon>close</mat-icon></button>
      </header>

      <div class="sheet-actions" *ngIf="data.actions?.length">
        <button *ngFor="let a of data.actions" mat-stroked-button class="sheet-act tone-{{ a.tone || 'neutral' }}" (click)="run(a)">
          <mat-icon>{{ a.icon }}</mat-icon>{{ a.label }}
        </button>
      </div>

      <div class="sheet-body">
        <section class="sheet-section" *ngFor="let s of sections">
          <h3>{{ s.title }}</h3>
          <dl class="sheet-grid">
            <div *ngFor="let it of s.items" class="sheet-item" [class.full]="it.full">
              <dt>{{ it.label }}</dt>
              <dd>
                <a *ngIf="it.href; else plain" [href]="it.href" target="_blank" rel="noopener">
                  <app-cell [column]="it.column" [row]="it.row"></app-cell>
                </a>
                <ng-template #plain><app-cell [column]="it.column" [row]="it.row"></app-cell></ng-template>
              </dd>
            </div>
          </dl>
        </section>

        <section class="sheet-section" *ngIf="images.length">
          <h3>Documents et photos</h3>
          <div class="sheet-images">
            <a *ngFor="let img of images" [href]="img.url" target="_blank" rel="noopener" class="sheet-image">
              <img *ngIf="!img.broken; else noImage" [src]="img.url" alt="" loading="lazy" (error)="img.broken = true" />
              <ng-template #noImage><div class="sheet-image-missing"><mat-icon>broken_image</mat-icon>Ouvrir le fichier</div></ng-template>
              <span>{{ img.label }}</span>
            </a>
          </div>
        </section>

        <section class="sheet-section" *ngFor="let g of galleries">
          <h3>{{ g.title }} <span class="count">{{ g.groups.length }}</span></h3>
          <div *ngFor="let group of g.groups" class="sheet-gallery">
            <div class="sheet-gallery-head" *ngIf="group.title || group.subtitle">
              <strong>{{ group.title }}</strong>
              <span *ngIf="group.subtitle">{{ group.subtitle }}</span>
            </div>
            <p class="sheet-gallery-text" *ngIf="group.text">{{ group.text }}</p>
            <div class="sheet-images">
              <a *ngFor="let p of group.photos" [href]="p.url" target="_blank" rel="noopener" class="sheet-image">
                <img *ngIf="!p.broken; else noPhoto" [src]="p.url" alt="" loading="lazy" (error)="p.broken = true" />
                <ng-template #noPhoto><div class="sheet-image-missing"><mat-icon>broken_image</mat-icon>Ouvrir le fichier</div></ng-template>
              </a>
            </div>
            <p class="sheet-empty" *ngIf="!group.photos.length">Aucune photo</p>
          </div>
          <p class="sheet-empty" *ngIf="!g.groups.length">{{ g.empty || 'Aucun élément' }}</p>
        </section>

        <section class="sheet-section" *ngFor="let l of data.lists || []">
          <h3>{{ l.title }} <span class="count">{{ l.rows.length }}</span></h3>
          <div class="mini-table" *ngIf="l.rows.length; else noRows">
            <table>
              <thead><tr><th *ngFor="let c of l.columns">{{ c.label }}</th></tr></thead>
              <tbody>
                <tr *ngFor="let r of l.rows">
                  <td *ngFor="let c of l.columns"><app-cell [column]="c" [row]="r"></app-cell></td>
                </tr>
              </tbody>
            </table>
          </div>
          <ng-template #noRows><p class="sheet-empty">{{ l.empty || 'Aucun élément' }}</p></ng-template>
        </section>
      </div>
    </div>
  `,
})
export class DetailSheetComponent {
  sections: { title: string; items: PreparedItem[] }[];
  images: { label: string; url: string; broken?: boolean }[];
  galleries: { title: string; empty?: string; groups: { title?: string | null; subtitle?: string | null; text?: string | null; photos: { url: string; broken?: boolean }[] }[] }[];
  avatar: string | null;

  constructor(@Inject(MAT_DIALOG_DATA) public data: DetailData, private ref: MatDialogRef<DetailSheetComponent>) {
    this.avatar = fileUrl(data.avatar ?? null);
    this.sections = data.sections.map(s => ({
      title: s.title,
      items: this.fillRows(s.items.filter(i => i.value !== undefined).map(i => this.prepare(i))),
    }));
    this.images = (data.images ?? [])
      .map(i => ({ label: i.label, url: fileUrl(i.url) }))
      .filter((i): i is { label: string; url: string } => !!i.url);
    this.galleries = (data.galleries ?? []).map(g => ({
      title: g.title,
      empty: g.empty,
      groups: g.groups.map(group => ({
        ...group,
        photos: group.photos.map(p => fileUrl(p)).filter((u): u is string => !!u).map(url => ({ url })),
      })),
    }));
  }

  private prepare(i: DetailItem): PreparedItem {
    return {
      label: i.label,
      column: { key: 'v', label: i.label, type: i.type ?? 'text', options: i.options },
      row: { v: i.value },
      full: !!i.full || i.type === 'longtext',
      href: i.href,
    };
  }

  /** Un champ seul sur sa ligne (avant un champ pleine largeur ou en fin de liste) prend toute la largeur. */
  private fillRows(items: PreparedItem[]): PreparedItem[] {
    let right = false;
    items.forEach((it, i) => {
      if (it.full) {
        right = false;
        return;
      }
      const next = items[i + 1];
      if (!right && (!next || next.full)) {
        it.full = true;
        return;
      }
      right = !right;
    });
    return items;
  }

  initialsOf = initials;

  run(a: DetailAction): void {
    if (a.closeFirst !== false) {
      this.ref.close();
    }
    a.handler();
  }

  close(): void {
    this.ref.close();
  }
}
