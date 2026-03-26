import { Component } from '@angular/core';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-about',
  templateUrl: './about.page.html',
  standalone: false,
  styleUrls: ['./about.page.scss'],
})
export class AboutPage {
  readonly appVersion = environment.appVersion;
  readonly appEnv     = environment.envName;
  readonly currentYear = new Date().getFullYear();

  readonly developer  = 'Ing. Samuel Lozada';
  readonly website    = 'https://ingjesdlozcorp-4c58b.web.app/';
  readonly phone      = '+413 667 9761';
  readonly phoneHref  = 'tel:+4136679761';
  readonly email      = 'ingjesdlozcorp@gmail.com';
  readonly linkedin   = 'https://www.linkedin.com/in/samuel-j-lozada-k-797299126/?locale=en_US';
}
