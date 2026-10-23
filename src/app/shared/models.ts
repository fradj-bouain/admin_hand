/** Modèles partagés de la console d'administration. */

export type Tone = 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger' | 'violet';

export interface Option {
  value: string;
  label: string;
  tone?: Tone;
}

export type CellType =
  | 'text'
  | 'longtext'
  | 'person'
  | 'datetime'
  | 'date'
  | 'money'
  | 'number'
  | 'rating'
  | 'stars'
  | 'status'
  | 'boolean'
  | 'chips'
  | 'image'
  | 'color'
  | 'phone';

export type FilterType = 'text' | 'select' | 'multiselect' | 'boolean' | 'date' | 'number';

export interface ColumnFilter {
  type: FilterType;
  /** Nom du paramètre envoyé à l'API (par défaut : la clé de la colonne). */
  param?: string;
  options?: Option[];
  placeholder?: string;
  /** Libellés oui / non pour un filtre booléen. */
  trueLabel?: string;
  falseLabel?: string;
}

export interface ColumnDef {
  key: string;
  label: string;
  type?: CellType;
  /** Clé de tri côté serveur ; false = non triable (par défaut : la clé). */
  sortKey?: string | false;
  filter?: ColumnFilter;
  width?: string;
  align?: 'start' | 'end' | 'center';
  /** Ligne secondaire sous la valeur (ex. téléphone sous le nom). */
  subKey?: string;
  /** Colonne « person » : clé de la photo (par défaut photoUrl). */
  photoKey?: string;
  /** Statut / énumération : libellé et couleur de chaque valeur. */
  options?: Option[];
  trueLabel?: string;
  falseLabel?: string;
  /** Valeur calculée à partir de la ligne. */
  value?: (row: any) => any;
  /** Masquée par défaut (affichable dans le menu Colonnes). */
  hidden?: boolean;
  /** Suffixe / unité (ex. « j »). */
  suffix?: string;
  /** Colonne « image » : vignette large (bannière) au lieu d'un carré. */
  wide?: boolean;
}

export interface RowAction {
  icon: string;
  label: string;
  tone?: Tone;
  visible?: (row: any) => boolean;
  handler: (row: any) => void;
}

export interface PageResult<T = any> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ===== Formulaires =====

export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'password'
  | 'number'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'toggle'
  | 'datetime'
  | 'color'
  | 'image';

export interface FormField {
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  options?: Option[];
  hint?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  /** Nombre maximum de choix (sélection multiple). */
  maxItems?: number;
  /** Prend toute la largeur du formulaire. */
  full?: boolean;
  pattern?: string;
  patternMessage?: string;
  /** Champ « image » : aperçu large (bannière) au lieu d'un carré. */
  wide?: boolean;
  /** Champ affiché seulement si la condition est vraie (valeurs du formulaire) ; masqué = non vérifié et envoyé vide. */
  visibleIf?: (value: Record<string, any>) => boolean;
}

// ===== Fiche détail =====

export interface DetailItem {
  label: string;
  value: any;
  type?: CellType;
  options?: Option[];
  href?: string;
  full?: boolean;
}

export interface DetailSection {
  title: string;
  items: DetailItem[];
}

export interface DetailList {
  title: string;
  columns: ColumnDef[];
  rows: any[];
  empty?: string;
}

export interface DetailAction {
  label: string;
  icon: string;
  tone?: Tone;
  /** Ferme la fiche avant d'exécuter l'action. */
  closeFirst?: boolean;
  handler: () => void;
}

export interface DetailData {
  title: string;
  subtitle?: string;
  avatar?: string | null;
  icon?: string;
  badges?: { label: string; tone: Tone }[];
  sections: DetailSection[];
  lists?: DetailList[];
  images?: { label: string; url: string | null }[];
  /** Galeries de photos groupées (ex. projets du portfolio d'un artisan). */
  galleries?: DetailGallery[];
  actions?: DetailAction[];
}

export interface DetailGallery {
  title: string;
  empty?: string;
  groups: { title?: string | null; subtitle?: string | null; text?: string | null; photos: string[] }[];
}
