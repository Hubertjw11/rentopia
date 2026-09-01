"use client";

import Header from "@/components/Header";
import Loading from "@/components/Loading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useGetPropertyPaymentsQuery,
  useGetPropertyLeasesQuery,
  useGetPropertyQuery,
} from "@/state/api";
import {
  ArrowDownToLine,
  ArrowLeft,
  Check,
  Download,
  Pencil,
} from "lucide-react";
import { RentalPeriodEnum, RentalPeriodSuffix } from "@/lib/constants";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useDownload } from "@/hooks/useDownload";
import ManagerViewingSlots from "@/components/ManagerViewingSlots";
import { formatDate } from "@/lib/datetime";
import React from "react";
import { formatIDR } from "@/lib/utils";

const PaymentStatusBadge = ({ status }: { status: string }) => (
  <span
    className={`px-2 py-1 rounded-full text-xs font-semibold ${
      status === "Paid"
        ? "bg-green-100 text-green-800 border-green-300"
        : "bg-red-100 text-red-800 border-red-300"
    }`}
  >
    {status === "Paid" && <Check className="w-4 h-4 inline-block mr-1" />}
    {status}
  </span>
);

const AgreementButton = ({
  leaseId,
  download,
  downloading,
  className = "",
}: {
  leaseId: number;
  download: (path: string, fallbackName: string) => Promise<void>;
  downloading: string | null;
  className?: string;
}) => {
  const path = `leases/${leaseId}/agreement`;
  return (
    <button
      onClick={() => download(path, `agreement-${leaseId}.pdf`)}
      disabled={downloading === path}
      className={`border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex items-center justify-center font-semibold hover:bg-primary-700 hover:text-primary-50 disabled:opacity-50 ${className}`}
    >
      <ArrowDownToLine className="w-4 h-4 mr-1" />
      {downloading === path ? "Preparing…" : "Download Agreement"}
    </button>
  );
};

const PropertyTenants = () => {
  const { id } = useParams();
  const propertyId = Number(id);

  const { data: property, isLoading: propertyLoading } =
    useGetPropertyQuery(propertyId);
  const { data: leases, isLoading: leasesLoading } =
    useGetPropertyLeasesQuery(propertyId);
  const { data: payments, isLoading: paymentsLoading } =
    useGetPropertyPaymentsQuery(propertyId);
  const { download, downloading } = useDownload();

  if (propertyLoading || leasesLoading || paymentsLoading) return <Loading />;

  const getCurrentMonthPaymentStatus = (leaseId: number) => {
    const currentDate = new Date();
    const currentMonthPayment = payments?.find(
      (payment) =>
        payment.leaseId === leaseId &&
        new Date(payment.dueDate).getMonth() === currentDate.getMonth() &&
        new Date(payment.dueDate).getFullYear() === currentDate.getFullYear(),
    );
    return currentMonthPayment?.paymentStatus || "Not Paid";
  };

  return (
    <div className="dashboard-container">
      {/* Back to properties page */}
      <Link
        href="/managers/properties"
        className="flex items-center mb-4 hover:text-primary-500"
        scroll={false}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        <span>Back to Properties</span>
      </Link>

      <Header
        title={property?.name || "My Property"}
        subtitle="Manage tenants and leases for this property"
      />
      <ManagerViewingSlots propertyId={propertyId} />

      <div className="w-full space-y-6">
        <div className="mt-8 bg-white rounded-xl shadow-md overflow-hidden p-6">
          <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Tenants Overview</h2>
              <p className="text-sm text-gray-500">
                Manage and view all tenants for this property.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/managers/properties/${propertyId}/edit`}
                className={`bg-white border border-gray-300 text-gray-700 py-2
              px-4 rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-primary-50`}
              >
                <Pencil className="w-5 h-5 mr-2" />
                <span>Edit Property</span>
              </Link>
              <button
                onClick={() =>
                  download(
                    `properties/${propertyId}/agreements`,
                    "agreements.zip",
                  )
                }
                disabled={
                  downloading === `properties/${propertyId}/agreements` ||
                  !leases?.length
                }
                className={`bg-white border border-gray-300 text-gray-700 py-2
              px-4 rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-primary-50 disabled:opacity-50`}
              >
                <Download className="w-5 h-5 mr-2" />
                <span>
                  {downloading === `properties/${propertyId}/agreements`
                    ? "Preparing…"
                    : "Download All"}
                </span>
              </button>
            </div>
          </div>
          <hr className="mt-4 mb-1" />
          <div className="space-y-4 py-2 md:hidden">
            {!leases?.length && (
              <p className="py-4 text-sm text-gray-500">
                No tenants yet for this property.
              </p>
            )}
            {leases?.map((lease) => (
              <div
                key={lease.id}
                className="rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-center gap-3">
                  <Image
                    src="/landing-i1.png"
                    alt={lease.tenant.name}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-semibold">
                      {lease.tenant.name}
                    </div>
                    <div className="truncate text-sm text-gray-500">
                      {lease.tenant.email}
                    </div>
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-y-3 text-sm">
                  <div>
                    <dt className="text-gray-500">Lease period</dt>
                    <dd className="mt-0.5">
                      {formatDate(lease.startDate)}
                      <br />
                      {formatDate(lease.endDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Rent</dt>
                    <dd className="mt-0.5">
                      {formatIDR(lease.rent)}
                      <span className="text-gray-500">
                        {property
                          ? RentalPeriodSuffix[
                              property.rentalPeriod as RentalPeriodEnum
                            ]
                          : ""}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Contact</dt>
                    <dd className="mt-0.5">{lease.tenant.phoneNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">This month</dt>
                    <dd className="mt-1">
                      <PaymentStatusBadge
                        status={getCurrentMonthPaymentStatus(lease.id)}
                      />
                    </dd>
                  </div>
                </dl>

                <AgreementButton
                  leaseId={lease.id}
                  download={download}
                  downloading={downloading}
                  className="mt-4 w-full"
                />
              </div>
            ))}
          </div>

          <div className="hidden md:block">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Lease Period</TableHead>
                  <TableHead>Rent</TableHead>
                  <TableHead>Current Month Status</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leases?.map((lease) => (
                  <TableRow key={lease.id} className="h-24">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Image
                          src="/landing-i1.png"
                          alt={lease.tenant.name}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                        <div>
                          <div className="font-semibold">
                            {lease.tenant.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {lease.tenant.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{formatDate(lease.startDate)} -</div>
                      <div>{formatDate(lease.endDate)}</div>
                    </TableCell>
                    <TableCell>
                      {formatIDR(lease.rent)}
                      <span className="text-gray-500">
                        {property
                          ? RentalPeriodSuffix[
                              property.rentalPeriod as RentalPeriodEnum
                            ]
                          : ""}
                      </span>
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge
                        status={getCurrentMonthPaymentStatus(lease.id)}
                      />
                    </TableCell>
                    <TableCell>{lease.tenant.phoneNumber}</TableCell>
                    <TableCell>
                      <AgreementButton
                        leaseId={lease.id}
                        download={download}
                        downloading={downloading}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyTenants;
