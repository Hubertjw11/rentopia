import * as z from "zod";
import { AmenityEnum, HighlightEnum, PropertyTypeEnum } from "@/lib/constants";

export const addressKey = (parts: {
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}) =>
  [parts.address, parts.city, parts.state, parts.postalCode, parts.country]
    .map((part) => String(part ?? "").trim().toLowerCase())
    .join("|");

const pinMatchesAddress = (data: {
  pinConfirmedFor: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}) => data.pinConfirmedFor === addressKey(data);

const pinIssue: { message: string; path: (string | number)[] } = {
  message: "Confirm the pin — the address changed since it was last set",
  path: ["latitude"],
};

const propertyFields = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  pricePerMonth: z.coerce.number().positive(),
  securityDeposit: z.coerce.number().positive(),
  applicationFee: z.coerce.number().positive(),
  isPetsAllowed: z.boolean(),
  isParkingIncluded: z.boolean(),
  photoUrls: z
    .array(z.instanceof(File))
    .min(1, "At least one photo is required"),
  amenities: z
    .array(z.nativeEnum(AmenityEnum))
    .min(1, "Pick at least one amenity"),
  highlights: z
    .array(z.nativeEnum(HighlightEnum))
    .min(1, "Pick at least one highlight"),
  beds: z.coerce.number().positive().max(10).int(),
  baths: z.coerce.number().positive().max(10),
  squareFeet: z.coerce.number().int().positive(),
  propertyType: z.nativeEnum(PropertyTypeEnum),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  pinConfirmedFor: z.string(),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  postalCode: z.string().min(1, "Postal code is required"),
});

export const propertySchema = propertyFields.refine(
  pinMatchesAddress,
  pinIssue,
);

export type PropertyFormData = z.infer<typeof propertySchema>;

export const propertyEditSchema = propertyFields
  .extend({
    photoUrls: z.array(z.instanceof(File)),
    keptPhotoUrls: z.array(z.string()),
  })
  .refine((data) => data.keptPhotoUrls.length + data.photoUrls.length > 0, {
    message: "At least one photo is required",
    path: ["photoUrls"],
  })
  .refine(pinMatchesAddress, pinIssue);

export type PropertyEditFormData = z.infer<typeof propertyEditSchema>;

export const applicationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  message: z.string().optional(),
});

export type ApplicationFormData = z.infer<typeof applicationSchema>;

export const settingsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;
