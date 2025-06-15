import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);
  console.log("Subscription payload:", JSON.stringify(payload, null, 2));

  try {
    // 从webhook payload中获取订阅信息
    const appSubscription = payload.app_subscription;

    if (!appSubscription) {
      console.error("No app_subscription found in webhook payload");
      return new Response("No subscription data", { status: 400 });
    }

    console.log("Processing subscription update:", {
      subscriptionId: appSubscription.id,
      status: appSubscription.status,
      shop: shop,
    });

    // 更新数据库中的订阅状态
    const updatedSubscription = await prisma.subscription.updateMany({
      where: {
        shop: shop,
        subscriptionId: appSubscription.id,
      },
      data: {
        status: appSubscription.status,
        // 如果订阅变为活跃状态，设置当前周期时间
        currentPeriodStart:
          appSubscription.status === "ACTIVE" ? new Date() : undefined,
        // 如果订阅被取消，记录取消时间
        cancelledAt:
          appSubscription.status === "CANCELLED" ? new Date() : undefined,
        updatedAt: new Date(),
      },
    });

    console.log(`Updated ${updatedSubscription.count} subscription records`);

    // 如果没有找到对应的订阅记录，可能需要创建一个
    if (updatedSubscription.count === 0) {
      console.warn(
        `No subscription found for shop ${shop} with ID ${appSubscription.id}`,
      );

      // 尝试创建一个新的订阅记录（这种情况下我们可能缺少一些信息）
      const existingSubscription = await prisma.subscription.findUnique({
        where: { shop: shop },
      });

      if (existingSubscription) {
        // 如果存在订阅记录但ID不匹配，更新ID
        await prisma.subscription.update({
          where: { shop: shop },
          data: {
            subscriptionId: appSubscription.id,
            status: appSubscription.status,
            currentPeriodStart:
              appSubscription.status === "ACTIVE" ? new Date() : undefined,
            cancelledAt:
              appSubscription.status === "CANCELLED" ? new Date() : undefined,
            updatedAt: new Date(),
          },
        });
        console.log("Updated existing subscription with new ID");
      } else {
        console.log(
          "No subscription record found to update - this subscription may have been created outside of our app",
        );
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Error processing subscription webhook:", error);
    return new Response("Internal server error", { status: 500 });
  }
};
