import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ShellComponent } from './shell.component';

const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('../pages/dashboard/dashboard.module').then((m) => m.DashboardPageModule),
      },
      {
        path: 'editor/:id',
        loadChildren: () =>
          import('../pages/editor/editor.module').then((m) => m.EditorPageModule),
      },
      {
        path: 'preview/:id',
        loadChildren: () =>
          import('../pages/preview/preview.module').then((m) => m.PreviewPageModule),
      },
      {
        path: 'clients',
        loadChildren: () =>
          import('../pages/clients/clients.module').then((m) => m.ClientsPageModule),
      },
      {
        path: 'profile',
        loadChildren: () =>
          import('../pages/profile/profile.module').then((m) => m.ProfilePageModule),
      },
      {
        path: 'about',
        loadChildren: () =>
          import('../pages/about/about.module').then((m) => m.AboutPageModule),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ShellRoutingModule {}
