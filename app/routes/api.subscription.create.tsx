import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * 处理订阅创建的API路由
 * 这个路由接收POST请求，包含订阅计划的信息
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    // 验证请求是否来自已认证的Shopify商家
    const { admin } = await authenticate.admin(request);

    // 解析请求体，获取订阅计划信息
    const formData = await request.formData();
    const planName = formData.get("planName") as string;
    const price = formData.get("price") as string;

    console.log("开始创建订阅:", { planName, price });

    // 根据计划名称设置订阅参数
    let subscriptionParams;

    if (planName === "Basic") {
      subscriptionParams = {
        name: "Basic Plan",
        price: 10.0,
        interval: "EVERY_30_DAYS", // 每30天收费一次
        trialDays: 0, // 无试用期
      };
    } else if (planName === "Pro") {
      subscriptionParams = {
        name: "Pro Plan",
        price: 30.0,
        interval: "EVERY_30_DAYS",
        trialDays: 0,
      };
    } else {
      throw new Error("无效的订阅计划");
    }

    // 使用Shopify GraphQL API创建订阅
    // appSubscriptionCreate mutation会创建一个新的应用订阅
    const response = await admin.graphql(
      `#graphql
        mutation appSubscriptionCreate($lineItems: [AppSubscriptionLineItemInput!]!, $name: String!, $returnUrl: URL!, $test: Boolean) {
          appSubscriptionCreate(lineItems: $lineItems, name: $name, returnUrl: $returnUrl, test: $test) {
            appSubscription {
              id
              status
              createdAt
            }
            confirmationUrl
            userErrors {
              field
              message
            }
          }
        }`,
      {
        variables: {
          name: subscriptionParams.name,
          // 定义订阅的计费项目
          lineItems: [
            {
              plan: {
                appRecurringPricingDetails: {
                  price: {
                    amount: subscriptionParams.price,
                    currencyCode: "USD",
                  },
                  interval: subscriptionParams.interval,
                },
              },
            },
          ],
          // 支付完成后的返回URL
          returnUrl: `${process.env.SHOPIFY_APP_URL}/app/plans?subscription=success`,
          // 在开发环境中使用测试模式
          test: process.env.NODE_ENV !== "production",
        },
      },
    );

    const responseJson = await response.json();
    console.log("Shopify API响应:", responseJson);

    // 检查是否有错误
    if (responseJson.data?.appSubscriptionCreate?.userErrors?.length > 0) {
      const errors = responseJson.data.appSubscriptionCreate.userErrors;
      console.error("订阅创建错误:", errors);
      return json(
        {
          success: false,
          error: errors[0].message,
        },
        { status: 400 },
      );
    }

    // 获取确认URL（用户需要访问这个URL来完成支付）
    const confirmationUrl =
      responseJson.data?.appSubscriptionCreate?.confirmationUrl;

    if (!confirmationUrl) {
      console.error("未获得确认URL");
      return json(
        {
          success: false,
          error: "无法创建订阅确认URL",
        },
        { status: 500 },
      );
    }

    console.log("订阅创建成功，确认URL:", confirmationUrl);

    // 返回成功响应，包含确认URL
    return json({
      success: true,
      confirmationUrl: confirmationUrl,
      subscription: responseJson.data.appSubscriptionCreate.appSubscription,
    });
  } catch (error) {
    console.error("订阅创建过程中发生错误:", error);
    return json(
      {
        success: false,
        error: "服务器内部错误",
      },
      { status: 500 },
    );
  }
}
