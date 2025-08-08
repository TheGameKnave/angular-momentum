// sidebar.component.ts
import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  expanded = false;

  menuItems = [
    { icon: 'pi pi-home', label: 'Home' },
    { icon: 'pi pi-user', label: 'Profile' },
    { icon: 'pi pi-cog', label: 'Settings' },
    { icon: 'pi pi-sign-out', label: 'Logout' }
  ];

  toggleMenu() {
    this.expanded = !this.expanded;
  }

  // Detect click outside the menu
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.sidebar')) {
      this.expanded = false;
    }
  }
}
