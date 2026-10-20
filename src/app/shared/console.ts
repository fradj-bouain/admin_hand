import { AfterViewInit, Directive, Injectable, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { forkJoin, Observable, of, Subscription } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { ApiService } from '../core/services/api.service';
import { DataTableComponent } from './data-table/data-table.component';
import { ConfirmData } from './dialogs/confirm-dialog.component';
import { Option, Tone } from './models';
import { UiService } from './ui.service';

/** Indicateur cliquable en haut d'une page : un nombre et le filtre qu'il applique au tableau. */
export interface PageKpi {
  key: string;
  label: string;
  icon: string;
  tone: Tone;
  filter: Record<string, string>;
}

@Injectable({ providedIn: 'root' })
export class ConsoleService {
  private categories$?: Observable<Option[]>;

  constructor(private api: ApiService) {}

  /** Nombre de lignes d'une liste pour ces filtres (page de taille 1 : seul le total sert). */
  count(endpoint: string, params: Record<string, string> = {}): Observable<number> {
    return this.api.get<any>(endpoint, { ...params, size: 1 }).pipe(
      map(r => r.data?.totalElements ?? 0),
      catchError(() => of(0)),
    );
  }

  counts(endpoint: string, filters: Record<string, Record<string, string>>): Observable<Record<string, number>> {
    const calls: Record<string, Observable<number>> = {};
    for (const [key, f] of Object.entries(filters)) {
      calls[key] = this.count(endpoint, f);
    }
    return forkJoin(calls);
  }

  /** Métiers actifs (pour les listes de choix), mis en cache pendant la session. */
  categoryOptions(): Observable<Option[]> {
    if (!this.categories$) {
      this.categories$ = this.api.get<any[]>('/categories').pipe(
        map(r => (r.data ?? []).map((c: any) => ({ value: c.name, label: c.name })).sort((a: Option, b: Option) => a.label.localeCompare(b.label, 'fr'))),
        catchError(() => of([])),
        shareReplay(1),
      );
    }
    return this.categories$;
  }

  resetCategories(): void {
    this.categories$ = undefined;
  }
}

/** Socle des pages de liste : indicateurs, tableau, actions avec confirmation et notification. */
@Directive()
export abstract class ConsolePage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(DataTableComponent) table?: DataTableComponent;

  abstract readonly endpoint: string;
  readonly kpis: PageKpi[] = [];
  counts: Record<string, number | undefined> = {};
  /** Indicateurs dont le filtre est celui du tableau, relevés à chaque chargement (jamais pendant la détection). */
  private activeKpis = new Set<string>();
  private tableSub?: Subscription;

  protected constructor(protected console: ConsoleService, protected ui: UiService, protected api: ApiService) {}

  ngOnInit(): void {
    this.loadCounts();
  }

  ngAfterViewInit(): void {
    this.tableSub = this.table?.loaded.subscribe(() => {
      const table = this.table!;
      this.activeKpis = new Set(this.kpis.filter(k => table.isFilter(k.filter)).map(k => k.key));
    });
  }

  ngOnDestroy(): void {
    this.tableSub?.unsubscribe();
  }

  loadCounts(): void {
    if (!this.kpis.length) {
      return;
    }
    const filters: Record<string, Record<string, string>> = {};
    for (const k of this.kpis) {
      filters[k.key] = k.filter;
    }
    this.console.counts(this.endpoint, filters).subscribe(c => (this.counts = c));
  }

  applyKpi(k: PageKpi): void {
    this.table?.applyFilters(k.filter);
  }

  kpiActive(k: PageKpi): boolean {
    return this.activeKpis.has(k.key);
  }

  reload(): void {
    this.table?.refresh();
    this.loadCounts();
  }

  /** Lance l'appel, affiche le résultat et recharge la page. */
  act(call: Observable<any>, success: string, after?: () => void): void {
    call.subscribe({
      next: () => {
        this.ui.toast(success);
        this.reload();
        after?.();
      },
      error: e => this.ui.error(e),
    });
  }

  /** Demande confirmation (et éventuellement une saisie), puis lance l'appel. */
  confirmThen(data: ConfirmData, call: (value?: string) => Observable<any>, success: string): void {
    this.ui.confirm(data).subscribe(r => {
      if (r) {
        this.act(call(r.value), success);
      }
    });
  }
}
