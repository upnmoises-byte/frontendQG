import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {

  private readonly API = `${environment.apiUrl}/configuracion`;

  constructor(private http: HttpClient) {}

  obtener(): Observable<Record<string, string>> {
    return this.http.get<Record<string, string>>(this.API);
  }

  guardar(mapa: Record<string, string>): Observable<Record<string, string>> {
    return this.http.put<Record<string, string>>(this.API, mapa);
  }
}
