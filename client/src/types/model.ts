// client/src/types/models.ts
export type Coordinates = { longitude: number; latitude: number };
export type Location = {
  id: number; address: string; city: string; state: string;
  country: string; postalCode: string; coordinates: Coordinates;
};
export type Manager = {
  id: number; cognitoId: string; name: string; email: string; phoneNumber: string;
};
export type Tenant = Manager & { stripeCustomerId: string | null; favorites?: Property[] };
export type Property = {
  id: number; name: string; description: string;
  pricePerMonth: number; securityDeposit: number; applicationFee: number;
  photoUrls: string[]; amenities: string[]; highlights: string[];
  isPetsAllowed: boolean; isParkingIncluded: boolean;
  beds: number; baths: number; squareFeet: number; propertyType: string;
  postedDate: string; averageRating: number | null; numberOfReviews: number | null;
  locationId: number; managerCognitoId: string;
  location: Location; manager?: Manager;
};
export type Lease = {
  id: number; startDate: string; endDate: string; rent: number; deposit: number;
  propertyId: number; tenantCognitoId: string;
  tenant?: Tenant; property?: Property; nextPaymentDate?: string;
};
export type Application = {
  id: number; applicationDate: string;
  status: "Pending" | "Approved" | "Denied";
  propertyId: number; tenantCognitoId: string;
  name: string; email: string; phoneNumber: string; message: string | null;
  leaseId: number | null;
  property: Property & { address: string };
  tenant: Tenant; manager: Manager; lease: Lease | null;
};
export type Payment = {
  id: number; amountDue: number; amountPaid: number;
  dueDate: string; paymentDate: string;
  paymentStatus: "Pending" | "Paid" | "PartiallyPaid" | "Overdue";
  leaseId: number;
};
export type PaymentMethod = {
  id: number; tenantCognitoId: string; stripePaymentMethodId: string;
  brand: string; last4: string; expMonth: number; expYear: number;
  isDefault: boolean; createdAt: string;
};