import { LOCALE_ID, NgModule } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Material Modules
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorIntl } from '@angular/material/paginator';

// Briques partagées de la console
import { ChipComponent } from './shared/chip.component';
import { CellComponent } from './shared/cell.component';
import { DataTableComponent } from './shared/data-table/data-table.component';
import { ConfirmDialogComponent } from './shared/dialogs/confirm-dialog.component';
import { FormDialogComponent } from './shared/dialogs/form-dialog.component';
import { DetailSheetComponent } from './shared/dialogs/detail-sheet.component';
import { KpiComponent, PageHeaderComponent } from './shared/page-header.component';
import { FrenchPaginatorIntl } from './shared/paginator-intl';

registerLocaleData(localeFr);

// Components
import { LoginComponent } from './features/auth/login/login.component';
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
import { CategoriesPageComponent } from './features/categories/categories-page.component';
import { LayoutComponent } from './core/layout/layout.component';
import { SettingsComponent } from './features/settings/settings.component';
import { PrivacyPolicyComponent } from './features/public/privacy-policy/privacy-policy.component';
import { DeleteUserDataComponent } from './features/public/delete-user-data/delete-user-data.component';
import { AuthExpiredInterceptor } from './core/services/auth-expired.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    PrivacyPolicyComponent,
    DeleteUserDataComponent,
    DashboardComponent,
    ClientsPageComponent,
    ArtisansPageComponent,
    AdminsPageComponent,
    RequestsPageComponent,
    ReservationsPageComponent,
    ReviewsPageComponent,
    StoriesPageComponent,
    BoostsPageComponent,
    VerificationsPageComponent,
    SupportPageComponent,
    CategoriesPageComponent,
    LayoutComponent,
    SettingsComponent,
    ChipComponent,
    CellComponent,
    DataTableComponent,
    ConfirmDialogComponent,
    FormDialogComponent,
    DetailSheetComponent,
    PageHeaderComponent,
    KpiComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    // Material
    MatToolbarModule,
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatSnackBarModule,
    MatChipsModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatDividerModule,
    MatProgressBarModule,
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'fr' },
    { provide: MatPaginatorIntl, useClass: FrenchPaginatorIntl },
    { provide: HTTP_INTERCEPTORS, useClass: AuthExpiredInterceptor, multi: true },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
