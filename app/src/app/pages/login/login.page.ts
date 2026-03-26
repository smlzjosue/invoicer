import { Component } from '@angular/core';
import { AuthService, LoginCredentials, RegisterCredentials, AuthResponse } from '../../services/auth.service';
import { ValidationService, ValidationResult } from '../../services/validation.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {

  // Form mode
  isLoginMode = true;

  // Form fields
  name = '';
  email = '';
  password = '';
  confirmPassword = '';

  // Password visibility
  showPassword = false;
  showConfirmPassword = false;

  // Loading states
  isSubmitting = false;

  // Validation errors
  nameError = '';
  emailError = '';
  passwordError = '';
  confirmPasswordError = '';

  constructor(
    private authService: AuthService,
    private validationService: ValidationService,
    private toastService: ToastService
  ) {}

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.clearForm();
    this.clearErrors();
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  validateField(field: string) {
    this.clearFieldError(field);

    switch (field) {
      case 'name':
        if (!this.isLoginMode) {
          const result = this.validationService.validateName(this.name);
          if (!result.isValid) this.nameError = result.error || '';
        }
        break;
      case 'email':
        const emailResult = this.validationService.validateEmail(this.email);
        if (!emailResult.isValid) this.emailError = emailResult.error || '';
        break;
      case 'password':
        if (!this.isLoginMode) {
          const passwordResult = this.validationService.validatePassword(this.password);
          if (!passwordResult.isValid) this.passwordError = passwordResult.error || '';
        }
        break;
      case 'confirmPassword':
        if (!this.isLoginMode) {
          const confirmResult = this.validationService.validatePasswordConfirmation(this.password, this.confirmPassword);
          if (!confirmResult.isValid) this.confirmPasswordError = confirmResult.error || '';
        }
        break;
    }
  }

  async login() {
    if (this.isSubmitting) return;
    this.clearErrors();

    const validationErrors = this.validationService.validateLoginForm(this.email, this.password);
    if (validationErrors.length > 0) {
      this.displayValidationErrors(validationErrors);
      return;
    }

    this.isSubmitting = true;
    await this.toastService.showLoading('Iniciando sesión...');

    try {
      const credentials: LoginCredentials = { email: this.email.trim(), password: this.password };
      const result: AuthResponse = await this.authService.login(credentials);

      await this.toastService.hideLoading();

      if (result.success) {
        const userName = this.authService.getUserDisplayName();
        await this.toastService.showLoginSuccess(userName);
      } else {
        await this.toastService.showError(result.error || 'Error en el inicio de sesión');
      }
    } catch (error) {
      await this.toastService.hideLoading();
      await this.toastService.showError('Error inesperado. Intenta nuevamente.');
    } finally {
      this.isSubmitting = false;
    }
  }

  async register() {
    if (this.isSubmitting) return;
    this.clearErrors();

    const validationErrors = this.validationService.validateRegisterForm(
      this.name, this.email, this.password, this.confirmPassword
    );
    if (validationErrors.length > 0) {
      this.displayValidationErrors(validationErrors);
      return;
    }

    this.isSubmitting = true;
    await this.toastService.showLoading('Creando cuenta...');

    try {
      const credentials: RegisterCredentials = {
        name: this.name.trim(),
        email: this.email.trim(),
        password: this.password
      };
      const result: AuthResponse = await this.authService.register(credentials);

      await this.toastService.hideLoading();

      if (result.success) {
        await this.toastService.showRegisterSuccess();
      } else {
        await this.toastService.showError(result.error || 'Error en el registro');
      }
    } catch (error) {
      await this.toastService.hideLoading();
      await this.toastService.showError('Error inesperado. Intenta nuevamente.');
    } finally {
      this.isSubmitting = false;
    }
  }

  async forgotPassword() {
    if (!this.email) {
      await this.toastService.showError('Por favor ingresa tu correo electrónico primero.');
      return;
    }

    const emailValidation = this.validationService.validateEmail(this.email);
    if (!emailValidation.isValid) {
      await this.toastService.showError(emailValidation.error || 'Correo electrónico inválido');
      return;
    }

    await this.toastService.showLoading('Enviando enlace de recuperación...');

    try {
      const result = await this.authService.resetPassword(this.email);
      await this.toastService.hideLoading();

      if (result.success) {
        await this.toastService.showPasswordResetSent(this.email);
      } else {
        await this.toastService.showError(result.error || 'Error al enviar el enlace');
      }
    } catch (error) {
      await this.toastService.hideLoading();
      await this.toastService.showError('Error inesperado. Intenta nuevamente.');
    }
  }

  async loginWithGoogle() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    await this.toastService.showLoading('Conectando con Google...');

    try {
      const result: AuthResponse = await this.authService.loginWithGoogle();
      await this.toastService.hideLoading();

      if (result.success) {
        await this.toastService.showSuccess(
          `¡Bienvenido${result.user?.displayName ? ', ' + result.user.displayName : ''}!`
        );
      } else {
        await this.toastService.showError(result.error || 'Error al conectar con Google');
      }
    } catch (error) {
      await this.toastService.hideLoading();
      await this.toastService.showError('Error inesperado al conectar con Google.');
    } finally {
      this.isSubmitting = false;
    }
  }

  async loginWithApple() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    await this.toastService.showLoading('Conectando con Apple...');

    try {
      const result: AuthResponse = await this.authService.loginWithApple();
      await this.toastService.hideLoading();

      if (result.success) {
        await this.toastService.showSuccess(
          `¡Bienvenido${result.user?.displayName ? ', ' + result.user.displayName : ''}!`
        );
      } else {
        await this.toastService.showError(result.error || 'Error al conectar con Apple');
      }
    } catch (error) {
      await this.toastService.hideLoading();
      await this.toastService.showError('Error inesperado al conectar con Apple.');
    } finally {
      this.isSubmitting = false;
    }
  }

  private displayValidationErrors(errors: ValidationResult[]) {
    const errorMessages = errors
      .filter(e => !e.isValid)
      .map(e => e.error || '');
    if (errorMessages.length > 0) {
      this.toastService.showValidationError(errorMessages);
    }
  }

  private clearForm() {
    this.name = '';
    this.email = '';
    this.password = '';
    this.confirmPassword = '';
    this.showPassword = false;
    this.showConfirmPassword = false;
  }

  private clearErrors() {
    this.nameError = '';
    this.emailError = '';
    this.passwordError = '';
    this.confirmPasswordError = '';
  }

  private clearFieldError(field: string) {
    switch (field) {
      case 'name': this.nameError = ''; break;
      case 'email': this.emailError = ''; break;
      case 'password': this.passwordError = ''; break;
      case 'confirmPassword': this.confirmPasswordError = ''; break;
    }
  }

  get hasErrors(): boolean {
    return !!(this.nameError || this.emailError || this.passwordError || this.confirmPasswordError);
  }

  get isSubmitDisabled(): boolean {
    return this.isSubmitting || this.hasErrors || !this.isFormValid();
  }

  private isFormValid(): boolean {
    if (this.isLoginMode) {
      return !!(this.email && this.password);
    } else {
      return !!(this.name && this.email && this.password && this.confirmPassword);
    }
  }
}
