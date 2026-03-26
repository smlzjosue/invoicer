import { Injectable } from '@angular/core';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ValidationService {

  validateEmail(email: string): ValidationResult {
    if (!email) {
      return { isValid: false, error: 'El correo electrónico es requerido.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Por favor ingresa un correo electrónico válido.' };
    }
    return { isValid: true };
  }

  validatePassword(password: string): ValidationResult {
    if (!password) {
      return { isValid: false, error: 'La contraseña es requerida.' };
    }
    if (password.length < 8) {
      return { isValid: false, error: 'La contraseña debe tener al menos 8 caracteres.' };
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return { isValid: false, error: 'La contraseña debe contener al menos una letra minúscula.' };
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return { isValid: false, error: 'La contraseña debe contener al menos una letra mayúscula.' };
    }
    if (!/(?=.*\d)/.test(password)) {
      return { isValid: false, error: 'La contraseña debe contener al menos un número.' };
    }
    return { isValid: true };
  }

  validatePasswordConfirmation(password: string, confirmPassword: string): ValidationResult {
    if (!confirmPassword) {
      return { isValid: false, error: 'La confirmación de contraseña es requerida.' };
    }
    if (password !== confirmPassword) {
      return { isValid: false, error: 'Las contraseñas no coinciden.' };
    }
    return { isValid: true };
  }

  validateName(name: string): ValidationResult {
    if (!name) {
      return { isValid: false, error: 'El nombre es requerido.' };
    }
    if (name.trim().length < 2) {
      return { isValid: false, error: 'El nombre debe tener al menos 2 caracteres.' };
    }
    if (name.trim().length > 50) {
      return { isValid: false, error: 'El nombre no puede tener más de 50 caracteres.' };
    }
    const nameRegex = /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/;
    if (!nameRegex.test(name)) {
      return { isValid: false, error: 'El nombre solo puede contener letras y espacios.' };
    }
    return { isValid: true };
  }

  validateLoginForm(email: string, password: string): ValidationResult[] {
    const errors: ValidationResult[] = [];
    const emailValidation = this.validateEmail(email);
    if (!emailValidation.isValid) errors.push(emailValidation);
    if (!password) errors.push({ isValid: false, error: 'La contraseña es requerida.' });
    return errors;
  }

  validateRegisterForm(
    name: string,
    email: string,
    password: string,
    confirmPassword: string
  ): ValidationResult[] {
    const errors: ValidationResult[] = [];
    const nameV = this.validateName(name);
    if (!nameV.isValid) errors.push(nameV);
    const emailV = this.validateEmail(email);
    if (!emailV.isValid) errors.push(emailV);
    const passV = this.validatePassword(password);
    if (!passV.isValid) errors.push(passV);
    const confirmV = this.validatePasswordConfirmation(password, confirmPassword);
    if (!confirmV.isValid) errors.push(confirmV);
    return errors;
  }

  getFirstError(results: ValidationResult[]): string | null {
    return results.find((r) => !r.isValid)?.error ?? null;
  }

  allValid(results: ValidationResult[]): boolean {
    return results.every((r) => r.isValid);
  }
}
