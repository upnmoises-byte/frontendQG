import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  correo = '';
  password = '';
  error = '';
  cargando = false;

  constructor(
    private router: Router,
    private auth: AuthService
  ) {}

  login(): void {
    this.error = '';
    if (!this.correo.trim() || !this.password) {
      this.error = 'Ingrese correo y contraseña';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.correo.trim())) {
      this.error = 'Ingrese un correo válido';
      return;
    }
    this.cargando = true;

    this.auth.login(this.correo.trim(), this.password).subscribe({
      next: () => {
        this.cargando = false;
        void this.router.navigate(['/dashboard']);
      },
      error: (err: { error?: { mensaje?: string } }) => {
        this.cargando = false;
        this.error = err.error?.mensaje ?? 'Credenciales incorrectas';
      }
    });
  }
}
