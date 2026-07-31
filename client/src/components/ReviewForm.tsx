"use client";

import React, { useState } from "react";
import { Star, Trash2 } from "lucide-react";
import {
  useDeleteReviewMutation,
  useGetAuthUserQuery,
  useGetReviewsQuery,
  useUpsertReviewMutation,
} from "@/state/api";
import { Review } from "@/types/model";
import { Button } from "./ui/button";

const ReviewForm = ({ propertyId }: { propertyId: number }) => {
  const { data: authUser } = useGetAuthUserQuery();
  const { data: reviews } = useGetReviewsQuery(propertyId);
  const [upsertReview, { isLoading: saving }] = useUpsertReviewMutation();
  const [deleteReview, { isLoading: deleting }] = useDeleteReviewMutation();

  const mine = reviews?.find(
    (r: Review) => r.tenantCognitoId === authUser?.cognitoInfo?.userId,
  );

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [hover, setHover] = useState(0);
  const [loadedFor, setLoadedFor] = useState<number | null | undefined>(
    undefined,
  );

  if (reviews && loadedFor !== (mine?.id ?? null)) {
    setLoadedFor(mine?.id ?? null);
    setRating(mine?.rating ?? 0);
    setComment(mine?.comment ?? "");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) return;
    await upsertReview({ propertyId, rating, comment: comment.trim() });
  };

  return (
    <div className="mt-8 bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold mb-1">
        {mine ? "Your review" : "Write a review"}
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        {mine
          ? "You can update or remove your review at any time."
          : "Share how living here has been."}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              className="p-0.5"
            >
              <Star
                className={`w-7 h-7 ${
                  n <= (hover || rating)
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm text-gray-500">{rating} / 5</span>
          )}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="What was it like living here? (optional)"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
        />

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={saving || rating < 1}
            className="bg-primary-700 text-white hover:bg-primary-600"
          >
            {saving ? "Saving…" : mine ? "Update review" : "Submit review"}
          </Button>

          {mine && (
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => deleteReview({ id: mine.id, propertyId })}
              className="border-gray-300 hover:bg-red-600 hover:text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;