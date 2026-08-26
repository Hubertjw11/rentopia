
"use client";

import { CustomFormField } from "@/components/FormField";
import LocationPicker from "@/components/LocationPicker";
import {
  AmenityEnum,
  AmenityIcons,
  HighlightEnum,
  HighlightIcons,
  PropertyTypeEnum,
} from "@/lib/constants";
import { formatEnumString } from "@/lib/utils";
import { X } from "lucide-react";
import Image from "next/image";
import React from "react";

type PropertyFormFieldsProps = {
  resetToken?: number;
  existingPhotos?: string[];
  onRemoveExistingPhoto?: (url: string) => void;
  initialLongitude?: number;
  initialLatitude?: number;
};

const PropertyFormFields = ({
  resetToken = 0,
  existingPhotos,
  onRemoveExistingPhoto,
  initialLongitude,
  initialLatitude,
}: PropertyFormFieldsProps) => (
  <>
    {/* Basic Information */}
    <div>
      <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
      <div className="space-y-4">
        <CustomFormField name="name" label="Property Name" />
        <CustomFormField name="description" label="Description" type="textarea" />
      </div>
    </div>

    <hr className="my-6 border-gray-200" />

    {/* Fees */}
    <div className="space-y-6">
      <h2 className="text-lg font-semibold mb-4">Fees</h2>
      <CustomFormField
        name="pricePerMonth"
        label="Price per Month"
        type="number"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CustomFormField
          name="securityDeposit"
          label="Security Deposit"
          type="number"
        />
        <CustomFormField
          name="applicationFee"
          label="Application Fee"
          type="number"
        />
      </div>
    </div>

    <hr className="my-6 border-gray-200" />

    {/* Property Details */}
    <div className="space-y-6">
      <h2 className="text-lg font-semibold mb-4">Property Details</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CustomFormField name="beds" label="Number of Beds" type="number" />
        <CustomFormField name="baths" label="Number of Baths" type="number" />
        <CustomFormField name="squareFeet" label="Square Feet" type="number" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <CustomFormField
          name="isPetsAllowed"
          label="Pets Allowed"
          type="switch"
        />
        <CustomFormField
          name="isParkingIncluded"
          label="Parking Included"
          type="switch"
        />
      </div>
      <div className="mt-4">
        <CustomFormField
          name="propertyType"
          label="Property Type"
          type="select"
          options={Object.keys(PropertyTypeEnum).map((type) => ({
            value: type,
            label: type,
          }))}
        />
      </div>
    </div>

    <hr className="my-6 border-gray-200" />

    {/* Amenities and Highlights */}
    <div>
      <h2 className="text-lg font-semibold mb-4">Amenities and Highlights</h2>
      <div className="space-y-6">
        <CustomFormField
          name="amenities"
          label="Amenities"
          type="multi-select"
          options={Object.keys(AmenityEnum).map((amenity) => ({
            value: amenity,
            label: formatEnumString(amenity),
          }))}
          icons={AmenityIcons}
        />
        <CustomFormField
          name="highlights"
          label="Highlights"
          type="multi-select"
          options={Object.keys(HighlightEnum).map((highlight) => ({
            value: highlight,
            label: formatEnumString(highlight),
          }))}
          icons={HighlightIcons}
        />
      </div>
    </div>

    <hr className="my-6 border-gray-200" />

    {/* Photos */}
    <div>
      <h2 className="text-lg font-semibold mb-4">Photos</h2>
      {existingPhotos && (
        <div className="mb-4">
          {existingPhotos.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {existingPhotos.map((url) => (
                <div
                  key={url}
                  className="relative h-24 w-32 overflow-hidden rounded-lg border border-gray-200"
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    sizes="128px"
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveExistingPhoto?.(url)}
                    aria-label="Remove this photo"
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-secondary-700">
              Every photo is removed — add at least one below before saving.
            </p>
          )}
        </div>
      )}
      <CustomFormField
        key={resetToken}
        name="photoUrls"
        label={existingPhotos ? "Add more photos" : "Property Photos"}
        type="file"
        accept="image/*"
      />
    </div>

    <hr className="my-6 border-gray-200" />

    {/* Additional Information */}
    <div className="space-y-6">
      <h2 className="text-lg font-semibold mb-4">Additional Information</h2>
      <CustomFormField name="address" label="Address" />
      <div className="flex justify-between gap-4">
        <CustomFormField name="city" label="City" className="w-full" />
        <CustomFormField name="state" label="State" className="w-full" />
        <CustomFormField
          name="postalCode"
          label="Postal Code"
          className="w-full"
        />
      </div>
      <CustomFormField name="country" label="Country" />

      <div>
        <h3 className="mb-2 text-sm font-medium">Pin the exact location</h3>
        <p className="mb-3 text-xs text-gray-500">
          Address lookup is often several kilometres off in Indonesia, so search
          by landmark if that&apos;s easier.
        </p>
        <LocationPicker
          key={resetToken}
          initialLongitude={initialLongitude}
          initialLatitude={initialLatitude}
        />
      </div>
    </div>
  </>
);

export default PropertyFormFields;