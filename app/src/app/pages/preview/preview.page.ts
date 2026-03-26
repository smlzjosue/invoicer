import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Invoice } from '../../models/invoice.model';
import { InvoiceService } from '../../services/invoice.service';

@Component({
  selector: 'app-preview',
  templateUrl: './preview.page.html',
  styleUrls: ['./preview.page.scss'],
  standalone: false,
})
export class PreviewPage implements OnInit {
  invoice$!: Observable<Invoice>;
  invoiceId!: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private invoiceService: InvoiceService
  ) {}

  ngOnInit() {
    this.invoiceId = this.route.snapshot.paramMap.get('id')!;
    this.invoice$ = this.invoiceService.getById(this.invoiceId);
  }

  editInvoice() {
    this.router.navigate(['/editor', this.invoiceId]);
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  print() {
    window.print();
  }
}
