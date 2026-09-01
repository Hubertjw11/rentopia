"use client";

import React, { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  useCreateSetupIntentMutation,
  useDeletePaymentMethodMutation,
  useGetPaymentMethodsQuery,
  useSavePaymentMethodMutation,
  useSetDefaultPaymentMethodMutation,
} from "@/state/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, CreditCard, Plus, Trash2 } from "lucide-react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

/** Inner form — must live inside <Elements> to access the Stripe context. */
const AddCardForm = ({
  cognitoId,
  onDone,
}: {
  cognitoId: string;
  onDone: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [savePaymentMethod] = useSavePaymentMethodMutation();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: stripeError, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Could not save this card.");
      setSubmitting(false);
      return;
    }

    const pmId = setupIntent?.payment_method;
    if (typeof pmId === "string") {
      await savePaymentMethod({ cognitoId, stripePaymentMethodId: pmId });
      onDone();
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full bg-primary-700 text-white"
      >
        {submitting ? "Saving…" : "Save card"}
      </Button>
    </form>
  );
};

const PaymentMethods = ({ cognitoId }: { cognitoId: string }) => {
  const { data: methods, isLoading } = useGetPaymentMethodsQuery(cognitoId, {
    skip: !cognitoId,
  });
  const [createSetupIntent] = useCreateSetupIntentMutation();
  const [setDefault, { isLoading: settingDefault }] =
    useSetDefaultPaymentMethodMutation();
  const [deleteMethod, { isLoading: deleting }] =
    useDeletePaymentMethodMutation();

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAddCard = async () => {
    setActionError(null);
    try {
      const result = await createSetupIntent(cognitoId).unwrap();
      setClientSecret(result.clientSecret);
      setIsOpen(true);
    } catch {
      setActionError("Could not start card setup. Please try again.");
    }
  };
  const closeDialog = () => {
    setIsOpen(false);
    setClientSecret(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden p-6 mt-10 md:mt-0 flex-1">
      <h2 className="text-2xl font-bold mb-4">Payment Method</h2>
      <p className="mb-4 text-sm text-gray-500">
        Cards are stored securely by Stripe. We only keep the brand, last four
        digits, and expiry.
      </p>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : methods && methods.length > 0 ? (
        <div className="space-y-3">
          {methods.map((method) => (
            <div
              key={method.id}
              className="border rounded-lg p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-9 bg-primary-900 flex items-center justify-center rounded-md shrink-0">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold capitalize">
                      {method.brand} •••• {method.last4}
                    </span>
                    {method.isDefault && (
                      <span className="text-xs font-medium bg-primary-700 text-white px-2.5 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    Expires {String(method.expMonth).padStart(2, "0")}/
                    {method.expYear}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!method.isDefault && (
                  <button
                    onClick={() => setDefault({ cognitoId, id: method.id })}
                    disabled={settingDefault}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1.5 hover:bg-primary-700 hover:text-primary-50 disabled:opacity-50 flex items-center whitespace-nowrap"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Set as default
                  </button>
                )}
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        `Remove the ${method.brand} card ending in ${method.last4}?`,
                      )
                    ) {
                      deleteMethod({ cognitoId, id: method.id });
                    }
                  }}
                  disabled={deleting}
                  aria-label="Remove card"
                  className="text-sm border border-gray-300 rounded-md px-3 py-1.5 hover:bg-red-600 hover:text-white disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-dashed rounded-lg p-6 text-center text-gray-500">
          No payment method on file.
        </div>
      )}

      <Button
        onClick={handleAddCard}
        className="mt-5 bg-primary-700 text-white hover:bg-primary-600"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add payment method
      </Button>
      {actionError && (
        <p className="mt-3 text-sm text-red-600">{actionError}</p>
      )}

      <Dialog open={isOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="bg-white">
          <DialogHeader className="mb-4">
            <DialogTitle>Add a card</DialogTitle>
          </DialogHeader>
          {clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <AddCardForm cognitoId={cognitoId} onDone={closeDialog} />
            </Elements>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentMethods;
