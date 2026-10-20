import { Component, OnDestroy, OnInit } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { NavigationEnd, Router } from '@angular/router';
import { forkJoin, interval, of, Subscription } from 'rxjs';
import { catchError, filter, map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  badge?: keyof Pending;
  tone?: 'warning' | 'danger' | 'info' | 'violet';
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

interface Pending {
  boosts: number;
  verifications: number;
  support: number;
  moderation: number;
}

/** Structure de la console : menu latéral, barre du haut, actions en attente. */
@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
})
export class LayoutComponent implements OnInit, OnDestroy {
  readonly sections: NavSection[] = [
    { items: [{ path: '/dashboard', label: 'Tableau de bord', icon: 'space_dashboard' }] },
    {
      title: 'Utilisateurs',
      items: [
        { path: '/clients', label: 'Clients', icon: 'person' },
        { path: '/artisans', label: 'Artisans', icon: 'engineering', badge: 'moderation', tone: 'warning' },
        { path: '/admins', label: 'Administrateurs', icon: 'admin_panel_settings' },
      ],
    },
    {
      title: 'Activité',
      items: [
        { path: '/requests', label: 'Demandes', icon: 'assignment' },
        { path: '/reservations', label: 'Réservations', icon: 'event_available' },
        { path: '/reviews', label: 'Avis', icon: 'reviews' },
        { path: '/stories', label: 'Stories', icon: 'smart_display' },
      ],
    },
    {
      title: 'Monétisation',
      items: [
        { path: '/boosts', label: 'Boosts', icon: 'bolt', badge: 'boosts', tone: 'warning' },
        { path: '/verifications', label: 'Vérifications', icon: 'verified', badge: 'verifications', tone: 'info' },
      ],
    },
    {
      title: 'Support',
      items: [{ path: '/support', label: 'Signalements', icon: 'support_agent', badge: 'support', tone: 'danger' }],
    },
    {
      title: 'Configuration',
      items: [
        { path: '/categories', label: 'Catégories', icon: 'category' },
        { path: '/settings', label: 'Paramètres', icon: 'tune' },
      ],
    },
  ];

  pending: Pending = { boosts: 0, verifications: 0, support: 0, moderation: 0 };
  isMobile = false;
  sidenavOpen = true;
  currentTitle = '';

  private subs: Subscription[] = [];

  constructor(
    public authService: AuthService,
    private api: ApiService,
    private breakpoints: BreakpointObserver,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.breakpoints.observe('(max-width: 1023px)').subscribe(r => {
        this.isMobile = r.matches;
        this.sidenavOpen = !r.matches;
      }),
      this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
        this.updateTitle();
        if (this.isMobile) {
          this.sidenavOpen = false;
        }
      }),
      interval(60_000).subscribe(() => this.loadPending()),
    );
    this.updateTitle();
    this.loadPending();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  /** Compteurs des actions en attente (Boosts, vérifications, signalements, modération). */
  loadPending(): void {
    const count = (endpoint: string, params: any, pick: (d: any) => number) =>
      this.api.get<any>(endpoint, params).pipe(map(r => pick(r.data) || 0), catchError(() => of(0)));
    forkJoin({
      boosts: count('/boosts/stats', undefined, d => d?.pendingCount),
      verifications: count('/verifications/stats', undefined, d => d?.pendingCount),
      support: count('/admin/v2/support-reports', { status: 'NEW', size: 1 }, d => d?.totalElements),
      moderation: count('/admin/v2/employees', { status: 'PENDING_MODERATION', size: 1 }, d => d?.totalElements),
    }).subscribe(p => (this.pending = p));
  }

  get totalPending(): number {
    return this.pending.boosts + this.pending.verifications + this.pending.support + this.pending.moderation;
  }

  get pendingItems(): { label: string; icon: string; link: string; query: any; count: number; tone: string }[] {
    const items = [
      { label: 'Boosts à valider', icon: 'bolt', link: '/boosts', query: { status: 'PENDING' }, count: this.pending.boosts, tone: 'warning' },
      { label: 'Vérifications à traiter', icon: 'verified', link: '/verifications', query: { status: 'PENDING' }, count: this.pending.verifications, tone: 'info' },
      { label: 'Nouveaux signalements', icon: 'support_agent', link: '/support', query: { status: 'NEW' }, count: this.pending.support, tone: 'danger' },
      { label: 'Artisans en modération', icon: 'engineering', link: '/artisans', query: { status: 'PENDING_MODERATION' }, count: this.pending.moderation, tone: 'violet' },
    ];
    return items.filter(i => i.count > 0);
  }

  private updateTitle(): void {
    const url = this.router.url.split('?')[0];
    for (const s of this.sections) {
      const item = s.items.find(i => url.startsWith(i.path));
      if (item) {
        this.currentTitle = item.label;
        return;
      }
    }
    this.currentTitle = '';
  }

  get adminName(): string {
    return this.authService.getCurrentUser()?.name || 'Administrateur';
  }

  get adminEmail(): string {
    return this.authService.getCurrentUser()?.email || '';
  }

  get adminInitials(): string {
    return this.adminName.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }

  logout(): void {
    this.authService.logout();
  }
}
