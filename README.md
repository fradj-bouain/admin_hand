# 🎛️ Interface d'Administration - Handy Tunisia

Interface d'administration Angular pour gérer la plateforme Handy Tunisia.

## 🚀 Installation

### Prérequis
- Node.js 18+
- npm ou yarn
- Angular CLI 17+

### Installation

```bash
cd admin
npm install
```

## 🔧 Configuration

### URL de l'API

Modifier `src/environments/environment.ts` :

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080',
  apiBasePath: '/api',
};
```

## 🏃 Lancer l'Application

```bash
# Développement
npm start
# ou
ng serve

# L'application sera accessible sur http://localhost:4200
```

## 📁 Structure

```
admin/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── services/      # Services API
│   │   │   ├── guards/        # Guards d'authentification
│   │   │   └── layout/        # Layout principal
│   │   └── features/
│   │       ├── auth/          # Authentification
│   │       ├── dashboard/      # Tableau de bord
│   │       ├── users/          # Gestion utilisateurs
│   │       ├── employees/      # Gestion employés
│   │       ├── requests/       # Gestion demandes
│   │       ├── reservations/   # Gestion réservations
│   │       ├── reviews/        # Gestion avis
│   │       └── categories/     # Gestion catégories
│   └── environments/
└── package.json
```

## 🔐 Authentification

L'interface utilise le même système d'authentification que l'application mobile :
- Envoi d'OTP par email
- Vérification OTP
- Token JWT stocké dans localStorage

## 📊 Fonctionnalités

### Dashboard
- Statistiques globales
- Vue d'ensemble de la plateforme

### Gestion des Utilisateurs
- Liste des utilisateurs
- Activer/Désactiver des comptes
- Voir les détails

### Gestion des Employés
- Liste des employés
- Vérifier des employés
- Modifier le statut (actif, suspendu, etc.)
- Voir les détails

### Gestion des Demandes
- Liste des demandes
- Filtrer par statut
- Voir les détails

### Gestion des Réservations
- Liste des réservations
- Voir les détails

### Gestion des Avis
- Liste des avis
- Masquer/Afficher des avis
- Modération

### Gestion des Catégories
- Créer des catégories
- Modifier des catégories
- Supprimer des catégories

## 🎨 Design

- Material Design avec Angular Material
- Interface moderne et professionnelle
- Responsive design
- Thème cohérent avec l'application mobile

## 🔗 Intégration Backend

L'interface communique avec le backend Spring Boot via :
- Service API centralisé (`ApiService`)
- Services métier (`AdminService`, `AuthService`)
- Gestion automatique du token JWT

## 📝 Notes

- Les endpoints admin doivent être créés dans le backend
- Certaines fonctionnalités utilisent des données mockées temporairement
- Le dashboard nécessite un endpoint `/api/admin/dashboard/stats`

## 🚀 Build pour Production

```bash
ng build --configuration production
```

Les fichiers seront générés dans `dist/handy-tunisia-admin/`





