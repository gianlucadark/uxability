import { environment } from 'src/environments/environment';

export const API_ENDPOINTS = {
  proxyHtml: `${environment.apiUrl}/proxy-html`,
  reportPdf: `${environment.apiUrl}/dowload-report/pdf`,
  reportCsv: `${environment.apiUrl}/dowload-report/csv`,
  scan: `${environment.apiUrl}/scan`,
  apiAxe: `${environment.apiUrl}/api/gemini/axe`,
  apiLght: `${environment.apiUrl}/api/gemini/lighthousef`,
};

export const URL = 'http://localhost:4200';
