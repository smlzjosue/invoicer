import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { UserProfileService } from '../services/user-profile.service';

@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss'],
  standalone: false,
})
export class ShellComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private profileService: UserProfileService,
    private menuCtrl: MenuController,
    private router: Router
  ) {}

  ngOnInit() {
    // Carga el perfil desde la API y actualiza el caché local
    this.profileService.loadProfile().subscribe();
  }

  get userName(): string {
    const profile = this.profileService.getProfile();
    return profile?.companyName || this.authService.getUserDisplayName();
  }

  get userEmail(): string {
    return this.authService.currentUser?.email ?? '';
  }

  get userInitial(): string {
    return this.userName.charAt(0).toUpperCase();
  }

  closeMenu() {
    this.menuCtrl.close();
  }

  goToProfile() {
    this.menuCtrl.close();
    this.router.navigate(['/profile']);
  }

  signOut() {
    return this.authService.signOut();
  }
}
