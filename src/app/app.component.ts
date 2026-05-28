import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ToastStackComponent } from './components/toast-stack.component';
import { ConfirmDialogComponent } from './components/confirm-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastStackComponent, ConfirmDialogComponent],
  template: `<router-outlet /><app-toast-stack /><app-confirm-dialog />`
})
export class AppComponent {}