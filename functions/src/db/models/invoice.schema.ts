import { Schema, model } from 'mongoose';

const itemSchema = new Schema(
  {
    description: { type: String, required: true },
    quantity:    { type: Number, required: true },
    rate:        { type: Number, required: true },
    amount:      { type: Number, required: true },
  },
  { _id: false }
);

const partySchema = new Schema(
  {
    name:    { type: String, required: true },
    email:   { type: String, required: true },
    phone:   { type: String, default: '' },
    address: { type: String, default: '' },
  },
  { _id: false }
);

const invoiceSchema = new Schema(
  {
    userId:        { type: String, required: true, index: true },
    invoiceNumber: { type: String, required: true },
    status:        { type: String, enum: ['draft', 'pending', 'paid'], required: true },
    issueDate:     { type: String, required: true },
    dueDate:       { type: String, required: true },
    from:          { type: partySchema, required: true },
    to:            { type: partySchema, required: true },
    items:         { type: [itemSchema], required: true },
    notes:         { type: String, default: '' },
    subtotal:      { type: Number, required: true },
    taxRate:       { type: Number, default: 0 },
    taxAmount:     { type: Number, default: 0 },
    total:         { type: Number, required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Invoice = model('Invoice', invoiceSchema);
