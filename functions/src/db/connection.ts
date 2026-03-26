import mongoose from 'mongoose';

let isConnected = false;

export async function connectDb(): Promise<void> {
  if (isConnected || mongoose.connection.readyState === 1) return;

  const uri = process.env['MONGO_URI'];
  if (!uri) throw new Error('MONGO_URI no está definida en las variables de entorno');

  await mongoose.connect(uri);
  isConnected = true;
}
