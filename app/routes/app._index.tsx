import { useEffect } from "react";
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
  List,
  Divider,
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
  const { session } = await authenticate.admin(request); // Get session
  const { shop } = session; // Get shop domain from session
  // 在这里可以加载需要的数据
  return json({ apiKey: process.env.SHOPIFY_API_KEY, shop }); // Return shop domain
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ];
  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        product: {
          title: `${color} Snowboard`,
        },
      },
    },
  );
  const responseJson = await response.json();

  const product = responseJson.data!.productCreate!.product!;
  const variantId = product.variants.edges[0]!.node!.id!;

  const variantResponse = await admin.graphql(
    `#graphql
    mutation shopifyRemixTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          barcode
          createdAt
        }
      }
    }`,
    {
      variables: {
        productId: product.id,
        variants: [{ id: variantId, price: "100.00" }],
      },
    },
  );

  const variantResponseJson = await variantResponse.json();

  return {
    product: responseJson!.data!.productCreate!.product,
    variant:
      variantResponseJson!.data!.productVariantsBulkUpdate!.productVariants,
  };
};

export default function Index() {
  const { apiKey, shop } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const updateCacheFetcher = useFetcher<UpdateCacheResponse>();

  const shopify = useAppBridge();
  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";
  const productId = fetcher.data?.product?.id.replace(
    "gid://shopify/Product/",
    "",
  );

  useEffect(() => {
    if (productId) {
      shopify.toast.show("Product created");
    }
  }, [productId, shopify]);

  const llmsTxtUrl = `https://${shop}/apps/llmstxt/llms.txt`;

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <InlineStack align="space-between" blockAlign="center">
              <Text variant="headingXl" as="h1">
                LLMs.txt Generator
              </Text>
              <Button variant="primary" url={llmsTxtUrl} target="_blank">
                View llms.txt
              </Button>
            </InlineStack>

            <Text as="p" variant="bodyMd">
              Easily control how AI models like ChatGPT, Claude, and Perplexity
              interact with your store. Use LLMs.txt to manage access to your
              content—whether you want to block AI crawlers or guide them to
              what matters.
            </Text>

            <Card>
              <BlockStack gap="500">
                <Text variant="headingMd" as="h2">
                  Configuration Options
                </Text>
                <BlockStack gap="300">
                  <div>
                    <Text variant="headingSm" as="h3">
                      LLMs.txt Generator Settings
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Set rules for which pages you want AI bots to know about.
                    </Text>
                  </div>
                  <Divider />
                  <div>
                    <Text variant="headingSm" as="h3">
                      Crawler Settings
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Allow or block specific LLM crawlers like GPTBot,
                      Anthropic, or Google-Extended.
                    </Text>
                  </div>
                  <Divider />
                  <div>
                    <Text variant="headingSm" as="h3">
                      Content Filtering Settings
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Fine-tune which pages or website resources are exposed to
                      AI tools.
                    </Text>
                  </div>
                </BlockStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">
                  Cache Management
                </Text>
                <updateCacheFetcher.Form
                  method="post"
                  action="/action/update-llms-cache"
                >
                  <Button
                    submit
                    loading={updateCacheFetcher.state === "submitting"}
                    variant="primary"
                  >
                    Update LLMs.txt Cache Now
                  </Button>
                </updateCacheFetcher.Form>
                {updateCacheFetcher.state === "loading" && (
                  <InlineStack gap="200" align="center">
                    <Spinner size="small" />
                    <Text as="span" tone="subdued">
                      Updating cache...
                    </Text>
                  </InlineStack>
                )}
                {updateCacheFetcher.data && (
                  <Box paddingBlockStart="300">
                    {updateCacheFetcher.data.success === true && (
                      <Banner
                        title="Cache Update Status"
                        tone="success"
                        onDismiss={() => {
                          updateCacheFetcher.data = undefined;
                        }}
                      >
                        <p>
                          {
                            (updateCacheFetcher.data as UpdateCacheSuccess)
                              .message
                          }{" "}
                          (Characters:{" "}
                          {
                            (updateCacheFetcher.data as UpdateCacheSuccess)
                              .charCount
                          }
                          )
                        </p>
                      </Banner>
                    )}
                    {updateCacheFetcher.data.success === false && (
                      <Banner
                        title="Cache Update Failed"
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

            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">
                  Frequently Asked Questions
                </Text>
                <List type="bullet">
                  <List.Item>What is llms.txt?</List.Item>
                  <List.Item>
                    Why is llms.txt important for my Shopify store?
                  </List.Item>
                  <List.Item>What is answer engine optimization?</List.Item>
                  <List.Item>
                    Can I block ChatGPT, Claude, or Perplexity from using my
                    store content?
                  </List.Item>
                  <List.Item>
                    Do I need technical knowledge to use this app?
                    <Text as="p" variant="bodySm" tone="subdued">
                      No technical skills are required. LLMs.txt Generator
                      handles everything for you. Just install the app, choose
                      which bots you want to allow or block, and your llms.txt
                      file will be created and kept up-to-date. It's
                      plug-and-play — built for busy merchants who want to stay
                      ahead without touching code.
                    </Text>
                  </List.Item>
                </List>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
