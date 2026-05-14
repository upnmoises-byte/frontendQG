import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, ToastItem } from '../services/notification.service';

@Component({
  selector: 'app-toast-stack',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-host" aria-live="polite" aria-relevant="additions">
      @for (t of notif.toasts(); track t.id) {
        <div class="toast" [ngClass]="'toast-' + t.type" role="status">
          <span class="toast-icon" aria-hidden="true">{{ icono(t) }}</span>
          <p class="toast-msg">{{ t.message }}</p>
          <button type="button" class="toast-close" (click)="notif.dismiss(t.id)" aria-label="Cerrar notificación">
            ×
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './toast-stack.component.css'
})
export class ToastStackComponent {
  constructor(readonly notif: NotificationService) {}

  icono(t: ToastItem): string {
    switch (t.type) {
      case 'success':
        return '✓';
      case 'error':
        return '!';
      case 'warning':
        return '▲';
      default:
        return 'i';
    }
  }
}
