import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ToastStackComponent } from './components/toast-stack.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastStackComponent],
  template: `<router-outlet /><app-toast-stack />`
})
export class AppComponent {}