import { environment } from '../../environments/environment';
import { ColumnDef } from './models';
import { labelOf } from './labels';

/** Formats d'affichage de la console : dates à l'heure de Tunisie, montants en DT. */

const TZ = 'Africa/Tunis';

const DATE_TIME = new Intl.DateTimeFormat('fr-FR', {
  timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});
const DATE_ONLY = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });
const DAY_SHORT = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: '2-digit', month: 'short' });

/** Date reçue de l'API. Sans fuseau (anciennes routes), on la considère en UTC comme le serveur. */
export function toDate(value: any): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  let s = String(value);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s)) {
    s += 'Z';
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDateTime(value: any): string {
  const d = toDate(value);
  return d ? DATE_TIME.format(d).replace(',', ' ·') : '';
}

export function formatDate(value: any): string {
  const d = toDate(value);
  return d ? DATE_ONLY.format(d) : '';
}

export function formatDayShort(isoDay: string): string {
  const d = new Date(isoDay + 'T12:00:00Z');
  return DAY_SHORT.format(d);
}

/** « il y a 3 h », « dans 2 j ». */
export function relative(value: any): string {
  const d = toDate(value);
  if (!d) {
    return '';
  }
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const m = Math.round(abs / 60000);
  const h = Math.round(abs / 3600000);
  const j = Math.round(abs / 86400000);
  const text = m < 1 ? "à l'instant" : m < 60 ? `${m} min` : h < 24 ? `${h} h` : j < 31 ? `${j} j` : `${Math.round(j / 30)} mois`;
  if (text === "à l'instant") {
    return text;
  }
  return diff < 0 ? `il y a ${text}` : `dans ${text}`;
}

export function formatMoney(value: any): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const n = Number(value);
  if (isNaN(n)) {
    return String(value);
  }
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} DT`;
}

export function formatNumber(value: any, digits = 0): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const n = Number(value);
  return isNaN(n) ? String(value) : n.toLocaleString('fr-FR', { maximumFractionDigits: digits });
}

/** URL d'un fichier (photo, document) : absolue telle quelle, sinon servie par l'API. */
export function fileUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  if (path.startsWith('/')) {
    return `${environment.apiUrl}${path}`;
  }
  return `${environment.apiUrl}${environment.apiBasePath}/files/${path}`;
}

export function initials(name: string | null | undefined): string {
  if (!name) {
    return '?';
  }
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

/** Valeur brute d'une colonne pour une ligne. */
export function rawValue(column: ColumnDef, row: any): any {
  return column.value ? column.value(row) : row?.[column.key];
}

/** Texte simple d'une cellule (export CSV, info-bulles). */
export function cellText(column: ColumnDef, row: any): string {
  const v = rawValue(column, row);
  switch (column.type) {
    case 'datetime':
      return formatDateTime(v);
    case 'date':
      return formatDate(v);
    case 'money':
      return formatMoney(v);
    case 'rating':
      return v === null || v === undefined ? '' : formatNumber(v, 1);
    case 'stars':
      return v === null || v === undefined ? '' : `${v}/5`;
    case 'status':
      return labelOf(column.options, v)?.label ?? (v ?? '');
    case 'boolean':
      return v === null || v === undefined ? '' : v ? (column.trueLabel ?? 'Oui') : (column.falseLabel ?? 'Non');
    case 'chips':
      return Array.isArray(v) ? v.join(', ') : (v ?? '');
    case 'person': {
      const sub = column.subKey ? row?.[column.subKey] : null;
      return [v, sub].filter(Boolean).join(' · ');
    }
    case 'number':
      return formatNumber(v, 2) + (column.suffix && v !== null && v !== undefined ? ` ${column.suffix}` : '');
    default:
      return v === null || v === undefined ? '' : String(v);
  }
}
