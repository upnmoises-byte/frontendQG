import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private idSeq = 0;
  readonly toasts = signal<ToastItem[]>([]);

  show(message: string, type: ToastType = 'info', durationMs = 5200): void {
    const id = ++this.idSeq;
    this.toasts.update((list) => [...list, { id, message, type }]);
    window.setTimeout(() => this.dismiss(id), durationMs);
  }

  success(message: string): void {
    this.show(message, 'success', 4800);
  }

  error(message: string): void {
    this.show(message, 'error', 8000);
  }

  warning(message: string): void {
    this.show(message, 'warning', 6200);
  }

  info(message: string): void {
    this.show(message, 'info', 5200);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
