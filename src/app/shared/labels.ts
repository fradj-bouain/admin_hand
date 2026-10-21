import { Option } from './models';

/** Libellés et couleurs des statuts (valeurs = noms des énumérations du backend). */

export const EMPLOYEE_STATUS: Option[] = [
  { value: 'ACTIVE', label: 'Actif', tone: 'success' },
  { value: 'PENDING_MODERATION', label: 'En modération', tone: 'warning' },
  { value: 'SUSPENDED', label: 'Suspendu', tone: 'danger' },
  { value: 'INACTIVE', label: 'Inactif', tone: 'neutral' },
];

export const REQUEST_STATUS: Option[] = [
  { value: 'PENDING', label: 'Nouvelle', tone: 'info' },
  { value: 'HAS_APPLICANTS', label: 'Candidatures', tone: 'primary' },
  { value: 'EMPLOYEE_SELECTED', label: 'Artisan choisi', tone: 'violet' },
  { value: 'PRICE_PROPOSED', label: 'Prix proposé', tone: 'warning' },
  { value: 'ACCEPTED', label: 'Acceptée', tone: 'success' },
  { value: 'IN_PROGRESS', label: 'En cours', tone: 'info' },
  { value: 'AWAITING_REVIEW', label: 'À confirmer', tone: 'warning' },
  { value: 'COMPLETED', label: 'Terminée', tone: 'success' },
  { value: 'CANCELLED', label: 'Annulée', tone: 'danger' },
];

export const URGENCY: Option[] = [
  { value: 'NORMAL', label: 'Normale', tone: 'neutral' },
  { value: 'URGENT', label: 'Urgente', tone: 'warning' },
  { value: 'VERY_URGENT', label: 'Très urgente', tone: 'danger' },
];

export const RESERVATION_STATUS: Option[] = [
  { value: 'PENDING', label: 'En attente', tone: 'warning' },
  { value: 'ACCEPTED', label: 'Acceptée', tone: 'success' },
  { value: 'REJECTED', label: 'Refusée', tone: 'danger' },
  { value: 'MODIFIED', label: 'Modifiée', tone: 'violet' },
  { value: 'CONFIRMED', label: 'Confirmée', tone: 'primary' },
  { value: 'AWAITING_REVIEW', label: 'À confirmer', tone: 'warning' },
  { value: 'COMPLETED', label: 'Terminée', tone: 'success' },
  { value: 'CANCELLED', label: 'Annulée', tone: 'danger' },
];

export const BOOST_STATUS: Option[] = [
  { value: 'PENDING', label: 'À valider', tone: 'warning' },
  { value: 'ACTIVE', label: 'Actif', tone: 'success' },
  { value: 'EXPIRED', label: 'Expiré', tone: 'neutral' },
  { value: 'CANCELLED', label: 'Annulé', tone: 'danger' },
  { value: 'REFUNDED', label: 'Remboursé', tone: 'neutral' },
];

export const BOOST_TYPE: Option[] = [
  { value: 'EXPRESS_24H', label: 'Express · 3 jours', tone: 'warning' },
  { value: 'WEEK', label: 'Medium · 12 jours', tone: 'primary' },
  { value: 'MEGA_30D', label: 'Mega · 30 jours', tone: 'violet' },
];

export const PAYMENT_METHOD: Option[] = [
  { value: 'FLOUCI', label: 'Flouci', tone: 'primary' },
  { value: 'D17', label: 'D17', tone: 'info' },
  { value: 'VIREMENT', label: 'Virement', tone: 'neutral' },
  { value: 'OTHER', label: 'Autre', tone: 'neutral' },
];

export const VERIFICATION_STATUS: Option[] = [
  { value: 'PENDING', label: 'À vérifier', tone: 'warning' },
  { value: 'APPROVED', label: 'Approuvée', tone: 'success' },
  { value: 'REJECTED', label: 'Refusée', tone: 'danger' },
];

/** Abonnement SNAY3I Premium : états Google Play. */
export const PREMIUM_STATUS: Option[] = [
  { value: 'ACTIVE', label: 'Actif', tone: 'success' },
  { value: 'CANCELED', label: 'Renouvellement arrêté', tone: 'warning' },
  { value: 'IN_GRACE_PERIOD', label: 'Délai de paiement', tone: 'warning' },
  { value: 'ON_HOLD', label: 'Suspendu (paiement refusé)', tone: 'danger' },
  { value: 'PAUSED', label: 'En pause', tone: 'neutral' },
  { value: 'PENDING', label: 'Paiement en attente', tone: 'info' },
  { value: 'EXPIRED', label: 'Expiré', tone: 'neutral' },
  { value: 'PENDING_PURCHASE_CANCELED', label: 'Achat abandonné', tone: 'neutral' },
  { value: 'UNKNOWN', label: 'Inconnu', tone: 'neutral' },
];

export const PREMIUM_PLAN: Option[] = [
  { value: 'monthly', label: 'Mensuel', tone: 'info' },
  { value: 'yearly', label: 'Annuel', tone: 'violet' },
];

/** État du badge sur le profil de l'artisan (employees.verification_status). */
export const BADGE_STATUS: Option[] = [
  { value: 'NONE', label: 'Aucune demande', tone: 'neutral' },
  { value: 'PENDING', label: 'Demande en cours', tone: 'warning' },
  { value: 'VERIFIED', label: 'Badge actif', tone: 'success' },
  { value: 'EXPIRED', label: 'Badge expiré', tone: 'danger' },
];

export const SUPPORT_STATUS: Option[] = [
  { value: 'NEW', label: 'Nouveau', tone: 'danger' },
  { value: 'IN_PROGRESS', label: 'En cours', tone: 'warning' },
  { value: 'RESOLVED', label: 'Résolu', tone: 'success' },
];

export const SUPPORT_CATEGORY: Option[] = [
  { value: 'BUG', label: 'Bug', tone: 'danger' },
  { value: 'ACCOUNT', label: 'Compte', tone: 'info' },
  { value: 'SUGGESTION', label: 'Suggestion', tone: 'violet' },
  { value: 'OTHER', label: 'Autre', tone: 'neutral' },
];

export const ADMIN_ROLE: Option[] = [
  { value: 'SUPER_ADMIN', label: 'Super admin', tone: 'violet' },
  { value: 'ADMIN', label: 'Administrateur', tone: 'primary' },
  { value: 'MODERATOR', label: 'Modérateur', tone: 'info' },
];

export const STORY_STATE: Option[] = [
  { value: 'active', label: 'Visible', tone: 'success' },
  { value: 'expired', label: 'Expirée', tone: 'neutral' },
  { value: 'disabled', label: 'Masquée', tone: 'danger' },
];

export const APPLICANT_STATUS: Option[] = [
  { value: 'PENDING', label: 'En attente', tone: 'warning' },
  { value: 'SELECTED', label: 'Choisi', tone: 'success' },
  { value: 'REJECTED', label: 'Non retenu', tone: 'neutral' },
  { value: 'WITHDRAWN', label: 'Retiré', tone: 'neutral' },
];

export const REVIEW_SOURCE: Option[] = [
  { value: 'request', label: 'Demande', tone: 'primary' },
  { value: 'reservation', label: 'Réservation', tone: 'info' },
  { value: 'none', label: 'Sans lien', tone: 'neutral' },
];

/** Les 24 gouvernorats (noms officiels enregistrés par l'app). */
export const GOVERNORATES: string[] = [
  'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa', 'Jendouba', 'Kairouan', 'Kasserine',
  'Kébili', 'Kef', 'Mahdia', 'Manouba', 'Médenine', 'Monastir', 'Nabeul', 'Sfax', 'Sidi Bouzid',
  'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan',
];

export const GOVERNORATE_OPTIONS: Option[] = GOVERNORATES.map(g => ({ value: g, label: g }));

export function labelOf(options: Option[] | undefined, value: any): Option | undefined {
  if (!options || value === null || value === undefined) {
    return undefined;
  }
  const v = String(value);
  return options.find(o => o.value === v) ?? options.find(o => o.value.toLowerCase() === v.toLowerCase());
}
