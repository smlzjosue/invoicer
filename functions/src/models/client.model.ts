export interface Client {
  id?: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateClientDto {
  userId?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}
