import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subject, Subscription, interval } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { formatPhone, initials, toDate } from '../../shared/format';
import { UiService } from '../../shared/ui.service';
import { ChatMessage, ChatService, ChatSummary } from './chat.service';
import { NewChatDialogComponent } from './new-chat-dialog.component';

type ListFilter = 'all' | 'unread' | 'CLIENT' | 'EMPLOYEE';
type ThreadItem = { kind: 'day'; label: string } | { kind: 'msg'; m: ChatMessage; first: boolean };

const PAGE_SIZE = 30;
const MAX_TEXT = 2000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const tunisDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis' });
const tunisTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Tunis', hour: '2-digit', minute: '2-digit' });
const tunisLongDay = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Tunis', weekday: 'long', day: 'numeric', month: 'long' });
const tunisShortDay = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Tunis', day: '2-digit', month: '2-digit', year: '2-digit' });

/**
 * Messagerie de l'équipe : à gauche les discussions (recherche serveur, filtres), à droite la discussion
 * ouverte. Les personnes reçoivent une notification et répondent depuis l'écran Messages de l'app.
 */
@Component({
  selector: 'app-messages-page',
  templateUrl: './messages-page.component.html',
  styleUrls: ['./messages-page.component.scss'],
})
export class MessagesPageComponent implements OnInit, OnDestroy {
  @ViewChild('scroller') scroller?: ElementRef<HTMLDivElement>;
  @ViewChild('composer') composer?: ElementRef<HTMLTextAreaElement>;

  readonly filters: { key: ListFilter; label: string }[] = [
    { key: 'all', label: 'Toutes' },
    { key: 'unread', label: 'Non lues' },
    { key: 'CLIENT', label: 'Clients' },
    { key: 'EMPLOYEE', label: 'Artisans' },
  ];
  readonly maxText = MAX_TEXT;

  conversations: ChatSummary[] = [];
  total = 0;
  listPage = 0;
  listLoading = false;
  q = '';
  listFilter: ListFilter = 'all';

  active: ChatSummary | null = null;
  messages: ChatMessage[] = [];
  thread: ThreadItem[] = [];
  threadLoading = false;
  hasOlder = false;
  loadingOlder = false;

  draft = '';
  image: { file: File; preview: string } | null = null;
  sending = false;

  readonly isSuperAdmin: boolean;
  private readonly search$ = new Subject<void>();
  private subs: Subscription[] = [];

  constructor(
    private chats: ChatService,
    private api: ApiService,
    private ui: UiService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router,
    auth: AuthService,
  ) {
    this.isSuperAdmin = (auth.getCurrentUser()?.role || '').toLowerCase() === 'super_admin';
  }

  ngOnInit(): void {
    this.subs.push(
      this.search$.pipe(debounceTime(350)).subscribe(() => this.loadList(true)),
      this.route.queryParamMap.subscribe(qp => {
        const userId = qp.get('user');
        const id = qp.get('c');
        if (qp.get('filter') === 'unread') {
          this.listFilter = 'unread';
        }
        if (userId) {
          this.openWith(userId);
        } else if (id && id !== this.active?.id) {
          this.select(id);
        }
      }),
      // Rafraîchissements : la discussion ouverte toutes les 5 s, la liste toutes les 15 s (onglet visible)
      interval(5_000).pipe(filter(() => !document.hidden && !!this.active)).subscribe(() => this.pollThread()),
      interval(15_000).pipe(filter(() => !document.hidden)).subscribe(() => this.loadList(false, true)),
    );
    this.loadList(true);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.clearImage();
  }

  // ===== Liste =====

  onSearch(): void {
    this.search$.next();
  }

  setFilter(f: ListFilter): void {
    this.listFilter = f;
    this.loadList(true);
  }

  private listParams(page: number, size: number): Record<string, any> {
    const p: Record<string, any> = { page, size };
    if (this.q.trim()) {
      p['q'] = this.q.trim();
    }
    if (this.listFilter === 'unread') {
      p['unread'] = 'true';
    } else if (this.listFilter !== 'all') {
      p['type'] = this.listFilter;
    }
    return p;
  }

  /** [reset] : repart de la première page ; [silent] : rafraîchissement périodique des pages déjà chargées. */
  loadList(reset: boolean, silent = false): void {
    if (!silent) {
      this.listLoading = true;
    }
    const size = reset ? PAGE_SIZE : Math.max(PAGE_SIZE, (this.listPage + 1) * PAGE_SIZE);
    this.chats.list(this.listParams(0, size)).subscribe({
      next: r => {
        this.conversations = r.content as ChatSummary[];
        this.total = r.totalElements;
        if (reset) {
          this.listPage = 0;
        }
        this.listLoading = false;
        const fresh = this.active && this.conversations.find(c => c.id === this.active!.id);
        if (fresh) {
          this.active = { ...this.active!, ...fresh };
        }
      },
      error: e => {
        this.listLoading = false;
        if (!silent) {
          this.ui.error(e);
        }
      },
    });
  }

  loadMore(): void {
    this.listLoading = true;
    this.chats.list(this.listParams(this.listPage + 1, PAGE_SIZE)).subscribe({
      next: r => {
        const known = new Set(this.conversations.map(c => c.id));
        this.conversations = [...this.conversations, ...(r.content as ChatSummary[]).filter(c => !known.has(c.id))];
        this.total = r.totalElements;
        this.listPage++;
        this.listLoading = false;
      },
      error: e => {
        this.listLoading = false;
        this.ui.error(e);
      },
    });
  }

  newChat(): void {
    this.dialog
      .open(NewChatDialogComponent, { width: '560px', maxWidth: '94vw', panelClass: 'app-dialog', autoFocus: 'input' })
      .afterClosed()
      .subscribe(userId => userId && this.openWith(userId));
  }

  // ===== Discussion =====

  private openWith(userId: string): void {
    this.chats.open(userId).subscribe({
      next: c => {
        this.router.navigate([], { queryParams: { c: c.id }, replaceUrl: true });
        this.showConversation(c);
        if (!this.conversations.some(x => x.id === c.id)) {
          this.conversations = [c, ...this.conversations];
        }
      },
      error: e => this.ui.error(e),
    });
  }

  select(id: string): void {
    const known = this.conversations.find(c => c.id === id);
    if (known) {
      this.showConversation(known);
    }
    this.chats.conversation(id).subscribe({
      next: c => (known ? (this.active = { ...this.active!, ...c }) : this.showConversation(c)),
      error: e => {
        this.ui.error(e);
        this.close();
      },
    });
  }

  open(c: ChatSummary): void {
    this.router.navigate([], { queryParams: { c: c.id }, replaceUrl: true });
  }

  close(): void {
    this.active = null;
    this.messages = [];
    this.thread = [];
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  private showConversation(c: ChatSummary): void {
    const changed = this.active?.id !== c.id;
    this.active = c;
    if (!changed) {
      return;
    }
    this.messages = [];
    this.thread = [];
    this.draft = '';
    this.clearImage();
    this.threadLoading = true;
    this.chats.messages(c.id).subscribe({
      next: list => {
        if (this.active?.id !== c.id) {
          return;
        }
        this.messages = list;
        this.hasOlder = list.length >= 50;
        this.rebuild();
        this.threadLoading = false;
        this.scrollToBottom();
        this.markRead();
        setTimeout(() => this.composer?.nativeElement.focus(), 50);
      },
      error: e => {
        this.threadLoading = false;
        this.ui.error(e);
      },
    });
  }

  private pollThread(): void {
    const id = this.active?.id;
    if (!id || this.threadLoading || this.sending) {
      return;
    }
    this.chats.messages(id).subscribe({
      next: latest => {
        if (this.active?.id !== id) {
          return;
        }
        const byId = new Map(this.messages.map(m => [m.id, m]));
        let arrived = false;
        for (const m of latest) {
          if (!byId.has(m.id)) {
            arrived = arrived || !m.mine;
          }
          byId.set(m.id, m);
        }
        const merged = [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        const atBottom = this.isAtBottom();
        const grew = merged.length !== this.messages.length;
        const readChanged = merged.some(m => m.mine && m.read && !this.messages.find(x => x.id === m.id)?.read);
        if (grew || readChanged) {
          this.messages = merged;
          this.rebuild();
          if (grew && atBottom) {
            this.scrollToBottom();
          }
        }
        if (arrived) {
          this.markRead(true);
        }
      },
      error: () => {},
    });
  }

  loadOlder(): void {
    if (!this.active || !this.messages.length || this.loadingOlder) {
      return;
    }
    const id = this.active.id;
    const el = this.scroller?.nativeElement;
    const before = el ? el.scrollHeight - el.scrollTop : 0;
    this.loadingOlder = true;
    this.chats.messages(id, this.messages[0].createdAt).subscribe({
      next: older => {
        this.loadingOlder = false;
        if (this.active?.id !== id) {
          return;
        }
        const known = new Set(this.messages.map(m => m.id));
        this.messages = [...older.filter(m => !known.has(m.id)), ...this.messages];
        this.hasOlder = older.length >= 50;
        this.rebuild();
        setTimeout(() => el && (el.scrollTop = el.scrollHeight - before));
      },
      error: e => {
        this.loadingOlder = false;
        this.ui.error(e);
      },
    });
  }

  /** [force] : un message vient d'arriver dans la discussion ouverte (le compteur affiché n'est pas encore à jour). */
  private markRead(force = false): void {
    const c = this.active;
    if (!c || (!force && !c.unread)) {
      return;
    }
    this.chats.markRead(c.id).subscribe({
      next: () => {
        c.unread = 0;
        const item = this.conversations.find(x => x.id === c.id);
        if (item) {
          item.unread = 0;
        }
        this.chats.refreshUnread();
        if (force) {
          this.loadList(false, true);
        }
      },
      error: () => {},
    });
  }

  // ===== Envoi =====

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      this.send();
    }
  }

  pickImage(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.ui.toast('Choisissez une image (JPG, PNG…)', 'danger');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.ui.toast('Image trop lourde (10 Mo au maximum)', 'danger');
      return;
    }
    this.clearImage();
    this.image = { file, preview: URL.createObjectURL(file) };
    this.composer?.nativeElement.focus();
  }

  clearImage(): void {
    if (this.image) {
      URL.revokeObjectURL(this.image.preview);
    }
    this.image = null;
  }

  get canSend(): boolean {
    return !!this.active && !this.sending && (!!this.draft.trim() || !!this.image) && this.draft.length <= MAX_TEXT;
  }

  send(): void {
    if (!this.canSend || !this.active) {
      return;
    }
    const c = this.active;
    const text = this.draft.trim();
    const image = this.image;
    this.sending = true;
    const post = (imageUrl?: string) =>
      this.chats.send(c.id, text, imageUrl).subscribe({
        next: m => {
          this.sending = false;
          this.draft = '';
          this.clearImage();
          if (this.active?.id === c.id && !this.messages.some(x => x.id === m.id)) {
            this.messages = [...this.messages, m];
            this.rebuild();
            this.scrollToBottom();
          }
          c.lastMessageText = text || '📷 Photo';
          c.lastMessageAt = m.createdAt;
          this.conversations = [c, ...this.conversations.filter(x => x.id !== c.id)];
          setTimeout(() => this.composer?.nativeElement.focus());
        },
        error: e => {
          this.sending = false;
          this.ui.error(e);
        },
      });
    if (image) {
      this.api.uploadImage(image.file).subscribe({
        next: r => post(r.data?.url),
        error: e => {
          this.sending = false;
          this.ui.error(e, "Impossible d'envoyer l'image");
        },
      });
    } else {
      post();
    }
  }

  // ===== Archivage =====

  archive(): void {
    const c = this.active;
    if (!c || !this.isSuperAdmin) {
      return;
    }
    this.ui.confirm({
      title: 'Archiver cette discussion ?',
      message: `Tous les messages et photos échangés avec ${c.name} seront supprimés définitivement, pour l'équipe comme pour `
        + `${c.type === 'EMPLOYEE' ? "l'artisan" : 'le client'}. Cette action est irréversible.`,
      tone: 'danger',
      icon: 'delete_forever',
      confirmLabel: 'Supprimer définitivement',
    }).subscribe(ok => {
      if (!ok) {
        return;
      }
      this.chats.archive(c.id).subscribe({
        next: () => {
          this.ui.toast('Discussion supprimée');
          this.conversations = this.conversations.filter(x => x.id !== c.id);
          this.total = Math.max(0, this.total - 1);
          this.close();
          this.chats.refreshUnread();
        },
        error: e => this.ui.error(e),
      });
    });
  }

  // ===== Affichage =====

  private rebuild(): void {
    const items: ThreadItem[] = [];
    let day = '';
    let prev: ChatMessage | null = null;
    for (const m of this.messages) {
      const d = toDate(m.createdAt);
      const key = d ? tunisDay.format(d) : '';
      if (key !== day) {
        day = key;
        prev = null;
        items.push({ kind: 'day', label: this.dayLabel(d) });
      }
      items.push({ kind: 'msg', m, first: !prev || prev.mine !== m.mine });
      prev = m;
    }
    this.thread = items;
  }

  private dayLabel(d: Date | null): string {
    if (!d) {
      return '';
    }
    const key = tunisDay.format(d);
    const today = tunisDay.format(new Date());
    const yesterday = tunisDay.format(new Date(Date.now() - 86_400_000));
    if (key === today) {
      return "Aujourd'hui";
    }
    if (key === yesterday) {
      return 'Hier';
    }
    const label = tunisLongDay.format(d);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  time(v: string): string {
    const d = toDate(v);
    return d ? tunisTime.format(d) : '';
  }

  /** Heure d'un message dans la liste : « 14:05 » aujourd'hui, « Hier », sinon la date. */
  when(v?: string): string {
    const d = v ? toDate(v) : null;
    if (!d) {
      return '';
    }
    const key = tunisDay.format(d);
    if (key === tunisDay.format(new Date())) {
      return tunisTime.format(d);
    }
    if (key === tunisDay.format(new Date(Date.now() - 86_400_000))) {
      return 'Hier';
    }
    return tunisShortDay.format(d);
  }

  phone = formatPhone;
  initialsOf = initials;

  fileLink(c: ChatSummary): any[] {
    return [c.type === 'EMPLOYEE' ? '/artisans' : '/clients'];
  }

  fileQuery(c: ChatSummary): Record<string, string> {
    return c.phone ? { phone: c.phone } : { name: c.name };
  }

  trackItem = (_: number, it: ThreadItem) => (it.kind === 'day' ? 'd' + it.label : it.m.id);
  trackConv = (_: number, c: ChatSummary) => c.id;

  private isAtBottom(): boolean {
    const el = this.scroller?.nativeElement;
    return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.scroller?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }
}
