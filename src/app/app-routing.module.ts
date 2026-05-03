import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { LayoutComponent } from './core/layout/layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { UsersComponent } from './features/users/users.component';
import { AdminsComponent } from './features/admins/admins.component';
import { RequestsComponent } from './features/requests/requests.component';
import { ReservationsComponent } from './features/reservations/reservations.component';
import { ReviewsComponent } from './features/reviews/reviews.component';
import { CategoriesComponent } from './features/categories/categories.component';
import { BoostsComponent } from './features/boosts/boosts.component';
import { VerificationsComponent } from './features/verifications/verifications.component';
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
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        component: DashboardComponent,
      },
      {
        path: 'users',
        component: UsersComponent,
      },
      {
        path: 'admins',
        component: AdminsComponent,
      },
      {
        path: 'requests',
        component: RequestsComponent,
      },
      {
        path: 'reservations',
        component: ReservationsComponent,
      },
      {
        path: 'reviews',
        component: ReviewsComponent,
      },
      {
        path: 'categories',
        component: CategoriesComponent,
      },
      {
        path: 'boosts',
        component: BoostsComponent,
      },
      {
        path: 'verifications',
        component: VerificationsComponent,
      },
      {
        path: 'settings',
        component: SettingsComponent,
      },
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
