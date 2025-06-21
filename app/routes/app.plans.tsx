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
import { useState } from "react";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate, BASIC, PRO } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing } = await authenticate.admin(request);

  // For development stores, use `isTest: true`
  const isDevelopmentStore = process.env.NODE_ENV === "development";

  const billingCheck = await billing.check({
    plans: [BASIC, PRO],
    isTest: isDevelopmentStore,
  });
  console.log("billingCheck", billingCheck);

  const { hasActivePayment, appSubscriptions } = billingCheck;

  const activeSubscription = hasActivePayment ? appSubscriptions[0] : null;

  return json({
    currentPlan: activeSubscription?.name || null,
  });
};

export default function PlansPage() {
  const { currentPlan } = useLoaderData<typeof loader>();
  console.log("currentPlan", currentPlan);
  // 使用useState管理加载状态和错误信息
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null); // 追踪哪个计划正在加载
  const [error, setError] = useState<string | null>(null); // 存储错误信息

  // 使用Remix的useFetcher来处理API调用
  // fetcher允许我们在不离开当前页面的情况下调用API
  const fetcher = useFetcher();

  // 在组件中使用App Bridge
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

  /**
   * 处理"Activate Plan"按钮点击事件
   * @param planName - 选择的计划名称 (Basic 或 Pro)
   * @param price - 计划价格
   */
  const handleActivatePlan = async (planName: string, price: string) => {
    try {
      console.log("current env:", process.env.NODE_ENV);
      // 清除之前的错误信息
      setError(null);

      // 设置当前正在处理的计划，用于显示加载状态
      setLoadingPlan(planName);

      console.log(`用户点击激活计划: ${planName} (${price})`);

      // 创建FormData对象来发送数据到后端API
      const formData = new FormData();
      formData.append("planName", planName);
      formData.append("price", price);

      // 使用fetcher提交数据到我们的API路由
      // 这会调用 /api/subscription/create 路由的action函数
      fetcher.submit(formData, {
        method: "post",
        action: "/api/subscription/create",
      });
    } catch (error) {
      console.error("激活计划时发生错误:", error);
      setError("激活计划时发生错误，请重试");
      setLoadingPlan(null);
    }
  };

  // 监听fetcher的响应
  // 当API调用完成时，这个effect会被触发
  if (fetcher.data && loadingPlan) {
    const response = fetcher.data as any;

    if (response.success) {
      // 订阅创建成功，重定向到Shopify支付页面
      console.log("订阅创建成功，重定向到支付页面:", response.confirmationUrl);

      // 使用App Bridge重定向
      window.open(response.confirmationUrl, "_top");
    } else {
      // 订阅创建失败，显示错误信息
      console.error("订阅创建失败:", response.error);
      setError(response.error || "创建订阅时发生错误");
      setLoadingPlan(null);
    }
  }

  return (
    <Page>
      <TitleBar title="Plans" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="600">
            {/* 显示错误信息的横幅 */}
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

            <InlineStack gap="400">
              {plans.map((plan, index) => {
                const isCurrentPlan = plan.name === currentPlan;
                return (
                  <Box key={index} minWidth="300px">
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
                            {plan.buttonText && (
                              <Button
                                variant={plan.buttonVariant as any}
                                size="large"
                                fullWidth
                                // 显示加载状态：如果当前计划正在处理，显示加载图标
                                loading={loadingPlan === plan.name}
                                // 禁用按钮：如果任何计划正在处理或fetcher正在提交数据
                                disabled={
                                  isCurrentPlan ||
                                  loadingPlan !== null ||
                                  fetcher.state === "submitting"
                                }
                                // 点击事件：调用handleActivatePlan函数
                                onClick={() =>
                                  handleActivatePlan(plan.name, plan.price)
                                }
                              >
                                {/* 根据加载状态显示不同的按钮文本 */}
                                {isCurrentPlan
                                  ? "Current Plan"
                                  : loadingPlan === plan.name
                                    ? "Processing..."
                                    : plan.buttonText}
                              </Button>
                            )}
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
