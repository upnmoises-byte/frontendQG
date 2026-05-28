import { Injectable, signal } from '@angular/core';

export type DialogVariant = 'confirm' | 'warning' | 'danger' | 'info';

export interface DialogRequest {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
}

export interface DialogState extends DialogRequest {
  visible: boolean;
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  readonly state = signal<DialogState | null>(null);

  private resolver: ((value: boolean) => void) | null = null;

  confirm(request: DialogRequest): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
      this.state.set({
        visible: true,
        title: request.title,
        message: request.message,
        confirmText: request.confirmText ?? 'Confirmar',
        cancelText: request.cancelText ?? 'Cancelar',
        variant: request.variant ?? 'confirm'
      });
    });
  }

  resolve(value: boolean): void {
    const resolver = this.resolver;
    this.resolver = null;
    this.state.set(null);
    resolver?.(value);
  }
}
