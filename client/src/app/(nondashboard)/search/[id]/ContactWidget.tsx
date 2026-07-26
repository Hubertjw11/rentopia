import { Button } from "@/components/ui/button";
import { useGetAuthUserQuery, useGetPropertyQuery } from "@/state/api";
import { Mail, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

const ContactWidget = ({ onOpenModal, propertyId }: ContactWidgetProps) => {
  const { data: authUser } = useGetAuthUserQuery();
  const { data: property } = useGetPropertyQuery(propertyId);
  const router = useRouter();

  const manager = property?.manager;

  const handleButtonClick = () => {
    if (authUser) {
      onOpenModal();
    } else {
      router.push("/signin");
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
        <a
          href={`mailto:${manager.email}`}
          className="flex items-center gap-2 mb-4 text-sm text-primary-600 hover:underline break-all"
        >
          <Mail className="w-4 h-4 shrink-0" />
          {manager.email}
        </a>
      )}

      <Button
        className="w-full bg-primary-700 text-white hover:bg-primary-600"
        onClick={handleButtonClick}
      >
        {authUser ? "Submit Application" : "Sign In to Apply"}
      </Button>

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
      </div>
    </div>
  );
};

export default ContactWidget;
