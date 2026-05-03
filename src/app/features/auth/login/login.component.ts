import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });

    // Si déjà connecté, rediriger vers le dashboard
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  login(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open(`Bienvenue ${response.data?.name || 'Admin'} !`, 'Fermer', {
            duration: 3000,
          });
          this.router.navigate(['/dashboard']);
        } else {
          this.snackBar.open(response.message || 'Erreur de connexion', 'Fermer', {
            duration: 3000,
          });
          this.isLoading = false;
        }
      },
      error: (error) => {
        this.isLoading = false;
        const errorMessage = error.error?.message || 'Erreur lors de la connexion';
        this.snackBar.open(errorMessage, 'Fermer', {
          duration: 3000,
        });
      },
    });
  }
}
