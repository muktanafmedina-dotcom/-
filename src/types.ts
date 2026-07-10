export interface Apartment {
  id?: string;
  buildingName: string;
  floor: string;
  apartmentNumber: string;
  description: string;
  images: string[];
  status: 'available' | 'occupied';
  price: number;
}

export interface Booking {
  id?: string;
  apartmentId: string;
  apartmentDetails: Apartment;
  customerName: string;
  customerId: string;
  customerMobile: string;
  paymentMethod: 'transfer' | 'arrival';
  bookingType: 'daily' | 'monthly';
  status?: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}
