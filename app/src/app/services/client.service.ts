import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Client } from '../models/client.model';

@Injectable({ providedIn: 'root' })
export class ClientService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.clientsUrl;

  getAll(): Observable<Client[]> {
    return this.http.get<Client[]>(this.baseUrl);
  }

  getById(id: string): Observable<Client> {
    return this.http.get<Client>(`${this.baseUrl}/${id}`);
  }

  async create(client: Omit<Client, 'id'>): Promise<string> {
    const res = await firstValueFrom(this.http.post<Client>(this.baseUrl, client));
    return res.id!;
  }

  async update(id: string, client: Partial<Omit<Client, 'id'>>): Promise<void> {
    await firstValueFrom(this.http.put<void>(`${this.baseUrl}/${id}`, client));
  }

  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}`));
  }
}
