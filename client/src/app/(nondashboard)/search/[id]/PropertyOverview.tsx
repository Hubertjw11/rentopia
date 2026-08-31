import {
  FurnishingEnum,
  FurnishingLabels,
  RentalPeriodEnum,
  RentalPeriodLabels,
  RentalPeriodSuffix,
} from "@/lib/constants";
import { formatIDR } from "@/lib/utils";
import { useGetPropertyQuery } from "@/state/api";
import { MapPin, Star } from "lucide-react";
import React from "react";

const PropertyOverview = ({ propertyId }: PropertyOverviewProps) => {
  const {
    data: property,
    isError,
    isLoading,
  } = useGetPropertyQuery(propertyId);

  if (isLoading) return <>Loading...</>;
  if (isError || !property) {
    return <>Property Not Found</>;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <div className="text-sm text-gray-500 mb-1">
          {property.location?.country} / {property.location?.state} /{" "}
          <span className="font-semibold text-gray-600">
            {property.location?.city}
          </span>
        </div>
        <h1 className="text-3xl font-bold my-5">{property.name}</h1>
        <div className="flex justify-between items-center">
          <span className="flex items-center text-gray-500">
            <MapPin className="w-4 h-4 mr-1 text-gray-700" />
            {property.location?.city}, {property.location?.state},{" "}
            {property.location?.country}
          </span>
          <div className="flex justify-between items-center gap-3">
            <span className="flex items-center text-yellow-500">
              <Star className="w-4 h-4 mr-1 fill-current" />
              {(property.averageRating ?? 0).toFixed(1)} (
              {property.numberOfReviews ?? 0})
            </span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="border border-primary-200 rounded-xl p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 sm:flex sm:justify-between sm:items-center sm:px-5">
          <div>
            <div className="text-sm text-gray-500">
              Rent (
              {RentalPeriodLabels[
                property.rentalPeriod as RentalPeriodEnum
              ].toLowerCase()}
              )
            </div>
            <div className="font-semibold">
              {formatIDR(property.price)}
              <span className="text-sm font-normal text-gray-500">
                {RentalPeriodSuffix[property.rentalPeriod as RentalPeriodEnum]}
              </span>
            </div>
          </div>
          <div className="hidden sm:block border-l border-gray-300 h-10"></div>
          <div>
            <div className="text-sm text-gray-500">Bedrooms</div>
            <div className="font-semibold">{property.beds} bd</div>
          </div>
          <div className="hidden sm:block border-l border-gray-300 h-10"></div>
          <div>
            <div className="text-sm text-gray-500">Bathrooms</div>
            <div className="font-semibold">{property.baths} ba</div>
          </div>
          <div className="hidden sm:block border-l border-gray-300 h-10"></div>
          <div>
            <div className="text-sm text-gray-500">Area</div>
            <div className="font-semibold">
              {property.areaSqm.toLocaleString()} m²
            </div>
          </div>
          <div className="hidden sm:block border-l border-gray-300 h-10"></div>
          <div>
            <div className="text-sm text-gray-500">Furnishing</div>
            <div className="font-semibold">
              {property.furnishing
                ? FurnishingLabels[property.furnishing as FurnishingEnum]
                : "Not specified"}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="my-16">
        <h2 className="text-xl font-semibold mb-5">About {property.name}</h2>
        {property.description?.trim() ? (
          <p className="text-gray-500 leading-7 whitespace-pre-wrap">
            {property.description}
          </p>
        ) : (
          <p className="text-gray-400 leading-7 italic">
            No description has been added for this property yet.
          </p>
        )}
      </div>
    </div>
  );
};

export default PropertyOverview;
