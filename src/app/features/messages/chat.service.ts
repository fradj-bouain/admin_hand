import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { PageResult } from '../../shared/models';

/** Une discussion avec un client ou un artisan (vue côté équipe). */
export interface ChatSummary {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  email?: string;
  photoUrl?: string;
  type: 'CLIENT' | 'EMPLOYEE';
  active: boolean;
  pushReady: boolean;
  employeeId?: string;
  profession?: string;
  governorate?: string;
  lastMessageText?: string;
  lastMessageAt?: string;
  unread: number;
  userUnread: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  mine: boolean;
  text?: string | null;
  imageUrl?: string | null;
  read: boolean;
  adminName?: string | null;
  createdAt: string;
}

const BASE = '/admin/v2/chats';

/** Messagerie de l'équipe (« SNAY3I Support » dans l'app) et compteur des messages non lus du menu. */
@Injectable({ providedIn: 'root' })
export class ChatService {
  /** Messages reçus que l'équipe n'a pas encore lus. */
  readonly unread$ = new BehaviorSubject<number>(0);

  constructor(private api: ApiService, private router: Router) {}

  refreshUnread(): void {
    this.api.get<any>(`${BASE}/unread`).subscribe({
      next: r => this.unread$.next(r.data?.messages ?? 0),
      error: () => {},
    });
  }

  list(params: Record<string, any>): Observable<PageResult> {
    return this.api.get<PageResult>(BASE, params).pipe(map(r => r.data as PageResult));
  }

  open(userId: string): Observable<ChatSummary> {
    return this.api.post<ChatSummary>(`${BASE}/with/${userId}`, {}).pipe(map(r => r.data as ChatSummary));
  }

  conversation(id: string): Observable<ChatSummary> {
    return this.api.get<ChatSummary>(`${BASE}/${id}`).pipe(map(r => r.data as ChatSummary));
  }

  messages(id: string, before?: string): Observable<ChatMessage[]> {
    return this.api.get<ChatMessage[]>(`${BASE}/${id}/messages`, before ? { before, limit: 50 } : { limit: 50 })
      .pipe(map(r => r.data ?? []));
  }

  send(id: string, text: string, imageUrl?: string): Observable<ChatMessage> {
    return this.api.post<ChatMessage>(`${BASE}/${id}/messages`, { text, imageUrl }).pipe(map(r => r.data as ChatMessage));
  }

  markRead(id: string): Observable<unknown> {
    return this.api.post(`${BASE}/${id}/read`, {});
  }

  archive(id: string): Observable<unknown> {
    return this.api.delete(`${BASE}/${id}`);
  }

  /** Ouvre la messagerie sur la discussion avec ce compte (boutons « Écrire » des autres pages). */
  writeTo(userId: string | null | undefined): void {
    if (userId) {
      this.router.navigate(['/messages'], { queryParams: { user: userId } });
    }
  }
}
