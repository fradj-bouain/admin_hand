import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { formatDayShort, formatMoney, formatNumber, relative } from '../../shared/format';
import { REQUEST_STATUS, labelOf } from '../../shared/labels';
import { ColumnDef, Tone } from '../../shared/models';

interface Bar {
  day: string;
  label: string;
  total: number;
  parts: { value: number; tone: string; label: string }[];
  tooltip: string;
}

interface Breakdown {
  label: string;
  count: number;
  pct: number;
  tone?: Tone;
  link?: string;
  query?: any;
}

/** Tableau de bord : ce qui attend une action, indicateurs, tendances sur 30 jours, activité récente. */
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  loading = true;
  error: string | null = null;
  data: any = null;
  k: any = {};

  signups: Bar[] = [];
  requests: Bar[] = [];
  requestsByStatus: Breakdown[] = [];
  topProfessions: Breakdown[] = [];
  topGovernorates: Breakdown[] = [];

  readonly recentRequestColumns: ColumnDef[] = [
    { key: 'createdAt', label: 'Publiée', type: 'datetime' },
    { key: 'clientName', label: 'Client', type: 'person', subKey: 'clientPhone' },
    { key: 'profession', label: 'Métier' },
    { key: 'status', label: 'Statut', type: 'status', options: REQUEST_STATUS },
  ];

  readonly today = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Tunis', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date());

  constructor(private api: ApiService, private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.api.get<any>('/admin/v2/dashboard').subscribe({
      next: r => {
        this.data = r.data;
        this.k = r.data?.kpis ?? {};
        this.build();
        this.loading = false;
      },
      error: e => {
        this.error = e?.error?.message || 'Impossible de charger le tableau de bord';
        this.loading = false;
      },
    });
  }

  get firstName(): string {
    return (this.auth.getCurrentUser()?.name || '').split(' ')[0] || 'à vous';
  }

  get actions(): { label: string; hint: string; icon: string; count: number; tone: string; link: string; query: any }[] {
    return [
      { label: 'Boosts à valider', hint: 'Paiement à vérifier', icon: 'bolt', count: this.k.boostsPending ?? 0, tone: 'warning', link: '/boosts', query: { status: 'PENDING' } },
      { label: 'Vérifications', hint: 'Pièces à contrôler', icon: 'verified', count: this.k.verificationsPending ?? 0, tone: 'info', link: '/verifications', query: { status: 'PENDING' } },
      { label: 'Signalements', hint: 'Nouveaux messages', icon: 'support_agent', count: this.k.supportNew ?? 0, tone: 'danger', link: '/support', query: { status: 'NEW' } },
      { label: 'Profils en modération', hint: 'Artisans à approuver', icon: 'engineering', count: this.k.artisansPendingModeration ?? 0, tone: 'violet', link: '/artisans', query: { status: 'PENDING_MODERATION' } },
    ];
  }

  go(link: string, query?: any): void {
    this.router.navigate([link], { queryParams: query });
  }

  money(v: any): string {
    return formatMoney(v ?? 0);
  }

  num(v: any, d = 0): string {
    return formatNumber(v ?? 0, d);
  }

  private build(): void {
    const d = this.data ?? {};
    for (const u of d.recentSignups ?? []) {
      u.ago = relative(u.createdAt);
    }
    this.signups = this.bars(d.signupsPerDay ?? [], [
      { key: 'CLIENT', tone: 'primary', label: 'clients' },
      { key: 'EMPLOYEE', tone: 'violet', label: 'artisans' },
    ]);
    this.requests = this.bars(d.requestsPerDay ?? [], [{ key: 'total', tone: 'info', label: 'demandes' }]);

    const byStatus: Record<string, number> = d.requestsByStatus ?? {};
    const totalReq = Object.values(byStatus).reduce((a, b) => a + b, 0) || 1;
    this.requestsByStatus = REQUEST_STATUS
      .filter(s => byStatus[s.value])
      .map(s => ({ label: s.label, count: byStatus[s.value], pct: (byStatus[s.value] / totalReq) * 100, tone: s.tone, link: '/requests', query: { status: s.value } }));

    const top = (rows: any[], link: string, param: string): Breakdown[] => {
      const max = Math.max(1, ...rows.map(r => r.count));
      return rows.map(r => ({ label: r.label, count: r.count, pct: (r.count / max) * 100, link, query: { [param]: r.label } }));
    };
    this.topProfessions = top(d.topProfessions ?? [], '/requests', 'profession');
    this.topGovernorates = top(d.topGovernorates ?? [], '/artisans', 'governorate');
  }

  private bars(days: any[], series: { key: string; tone: string; label: string }[]): Bar[] {
    return days.map(day => {
      const parts = series.map(s => ({ value: Number(day[s.key] ?? 0), tone: s.tone, label: s.label }));
      const total = series.length === 1 ? parts[0].value : parts.reduce((a, p) => a + p.value, 0);
      const label = formatDayShort(day.day);
      const detail = parts.filter(p => p.value > 0).map(p => `${p.value} ${p.label}`).join(', ');
      return { day: day.day, label, total, parts, tooltip: `${label} : ${detail || 'aucune activité'}` };
    });
  }

  maxOf(bars: Bar[]): number {
    return Math.max(1, ...bars.map(b => b.total));
  }

  sumOf(bars: Bar[]): number {
    return bars.reduce((a, b) => a + b.total, 0);
  }

  statusLabel(v: string) {
    return labelOf(REQUEST_STATUS, v);
  }
}
