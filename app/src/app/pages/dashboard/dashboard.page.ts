import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Invoice } from '../../models/invoice.model';
import { InvoiceService } from '../../services/invoice.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage implements OnInit {
  invoices$!: Observable<Invoice[]>;
  filteredInvoices$!: Observable<Invoice[]>;
  selectedSegment = 'all';

  constructor(
    private invoiceService: InvoiceService,
    private authService: AuthService,
    private router: Router,
    private alertCtrl: AlertController
  ) {}

  signOut() {
    return this.authService.signOut();
  }

  ngOnInit() {
    this.invoices$ = this.invoiceService.getAll();
    this.applyFilter();
  }

  onSegmentChange(event: CustomEvent) {
    this.selectedSegment = event.detail.value;
    this.applyFilter();
  }

  applyFilter() {
    this.filteredInvoices$ = this.invoices$.pipe(
      map((invoices) =>
        this.selectedSegment === 'all'
          ? invoices
          : invoices.filter((inv) => inv.status === this.selectedSegment)
      )
    );
  }

  openEditor(id?: string) {
    this.router.navigate(['/editor', id ?? 'new']);
  }

  openPreview(id: string, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/preview', id]);
  }

  async confirmDelete(id: string, event: Event) {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: 'Eliminar factura',
      message: '¿Estás seguro? Esta acción no se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.invoiceService.delete(id!),
        },
      ],
    });
    await alert.present();
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = { paid: 'success', pending: 'warning', draft: 'medium' };
    return map[status] ?? 'medium';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = { paid: 'Pagada', pending: 'Pendiente', draft: 'Borrador' };
    return map[status] ?? status;
  }

  trackByInvoice(_: number, inv: Invoice) {
    return inv.id;
  }
}
