import {
  Box,
  Card,
  Layout,
  Page,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Icon,
  Spinner,
  Banner,
  Badge,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { CheckIcon } from "@shopify/polaris-icons";
import { useState, useEffect } from "react";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate, BASIC_PLAN, PRO_PLAN } from "../shopify.server";

type ActionResponse = {
  success: boolean;
  error?: string;
  confirmationUrl?: string;
};

export const loader = async ({ request }: ActionFunctionArgs) => {
  const { billing } = await authenticate.admin(request);

  // For development stores, use `isTest: true`
  const isDevelopmentStore = process.env.NODE_ENV === "development";

  const { hasActivePayment, appSubscriptions } = await billing.check({
    plans: [BASIC_PLAN, PRO_PLAN],
    isTest: isDevelopmentStore,
  });

  const activeSubscription = hasActivePayment ? appSubscriptions[0] : null;

  return json({
    currentPlan: activeSubscription?.name || null,
    subscriptionId: activeSubscription?.id || null,
  });
};

export default function PlansPage() {
  const { currentPlan, subscriptionId } = useLoaderData<typeof loader>();
  const activateFetcher = useFetcher<ActionResponse>();
  const cancelFetcher = useFetcher<ActionResponse>();

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Handle cancellation success
    if (cancelFetcher.data?.success) {
      window.location.reload(); // Reload to get fresh data from loader
    }
    // Handle cancellation error
    if (cancelFetcher.data?.error) {
      setError(cancelFetcher.data.error);
    }
  }, [cancelFetcher.data]);

  useEffect(() => {
    // Handle activation success
    if (activateFetcher.data?.success && loadingPlan) {
      const { confirmationUrl } = activateFetcher.data as any;
      window.open(confirmationUrl, "_top");
    }
    // Handle activation error
    if (activateFetcher.data?.error && loadingPlan) {
      setError(activateFetcher.data.error || "Failed to create subscription.");
      setLoadingPlan(null);
    }
  }, [activateFetcher.data, loadingPlan]);

  const app = useAppBridge();

  // 定义订阅计划数据
  const plans = [
    {
      name: "Free",
      price: "Free",
      period: "",
      features: [
        "Homepage",
        "100 Products",
        "5 Collections",
        "5 blogs",
        "3 AI Supported",
      ],
      buttonText: "",
    },
    {
      name: "Basic",
      price: "$10",
      period: "per month",
      features: [
        "Homepage",
        "500 Products",
        "50 Collections",
        "100 blogs",
        "All AI Supported",
      ],
      buttonText: "Activate Plan",
      buttonVariant: "primary",
    },
    {
      name: "Pro",
      price: "$30",
      period: "per month",
      features: [
        "Homepage",
        "Unlimited Products",
        "Unlimited Collections",
        "Unlimited blogs",
        "Unlimited Pages",
        "All AI Supported",
      ],
      buttonText: "Activate Plan",
      buttonVariant: "primary",
    },
  ];

  const handleActivatePlan = (planName: string, price: string) => {
    setError(null);
    setLoadingPlan(planName);

    const formData = new FormData();
    formData.append("planName", planName);
    formData.append("price", price);

    activateFetcher.submit(formData, {
      method: "post",
      action: "/api/subscription/create",
    });
  };

  const handleCancelSubscription = () => {
    if (!subscriptionId) {
      setError("Active subscription ID not found.");
      return;
    }
    setError(null);
    const formData = new FormData();
    formData.append("subscriptionId", subscriptionId);

    cancelFetcher.submit(formData, {
      method: "post",
      action: "/api/subscription/cancel",
    });
  };

  return (
    <Page>
      <TitleBar title="Plans" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="600">
            {error && (
              <Banner
                title="Error"
                tone="critical"
                onDismiss={() => setError(null)}
              >
                <Text as="p">{error}</Text>
              </Banner>
            )}

            <Box paddingBlockStart="400">
              <BlockStack gap="200">
                <Text as="h1" variant="headingXl">
                  Subscription Plans
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Choose a plan that works best for your business
                </Text>
              </BlockStack>
            </Box>

            <InlineStack gap="400" align="start">
              {plans.map((plan) => {
                const isCurrentPlan = plan.name === currentPlan;

                return (
                  <Box key={plan.name} minWidth="300px">
                    <Card>
                      <Box minHeight="300px">
                        <BlockStack gap="400" inlineAlign="stretch">
                          <BlockStack gap="200">
                            <InlineStack gap="200" align="start">
                              <Text as="h2" variant="headingMd" tone="subdued">
                                {plan.name}
                              </Text>
                              {isCurrentPlan && (
                                <Badge tone="success">Current Plan</Badge>
                              )}
                            </InlineStack>
                            <BlockStack gap="100">
                              <InlineStack
                                gap="100"
                                align="start"
                                blockAlign="end"
                              >
                                <Text as="span" variant="headingXl">
                                  {plan.price}
                                </Text>
                                {plan.period && (
                                  <Text
                                    as="span"
                                    variant="bodyMd"
                                    tone="subdued"
                                  >
                                    {plan.period}
                                  </Text>
                                )}
                              </InlineStack>
                            </BlockStack>
                          </BlockStack>

                          <BlockStack gap="100">
                            {plan.features.map((feature, featureIndex) => (
                              <InlineStack
                                key={featureIndex}
                                gap="100"
                                align="start"
                                blockAlign="start"
                              >
                                <Box minWidth="20px">
                                  <Icon source={CheckIcon} tone="success" />
                                </Box>
                                <Text as="span" variant="bodyMd">
                                  {feature}
                                </Text>
                              </InlineStack>
                            ))}
                          </BlockStack>

                          <Box paddingBlockStart="400">
                            {isCurrentPlan ? (
                              <Button
                                variant="primary"
                                tone="critical"
                                size="large"
                                fullWidth
                                loading={cancelFetcher.state === "submitting"}
                                onClick={handleCancelSubscription}
                              >
                                Cancel Subscription
                              </Button>
                            ) : plan.buttonText ? (
                              <Button
                                variant={plan.buttonVariant as any}
                                size="large"
                                fullWidth
                                loading={loadingPlan === plan.name}
                                disabled={
                                  !!currentPlan || // Disable if any plan is active
                                  loadingPlan !== null ||
                                  activateFetcher.state === "submitting"
                                }
                                onClick={() =>
                                  handleActivatePlan(plan.name, plan.price)
                                }
                              >
                                {loadingPlan === plan.name
                                  ? "Processing..."
                                  : plan.buttonText}
                              </Button>
                            ) : null}
                          </Box>
                        </BlockStack>
                      </Box>
                    </Card>
                  </Box>
                );
              })}
            </InlineStack>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
