import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { UserProfileService } from '../../services/user-profile.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  standalone: false,
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit {
  form!: FormGroup;
  isLoading = true;
  isSaving = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private profileService: UserProfileService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      companyName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      address: [''],
    });

    // Pre-fill con caché local inmediatamente
    const cached = this.profileService.getProfile();
    if (cached) {
      this.form.patchValue(cached);
    } else {
      this.form.patchValue({ email: this.authService.currentUser?.email ?? '' });
    }

    // Luego sincroniza desde la API
    this.profileService.loadProfile().subscribe({
      next: (profile) => {
        if (profile) this.form.patchValue(profile);
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; },
    });
  }

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.profileService.saveProfile(this.form.value).subscribe({
      next: async () => {
        this.form.markAsPristine();
        this.isSaving = false;
        const toast = await this.toastCtrl.create({
          message: 'Perfil guardado correctamente',
          color: 'success',
          duration: 2500,
          position: 'bottom',
        });
        await toast.present();
      },
      error: async () => {
        this.isSaving = false;
        const toast = await this.toastCtrl.create({
          message: 'Error al guardar el perfil. Intenta nuevamente.',
          color: 'danger',
          duration: 3000,
          position: 'bottom',
        });
        await toast.present();
      },
    });
  }
}
