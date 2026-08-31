import "./support/database";
import { before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import { resetDatabase } from "./support/database";
import {
  makeApplication,
  makeConversation,
  makeLease,
  makeManager,
  makeMessage,
  makeProperty,
  makeTenant,
  prisma,
} from "./support/factories";
import { asManager, asTenant, callRoute } from "./support/http";

import {
  getLeasePayments,
  getPropertyLeases,
  getPropertyPayments,
} from "../src/controllers/leaseControllers";
import {
  downloadLeaseAgreement,
  downloadPropertyAgreements,
} from "../src/controllers/agreementControllers";
import { updateApplicationStatus } from "../src/controllers/applicationControllers";
import {
  createConversation,
  editMessage,
} from "../src/controllers/conversationControllers";
import { updateProperty } from "../src/controllers/propertyControllers";
import { requireSelf } from "../src/middleware/authMiddleware";

/**
 * Ownership is enforced inside the Prisma where-clause, which means a resource
 * someone does not own is indistinguishable from one that does not exist.
 * These tests exist to keep it that way: every refusal below must be a 404,
 * never a 403, or an attacker can enumerate ids by watching status codes.
 */

const MISSING_ID = 999_999;

let owner: string;
let rival: string;
let tenant: string;
let stranger: string;
let propertyId: number;
let leaseId: number;

before(async () => {
  await resetDatabase();
});

beforeEach(async () => {
  await resetDatabase();

  owner = (await makeManager()).cognitoId;
  rival = (await makeManager()).cognitoId;
  tenant = (await makeTenant()).cognitoId;
  stranger = (await makeTenant()).cognitoId;

  const property = await makeProperty(owner);
  propertyId = property.id;
  leaseId = (await makeLease(propertyId, tenant)).id;
});

describe("a property's leases and payments", () => {
  it("are readable by the manager who owns the property", async () => {
    const leases = await callRoute(getPropertyLeases, {
      params: { id: String(propertyId) },
      user: asManager(owner),
    });
    assert.equal(leases.status, 200);

    const payments = await callRoute(getPropertyPayments, {
      params: { id: String(propertyId) },
      user: asManager(owner),
    });
    assert.equal(payments.status, 200);
  });

  it("look absent to a different manager", async () => {
    const leases = await callRoute(getPropertyLeases, {
      params: { id: String(propertyId) },
      user: asManager(rival),
    });
    assert.equal(leases.status, 404, "must be 404, not 403");

    const payments = await callRoute(getPropertyPayments, {
      params: { id: String(propertyId) },
      user: asManager(rival),
    });
    assert.equal(payments.status, 404, "must be 404, not 403");
  });

  it("answer a missing property the same way as a forbidden one", async () => {
    const missing = await callRoute(getPropertyLeases, {
      params: { id: String(MISSING_ID) },
      user: asManager(owner),
    });
    const forbidden = await callRoute(getPropertyLeases, {
      params: { id: String(propertyId) },
      user: asManager(rival),
    });
    assert.equal(missing.status, forbidden.status);
    assert.deepEqual(missing.body, forbidden.body);
  });
});

describe("a lease's payments", () => {
  it("are readable by the tenant on the lease", async () => {
    const result = await callRoute(getLeasePayments, {
      params: { id: String(leaseId) },
      user: asTenant(tenant),
    });
    assert.equal(result.status, 200);
  });

  it("are readable by the property's manager", async () => {
    const result = await callRoute(getLeasePayments, {
      params: { id: String(leaseId) },
      user: asManager(owner),
    });
    assert.equal(result.status, 200);
  });

  it("are hidden from an unrelated tenant", async () => {
    const result = await callRoute(getLeasePayments, {
      params: { id: String(leaseId) },
      user: asTenant(stranger),
    });
    assert.equal(result.status, 404, "must be 404, not 403");
  });

  it("are hidden from an unrelated manager", async () => {
    const result = await callRoute(getLeasePayments, {
      params: { id: String(leaseId) },
      user: asManager(rival),
    });
    assert.equal(result.status, 404, "must be 404, not 403");
  });
});

describe("lease agreements", () => {
  it("download for the tenant on the lease", async () => {
    const result = await callRoute(downloadLeaseAgreement, {
      params: { id: String(leaseId) },
      user: asTenant(tenant),
    });
    assert.equal(result.status, 200);
  });

  it("download for the property's manager", async () => {
    const result = await callRoute(downloadLeaseAgreement, {
      params: { id: String(leaseId) },
      user: asManager(owner),
    });
    assert.equal(result.status, 200);
  });

  it("are hidden from everyone else", async () => {
    const result = await callRoute(downloadLeaseAgreement, {
      params: { id: String(leaseId) },
      user: asTenant(stranger),
    });
    assert.equal(result.status, 404, "must be 404, not 403");
  });

  it("cannot be bulk-downloaded by another manager", async () => {
    const result = await callRoute(downloadPropertyAgreements, {
      params: { id: String(propertyId) },
      user: asManager(rival),
    });
    assert.equal(result.status, 404, "must be 404, not 403");
  });
});

describe("approving an application", () => {
  it("is refused to a manager who does not own the property", async () => {
    const application = await makeApplication(propertyId, tenant);

    const result = await callRoute(updateApplicationStatus, {
      params: { id: String(application.id) },
      body: { status: "Approved" },
      user: asManager(rival),
    });

    assert.equal(result.status, 404, "must be 404, not 403");
    const after = await prisma.application.findUnique({
      where: { id: application.id },
    });
    assert.equal(after?.status, "Pending", "the row must be untouched");
  });

  it("works for the owning manager", async () => {
    const application = await makeApplication(propertyId, tenant);

    const result = await callRoute(updateApplicationStatus, {
      params: { id: String(application.id) },
      body: { status: "Approved" },
      user: asManager(owner),
    });

    assert.equal(result.status, 200);
    const after = await prisma.application.findUnique({
      where: { id: application.id },
    });
    assert.equal(after?.status, "Approved");
  });

  it("refuses a second approval with 409 rather than creating another lease", async () => {
    const application = await makeApplication(propertyId, tenant);
    const request = {
      params: { id: String(application.id) },
      body: { status: "Approved" },
      user: asManager(owner),
    };

    await callRoute(updateApplicationStatus, request);
    const leasesAfterFirst = await prisma.lease.count();

    const second = await callRoute(updateApplicationStatus, request);

    assert.equal(second.status, 409);
    assert.equal(
      await prisma.lease.count(),
      leasesAfterFirst,
      "a duplicate approval must not mint a second lease",
    );
  });
});

describe("starting a conversation", () => {
  it("is open to any tenant", async () => {
    const result = await callRoute(createConversation, {
      body: { propertyId: String(propertyId) },
      user: asTenant(stranger),
    });
    assert.ok(result.status === 200 || result.status === 201);
  });

  it("is refused to a manager on someone else's listing", async () => {
    const result = await callRoute(createConversation, {
      body: { propertyId: String(propertyId), tenantCognitoId: tenant },
      user: asManager(rival),
    });
    assert.equal(result.status, 404, "must be 404, not 403");
  });
});

describe("editing a message", () => {
  it("is refused to a participant who did not send it", async () => {
    const conversation = await makeConversation(propertyId, tenant, owner);
    const message = await makeMessage(conversation.id, tenant);
    const result = await callRoute(editMessage, {
      params: { id: String(conversation.id), messageId: String(message.id) },
      body: { body: "Edited by the wrong person" },
      user: asManager(owner),
    });

    assert.equal(result.status, 404);
    const after = await prisma.message.findUnique({ where: { id: message.id } });
    assert.equal(after?.body, "Original text");
    assert.equal(after?.editedAt, null);
  });

  it("is allowed for the sender", async () => {
    const conversation = await makeConversation(propertyId, tenant, owner);
    const message = await makeMessage(conversation.id, tenant);

    const result = await callRoute(editMessage, {
      params: { id: String(conversation.id), messageId: String(message.id) },
      body: { body: "Edited by the sender" },
      user: asTenant(tenant),
    });

    assert.equal(result.status, 200);
    const after = await prisma.message.findUnique({ where: { id: message.id } });
    assert.equal(after?.body, "Edited by the sender");
    assert.notEqual(after?.editedAt, null);
  });
});

describe("updating a property", () => {
  it("is refused to a manager who does not own it", async () => {
    const result = await callRoute(updateProperty, {
      params: { id: String(propertyId) },
      body: {
        name: "Hijacked",
        description: "d",
        propertyType: "Villa",
        rentalPeriod: "Monthly",
        address: "Jalan Baru",
        city: "Bandung",
        state: "Jawa Barat",
        country: "Indonesia",
        postalCode: "40135",
        amenities: "WiFi",
        highlights: "GreatView",
        price: "1000000",
        securityDeposit: "1000000",
        applicationFee: "100000",
        beds: "1",
        baths: "1",
        areaSqm: "20",
        isPetsAllowed: "false",
        isParkingIncluded: "false",
        latitude: "-6.2",
        longitude: "106.8",
        keptPhotoUrls: JSON.stringify(["https://example.com/photo.jpg"]),
      },
      files: [],
      user: asManager(rival),
    });

    assert.equal(result.status, 404, "must be 404, not 403");
    const after = await prisma.property.findUnique({ where: { id: propertyId } });
    assert.notEqual(after?.name, "Hijacked");
  });
});

describe("requireSelf", () => {
  const run = (user: ReturnType<typeof asTenant> | undefined, requested: string) => {
    let nextCalled = false;
    const res = {
      statusCode: 200,
      body: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.body = payload;
        return this;
      },
    };
    requireSelf()({ params: { cognitoId: requested }, user } as any, res as any, () => {
      nextCalled = true;
    });
    return { status: res.statusCode, nextCalled };
  };

  it("lets a user through to their own resource", () => {
    const result = run(asTenant("ten-1"), "ten-1");
    assert.equal(result.nextCalled, true);
  });

  it("blocks a user reaching for someone else's", () => {
    const result = run(asTenant("ten-1"), "ten-2");
    assert.equal(result.nextCalled, false);
    assert.equal(result.status, 403);
  });

  it("rejects an unauthenticated caller with 401", () => {
    const result = run(undefined, "ten-1");
    assert.equal(result.nextCalled, false);
    assert.equal(result.status, 401);
  });
});