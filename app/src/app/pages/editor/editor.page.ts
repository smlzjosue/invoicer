import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonDatetime, LoadingController, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { InvoiceService } from '../../services/invoice.service';
import { ClientService } from '../../services/client.service';
import { UserProfileService } from '../../services/user-profile.service';
import { Client } from '../../models/client.model';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.page.html',
  standalone: false,
  styleUrls: ['./editor.page.scss'],
})
export class EditorPage implements OnInit {
  form!: FormGroup;
  invoiceId: string | null = null;
  isNew = true;

  issueDateModalOpen = false;
  issueDateInitial = '';
  dueDateModalOpen = false;
  dueDateInitial = '';

  clientSelectorOpen = false;
  clientSearch = '';
  allClients: Client[] = [];

  get minDueDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  get issueDateDisplay(): string {
    const val = this.form.get('issueDate')!.value;
    if (!val) return 'Seleccionar fecha';
    const [year, month, day] = val.split('-');
    return `${day}/${month}/${year}`;
  }

  get dueDateDisplay(): string {
    const val = this.form.get('dueDate')!.value;
    if (!val) return 'Seleccionar fecha';
    const [year, month, day] = val.split('-');
    return `${day}/${month}/${year}`;
  }

  openIssueDateModal() {
    this.issueDateInitial = this.form.get('issueDate')!.value || new Date().toISOString().split('T')[0];
    this.issueDateModalOpen = true;
  }

  async confirmIssueDate(picker: IonDatetime) {
    await picker.confirm();
    const val = picker.value as string;
    if (val) this.form.get('issueDate')!.setValue(val.substring(0, 10));
    this.issueDateModalOpen = false;
  }

  setIssueDateToday() {
    this.form.get('issueDate')!.setValue(new Date().toISOString().split('T')[0]);
    this.issueDateModalOpen = false;
  }

  cancelIssueDate() {
    this.issueDateModalOpen = false;
  }

  openDueDateModal() {
    this.dueDateInitial = this.form.get('dueDate')!.value || this.minDueDate;
    this.dueDateModalOpen = true;
  }

  async confirmDueDate(picker: IonDatetime) {
    await picker.confirm();
    const val = picker.value as string;
    if (val) this.form.get('dueDate')!.setValue(val.substring(0, 10));
    this.dueDateModalOpen = false;
  }

  setDueDateToday() {
    this.form.get('dueDate')!.setValue(this.minDueDate);
    this.dueDateModalOpen = false;
  }

  cancelDueDate() {
    this.dueDateModalOpen = false;
  }

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private invoiceService: InvoiceService,
    private clientService: ClientService,
    private profileService: UserProfileService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.buildForm();
    firstValueFrom(this.clientService.getAll()).then((c) => (this.allClients = c));
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.invoiceId = id;
      this.isNew = false;
      this.loadInvoice(id);
    } else {
      const profile = this.profileService.getProfile();
      if (profile) {
        this.form.get('from')!.patchValue({
          name: profile.companyName,
          email: profile.email,
          phone: profile.phone,
          address: profile.address,
        });
      }
    }
  }

  get filteredClients(): Client[] {
    const term = this.clientSearch.toLowerCase().trim();
    if (!term) return this.allClients;
    return this.allClients.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term)
    );
  }

  openClientSelector() {
    this.clientSearch = '';
    this.clientSelectorOpen = true;
  }

  closeClientSelector() {
    this.clientSelectorOpen = false;
  }

  selectClient(client: Client) {
    this.form.get('to')!.patchValue({
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
    });
    this.clientSelectorOpen = false;
  }

  buildForm() {
    this.form = this.fb.group({
      invoiceNumber: [this.invoiceService.generateInvoiceNumber(), Validators.required],
      status: ['draft', Validators.required],
      issueDate: [new Date().toISOString().split('T')[0], Validators.required],
      dueDate: ['', Validators.required],
      from: this.fb.group({
        name: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone: [''],
        address: [''],
      }),
      to: this.fb.group({
        name: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone: [''],
        address: [''],
      }),
      items: this.fb.array([this.newItem()]),
      notes: [''],
      taxRate: [0, [Validators.min(0), Validators.max(100)]],
    });

    this.items.valueChanges.subscribe(() => this.recalculate());
    this.form.get('taxRate')!.valueChanges.subscribe(() => this.recalculate());
  }

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  newItem(): FormGroup {
    return this.fb.group({
      description: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      rate: [0, [Validators.required, Validators.min(0)]],
      amount: [{ value: 0, disabled: true }],
    });
  }

  addItem() {
    this.items.push(this.newItem());
  }

  removeItem(index: number) {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  recalculate() {
    const rawItems = this.items.controls.map((ctrl) => ({
      quantity: ctrl.get('quantity')!.value ?? 0,
      rate: ctrl.get('rate')!.value ?? 0,
    }));

    rawItems.forEach((item, i) => {
      this.items.at(i).get('amount')!.setValue(item.quantity * item.rate, { emitEvent: false });
    });
  }

  get totals() {
    const taxRate = this.form.get('taxRate')!.value ?? 0;
    const rawItems = this.items.controls.map((ctrl) => ({
      quantity: ctrl.get('quantity')!.value ?? 0,
      rate: ctrl.get('rate')!.value ?? 0,
    }));
    return this.invoiceService.calculateTotals(rawItems, taxRate);
  }

  async loadInvoice(id: string) {
    const loading = await this.loadingCtrl.create({ message: 'Cargando...' });
    await loading.present();
    try {
      const invoice = await firstValueFrom(this.invoiceService.getById(id));
      this.form.patchValue(invoice);
      // Rebuild items FormArray
      while (this.items.length) this.items.removeAt(0);
      invoice.items.forEach((item) => {
        const group = this.newItem();
        group.patchValue(item);
        this.items.push(group);
      });
    } finally {
      await loading.dismiss();
    }
  }

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Guardando...' });
    await loading.present();

    const { subtotal, taxAmount, total } = this.totals;
    const rawItems = this.items.getRawValue();
    const data = {
      ...this.form.getRawValue(),
      items: rawItems,
      subtotal,
      taxAmount,
      total,
    };

    try {
      if (this.isNew) {
        const newId = await this.invoiceService.create(data);
        await loading.dismiss();
        this.router.navigate(['/preview', newId], { replaceUrl: true });
      } else {
        await this.invoiceService.update(this.invoiceId!, data);
        await loading.dismiss();
        this.router.navigate(['/preview', this.invoiceId]);
      }
    } catch (err: any) {
      await loading.dismiss();
      console.error('Error guardando factura:', err);
      const toast = await this.toastCtrl.create({
        message: `Error: ${err?.message ?? 'No se pudo guardar la factura'}`,
        color: 'danger',
        duration: 5000,
      });
      await toast.present();
    }
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
