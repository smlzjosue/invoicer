import { Schema, model } from 'mongoose';

const clientSchema = new Schema(
  {
    userId:  { type: String, required: true, index: true },
    name:    { type: String, required: true },
    email:   { type: String, required: true },
    phone:   { type: String, default: '' },
    address: { type: String, default: '' },
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

export const Client = model('Client', clientSchema);
