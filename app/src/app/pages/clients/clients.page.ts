import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { Client } from '../../models/client.model';
import { ClientService } from '../../services/client.service';

@Component({
  selector: 'app-clients',
  templateUrl: './clients.page.html',
  standalone: false,
  styleUrls: ['./clients.page.scss'],
})
export class ClientsPage implements OnInit {
  clients: Client[] = [];
  searchTerm = '';
  clientModalOpen = false;
  editingClient: Client | null = null;
  form!: FormGroup;

  constructor(
    private clientService: ClientService,
    private fb: FormBuilder,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.buildForm();
    this.loadClients();
  }

  buildForm() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      address: [''],
    });
  }

  async loadClients() {
    this.clients = await firstValueFrom(this.clientService.getAll());
  }

  get filteredClients(): Client[] {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) return this.clients;
    return this.clients.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        c.phone?.toLowerCase().includes(term)
    );
  }

  openCreateModal() {
    this.editingClient = null;
    this.form.reset({ name: '', email: '', phone: '', address: '' });
    this.clientModalOpen = true;
  }

  openEditModal(client: Client) {
    this.editingClient = client;
    this.form.patchValue(client);
    this.clientModalOpen = true;
  }

  closeModal() {
    this.clientModalOpen = false;
  }

  async saveClient() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const data = this.form.value;
    try {
      if (this.editingClient) {
        await this.clientService.update(this.editingClient.id!, data);
      } else {
        await this.clientService.create(data);
      }
      this.clientModalOpen = false;
      this.loadClients();
      const toast = await this.toastCtrl.create({
        message: this.editingClient ? 'Cliente actualizado' : 'Cliente creado',
        color: 'success',
        duration: 2000,
      });
      await toast.present();
    } catch (err: any) {
      const toast = await this.toastCtrl.create({
        message: `Error: ${err?.message ?? 'No se pudo guardar el cliente'}`,
        color: 'danger',
        duration: 4000,
      });
      await toast.present();
    }
  }

  async confirmDelete(client: Client) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar cliente',
      message: `¿Eliminar a ${client.name}? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.clientService.delete(client.id!);
            this.loadClients();
          },
        },
      ],
    });
    await alert.present();
  }

  trackByClient(_: number, client: Client) {
    return client.id;
  }
}
