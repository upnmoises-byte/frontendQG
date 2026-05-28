import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogService } from '../services/dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (dialog.state(); as d) {
      <div class="qg-dialog-backdrop" (click)="cancelar()">
        <div
          class="qg-dialog"
          [class.qg-dialog-danger]="d.variant === 'danger'"
          [class.qg-dialog-warning]="d.variant === 'warning'"
          role="alertdialog"
          aria-modal="true"
          (click)="$event.stopPropagation()"
        >
          <header class="qg-dialog-header">
            <h3>{{ d.title }}</h3>
          </header>
          <p class="qg-dialog-body">{{ d.message }}</p>
          <footer class="qg-dialog-footer">
            <button type="button" class="qg-btn qg-btn-ghost" (click)="cancelar()">
              {{ d.cancelText }}
            </button>
            <button
              type="button"
              class="qg-btn"
              [class.qg-btn-danger]="d.variant === 'danger'"
              [class.qg-btn-warning]="d.variant === 'warning'"
              [class.qg-btn-primary]="d.variant !== 'danger' && d.variant !== 'warning'"
              (click)="confirmar()"
            >
              {{ d.confirmText }}
            </button>
          </footer>
        </div>
      </div>
    }
  `,
  styleUrl: './confirm-dialog.component.css'
})
export class ConfirmDialogComponent {
  constructor(readonly dialog: DialogService) {}

  confirmar(): void {
    this.dialog.resolve(true);
  }

  cancelar(): void {
    this.dialog.resolve(false);
  }
}
