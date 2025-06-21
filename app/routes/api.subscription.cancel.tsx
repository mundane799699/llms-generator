import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing } = await authenticate.admin(request);

  const formData = await request.formData();
  const subscriptionId = formData.get("subscriptionId") as string;

  if (!subscriptionId) {
    return json(
      { success: false, error: "Subscription ID is required" },
      { status: 400 },
    );
  }

  try {
    // For development stores, use `isTest: true`
    const isDevelopmentStore = process.env.NODE_ENV === "development";

    const cancelledSubscription = await billing.cancel({
      subscriptionId: subscriptionId,
      isTest: isDevelopmentStore,
      prorate: true, // Prorate the subscription cost
    });

    return json({ success: true, cancelledSubscription });
  } catch (error: any) {
    console.error("Failed to cancel subscription:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};
