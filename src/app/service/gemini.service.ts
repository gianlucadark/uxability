import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from 'src/endpoints/endopoints';

@Injectable({ providedIn: 'root' })
export class GeminiService {
  constructor(private http: HttpClient) {}

  interpretAxe(description: string): Observable<{ summary: string }> {
    return this.http.post<{ summary: string }>(API_ENDPOINTS.apiAxe, { description });
  }

  interpretLighthouse(descriptions: string[]): Observable<{ explanations: string[] }> {
    return this.http.post<{ explanations: string[] }>(API_ENDPOINTS.apiLght, { descriptions });
  }
}
