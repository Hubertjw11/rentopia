"use client";

import Header from "@/components/Header";
import PropertyFormFields from "@/components/PropertyFormFields";
import { Form } from "@/components/ui/form";
import { RentalPeriodEnum } from "@/lib/constants";
import { PropertyFormData, propertySchema } from "@/lib/schemas";
import { useCreatePropertyMutation, useGetAuthUserQuery } from "@/state/api";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { Button } from "@/components/ui/button";

const NewProperty = () => {
  const [createProperty] = useCreatePropertyMutation();
  const { data: authUser } = useGetAuthUserQuery();

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(
      propertySchema,
    ) as unknown as Resolver<PropertyFormData>,
    defaultValues: {
      name: "",
      description: "",
      price: 3_500_000,
      rentalPeriod: RentalPeriodEnum.Monthly,
      securityDeposit: 3_500_000,
      applicationFee: 250_000,
      isPetsAllowed: true,
      isParkingIncluded: true,
      photoUrls: [],
      amenities: [],
      highlights: [],
      beds: 1,
      baths: 1,
      areaSqm: 90,
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      pinConfirmedFor: "",
    },
  });

  const [resetToken, setResetToken] = useState(0);

  const onSubmit = async (data: PropertyFormData) => {
    if (!authUser?.cognitoInfo?.userId) {
      throw new Error("No manager ID found");
    }

    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === "photoUrls") {
        const files = value as File[];
        files.forEach((file: File) => {
          formData.append("photos", file);
        });
      } else if (Array.isArray(value)) {
        formData.append(key, value.join(","));
      } else {
        formData.append(key, String(value));
      }
    });

    formData.append("managerCognitoId", authUser.cognitoInfo.userId);

    const result = await createProperty(formData);
    if ("error" in result) return;

    form.reset();
    setResetToken((token) => token + 1);
  };

  return (
    <div className="dashboard-container">
      <Header
        title="Add New Property"
        subtitle="Create a new property listing with detailed information"
      />
      <div className="bg-white rounded-xl p-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="p-4 space-y-10"
          >
            <PropertyFormFields resetToken={resetToken} />
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="bg-primary-700 text-white w-full mt-8"
            >
              {form.formState.isSubmitting ? "Creating…" : "Create Property"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default NewProperty;