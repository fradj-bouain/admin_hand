import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Subject, Subscription, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, map, switchMap, tap } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { formatPhone, initials } from '../../shared/format';

interface Person {
  userId: string;
  name: string;
  phone?: string;
  type: 'CLIENT' | 'EMPLOYEE';
  detail?: string;
}

/** Choisir la personne à qui écrire : recherche parmi les clients et les artisans (nom ou téléphone). */
@Component({
  selector: 'app-new-chat-dialog',
  template: `
    <div class="dialog new-chat">
      <div class="dialog-head">
        <div class="dialog-head-icon"><mat-icon>add_comment</mat-icon></div>
        <div>
          <h2>Nouvelle discussion</h2>
          <p>Elle apparaîtra dans ses Messages, avec une notification à chaque message.</p>
        </div>
        <button mat-icon-button type="button" class="dialog-close" mat-dialog-close><mat-icon>close</mat-icon></button>
      </div>
      <div class="dialog-body">
        <div class="nc-search">
          <mat-icon>search</mat-icon>
          <input type="search" [(ngModel)]="q" (ngModelChange)="search$.next()" placeholder="Nom ou téléphone d'un client ou d'un artisan…"
                 autocomplete="off" cdkFocusInitial />
        </div>
        <mat-progress-bar *ngIf="loading" mode="indeterminate"></mat-progress-bar>
        <ul class="nc-results">
          <li *ngFor="let p of results" (click)="pick(p)" tabindex="0" (keydown.enter)="pick(p)">
            <span class="nc-avatar" [class.artisan]="p.type === 'EMPLOYEE'">{{ initialsOf(p.name) }}</span>
            <div class="nc-text">
              <strong>{{ p.name }}</strong>
              <small>{{ phone(p.phone) || 'Sans téléphone' }}<ng-container *ngIf="p.detail"> · {{ p.detail }}</ng-container></small>
            </div>
            <app-chip [label]="p.type === 'EMPLOYEE' ? 'Artisan' : 'Client'" [tone]="p.type === 'EMPLOYEE' ? 'violet' : 'primary'"></app-chip>
          </li>
        </ul>
        <p class="nc-hint" *ngIf="!loading && q.trim().length >= 2 && !results.length">Aucun compte ne correspond.</p>
        <p class="nc-hint" *ngIf="q.trim().length < 2">Tapez au moins 2 caractères.</p>
      </div>
    </div>
  `,
  styles: [`
    .new-chat { width: 100%; }
    .nc-search { display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 12px; border: 1px solid var(--border-strong);
      border-radius: 12px; background: var(--surface); }
    .nc-search:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-ring); }
    .nc-search mat-icon { color: var(--text-muted); }
    .nc-search input { flex: 1; border: 0; outline: none; font: inherit; font-size: 14.5px; background: transparent; color: var(--text); }
    .nc-results { list-style: none; margin: 10px 0 0; padding: 0; max-height: 360px; overflow: auto; }
    .nc-results li { display: flex; align-items: center; gap: 12px; padding: 10px 8px; border-radius: 10px; cursor: pointer; outline: none; }
    .nc-results li:hover, .nc-results li:focus { background: var(--row-hover); }
    .nc-avatar { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; flex: none; font-weight: 700;
      font-size: 13px; color: #fff; background: var(--primary); }
    .nc-avatar.artisan { background: var(--violet); }
    .nc-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .nc-text strong { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .nc-text small { color: var(--text-muted); font-size: 12.5px; }
    .nc-hint { color: var(--text-muted); font-size: 13px; margin: 12px 4px 0; }
  `],
})
export class NewChatDialogComponent implements OnInit, OnDestroy {
  q = '';
  results: Person[] = [];
  loading = false;
  readonly search$ = new Subject<void>();
  private sub?: Subscription;

  initialsOf = initials;
  phone = formatPhone;

  constructor(private api: ApiService, private ref: MatDialogRef<NewChatDialogComponent, string>) {}

  ngOnInit(): void {
    this.sub = this.search$
      .pipe(
        debounceTime(300),
        map(() => this.q.trim()),
        tap(q => (this.loading = q.length >= 2)),
        switchMap(q => (q.length < 2 ? of([] as Person[]) : this.find(q))),
      )
      .subscribe(r => {
        this.results = r;
        this.loading = false;
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private find(q: string) {
    const params = { q, size: 8, sort: 'name', dir: 'asc' };
    const clients = this.api.get<any>('/admin/v2/clients', params).pipe(
      map(r => (r.data?.content ?? []).map((c: any): Person => ({
        userId: c.id, name: c.name, phone: c.phone, type: 'CLIENT', detail: c.city || c.governorate,
      }))),
      catchError(() => of([] as Person[])),
    );
    const artisans = this.api.get<any>('/admin/v2/employees', params).pipe(
      map(r => (r.data?.content ?? []).filter((e: any) => e.userId).map((e: any): Person => ({
        userId: e.userId, name: e.name, phone: e.phone, type: 'EMPLOYEE',
        detail: [(e.professions ?? [])[0] ?? e.profession, e.governorate].filter(Boolean).join(', '),
      }))),
      catchError(() => of([] as Person[])),
    );
    return forkJoin([clients, artisans]).pipe(map(([c, a]) => [...c, ...a]));
  }

  pick(p: Person): void {
    this.ref.close(p.userId);
  }
}
