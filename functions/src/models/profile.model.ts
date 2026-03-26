export interface UserProfile {
  companyName: string;
  email: string;
  phone?: string;
  address?: string;
  updatedAt?: FirebaseFirestore.Timestamp | Date;
}
