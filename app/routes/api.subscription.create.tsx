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
    const { admin, session } = await authenticate.admin(request);

    // 获取店铺域名
    const shop = session.shop;
    console.log("当前店铺:", shop);
    let myShop = shop.replace(".myshopify.com", "");

    // 解析请求体，获取订阅计划信息
    const formData = await request.formData();
    const planName = formData.get("planName") as string;
    const price = formData.get("price") as string;

    console.log("开始创建订阅:", { shop, planName, price });

    // 根据计划名称设置订阅参数
    let subscriptionParams;

    if (planName === "Basic") {
      subscriptionParams = {
        name: "Basic",
        price: 10.0,
        interval: "EVERY_30_DAYS", // 每30天收费一次
        trialDays: 0, // 无试用期
      };
    } else if (planName === "Pro") {
      subscriptionParams = {
        name: "Pro",
        price: 30.0,
        interval: "EVERY_30_DAYS",
        trialDays: 0,
      };
    } else {
      throw new Error("无效的订阅计划");
    }

    // Now construct the return URL
    const returnUrl = `https://admin.shopify.com/store/${myShop}/apps/${process.env.APP_NAME}/app/plans`;

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
          returnUrl: returnUrl,
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

    // 获取确认URL和订阅信息
    const confirmationUrl =
      responseJson.data?.appSubscriptionCreate?.confirmationUrl;
    const shopifySubscription =
      responseJson.data?.appSubscriptionCreate?.appSubscription;

    if (!confirmationUrl || !shopifySubscription) {
      console.error("未获得确认URL或订阅信息");
      return json(
        {
          success: false,
          error: "无法创建订阅确认URL",
        },
        { status: 500 },
      );
    }

    console.log("Shopify订阅创建成功:", {
      id: shopifySubscription.id,
      status: shopifySubscription.status,
      confirmationUrl,
    });

    // 返回成功响应，包含确认URL
    return json({
      success: true,
      confirmationUrl: confirmationUrl,
      subscription: shopifySubscription,
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
