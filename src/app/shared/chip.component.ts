import { Component, Input } from '@angular/core';
import { Tone } from './models';

/** Pastille de statut colorée. */
@Component({
  selector: 'app-chip',
  template: `<span class="chip chip-{{ tone || 'neutral' }}" [class.chip-dot]="dot"><i *ngIf="dot"></i>{{ label }}</span>`,
})
export class ChipComponent {
  @Input() label = '';
  @Input() tone: Tone | undefined = 'neutral';
  @Input() dot = true;
}
