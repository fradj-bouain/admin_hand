import {
  Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { Subject, Subscription, of } from 'rxjs';
import { catchError, debounceTime, map, switchMap, tap } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { ColumnDef, Option, PageResult, RowAction } from '../models';
import { cellText, formatDate } from '../format';
import { labelOf } from '../labels';

interface SavedState {
  filters: Record<string, string>;
  q: string;
  sortKey?: string;
  sortDir: 'asc' | 'desc';
  size: number;
  hidden: string[];
}

/**
 * Tableau de la console : un filtre sous chaque colonne, tri, pagination et recherche appliqués par
 * l'API ; filtres conservés pendant la session (par page), colonnes affichées mémorisées, export CSV.
 */
@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
})
export class DataTableComponent implements OnInit, OnChanges, OnDestroy {
  @Input() endpoint = '';
  @Input() columns: ColumnDef[] = [];
  @Input() actions: RowAction[] = [];
  @Input() defaultSort?: { key: string; dir: 'asc' | 'desc' };
  @Input() fixedParams: Record<string, string> = {};
  @Input() selectable = false;
  @Input() clickable = true;
  @Input() searchPlaceholder = 'Rechercher…';
  @Input() exportName = 'export';
  @Input() emptyText = 'Aucun résultat';
  @Input() emptyIcon = 'inbox';
  /** Lit les filtres initiaux dans l'URL (?status=PENDING…). */
  @Input() useQueryParams = true;

  @Output() rowClick = new EventEmitter<any>();
  @Output() selectionChange = new EventEmitter<any[]>();
  @Output() loaded = new EventEmitter<PageResult>();

  rows: any[] = [];
  total = 0;
  page = 0;
  size = 20;
  loading = false;
  error: string | null = null;
  sortKey?: string;
  sortDir: 'asc' | 'desc' = 'desc';
  q = '';
  filters: Record<string, string> = {};
  hidden = new Set<string>();
  selected = new Map<any, any>();
  exporting = false;

  /** Valeurs en cours de saisie dans les menus de plages (avant « Appliquer »). */
  draft: Record<string, string> = {};

  private load$ = new Subject<void>();
  private typing$ = new Subject<void>();
  private subs: Subscription[] = [];

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.restore();
    this.subs.push(
      this.typing$.pipe(debounceTime(350)).subscribe(() => this.refresh(true)),
      this.load$
        .pipe(
          tap(() => {
            this.loading = true;
            this.error = null;
          }),
          switchMap(() =>
            this.api.get<PageResult>(this.endpoint, this.params()).pipe(
              map(r => r.data as PageResult),
              catchError(err => {
                this.error = err?.error?.message || 'Impossible de charger les données';
                return of(null);
              }),
            ),
          ),
        )
        .subscribe(result => {
          this.loading = false;
          if (result) {
            this.rows = result.content ?? [];
            this.total = result.totalElements ?? 0;
            if (this.rows.length === 0 && this.page > 0 && this.total > 0) {
              this.page = Math.max(0, Math.ceil(this.total / this.size) - 1);
              this.load$.next();
              return;
            }
            this.loaded.emit(result);
          }
        }),
    );
    if (this.useQueryParams) {
      // Lien vers la même page avec d'autres filtres (cloche, tableau de bord) : on les applique
      let first = true;
      this.subs.push(
        this.route.queryParamMap.subscribe(qp => {
          if (first) {
            first = false;
            return;
          }
          if (qp.keys.length) {
            this.filters = {};
            for (const k of qp.keys) {
              const v = qp.get(k);
              if (v) {
                this.filters[k] = v;
              }
            }
            this.refresh(true);
          }
        }),
      );
    }
    this.load$.next();
  }

  /** Remplace les filtres par ceux-ci (indicateurs cliquables des pages). */
  applyFilters(filters: Record<string, string>): void {
    this.filters = { ...filters };
    this.q = '';
    this.refresh(true);
  }

  /** Vrai si les filtres actuels sont exactement ceux-ci. */
  isFilter(filters: Record<string, string>): boolean {
    const a = Object.entries(this.filters).filter(([, v]) => v);
    const b = Object.entries(filters).filter(([, v]) => v);
    return a.length === b.length && b.every(([k, v]) => this.filters[k] === v) && !this.q.trim();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fixedParams'] && !changes['fixedParams'].firstChange) {
      this.refresh(true);
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  // ===== Chargement =====

  /** Recharge la page courante (après une action) ou repart de la première page. */
  refresh(resetPage = false): void {
    if (resetPage) {
      this.page = 0;
    }
    this.save();
    this.load$.next();
  }

  private params(extra: Record<string, string | number> = {}): Record<string, any> {
    const p: Record<string, any> = { ...this.fixedParams, ...this.filters, page: this.page, size: this.size };
    if (this.q.trim()) {
      p['q'] = this.q.trim();
    }
    const sort = this.sortKey ?? this.defaultSort?.key;
    if (sort) {
      p['sort'] = sort;
      p['dir'] = this.sortKey ? this.sortDir : this.defaultSort?.dir ?? 'desc';
    }
    return { ...p, ...extra };
  }

  // ===== Colonnes, tri =====

  get shownColumns(): ColumnDef[] {
    return this.columns.filter(c => !this.hidden.has(c.key));
  }

  sortOf(c: ColumnDef): string | null {
    return c.sortKey === false ? null : c.sortKey ?? c.key;
  }

  activeSort(): string | undefined {
    return this.sortKey ?? this.defaultSort?.key;
  }

  activeDir(): 'asc' | 'desc' {
    return this.sortKey ? this.sortDir : this.defaultSort?.dir ?? 'desc';
  }

  toggleSort(c: ColumnDef): void {
    const key = this.sortOf(c);
    if (!key) {
      return;
    }
    if (this.activeSort() === key) {
      this.sortKey = key;
      this.sortDir = this.activeDir() === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = c.type === 'text' || c.type === 'person' ? 'asc' : 'desc';
    }
    this.refresh(true);
  }

  toggleColumn(c: ColumnDef): void {
    if (this.hidden.has(c.key)) {
      this.hidden.delete(c.key);
    } else if (this.shownColumns.length > 1) {
      this.hidden.add(c.key);
    }
    this.save();
  }

  // ===== Filtres =====

  param(c: ColumnDef): string {
    return c.filter?.param ?? c.key;
  }

  onSearch(): void {
    this.typing$.next();
  }

  setFilter(param: string, value: any, debounce = false): void {
    const v = value === null || value === undefined ? '' : String(value).trim();
    if (v) {
      this.filters[param] = v;
    } else {
      delete this.filters[param];
    }
    if (debounce) {
      this.typing$.next();
    } else {
      this.refresh(true);
    }
  }

  multiValue(param: string): string[] {
    return this.filters[param] ? this.filters[param].split(',') : [];
  }

  setMulti(param: string, values: string[]): void {
    this.setFilter(param, (values ?? []).join(','));
  }

  /** Ouvre un menu de plage : copie les valeurs actuelles dans le brouillon. */
  openRange(param: string, kind: 'date' | 'number'): void {
    const [a, b] = kind === 'date' ? ['From', 'To'] : ['Min', 'Max'];
    this.draft = { [param + a]: this.filters[param + a] ?? '', [param + b]: this.filters[param + b] ?? '' };
  }

  applyRange(param: string, kind: 'date' | 'number'): void {
    const [a, b] = kind === 'date' ? ['From', 'To'] : ['Min', 'Max'];
    for (const k of [param + a, param + b]) {
      const v = (this.draft[k] ?? '').toString().trim();
      if (v) {
        this.filters[k] = v;
      } else {
        delete this.filters[k];
      }
    }
    this.refresh(true);
  }

  clearRange(param: string, kind: 'date' | 'number'): void {
    const [a, b] = kind === 'date' ? ['From', 'To'] : ['Min', 'Max'];
    delete this.filters[param + a];
    delete this.filters[param + b];
    this.draft = {};
    this.refresh(true);
  }

  /** Raccourcis de dates : aujourd'hui, 7 jours, 30 jours, ce mois. */
  quickRange(param: string, preset: 'today' | '7' | '30' | 'month'): void {
    const today = this.tunisToday();
    const from = new Date(today);
    if (preset === '7') {
      from.setUTCDate(from.getUTCDate() - 6);
    } else if (preset === '30') {
      from.setUTCDate(from.getUTCDate() - 29);
    } else if (preset === 'month') {
      from.setUTCDate(1);
    }
    this.draft = { [param + 'From']: this.iso(from), [param + 'To']: this.iso(today) };
    this.applyRange(param, 'date');
  }

  rangeLabel(c: ColumnDef): string {
    const p = this.param(c);
    if (c.filter?.type === 'date') {
      const f = this.filters[p + 'From'];
      const t = this.filters[p + 'To'];
      if (!f && !t) {
        return 'Période';
      }
      const fmt = (d?: string) => (d ? formatDate(d + 'T12:00:00Z').slice(0, 5) : '…');
      return f === t ? fmt(f) : `${fmt(f)} → ${fmt(t)}`;
    }
    const min = this.filters[p + 'Min'];
    const max = this.filters[p + 'Max'];
    if (!min && !max) {
      return 'Plage';
    }
    if (min && max) {
      return min === max ? `= ${min}` : `${min} – ${max}`;
    }
    return min ? `≥ ${min}` : `≤ ${max}`;
  }

  rangeActive(c: ColumnDef): boolean {
    const p = this.param(c);
    const [a, b] = c.filter?.type === 'date' ? ['From', 'To'] : ['Min', 'Max'];
    return !!(this.filters[p + a] || this.filters[p + b]);
  }

  get hasFilters(): boolean {
    return Object.keys(this.filters).length > 0 || !!this.q.trim();
  }

  /** Pastilles des filtres actifs (libellé lisible + suppression). */
  get activeChips(): { label: string; remove: () => void }[] {
    const chips: { label: string; remove: () => void }[] = [];
    for (const c of this.columns) {
      if (!c.filter) {
        continue;
      }
      const p = this.param(c);
      const t = c.filter.type;
      if (t === 'date' || t === 'number') {
        if (this.rangeActive(c)) {
          chips.push({ label: `${c.label} : ${this.rangeLabel(c)}`, remove: () => this.clearRange(p, t) });
        }
      } else if (this.filters[p]) {
        chips.push({ label: `${c.label} : ${this.filterLabel(c, this.filters[p])}`, remove: () => this.setFilter(p, '') });
      }
    }
    return chips;
  }

  private filterLabel(c: ColumnDef, value: string): string {
    const f = c.filter!;
    if (f.type === 'boolean') {
      return value === 'true' ? f.trueLabel ?? c.trueLabel ?? 'Oui' : f.falseLabel ?? c.falseLabel ?? 'Non';
    }
    const opts: Option[] | undefined = f.options ?? c.options;
    if (opts) {
      return value.split(',').map(v => labelOf(opts, v)?.label ?? v).join(', ');
    }
    return `« ${value} »`;
  }

  resetFilters(): void {
    this.filters = {};
    this.q = '';
    this.draft = {};
    this.refresh(true);
  }

  // ===== Pagination, sélection =====

  onPage(e: PageEvent): void {
    this.page = e.pageIndex;
    this.size = e.pageSize;
    this.refresh();
  }

  rowId(row: any): any {
    return row?.id ?? row;
  }

  trackRow = (_: number, row: any) => this.rowId(row);

  isSelected(row: any): boolean {
    return this.selected.has(this.rowId(row));
  }

  toggleRow(row: any): void {
    const id = this.rowId(row);
    if (this.selected.has(id)) {
      this.selected.delete(id);
    } else {
      this.selected.set(id, row);
    }
    this.selectionChange.emit([...this.selected.values()]);
  }

  get allSelected(): boolean {
    return this.rows.length > 0 && this.rows.every(r => this.isSelected(r));
  }

  get someSelected(): boolean {
    return this.rows.some(r => this.isSelected(r)) && !this.allSelected;
  }

  toggleAll(): void {
    const select = !this.allSelected;
    for (const r of this.rows) {
      if (select) {
        this.selected.set(this.rowId(r), r);
      } else {
        this.selected.delete(this.rowId(r));
      }
    }
    this.selectionChange.emit([...this.selected.values()]);
  }

  clearSelection(): void {
    this.selected.clear();
    this.selectionChange.emit([]);
  }

  visibleActions(row: any): RowAction[] {
    return this.actions.filter(a => !a.visible || a.visible(row));
  }

  onRowClick(row: any): void {
    if (this.clickable) {
      this.rowClick.emit(row);
    }
  }

  // ===== Export CSV (toutes les lignes filtrées, colonnes affichées) =====

  exportCsv(): void {
    this.exporting = true;
    this.api.get<PageResult>(this.endpoint, this.params({ page: 0, size: 1000 })).subscribe({
      next: r => {
        const rows = (r.data as PageResult)?.content ?? [];
        const cols = this.shownColumns;
        const esc = (s: string) => `"${(s ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
        const lines = [cols.map(c => esc(c.label)).join(';')];
        for (const row of rows) {
          lines.push(cols.map(c => esc(cellText(c, row))).join(';'));
        }
        const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${this.exportName}-${this.iso(this.tunisToday())}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
        this.exporting = false;
      },
      error: () => (this.exporting = false),
    });
  }

  // ===== Mémoire de session =====

  private storageKey(): string {
    return 'dt:' + this.endpoint;
  }

  /** Colonnes masquées par l'utilisateur ; « v2 » : colonnes téléphone ajoutées, choix précédents oubliés. */
  private colsKey(): string {
    return this.storageKey() + ':cols:v2';
  }

  private save(): void {
    try {
      const state: SavedState = {
        filters: this.filters, q: this.q, sortKey: this.sortKey, sortDir: this.sortDir, size: this.size,
        hidden: [...this.hidden],
      };
      sessionStorage.setItem(this.storageKey(), JSON.stringify(state));
      localStorage.setItem(this.colsKey(), JSON.stringify([...this.hidden]));
    } catch {
      /* stockage indisponible : on garde l'état en mémoire */
    }
  }

  private restore(): void {
    this.hidden = new Set(this.columns.filter(c => c.hidden).map(c => c.key));
    try {
      const cols = localStorage.getItem(this.colsKey());
      if (cols) {
        this.hidden = new Set((JSON.parse(cols) as string[]).filter(k => this.columns.some(c => c.key === k)));
      }
      const raw = sessionStorage.getItem(this.storageKey());
      if (raw) {
        const s = JSON.parse(raw) as SavedState;
        this.filters = s.filters ?? {};
        this.q = s.q ?? '';
        this.sortKey = s.sortKey;
        this.sortDir = s.sortDir ?? 'desc';
        this.size = s.size ?? 20;
      }
    } catch {
      /* état illisible : valeurs par défaut */
    }
    if (this.useQueryParams) {
      const qp = this.route.snapshot.queryParamMap;
      if (qp.keys.length) {
        this.filters = {};
        for (const k of qp.keys) {
          const v = qp.get(k);
          if (v) {
            this.filters[k] = v;
          }
        }
      }
    }
  }

  private tunisToday(): Date {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis' }).format(new Date());
    return new Date(parts + 'T00:00:00Z');
  }

  private iso(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
