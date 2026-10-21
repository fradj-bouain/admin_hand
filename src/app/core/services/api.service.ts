import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParameterCodec, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  statusCode?: number;
}

/**
 * Encode chaque caractère spécial des paramètres d'URL. Le codec par défaut d'Angular laisse « + » tel
 * quel, que le serveur lit comme un espace : « +216 50… » devenait « 216 50… » et ne trouvait rien.
 */
class StrictParamCodec implements HttpParameterCodec {
  encodeKey(key: string): string {
    return encodeURIComponent(key);
  }
  encodeValue(value: string): string {
    return encodeURIComponent(value);
  }
  decodeKey(key: string): string {
    return decodeURIComponent(key);
  }
  decodeValue(value: string): string {
    return decodeURIComponent(value);
  }
}

const PARAM_CODEC = new StrictParamCodec();

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = `${environment.apiUrl}${environment.apiBasePath}`;

  constructor(private http: HttpClient) {}

  /** Base URL for files (images, etc.) - use with path from upload response */
  getFilesBaseUrl(): string {
    return `${this.baseUrl}/files/`;
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('admin_token');
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  get<T>(endpoint: string, params?: any): Observable<ApiResponse<T>> {
    let httpParams = new HttpParams({ encoder: PARAM_CODEC });
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }

    return this.http.get<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, {
      headers: this.getHeaders(),
      params: httpParams,
    });
  }

  post<T>(endpoint: string, data?: any): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, data, {
      headers: this.getHeaders(),
    });
  }

  put<T>(endpoint: string, data?: any, queryParams?: any): Observable<ApiResponse<T>> {
    let httpParams = new HttpParams({ encoder: PARAM_CODEC });
    if (queryParams) {
      Object.keys(queryParams).forEach(key => {
        if (queryParams[key] !== undefined && queryParams[key] !== null) {
          httpParams = httpParams.set(key, queryParams[key]);
        }
      });
    }

    return this.http.put<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, data, {
      headers: this.getHeaders(),
      params: httpParams,
    });
  }

  delete<T>(endpoint: string): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, {
      headers: this.getHeaders(),
    });
  }

  patch<T>(endpoint: string, data?: any, queryParams?: any): Observable<ApiResponse<T>> {
    let httpParams = new HttpParams({ encoder: PARAM_CODEC });
    if (queryParams) {
      Object.keys(queryParams).forEach(key => {
        if (queryParams[key] !== undefined && queryParams[key] !== null) {
          httpParams = httpParams.set(key, queryParams[key]);
        }
      });
    }

    return this.http.patch<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, data, {
      headers: this.getHeaders(),
      params: httpParams,
    });
  }

  /** Upload image (multipart). Do not set Content-Type so browser sets multipart boundary. */
  uploadImage(file: File): Observable<ApiResponse<{ url: string; path: string }>> {
    const token = localStorage.getItem('admin_token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ApiResponse<{ url: string; path: string }>>(
      `${this.baseUrl}/files/upload/image`,
      formData,
      { headers }
    );
  }
}
