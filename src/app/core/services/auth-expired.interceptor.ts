import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

/** Session admin expirée (401) : retour à la connexion plutôt que des erreurs sur chaque page. */
@Injectable()
export class AuthExpiredInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401 && !req.url.includes('/admin-auth/login') && this.auth.isAuthenticated()) {
          this.auth.logout();
        }
        return throwError(() => err);
      }),
    );
  }
}
