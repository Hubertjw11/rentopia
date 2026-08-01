export type Coordinates = { longitude: number; latitude: number };

export type Location = {
  id: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  coordinates: Coordinates;
};

export type Manager = {
  id: number;
  cognitoId: string;
  name: string;
  email: string;
  phoneNumber: string;
};

export type Tenant = Manager & {
  stripeCustomerId: string | null;
  favorites?: Property[];
};

export type Property = {
  id: number;
  name: string;
  description: string;
  pricePerMonth: number;
  securityDeposit: number;
  applicationFee: number;
  photoUrls: string[];
  amenities: string[];
  highlights: string[];
  isPetsAllowed: boolean;
  isParkingIncluded: boolean;
  beds: number;
  baths: number;
  squareFeet: number;
  propertyType: string;
  postedDate: string;
  averageRating: number | null;
  numberOfReviews: number | null;
  locationId: number;
  managerCognitoId: string;
  location: Location;
  manager?: Manager;
};

export type Lease = {
  id: number;
  startDate: string;
  endDate: string;
  rent: number;
  deposit: number;
  propertyId: number;
  tenantCognitoId: string;
};

export type LeaseWithTenant = Lease & { tenant: Tenant };

export type ApplicationLease = Lease & { nextPaymentDate: string };

export type ApplicationStatus = "Pending" | "Approved" | "Denied";

export type Application = {
  id: number;
  applicationDate: string;
  status: ApplicationStatus;
  propertyId: number;
  tenantCognitoId: string;
  name: string;
  email: string;
  phoneNumber: string;
  message: string | null;
  leaseId: number | null;
  property: Property & { address: string };
  tenant: Tenant;
  manager: Manager;
  lease: ApplicationLease | null;
};

export type ApplicationRow = Omit<
  Application,
  "property" | "manager" | "lease"
> & {
  property: Property;
  lease?: Lease | null;
};

export type PaymentStatus = "Pending" | "Paid" | "PartiallyPaid" | "Overdue";

export type Payment = {
  id: number;
  amountDue: number;
  amountPaid: number;
  dueDate: string;
  paymentDate: string;
  paymentStatus: PaymentStatus;
  leaseId: number;
};

export type PaymentMethod = {
  id: number;
  tenantCognitoId: string;
  stripePaymentMethodId: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  createdAt: string;
};

export type NotificationType =
  | "ApplicationSubmitted"
  | "ApplicationApproved"
  | "ApplicationDenied"
  | "NewMessage";

export type AppNotification = {
  id: number;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export type NotificationPage = {
  notifications: AppNotification[];
  hasMore: boolean;
};

export type PropertyPage = {
  properties: Property[];
  total: number;
  page: number;
  limit: number;
};

export type PropertyMarker = {
  id: number;
  name: string;
  pricePerMonth: number;
  longitude: number;
  latitude: number;
};

export type ReplyPreview = {
  id: number;
  senderCognitoId: string;
  body: string;
  isDeleted: boolean;
};

export type MessageSearchHit = {
  id: number;
  conversationId: number;
  senderCognitoId: string;
  body: string;
  createdAt: string;
  conversation: {
    id: number;
    propertyName: string;
    tenantName: string;
    managerName: string;
  };
};

export type MessageSearchPage = {
  results: MessageSearchHit[];
  hasMore: boolean;
};

export type Message = {
  id: number;
  conversationId: number;
  senderCognitoId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  isDeleted: boolean;
  replyTo: ReplyPreview | null;
};

export type MessagePage = {
  messages: Message[];
  hasMore: boolean;
};

export type Conversation = {
  id: number;
  propertyId: number;
  tenantCognitoId: string;
  managerCognitoId: string;
  lastMessageAt: string;
  createdAt: string;
  property: { id: number; name: string; photoUrls: string[] };
  tenant: { cognitoId: string; name: string };
  manager: { cognitoId: string; name: string };
  lastMessage: Message | null;
  unreadCount: number;
};

export type ConversationRow = Omit<
  Conversation,
  "property" | "tenant" | "manager" | "lastMessage" | "unreadCount"
>;

export type Review = {
  id: number;
  rating: number;
  comment: string | null;
  propertyId: number;
  tenantCognitoId: string;
  createdAt: string;
  updatedAt: string;
  tenant: { cognitoId: string; name: string };
};

export type ReviewRow = Omit<Review, "tenant">;
