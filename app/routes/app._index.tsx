import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  InlineStack,
  Spinner,
  Banner,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";

// Define the expected return type for the cache update action
interface UpdateCacheSuccess {
  success: true;
  message: string;
  charCount: number;
}
interface UpdateCacheError {
  success: false;
  error: string;
}
type UpdateCacheResponse = UpdateCacheSuccess | UpdateCacheError;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;
  const shopDataResponse = await admin.graphql(
    `query GetShopData { shop { name description } }`, // Added description to the query
  );
  const shopDataJson = await shopDataResponse.json();
  const shopName = shopDataJson.data?.shop?.name;
  return json({ shopName, shop });
};

export default function Index() {
  const { shopName, shop } = useLoaderData<typeof loader>();
  const updateCacheFetcher = useFetcher<UpdateCacheResponse>();

  const shopify = useAppBridge();
  const llmsTxtUrl = `https://${shop}/apps/llmstxt/llms.txt`;

  const handleGenerate = () => {
    updateCacheFetcher.submit(
      {},
      {
        method: "post",
        action: "/action/update-llms-cache",
      },
    );
  };

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <BlockStack gap="800">
            {/* 欢迎标题 */}
            <BlockStack gap="200">
              <Text variant="headingXl" as="h1">
                {shopName}, welcome onboard.
              </Text>
              <Text variant="bodyLg" as="p" tone="subdued">
                One Step to Unlock AI-Driven Growth for Your Store.
              </Text>
            </BlockStack>

            {/* 第一步：生成 LLMS.txt */}
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Step 1: Generate your shop's LLMS.txt
                </Text>

                <InlineStack align="center">
                  <Button
                    variant="primary"
                    onClick={handleGenerate}
                    loading={updateCacheFetcher.state === "submitting"}
                    disabled={updateCacheFetcher.state === "submitting"}
                  >
                    Generate
                  </Button>
                </InlineStack>

                {updateCacheFetcher.state === "loading" && (
                  <Box paddingBlockStart="300">
                    <InlineStack gap="200" align="center">
                      <Spinner size="small" />
                      <Text as="span" tone="subdued">
                        Generating llms.txt...
                      </Text>
                    </InlineStack>
                  </Box>
                )}

                {updateCacheFetcher.data && (
                  <Box paddingBlockStart="300">
                    {updateCacheFetcher.data.success === true && (
                      <BlockStack gap="300">
                        <InlineStack gap="200" align="start">
                          <Text as="span" tone="success">
                            ✓
                          </Text>
                          <Text as="p" variant="bodySm" tone="success">
                            {
                              (updateCacheFetcher.data as UpdateCacheSuccess)
                                .message
                            }
                            (Characters:{" "}
                            {
                              (updateCacheFetcher.data as UpdateCacheSuccess)
                                .charCount
                            }
                            )
                          </Text>
                        </InlineStack>
                        <InlineStack align="center">
                          <Button
                            variant="primary"
                            url={llmsTxtUrl}
                            target="_blank"
                          >
                            View
                          </Button>
                        </InlineStack>
                      </BlockStack>
                    )}
                    {updateCacheFetcher.data.success === false && (
                      <Banner
                        title="Generation Failed"
                        tone="critical"
                        onDismiss={() => {
                          updateCacheFetcher.data = undefined;
                        }}
                      >
                        <p>
                          {(updateCacheFetcher.data as UpdateCacheError).error}
                        </p>
                      </Banner>
                    )}
                  </Box>
                )}
              </BlockStack>
            </Card>

            {/* 底部按钮 */}
            <InlineStack gap="300" align="center">
              <Link to="/app/settings">
                <Button variant="primary" size="large">
                  Advanced settings
                </Button>
              </Link>
              <Link to="/app/plans">
                <Button variant="primary" size="large">
                  Plans
                </Button>
              </Link>
            </InlineStack>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
