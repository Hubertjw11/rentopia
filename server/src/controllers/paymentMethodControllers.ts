import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/** Every tenant needs exactly one Stripe Customer; create it on first use. */
const getOrCreateStripeCustomer = async (
  cognitoId: string,
): Promise<string> => {
  const tenant = await prisma.tenant.findUnique({ where: { cognitoId } });
  if (!tenant) throw new Error("Tenant not found");
  if (tenant.stripeCustomerId) return tenant.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: tenant.email,
    name: tenant.name,
    metadata: { cognitoId },
  });
  await prisma.tenant.update({
    where: { cognitoId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
};

export const listPaymentMethods = async (
  req: Request<{ cognitoId: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    const methods = await prisma.paymentMethod.findMany({
      where: { tenantCognitoId: cognitoId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    res.json(methods);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving payment methods: ${error.message}` });
  }
};

/** Step 1 of adding a card: hand the browser a SetupIntent client secret. */
export const createSetupIntent = async (
  req: Request<{ cognitoId: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    const customerId = await getOrCreateStripeCustomer(cognitoId);

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
    });
    res.json({ clientSecret: setupIntent.client_secret });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error creating setup intent: ${error.message}` });
  }
};

/** Step 2: after the browser confirms, store only the safe display metadata. */
export const savePaymentMethod = async (
  req: Request<{ cognitoId: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    const { stripePaymentMethodId } = req.body;

    const tenant = await prisma.tenant.findUnique({ where: { cognitoId } });
    if (!tenant?.stripeCustomerId) {
      res.status(400).json({ message: "No Stripe customer for this tenant" });
      return;
    }

    const pm = await stripe.paymentMethods.retrieve(stripePaymentMethodId);

    // Security: the card must belong to THIS tenant's Stripe customer.
    if (pm.customer !== tenant.stripeCustomerId) {
      res
        .status(403)
        .json({ message: "Payment method does not belong to this tenant" });
      return;
    }
    if (!pm.card) {
      res
        .status(400)
        .json({ message: "Only card payment methods are supported" });
      return;
    }

    const existingCount = await prisma.paymentMethod.count({
      where: { tenantCognitoId: cognitoId },
    });

    const saved = await prisma.paymentMethod.create({
      data: {
        tenantCognitoId: cognitoId,
        stripePaymentMethodId: pm.id,
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
        isDefault: existingCount === 0, // first card added becomes the default
      },
    });

    res.status(201).json(saved);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error saving payment method: ${error.message}` });
  }
};

export const setDefaultPaymentMethod = async (
  req: Request<{ cognitoId: string; id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { cognitoId, id } = req.params;

    const method = await prisma.paymentMethod.findUnique({
      where: { id: Number(id) },
    });
    if (!method || method.tenantCognitoId !== cognitoId) {
      res.status(404).json({ message: "Payment method not found" });
      return;
    }

    await prisma.$transaction([
      prisma.paymentMethod.updateMany({
        where: { tenantCognitoId: cognitoId },
        data: { isDefault: false },
      }),
      prisma.paymentMethod.update({
        where: { id: Number(id) },
        data: { isDefault: true },
      }),
    ]);

    const methods = await prisma.paymentMethod.findMany({
      where: { tenantCognitoId: cognitoId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    res.json(methods);
  } catch (error: any) {
    res.status(500).json({
      message: `Error setting default payment method: ${error.message}`,
    });
  }
};

export const deletePaymentMethod = async (
  req: Request<{ cognitoId: string; id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const { cognitoId, id } = req.params;

    const method = await prisma.paymentMethod.findUnique({
      where: { id: Number(id) },
    });
    if (!method || method.tenantCognitoId !== cognitoId) {
      res.status(404).json({ message: "Payment method not found" });
      return;
    }

    // Remove our record first so the tenant's list is immediately correct.
    await prisma.paymentMethod.delete({ where: { id: Number(id) } });

    try {
      await stripe.paymentMethods.detach(method.stripePaymentMethodId);
    } catch (stripeError: any) {
      // Already removed from the tenant's view; log for cleanup, don't fail.
      console.error(
        `Stripe detach failed for ${method.stripePaymentMethodId}: ${stripeError.message}`,
      );
    }

    // If we removed the default, promote the newest remaining card.
    if (method.isDefault) {
      const next = await prisma.paymentMethod.findFirst({
        where: { tenantCognitoId: cognitoId },
        orderBy: { createdAt: "desc" },
      });
      if (next) {
        await prisma.paymentMethod.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }

    res.json({ message: "Payment method removed" });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error deleting payment method: ${error.message}` });
  }
};
