import { Injectable } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class ToastService {
  constructor(
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) {}

  async showSuccess(message: string, duration = 3000) {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      position: 'top',
      color: 'success',
      cssClass: 'custom-toast',
      buttons: [{ side: 'end', icon: 'close', role: 'cancel' }],
    });
    await toast.present();
  }

  async showError(message: string, duration = 4000) {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      position: 'top',
      color: 'danger',
      cssClass: 'custom-toast',
      buttons: [{ side: 'end', icon: 'close', role: 'cancel' }],
    });
    await toast.present();
  }

  async showInfo(message: string, duration = 3000) {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      position: 'top',
      color: 'primary',
      cssClass: 'custom-toast',
      buttons: [{ side: 'end', icon: 'close', role: 'cancel' }],
    });
    await toast.present();
  }

  async showLoading(message = 'Cargando...') {
    const loading = await this.loadingCtrl.create({
      message,
      cssClass: 'custom-loading',
      spinner: 'crescent',
    });
    await loading.present();
    return loading;
  }

  async hideLoading() {
    try {
      await this.loadingCtrl.dismiss();
    } catch {
      // already dismissed
    }
  }

  async showConfirmAlert(
    header: string,
    message: string,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar'
  ): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header,
        message,
        cssClass: 'custom-alert',
        buttons: [
          { text: cancelText, role: 'cancel', handler: () => resolve(false) },
          { text: confirmText, handler: () => resolve(true) },
        ],
      });
      await alert.present();
    });
  }

  async showAlert(header: string, message: string, buttonText = 'Entendido') {
    const alert = await this.alertCtrl.create({
      header,
      message,
      cssClass: 'custom-alert',
      buttons: [buttonText],
    });
    await alert.present();
  }

  async showValidationError(errors: string[]) {
    const message = errors.length > 1 ? `• ${errors.join('\n• ')}` : errors[0];
    await this.showError(message, 5000);
  }

  async showLoginSuccess(userName?: string) {
    await this.showSuccess(userName ? `¡Bienvenido ${userName}!` : '¡Inicio de sesión exitoso!');
  }

  async showRegisterSuccess() {
    await this.showSuccess('¡Cuenta creada exitosamente! Bienvenido a FacturaFácil.');
  }

  async showLogoutSuccess() {
    await this.showSuccess('Sesión cerrada correctamente.');
  }

  async showPasswordResetSent(email: string) {
    await this.showSuccess(`Se ha enviado un enlace de recuperación a ${email}`);
  }
}
