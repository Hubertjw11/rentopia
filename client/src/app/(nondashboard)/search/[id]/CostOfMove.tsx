import { RentalPeriodEnum, RentalPeriodNoun } from "@/lib/constants";
import { formatIDR } from "@/lib/utils";
import { Property } from "@/types/model";
import React from "react";

const Row = ({ label, value }: { label: string; value: number }) => (
  <div className="flex justify-between gap-4 py-0.5">
    <span className="text-primary-600">{label}</span>
    <span className="font-medium tabular-nums">{formatIDR(value)}</span>
  </div>
);

const CostOfMove = ({ property }: { property: Property }) => {
  const noun =
    RentalPeriodNoun[property.rentalPeriod as RentalPeriodEnum] ?? "month";
  const total =
    property.price + property.securityDeposit + property.applicationFee;

  return (
    <div className="mb-4 rounded-xl border border-primary-200 p-4 text-sm">
      <h3 className="mb-2 font-semibold text-primary-800">Cost to move in</h3>

      <Row label={`First ${noun}'s rent`} value={property.price} />
      <Row label="Security deposit" value={property.securityDeposit} />
      <Row label="Application fee" value={property.applicationFee} />

      <hr className="my-2 border-primary-200" />

      <div className="flex justify-between gap-4">
        <span className="font-semibold text-primary-800">Due upfront</span>
        <span className="font-bold tabular-nums text-primary-800">
          {formatIDR(total)}
        </span>
      </div>

      {property.securityDeposit > 0 && (
        <p className="mt-2 text-xs text-primary-600">
          {formatIDR(property.securityDeposit)} of this is a refundable deposit,
          returned at the end of the tenancy less any deductions.
        </p>
      )}
    </div>
  );
};

export default CostOfMove;