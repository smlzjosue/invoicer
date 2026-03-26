import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { UserProfile } from '../models/user-profile.model';
import { environment } from '../../environments/environment';

const STORAGE_KEY = 'invoicer_user_profile';

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly baseUrl = environment.profileUrl;

  constructor(private http: HttpClient) {}

  /** Lectura rápida desde caché localStorage — síncrona, para auto-fill en editor */
  getProfile(): UserProfile | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as UserProfile) : null;
    } catch {
      return null;
    }
  }

  hasProfile(): boolean {
    return !!this.getProfile();
  }

  /** Carga perfil desde la API y actualiza el caché local */
  loadProfile(): Observable<UserProfile | null> {
    return this.http.get<UserProfile>(this.baseUrl).pipe(
      tap((profile) => this.saveToCache(profile)),
      catchError(() => of(null))
    );
  }

  /** Persiste el perfil en la API y actualiza el caché local */
  saveProfile(profile: UserProfile): Observable<UserProfile> {
    return this.http.put<UserProfile>(this.baseUrl, profile).pipe(
      tap((saved) => this.saveToCache(saved))
    );
  }

  private saveToCache(profile: UserProfile): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }
}
