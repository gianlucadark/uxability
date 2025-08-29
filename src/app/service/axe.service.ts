import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AxeService {
  constructor(private http: HttpClient) {}

  async scanUrl(url: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.http.post('http://localhost:3001/scan', { url })
      );
      return response;
    } catch (error) {
      console.error('Errore durante la scansione:', error);
      throw error;
    }
  }
}
