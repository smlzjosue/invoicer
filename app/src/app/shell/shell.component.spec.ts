import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule, MenuController } from '@ionic/angular';
import { ShellComponent } from './shell.component';
import { AuthService } from '../services/auth.service';

const authServiceMock = {
  signOut: jasmine.createSpy('signOut').and.returnValue(Promise.resolve()),
};

const menuControllerMock = {
  close: jasmine.createSpy('close').and.returnValue(Promise.resolve()),
};

describe('ShellComponent', () => {
  let component: ShellComponent;
  let fixture: ComponentFixture<ShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ShellComponent],
      imports: [IonicModule.forRoot(), RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: MenuController, useValue: menuControllerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render ion-split-pane', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('ion-split-pane')).toBeTruthy();
  });

  it('should render ion-menu', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('ion-menu')).toBeTruthy();
  });

  it('should render ion-router-outlet with id main-content', () => {
    const el: HTMLElement = fixture.nativeElement;
    const outlet = el.querySelector('ion-router-outlet');
    expect(outlet).toBeTruthy();
    expect(outlet?.getAttribute('id')).toBe('main-content');
  });

  it('should render dashboard nav link', () => {
    const el: HTMLElement = fixture.nativeElement;
    const items = el.querySelectorAll('ion-item[routerLink]');
    const links = Array.from(items).map(i => i.getAttribute('routerLink') || i.getAttribute('ng-reflect-router-link'));
    expect(links.some(l => l?.includes('dashboard'))).toBeTrue();
  });

  it('should call MenuController.close() when closeMenu() is called', () => {
    component.closeMenu();
    expect(menuControllerMock.close).toHaveBeenCalled();
  });

  it('should call AuthService.signOut() when signOut() is called', () => {
    component.signOut();
    expect(authServiceMock.signOut).toHaveBeenCalled();
  });
});
