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
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { CheckIcon } from "@shopify/polaris-icons";

export default function PlansPage() {
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
      buttonVariant: undefined,
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

  return (
    <Page>
      <TitleBar title="Plans" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="600">
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

            <InlineStack gap="400">
              {plans.map((plan, index) => (
                <Box key={index} minWidth="300px">
                  <Card>
                    <Box minHeight="300px">
                      <BlockStack gap="400" inlineAlign="stretch">
                        <BlockStack gap="200">
                          <Text as="h2" variant="headingMd" tone="subdued">
                            {plan.name}
                          </Text>
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
                                <Text as="span" variant="bodyMd" tone="subdued">
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
                          {plan.buttonText && (
                            <Button
                              variant={plan.buttonVariant as any}
                              size="large"
                              fullWidth
                            >
                              {plan.buttonText}
                            </Button>
                          )}
                        </Box>
                      </BlockStack>
                    </Box>
                  </Card>
                </Box>
              ))}
            </InlineStack>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
