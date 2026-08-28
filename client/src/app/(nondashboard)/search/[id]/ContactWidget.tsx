import { Button } from "@/components/ui/button";
import {
  useGetAuthUserQuery,
  useGetConversationsQuery,
  useGetPropertyQuery,
  useStartConversationMutation,
} from "@/state/api";
import { Conversation } from "@/types/model";
import { BadgeCheck, Mail, MessageSquare, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import CostOfMove from "./CostOfMove";

const ContactWidget = ({ onOpenModal, propertyId }: ContactWidgetProps) => {
  const { data: authUser } = useGetAuthUserQuery();
  const { data: property } = useGetPropertyQuery(propertyId);
  const router = useRouter();

  const manager = property?.manager;

  const emailIsVerified =
    !!manager?.email &&
    !!manager?.verifiedEmail &&
    manager.email.trim().toLowerCase() ===
      manager.verifiedEmail.trim().toLowerCase();

  const [startConversation, { isLoading: starting }] =
    useStartConversationMutation();
  const isTenant = authUser?.userRole?.toLowerCase() === "tenant";
  const { data: conversations } = useGetConversationsQuery(undefined, {
    skip: !isTenant,
  });
  const existing = conversations?.find(
    (c: Conversation) => c.propertyId === propertyId,
  );

  const handleButtonClick = () => {
    if (authUser) {
      onOpenModal();
    } else {
      router.push("/signin");
    }
  };

  const handleMessage = async () => {
    if (!authUser) {
      router.push("/signin");
      return;
    }
    try {
      const conversation = await startConversation({ propertyId }).unwrap();
      router.push(`/tenants/messages?c=${conversation.id}`, { scroll: false });
    } catch {
      // withToast on the mutation already surfaced the error.
    }
  };

  return (
    <div className="bg-white border border-primary-200 rounded-2xl p-7 h-fit min-w-75">
      {/* Contact Property */}
      <div className="flex items-center gap-5 mb-4 border border-primary-200 p-4 rounded-xl">
        <div className="flex items-center p-4 bg-primary-900 rounded-full">
          <Phone className="text-primary-50" size={15} />
        </div>
        <div className="min-w-0">
          <p>Contact This Property</p>
          {manager?.phoneNumber ? (
            <a
              href={`tel:${manager.phoneNumber}`}
              className="text-lg font-bold text-primary-800 hover:underline"
            >
              {manager.phoneNumber}
            </a>
          ) : (
            <div className="text-lg font-bold text-primary-800">
              Not available
            </div>
          )}
        </div>
      </div>

      {manager?.email && (
        <div className="mb-4">
          <a
            href={`mailto:${manager.email}`}
            className="flex items-center gap-2 text-sm text-primary-600 hover:underline break-all"
          >
            <Mail className="w-4 h-4 shrink-0" />
            {manager.email}
          </a>
          {emailIsVerified && (
            <span className="mt-1 flex items-center gap-1 text-xs font-medium text-green-700">
              <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
              Email address confirmed
            </span>
          )}
        </div>
      )}

      {property && <CostOfMove property={property} />}

      <Button
        className="w-full bg-primary-700 text-white hover:bg-primary-600"
        onClick={handleButtonClick}
      >
        {authUser ? "Submit Application" : "Sign In to Apply"}
      </Button>

      {isTenant && (
        <Button
          variant="outline"
          disabled={starting}
          onClick={handleMessage}
          className="w-full mt-2 border-primary-400 hover:bg-primary-700 hover:text-primary-50"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          {starting
            ? "Opening…"
            : existing
              ? "Continue conversation"
              : "Message manager"}
        </Button>
      )}

      <hr className="my-4" />
      <div className="text-sm">
        {manager?.name && (
          <div className="text-primary-600 mb-1">
            Managed by <span className="font-semibold">{manager.name}</span>
          </div>
        )}
        <div className="text-primary-600">
          Open by appointment on Monday - Sunday
        </div>
        <p className="mt-3 text-xs text-primary-500">
          Rentopia confirms email addresses only. Phone numbers, identity and
          property ownership are not checked.
        </p>
      </div>
    </div>
  );
};

export default ContactWidget;
