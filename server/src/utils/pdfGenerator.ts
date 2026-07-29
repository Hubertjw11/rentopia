import PDFDocument from "pdfkit";

/** Brand palette — mirrors the values in client globals.css */
const DARK = "#27272a";
const ACCENT = "#e45a5a";
const MUTED = "#57575f";
const RULE = "#e0e0e2";

export type AgreementData = {
  lease: {
    id: number;
    startDate: Date;
    endDate: Date;
    rent: number;
    deposit: number;
  };
  property: {
    name: string;
    isPetsAllowed: boolean;
    isParkingIncluded: boolean;
    location: {
      address: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
  };
  tenant: { name: string; email: string; phoneNumber: string };
  manager: { name: string; email: string; phoneNumber: string };
};

const money = (n: number) =>
  `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

const longDate = (d: Date) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

/** Dark banner with the RENTOPIA wordmark. */
const drawHeader = (doc: PDFKit.PDFDocument) => {
  doc.rect(0, 0, doc.page.width, 90).fill(DARK);

  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(24);
  doc.text("RENT", 50, 32, { continued: true });
  doc.fillColor(ACCENT).text("OPIA");

  doc
    .fillColor("#c7c7cc")
    .font("Helvetica")
    .fontSize(9)
    .text("Rental Management Platform", 50, 62);

  doc.y = 120;
  doc.fillColor(DARK);
};

const sectionTitle = (doc: PDFKit.PDFDocument, label: string) => {
  doc.moveDown(1);
  doc.x = 50;
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(DARK)
    .text(label.toUpperCase(), 50, doc.y);
  const y = doc.y + 3;
  doc
    .moveTo(50, y)
    .lineTo(doc.page.width - 50, y)
    .strokeColor(RULE)
    .lineWidth(1)
    .stroke();
  doc.moveDown(0.6);
};

const labelledRow = (
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  width: number,
) => {
  const startY = doc.y;
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(MUTED)
    .text(label.toUpperCase(), x, startY, { width });
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(DARK)
    .text(value || "—", x, doc.y + 1, { width });
};

/** Renders the whole agreement into an existing document. */
export const renderAgreement = (
  doc: PDFKit.PDFDocument,
  data: AgreementData,
) => {
  const { lease, property, tenant, manager } = data;
  const left = 50;
  const right = doc.page.width / 2 + 10;
  const colWidth = doc.page.width / 2 - 60;
  const fullAddress = `${property.location.address}, ${property.location.city}, ${property.location.state} ${property.location.postalCode}, ${property.location.country}`;

  drawHeader(doc);

  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(DARK)
    .text("RESIDENTIAL LEASE AGREEMENT", { align: "center" });
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(MUTED)
    .text(
      `Agreement No. RNT-${String(lease.id).padStart(5, "0")}  •  Issued ${longDate(new Date())}`,
      { align: "center" },
    );

  doc.moveDown(1.2);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(DARK)
    .text(
      `This Residential Lease Agreement (the "Agreement") is entered into between the Landlord and the Tenant identified below, for the rental of the property described herein, subject to the terms and conditions set out in this Agreement.`,
      { align: "justify" },
    );

  /* PARTIES */
  sectionTitle(doc, "Parties");
  const partiesY = doc.y;
  labelledRow(doc, "Landlord / Manager", manager.name, left, colWidth);
  labelledRow(doc, "Email", manager.email, left, colWidth);
  labelledRow(doc, "Phone", manager.phoneNumber, left, colWidth);
  const afterLeft = doc.y;

  doc.y = partiesY;
  labelledRow(doc, "Tenant", tenant.name, right, colWidth);
  labelledRow(doc, "Email", tenant.email, right, colWidth);
  labelledRow(doc, "Phone", tenant.phoneNumber, right, colWidth);
  doc.y = Math.max(afterLeft, doc.y);

  /* PROPERTY */
  sectionTitle(doc, "Leased Premises");
  labelledRow(doc, "Property", property.name, left, doc.page.width - 100);
  labelledRow(doc, "Address", fullAddress, left, doc.page.width - 100);

  const amenities: string[] = [];
  amenities.push(
    property.isPetsAllowed ? "Pets permitted" : "No pets permitted",
  );
  amenities.push(
    property.isParkingIncluded ? "Parking included" : "Parking not included",
  );
  labelledRow(
    doc,
    "Conditions",
    amenities.join("  •  "),
    left,
    doc.page.width - 100,
  );

  /* TERMS */
  sectionTitle(doc, "Term and Payment");
  const termsY = doc.y;
  labelledRow(doc, "Lease Start", longDate(lease.startDate), left, colWidth);
  labelledRow(doc, "Monthly Rent", money(lease.rent), left, colWidth);
  const afterTerms = doc.y;

  doc.y = termsY;
  labelledRow(doc, "Lease End", longDate(lease.endDate), right, colWidth);
  labelledRow(doc, "Security Deposit", money(lease.deposit), right, colWidth);
  doc.y = Math.max(afterTerms, doc.y);

  /* CLAUSES */
  sectionTitle(doc, "Terms and Conditions");

  const clauses: [string, string][] = [
    [
      "Term of Tenancy",
      `The tenancy begins on ${longDate(lease.startDate)} and ends on ${longDate(lease.endDate)}. Continued occupancy beyond the end date requires a renewal agreed in writing by both parties.`,
    ],
    [
      "Rent",
      `Rent of ${money(lease.rent)} is payable monthly, in advance, on or before the first day of each calendar month. Payments are made through the Rentopia platform using the Tenant's registered payment method.`,
    ],
    [
      "Security Deposit",
      `The Tenant has paid a security deposit of ${money(lease.deposit)}. The deposit is returned within thirty (30) days of the end of tenancy, less any deductions for unpaid rent or damage beyond ordinary wear and tear, with an itemised statement provided.`,
    ],
    [
      "Use of Premises",
      "The premises shall be used solely as a private residence for the Tenant and permitted occupants. Any sublease or assignment requires the Landlord's prior written consent.",
    ],
    [
      "Maintenance and Repairs",
      "The Landlord shall maintain the structure, plumbing, electrical and heating systems in good working order. The Tenant shall keep the premises clean and promptly report any damage or required repairs.",
    ],
    [
      "Entry by Landlord",
      "The Landlord may enter the premises for inspection, repairs, or showings after giving the Tenant at least twenty-four (24) hours' notice, except in the case of an emergency.",
    ],
    [
      "Termination",
      "Either party may terminate this Agreement at the end of the term by giving thirty (30) days' written notice. Early termination by the Tenant may result in forfeiture of the security deposit.",
    ],
  ];

  clauses.forEach(([heading, body], i) => {
    if (doc.y > doc.page.height - 140) doc.addPage();
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(DARK)
      .text(`${i + 1}. ${heading}`, left, doc.y, {
        width: doc.page.width - 100,
      });
    doc
      .font("Helvetica")
      .fontSize(9.5)
      .fillColor(MUTED)
      .text(body, left, doc.y, {
        width: doc.page.width - 100,
        align: "justify",
        indent: 12,
      });
    doc.moveDown(0.5);
  });

  /* SIGNATURES */
  if (doc.y > doc.page.height - 200) doc.addPage();
  sectionTitle(doc, "Signatures");
  doc.moveDown(1.5);

  const sigY = doc.y + 30;
  [left, right].forEach((x, idx) => {
    doc
      .moveTo(x, sigY)
      .lineTo(x + colWidth, sigY)
      .strokeColor(DARK)
      .lineWidth(0.8)
      .stroke();
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(DARK)
      .text(idx === 0 ? manager.name : tenant.name, x, sigY + 6, {
        width: colWidth,
      });
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(MUTED)
      .text(idx === 0 ? "Landlord / Manager" : "Tenant", x, doc.y + 1, {
        width: colWidth,
      });
    doc.text("Date: ______________________", x, doc.y + 10, {
      width: colWidth,
    });
  });

  /* FOOTER on every page */
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    const footerY = doc.page.height - 60;
    doc
      .moveTo(50, footerY)
      .lineTo(doc.page.width - 50, footerY)
      .strokeColor(RULE)
      .lineWidth(1)
      .stroke();
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(MUTED)
      .text(
        "Generated by Rentopia. This document is provided for demonstration purposes and has not been reviewed by a legal professional.",
        50,
        footerY + 8,
        { width: doc.page.width - 100, align: "left", lineBreak: false },
      );
    doc.text(`Page ${i - range.start + 1} of ${range.count}`, 50, footerY + 8, {
      width: doc.page.width - 100,
      align: "right",
      lineBreak: false,
    });

    doc.page.margins.bottom = bottomMargin;
  }
};

/** Builds the agreement and resolves with the finished PDF bytes. */
export const generateAgreementBuffer = (data: AgreementData): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    try {
      renderAgreement(doc, data);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
