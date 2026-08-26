"use client";

import Header from "@/components/Header";
import Loading from "@/components/Loading";
import PropertyFormFields from "@/components/PropertyFormFields";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { PropertyEditFormData, propertyEditSchema } from "@/lib/schemas";
import { useGetPropertyQuery, useUpdatePropertyMutation } from "@/state/api";
import { Property } from "@/types/model";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";

const EditPropertyForm = ({ property }: { property: Property }) => {
  const router = useRouter();
  const [updateProperty] = useUpdatePropertyMutation();

  const form = useForm<PropertyEditFormData>({
    resolver: zodResolver(
      propertyEditSchema,
    ) as unknown as Resolver<PropertyEditFormData>,
    defaultValues: {
      name: property.name,
      description: property.description,
      pricePerMonth: property.pricePerMonth,
      securityDeposit: property.securityDeposit,
      applicationFee: property.applicationFee,
      isPetsAllowed: property.isPetsAllowed,
      isParkingIncluded: property.isParkingIncluded,
      photoUrls: [],
      keptPhotoUrls: property.photoUrls,
      amenities: property.amenities as PropertyEditFormData["amenities"],
      highlights: property.highlights as PropertyEditFormData["highlights"],
      beds: property.beds,
      baths: property.baths,
      squareFeet: property.squareFeet,
      propertyType:
        property.propertyType as PropertyEditFormData["propertyType"],
      latitude: property.location.coordinates.latitude,
      longitude: property.location.coordinates.longitude,
      address: property.location.address,
      city: property.location.city,
      state: property.location.state,
      country: property.location.country,
      postalCode: property.location.postalCode,
    },
  });

  const keptPhotoUrls = useWatch({
    control: form.control,
    name: "keptPhotoUrls",
  });

  const removePhoto = (url: string) => {
    form.setValue(
      "keptPhotoUrls",
      form.getValues("keptPhotoUrls").filter((kept) => kept !== url),
      { shouldValidate: true, shouldDirty: true },
    );
  };

  const onSubmit = async (data: PropertyEditFormData) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === "photoUrls") {
        const files = value as File[];
        files.forEach((file: File) => {
          formData.append("photos", file);
        });
      } else if (key === "keptPhotoUrls") {
        formData.append(key, JSON.stringify(value));
      } else if (Array.isArray(value)) {
        formData.append(key, value.join(","));
      } else {
        formData.append(key, String(value));
      }
    });

    const result = await updateProperty({ id: property.id, body: formData });
    if ("error" in result) return;

    router.push(`/managers/properties/${property.id}`);
  };

  return (
    <div className="dashboard-container">
      <Link
        href={`/managers/properties/${property.id}`}
        className="flex items-center mb-4 hover:text-primary-500"
        scroll={false}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        <span>Back to {property.name}</span>
      </Link>

      <Header
        title="Edit Property"
        subtitle="Update the details tenants see on this listing"
      />
      <div className="bg-white rounded-xl p-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="p-4 space-y-10"
          >
            <PropertyFormFields
              existingPhotos={keptPhotoUrls}
              onRemoveExistingPhoto={removePhoto}
              initialLongitude={property.location.coordinates.longitude}
              initialLatitude={property.location.coordinates.latitude}
            />
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="bg-primary-700 text-white w-full mt-8"
            >
              {form.formState.isSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

const EditProperty = () => {
  const { id } = useParams();
  const propertyId = Number(id);
  const { data: property, isLoading } = useGetPropertyQuery(propertyId);

  if (isLoading) return <Loading />;
  if (!property) return <div>Property not found</div>;
  return <EditPropertyForm key={property.id} property={property} />;
};

export default EditProperty;