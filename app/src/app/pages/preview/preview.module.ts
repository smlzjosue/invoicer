import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { PreviewPage } from './preview.page';
import { PreviewPageRoutingModule } from './preview-routing.module';

@NgModule({
  imports: [CommonModule, IonicModule, PreviewPageRoutingModule],
  declarations: [PreviewPage],
})
export class PreviewPageModule {}
