"use client";

import React from "react";
import { Star } from "lucide-react";
import { useGetReviewsQuery } from "@/state/api";
import { Review } from "@/types/model";

export const Stars = ({
  value,
  className = "w-4 h-4",
}: {
  value: number;
  className?: string;
}) => (
  <span className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className={`${className} ${
          n <= Math.round(value)
            ? "text-yellow-400 fill-yellow-400"
            : "text-gray-300"
        }`}
      />
    ))}
  </span>
);

const PropertyReviews = ({ propertyId }: { propertyId: number }) => {
  const { data: reviews, isLoading } = useGetReviewsQuery(propertyId);

  const average = reviews?.length
    ? reviews.reduce((sum: number, r: Review) => sum + r.rating, 0) /
      reviews.length
    : 0;

  return (
    <div className="py-16">
      <h3 className="text-xl font-semibold text-primary-800">Reviews</h3>

      {isLoading ? (
        <p className="text-sm text-gray-500 mt-4">Loading…</p>
      ) : !reviews?.length ? (
        <p className="text-sm text-gray-500 mt-4">
          No reviews yet. Only tenants who have leased this property can leave
          one.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-3 mt-2">
            <Stars value={average} className="w-5 h-5" />
            <span className="font-semibold">{average.toFixed(1)}</span>
            <span className="text-sm text-gray-500">
              ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
            </span>
          </div>

          <div className="mt-6 space-y-5">
            {reviews.map((r: Review) => (
              <div
                key={r.id}
                className="border-b border-primary-200 pb-5 last:border-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-sm">{r.tenant.name}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-1">
                  <Stars value={r.rating} className="w-3.5 h-3.5" />
                </div>
                {r.comment && (
                  <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
                    {r.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PropertyReviews;