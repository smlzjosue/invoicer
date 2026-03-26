import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User,
  UserCredential,
} from 'firebase/auth';
import { environment } from '../../environments/environment';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth;
  private userSubject = new BehaviorSubject<User | null | undefined>(undefined);
  user$ = this.userSubject.asObservable();

  constructor(private router: Router) {
    const app = getApps().length === 0 ? initializeApp(environment.firebase) : getApp();
    this.auth = getAuth(app);
    onAuthStateChanged(this.auth, (user) => this.userSubject.next(user));
    this.handleRedirectResult();
  }

  /** Espera la primera resolución del estado de auth (para guards). */
  getInitialUser(): Promise<User | null> {
    return new Promise((resolve) => {
      const unsub = onAuthStateChanged(this.auth, (user) => {
        unsub();
        resolve(user);
      });
    });
  }

  get currentUser(): User | null | undefined {
    return this.userSubject.getValue();
  }

  getUserDisplayName(): string {
    const user = this.auth.currentUser;
    return user?.displayName || user?.email || 'Usuario';
  }

  // Maneja resultado de redirect (Apple Sign-In)
  private async handleRedirectResult(): Promise<void> {
    try {
      const result = await getRedirectResult(this.auth);
      if (result) {
        await this.router.navigate(['/dashboard']);
      }
    } catch (error: any) {
      console.error('Error en redirect result:', error);
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const result: UserCredential = await signInWithEmailAndPassword(
        this.auth,
        credentials.email,
        credentials.password
      );
      await this.router.navigate(['/dashboard']);
      return { success: true, user: result.user };
    } catch (error: any) {
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const result: UserCredential = await createUserWithEmailAndPassword(
        this.auth,
        credentials.email,
        credentials.password
      );
      if (result.user) {
        await updateProfile(result.user, { displayName: credentials.name });
      }
      await this.router.navigate(['/dashboard']);
      return { success: true, user: result.user };
    } catch (error: any) {
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  async resetPassword(email: string): Promise<AuthResponse> {
    try {
      await sendPasswordResetEmail(this.auth, email);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: this.getErrorMessage(error.code) };
    }
  }

  async loginWithGoogle(): Promise<AuthResponse> {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      const result: UserCredential = await signInWithPopup(this.auth, provider);
      await this.router.navigate(['/dashboard']);
      return { success: true, user: result.user };
    } catch (error: any) {
      return { success: false, error: this.getGoogleErrorMessage(error.code) };
    }
  }

  async loginWithApple(): Promise<AuthResponse> {
    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      try {
        const result: UserCredential = await signInWithPopup(this.auth, provider);
        await this.router.navigate(['/dashboard']);
        return { success: true, user: result.user };
      } catch (popupError: any) {
        if (
          popupError.code === 'auth/popup-blocked' ||
          popupError.code === 'auth/popup-closed-by-user' ||
          popupError.code === 'auth/cancelled-popup-request'
        ) {
          await signInWithRedirect(this.auth, provider);
          return { success: false, error: 'Redirigiendo a Apple...' };
        }
        throw popupError;
      }
    } catch (error: any) {
      return { success: false, error: this.getAppleErrorMessage(error.code) };
    }
  }

  async getIdToken(): Promise<string | null> {
    return this.auth.currentUser?.getIdToken() ?? null;
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
    await this.router.navigate(['/login']);
  }

  private getErrorMessage(errorCode: string): string {
    const messages: { [key: string]: string } = {
      'auth/email-already-in-use': 'Este correo electrónico ya está registrado.',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
      'auth/user-not-found': 'No existe una cuenta con este correo electrónico.',
      'auth/wrong-password': 'Contraseña incorrecta.',
      'auth/invalid-email': 'El formato del correo electrónico no es válido.',
      'auth/user-disabled': 'Esta cuenta ha sido deshabilitada.',
      'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta más tarde.',
      'auth/network-request-failed': 'Error de conexión. Verifica tu internet.',
      'auth/operation-not-allowed': 'Operación no permitida.',
      'auth/requires-recent-login': 'Esta operación requiere autenticación reciente.',
      'auth/invalid-credential': 'Las credenciales proporcionadas no son válidas.',
      'auth/account-exists-with-different-credential': 'Ya existe una cuenta con este correo usando otro método.',
      'auth/credential-already-in-use': 'Esta credencial ya está en uso.',
      'auth/missing-email': 'Debe proporcionar un correo electrónico.',
      'auth/missing-password': 'Debe proporcionar una contraseña.',
      'auth/popup-closed-by-user': 'Operación cancelada por el usuario.',
      'auth/popup-blocked': 'Popup bloqueado. Permite popups para este sitio.',
      'auth/cancelled-popup-request': 'Solicitud cancelada.',
    };
    return messages[errorCode] || 'Ha ocurrido un error inesperado. Intenta nuevamente.';
  }

  private getGoogleErrorMessage(errorCode: string): string {
    const messages: { [key: string]: string } = {
      'auth/popup-closed-by-user': 'Operación cancelada por el usuario.',
      'auth/popup-blocked': 'Popup bloqueado. Permite popups para este sitio.',
      'auth/cancelled-popup-request': 'Solicitud cancelada.',
      'auth/account-exists-with-different-credential': 'Ya existe una cuenta con este correo usando otro método.',
      'auth/credential-already-in-use': 'Esta cuenta de Google ya está en uso.',
      'auth/unauthorized-domain': 'Dominio no autorizado para esta operación.',
      'auth/network-request-failed': 'Error de conexión. Verifica tu internet.',
      'auth/internal-error': 'Error interno del servidor. Intenta más tarde.',
    };
    return messages[errorCode] || 'Error al autenticar con Google. Intenta nuevamente.';
  }

  private getAppleErrorMessage(errorCode: string): string {
    const messages: { [key: string]: string } = {
      'auth/popup-closed-by-user': 'Operación cancelada por el usuario.',
      'auth/popup-blocked': 'Popup bloqueado. Permite popups para este sitio.',
      'auth/cancelled-popup-request': 'Solicitud cancelada.',
      'auth/account-exists-with-different-credential': 'Ya existe una cuenta con este correo usando otro método.',
      'auth/credential-already-in-use': 'Esta cuenta de Apple ya está en uso.',
      'auth/unauthorized-domain': 'Dominio no autorizado para esta operación.',
      'auth/network-request-failed': 'Error de conexión. Verifica tu internet.',
      'auth/internal-error': 'Error interno del servidor. Intenta más tarde.',
      'auth/invalid-oauth-provider': 'Proveedor OAuth inválido.',
    };
    return messages[errorCode] || 'Error al autenticar con Apple. Intenta nuevamente.';
  }
}
