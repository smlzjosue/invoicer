import { TestBed } from '@angular/core/testing';
import { ValidationService } from './validation.service';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ValidationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── validateEmail ────────────────────────────────────────────────────────

  describe('validateEmail', () => {
    it('should fail on empty email', () => {
      const result = service.validateEmail('');
      expect(result.isValid).toBeFalse();
      expect(result.error).toBeTruthy();
    });

    it('should fail on email without @', () => {
      const result = service.validateEmail('invalidemail.com');
      expect(result.isValid).toBeFalse();
    });

    it('should fail on email without domain', () => {
      const result = service.validateEmail('user@');
      expect(result.isValid).toBeFalse();
    });

    it('should pass on valid email', () => {
      expect(service.validateEmail('user@example.com').isValid).toBeTrue();
    });

    it('should pass on email with subdomain', () => {
      expect(service.validateEmail('user@mail.example.co').isValid).toBeTrue();
    });
  });

  // ─── validatePassword ─────────────────────────────────────────────────────

  describe('validatePassword', () => {
    it('should fail on empty password', () => {
      const result = service.validatePassword('');
      expect(result.isValid).toBeFalse();
    });

    it('should fail when shorter than 8 characters', () => {
      const result = service.validatePassword('Abc1234');
      expect(result.isValid).toBeFalse();
      expect(result.error).toContain('8');
    });

    it('should fail without lowercase letter', () => {
      const result = service.validatePassword('ABCDEF1234');
      expect(result.isValid).toBeFalse();
      expect(result.error).toContain('minúscula');
    });

    it('should fail without uppercase letter', () => {
      const result = service.validatePassword('abcdef1234');
      expect(result.isValid).toBeFalse();
      expect(result.error).toContain('mayúscula');
    });

    it('should fail without a number', () => {
      const result = service.validatePassword('AbcdefGHI');
      expect(result.isValid).toBeFalse();
      expect(result.error).toContain('número');
    });

    it('should pass with a valid password', () => {
      expect(service.validatePassword('Secure1Pass').isValid).toBeTrue();
    });

    it('should pass with exactly 8 valid characters', () => {
      expect(service.validatePassword('Abcde1fg').isValid).toBeTrue();
    });
  });

  // ─── validatePasswordConfirmation ─────────────────────────────────────────

  describe('validatePasswordConfirmation', () => {
    it('should fail when confirmPassword is empty', () => {
      const result = service.validatePasswordConfirmation('Password1', '');
      expect(result.isValid).toBeFalse();
    });

    it('should fail when passwords do not match', () => {
      const result = service.validatePasswordConfirmation('Password1', 'Password2');
      expect(result.isValid).toBeFalse();
      expect(result.error).toContain('coinciden');
    });

    it('should pass when passwords match', () => {
      expect(service.validatePasswordConfirmation('Password1', 'Password1').isValid).toBeTrue();
    });
  });

  // ─── validateName ─────────────────────────────────────────────────────────

  describe('validateName', () => {
    it('should fail on empty name', () => {
      expect(service.validateName('').isValid).toBeFalse();
    });

    it('should fail on name shorter than 2 chars', () => {
      expect(service.validateName('A').isValid).toBeFalse();
    });

    it('should fail on name longer than 50 chars', () => {
      expect(service.validateName('A'.repeat(51)).isValid).toBeFalse();
    });

    it('should fail on name with numbers', () => {
      const result = service.validateName('John1');
      expect(result.isValid).toBeFalse();
      expect(result.error).toContain('letras');
    });

    it('should pass on valid name', () => {
      expect(service.validateName('Juan Pérez').isValid).toBeTrue();
    });

    it('should pass on name with accented characters', () => {
      expect(service.validateName('María José').isValid).toBeTrue();
    });

    it('should pass on minimum length name', () => {
      expect(service.validateName('Jo').isValid).toBeTrue();
    });
  });

  // ─── validateLoginForm ────────────────────────────────────────────────────

  describe('validateLoginForm', () => {
    it('should return errors for empty email and password', () => {
      const errors = service.validateLoginForm('', '');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.every(e => !e.isValid)).toBeTrue();
    });

    it('should return error for invalid email', () => {
      const errors = service.validateLoginForm('bad-email', 'password');
      expect(errors.some(e => !e.isValid)).toBeTrue();
    });

    it('should return empty array for valid inputs', () => {
      const errors = service.validateLoginForm('user@example.com', 'anypassword');
      expect(errors.length).toBe(0);
    });
  });

  // ─── validateRegisterForm ─────────────────────────────────────────────────

  describe('validateRegisterForm', () => {
    it('should return errors when all fields are empty', () => {
      const errors = service.validateRegisterForm('', '', '', '');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should return no errors for valid register data', () => {
      const errors = service.validateRegisterForm(
        'Juan Pérez',
        'juan@example.com',
        'Secure1Pass',
        'Secure1Pass'
      );
      expect(errors.length).toBe(0);
    });

    it('should catch mismatched passwords', () => {
      const errors = service.validateRegisterForm(
        'Juan Pérez',
        'juan@example.com',
        'Secure1Pass',
        'OtherPass1'
      );
      expect(errors.some(e => e.error?.includes('coinciden'))).toBeTrue();
    });
  });

  // ─── getFirstError ────────────────────────────────────────────────────────

  describe('getFirstError', () => {
    it('should return null when all results are valid', () => {
      expect(service.getFirstError([{ isValid: true }, { isValid: true }])).toBeNull();
    });

    it('should return the first error message', () => {
      const result = service.getFirstError([
        { isValid: false, error: 'Error one' },
        { isValid: false, error: 'Error two' },
      ]);
      expect(result).toBe('Error one');
    });

    it('should return null for empty array', () => {
      expect(service.getFirstError([])).toBeNull();
    });
  });

  // ─── allValid ─────────────────────────────────────────────────────────────

  describe('allValid', () => {
    it('should return true when all results are valid', () => {
      expect(service.allValid([{ isValid: true }, { isValid: true }])).toBeTrue();
    });

    it('should return false when any result is invalid', () => {
      expect(service.allValid([{ isValid: true }, { isValid: false }])).toBeFalse();
    });

    it('should return true for empty array', () => {
      expect(service.allValid([])).toBeTrue();
    });
  });
});
