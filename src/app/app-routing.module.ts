import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { LayoutComponent } from './core/layout/layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ClientsPageComponent } from './features/clients/clients-page.component';
import { ArtisansPageComponent } from './features/artisans/artisans-page.component';
import { AdminsPageComponent } from './features/admins/admins-page.component';
import { RequestsPageComponent } from './features/requests/requests-page.component';
import { ReservationsPageComponent } from './features/reservations/reservations-page.component';
import { ReviewsPageComponent } from './features/reviews/reviews-page.component';
import { StoriesPageComponent } from './features/stories/stories-page.component';
import { BoostsPageComponent } from './features/boosts/boosts-page.component';
import { VerificationsPageComponent } from './features/verifications/verifications-page.component';
import { SupportPageComponent } from './features/support/support-page.component';
import { MessagesPageComponent } from './features/messages/messages-page.component';
import { CategoriesPageComponent } from './features/categories/categories-page.component';
import { SettingsComponent } from './features/settings/settings.component';
import { PrivacyPolicyComponent } from './features/public/privacy-policy/privacy-policy.component';
import { DeleteUserDataComponent } from './features/public/delete-user-data/delete-user-data.component';

const routes: Routes = [
  {
    path: 'privacy-policy',
    component: PrivacyPolicyComponent,
  },
  {
    path: 'delete-user-data',
    component: DeleteUserDataComponent,
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent, title: 'Tableau de bord · SNAY3I' },
      { path: 'clients', component: ClientsPageComponent, title: 'Clients · SNAY3I' },
      { path: 'artisans', component: ArtisansPageComponent, title: 'Artisans · SNAY3I' },
      { path: 'admins', component: AdminsPageComponent, title: 'Administrateurs · SNAY3I' },
      { path: 'requests', component: RequestsPageComponent, title: 'Demandes · SNAY3I' },
      { path: 'reservations', component: ReservationsPageComponent, title: 'Réservations · SNAY3I' },
      { path: 'reviews', component: ReviewsPageComponent, title: 'Avis · SNAY3I' },
      { path: 'stories', component: StoriesPageComponent, title: 'Stories · SNAY3I' },
      { path: 'boosts', component: BoostsPageComponent, title: 'Boosts · SNAY3I' },
      { path: 'verifications', component: VerificationsPageComponent, title: 'Vérifications · SNAY3I' },
      { path: 'messages', component: MessagesPageComponent, title: 'Messages · SNAY3I' },
      { path: 'support', component: SupportPageComponent, title: 'Signalements · SNAY3I' },
      { path: 'categories', component: CategoriesPageComponent, title: 'Métiers · SNAY3I' },
      { path: 'settings', component: SettingsComponent, title: 'Paramètres · SNAY3I' },
      // Anciennes adresses
      { path: 'users', redirectTo: 'clients', pathMatch: 'full' },
      { path: 'employees', redirectTo: 'artisans', pathMatch: 'full' },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
