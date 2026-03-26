import { Schema, model } from 'mongoose';

const userProfileSchema = new Schema(
  {
    // userId es el Firebase uid — actúa como clave primaria lógica
    userId:      { type: String, required: true, unique: true, index: true },
    companyName: { type: String, required: true },
    email:       { type: String, required: true },
    phone:       { type: String, default: '' },
    address:     { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        // Mantiene compatibilidad con la API anterior: { id: uid, ... }
        ret.id = ret.userId;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const UserProfile = model('UserProfile', userProfileSchema);
