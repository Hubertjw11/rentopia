import "./support/database";
import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import { resetDatabase } from "./support/database";
import {
  makeManager,
  makeProperty,
  makeTenant,
  makeViewingSlot,
  prisma,
} from "./support/factories";
import { asManager, asTenant, callRoute } from "./support/http";

import {
  bookViewingSlot,
  cancelViewingBooking,
  createViewingSlot,
  listViewingSlots,
} from "../src/controllers/viewingControllers";

let owner: string;
let tenantA: string;
let tenantB: string;
let propertyId: number;

beforeEach(async () => {
  await resetDatabase();
  owner = (await makeManager()).cognitoId;
  tenantA = (await makeTenant()).cognitoId;
  tenantB = (await makeTenant()).cognitoId;
  propertyId = (await makeProperty(owner)).id;
});

describe("publishing a slot", () => {
  const base = {
    startsAt: new Date(Date.now() + 24 * 3_600_000).toISOString(),
    durationMinutes: 30,
    mode: "InPerson",
  };

  it("is refused on another manager's property", async () => {
    const other = (await makeManager()).cognitoId;
    const result = await callRoute(createViewingSlot, {
      params: { id: String(propertyId) },
      body: base,
      user: asManager(other),
    });
    assert.equal(result.status, 404, "must be 404, not 403");
  });

  it("rejects a time in the past", async () => {
    const result = await callRoute(createViewingSlot, {
      params: { id: String(propertyId) },
      body: { ...base, startsAt: new Date(Date.now() - 3_600_000).toISOString() },
      user: asManager(owner),
    });
    assert.equal(result.status, 400);
  });

  it("requires an https link for a virtual viewing", async () => {
    const result = await callRoute(createViewingSlot, {
      params: { id: String(propertyId) },
      body: { ...base, mode: "Virtual", meetingUrl: "not a url" },
      user: asManager(owner),
    });
    assert.equal(result.status, 400);
  });

  it("refuses a slot that overlaps an existing one", async () => {
    await callRoute(createViewingSlot, {
      params: { id: String(propertyId) },
      body: base,
      user: asManager(owner),
    });

    const overlapping = await callRoute(createViewingSlot, {
      params: { id: String(propertyId) },
      body: {
        ...base,
        startsAt: new Date(Date.parse(base.startsAt) + 10 * 60_000).toISOString(),
        durationMinutes: 45,
      },
      user: asManager(owner),
    });

    assert.equal(overlapping.status, 409);
  });
});

describe("booking a slot", () => {
  it("gives the slot to exactly one of two simultaneous claims", async () => {
    const slot = await makeViewingSlot(propertyId);

    const [first, second] = await Promise.all([
      callRoute(bookViewingSlot, {
        params: { slotId: String(slot.id) },
        user: asTenant(tenantA),
      }),
      callRoute(bookViewingSlot, {
        params: { slotId: String(slot.id) },
        user: asTenant(tenantB),
      }),
    ]);

    const statuses = [first.status, second.status].sort();
    assert.deepEqual(
      statuses,
      [200, 409],
      "one claim must win and the other must be told the slot is taken",
    );

    const after = await prisma.viewingSlot.findUnique({ where: { id: slot.id } });
    assert.ok(after?.bookedByCognitoId, "the slot must end up held by someone");
  });

  it("allows only one live booking per tenant per property", async () => {
    const first = await makeViewingSlot(propertyId, { hoursFromNow: 24 });
    const second = await makeViewingSlot(propertyId, { hoursFromNow: 48 });

    const one = await callRoute(bookViewingSlot, {
      params: { slotId: String(first.id) },
      user: asTenant(tenantA),
    });
    const two = await callRoute(bookViewingSlot, {
      params: { slotId: String(second.id) },
      user: asTenant(tenantA),
    });

    assert.equal(one.status, 200);
    assert.equal(two.status, 409);
  });

  it("does not stop that tenant booking a different property", async () => {
    const otherProperty = await makeProperty(owner);
    await callRoute(bookViewingSlot, {
      params: { slotId: String((await makeViewingSlot(propertyId)).id) },
      user: asTenant(tenantA),
    });

    const elsewhere = await callRoute(bookViewingSlot, {
      params: { slotId: String((await makeViewingSlot(otherProperty.id)).id) },
      user: asTenant(tenantA),
    });

    assert.equal(elsewhere.status, 200);
  });

  it("frees the slot again when the booker cancels", async () => {
    const slot = await makeViewingSlot(propertyId);
    await callRoute(bookViewingSlot, {
      params: { slotId: String(slot.id) },
      user: asTenant(tenantA),
    });

    const wrongTenant = await callRoute(cancelViewingBooking, {
      params: { slotId: String(slot.id) },
      user: asTenant(tenantB),
    });
    assert.equal(wrongTenant.status, 404, "only the booker may cancel");

    const cancelled = await callRoute(cancelViewingBooking, {
      params: { slotId: String(slot.id) },
      user: asTenant(tenantA),
    });
    assert.equal(cancelled.status, 200);

    const rebooked = await callRoute(bookViewingSlot, {
      params: { slotId: String(slot.id) },
      user: asTenant(tenantB),
    });
    assert.equal(rebooked.status, 200);
  });
});

describe("the meeting link", () => {
  it("is shown to the manager and the booker, and to nobody else", async () => {
    const slot = await makeViewingSlot(propertyId, {
      mode: "Virtual",
      meetingUrl: "https://meet.example.com/abc-defg-hij",
    });
    await callRoute(bookViewingSlot, {
      params: { slotId: String(slot.id) },
      user: asTenant(tenantA),
    });

    const pick = (body: unknown) =>
      (body as { id: number; meetingUrl: string | null }[]).find(
        (row) => row.id === slot.id,
      );

    const anonymous = await callRoute(listViewingSlots, {
      params: { id: String(propertyId) },
    });
    const booker = await callRoute(listViewingSlots, {
      params: { id: String(propertyId) },
      user: asTenant(tenantA),
    });
    const other = await callRoute(listViewingSlots, {
      params: { id: String(propertyId) },
      user: asTenant(tenantB),
    });
    const manager = await callRoute(listViewingSlots, {
      params: { id: String(propertyId) },
      user: asManager(owner),
    });

    assert.equal(pick(anonymous.body)?.meetingUrl, null);
    assert.equal(pick(other.body)?.meetingUrl, null);
    assert.ok(pick(booker.body)?.meetingUrl?.startsWith("https://"));
    assert.ok(pick(manager.body)?.meetingUrl?.startsWith("https://"));
  });

  it("still lists a taken slot, just without the link", async () => {
    const slot = await makeViewingSlot(propertyId);
    await callRoute(bookViewingSlot, {
      params: { slotId: String(slot.id) },
      user: asTenant(tenantA),
    });

    const anonymous = await callRoute(listViewingSlots, {
      params: { id: String(propertyId) },
    });
    const listed = (anonymous.body as { isBooked: boolean }[])[0];
    assert.equal(listed.isBooked, true);
  });
});