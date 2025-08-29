import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GeminiService {
  constructor(private http: HttpClient) {}

  interpretAxe(description: string): Observable<{ summary: string }> {
    return this.http.post<{ summary: string }>('http://localhost:3001/api/gemini/axe', { description });
  }

  interpretLighthouse(descriptions: string[]): Observable<{ explanations: string[] }> {
    return this.http.post<{ explanations: string[] }>('http://localhost:3001/api/gemini/lighthouse', { descriptions });
  }
}
