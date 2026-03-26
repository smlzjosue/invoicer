import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { EditorPage } from './editor.page';
import { EditorPageRoutingModule } from './editor-routing.module';

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, EditorPageRoutingModule],
  declarations: [EditorPage],
})
export class EditorPageModule {}
