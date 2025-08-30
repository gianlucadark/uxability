import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_ENDPOINTS } from 'src/endpoints/endopoints';

@Injectable({
  providedIn: 'root'
})
export class AxeService {
  constructor(private http: HttpClient) {}

  async scanUrl(url: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.http.post(API_ENDPOINTS.scan, { url })
      );
      return response;
    } catch (error) {
      console.error('Errore durante la scansione:', error);
      throw error;
    }
  }
}
