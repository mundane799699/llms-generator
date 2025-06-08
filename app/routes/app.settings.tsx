import {
  Box,
  Card,
  Layout,
  Link,
  List,
  Page,
  Text,
  BlockStack,
  Checkbox,
  Toast,
  Frame,
  Button,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState, useEffect } from "react";
import {
  json,
  type ActionFunction,
  type LoaderFunction,
} from "@remix-run/node";
import { useLoaderData, useActionData, useSubmit } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Loader function to fetch settings
export const loader: LoaderFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    // 尝试获取现有设置
    let settings = await prisma.settings.findUnique({
      where: { shop },
    });

    // 如果没有设置记录，创建一个默认的
    if (!settings) {
      settings = await prisma.settings.create({
        data: { shop },
      });
    }

    return json({ settings });
  } catch (error) {
    console.error("Error loading settings:", error);
    return json({ error: "Failed to load settings" }, { status: 500 });
  }
};

// Action function to save settings
export const action: ActionFunction = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const settingsData = JSON.parse(formData.get("settings") as string);

    const {
      gptBot,
      anthropicAI,
      googleExtended,
      perplexityBot,
      deepSeekBot,
      includeProducts,
      includeCollections,
      includePages,
      includeArticles,
      autoSyncEnabled,
    } = settingsData;

    // 使用upsert来更新或创建设置
    const settings = await prisma.settings.upsert({
      where: { shop },
      update: {
        gptBot,
        anthropicAI,
        googleExtended,
        perplexityBot,
        deepSeekBot,
        includeProducts,
        includeCollections,
        includePages,
        includeArticles,
        autoSyncEnabled,
      },
      create: {
        shop,
        gptBot,
        anthropicAI,
        googleExtended,
        perplexityBot,
        deepSeekBot,
        includeProducts,
        includeCollections,
        includePages,
        includeArticles,
        autoSyncEnabled,
      },
    });

    return json({ settings, success: true });
  } catch (error) {
    console.error("Error saving settings:", error);
    return json({ error: "Failed to save settings" }, { status: 500 });
  }
};

export default function SettingsPage() {
  const { settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const [llmsSettings, setLlmsSettings] = useState({
    gptBot: settings?.gptBot ?? true,
    anthropicAI: settings?.anthropicAI ?? true,
    googleExtended: settings?.googleExtended ?? true,
    perplexityBot: settings?.perplexityBot ?? true,
    deepSeekBot: settings?.deepSeekBot ?? true,
    includeProducts: settings?.includeProducts ?? true,
    includeCollections: settings?.includeCollections ?? true,
    includePages: settings?.includePages ?? true,
    includeArticles: settings?.includeArticles ?? true,
    autoSyncEnabled: settings?.autoSyncEnabled ?? true,
  });

  const [toastActive, setToastActive] = useState(false);

  // Update local state when settings are loaded
  useEffect(() => {
    if (settings) {
      setLlmsSettings(settings);
    }
  }, [settings]);

  // Show toast when settings are saved
  useEffect(() => {
    if (actionData?.success) {
      setToastActive(true);
    }
  }, [actionData]);

  const saveSettings = () => {
    const formData = new FormData();
    formData.append("settings", JSON.stringify(llmsSettings));
    submit(formData, { method: "post" });
  };

  const toastMarkup = toastActive ? (
    <Toast
      content="Settings saved successfully!"
      onDismiss={() => setToastActive(false)}
    />
  ) : null;

  return (
    <Frame>
      <Page>
        <TitleBar title="Crawlers settings" />
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    1. Select AI Models to Index Your Store:
                  </Text>
                </BlockStack>

                <BlockStack gap="300">
                  <Checkbox
                    label="GPTBot"
                    checked={llmsSettings.gptBot}
                    onChange={() => {
                      setLlmsSettings({
                        ...llmsSettings,
                        gptBot: !llmsSettings.gptBot,
                      });
                    }}
                  />
                  <Checkbox
                    label="Anthropic-AI"
                    checked={llmsSettings.anthropicAI}
                    onChange={() => {
                      setLlmsSettings({
                        ...llmsSettings,
                        anthropicAI: !llmsSettings.anthropicAI,
                      });
                    }}
                  />
                  <Checkbox
                    label="Google-Extended"
                    checked={llmsSettings.googleExtended}
                    onChange={() => {
                      setLlmsSettings({
                        ...llmsSettings,
                        googleExtended: !llmsSettings.googleExtended,
                      });
                    }}
                  />
                  <Checkbox
                    label="PerplexityBot"
                    checked={llmsSettings.perplexityBot}
                    onChange={() => {
                      setLlmsSettings({
                        ...llmsSettings,
                        perplexityBot: !llmsSettings.perplexityBot,
                      });
                    }}
                  />
                  <Checkbox
                    label="DeepSeekBot"
                    checked={llmsSettings.deepSeekBot}
                    onChange={() => {
                      setLlmsSettings({
                        ...llmsSettings,
                        deepSeekBot: !llmsSettings.deepSeekBot,
                      });
                    }}
                  />
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    2. Select what content from your store to index:
                  </Text>
                </BlockStack>

                <BlockStack gap="300">
                  <Checkbox
                    label="Products"
                    checked={llmsSettings.includeProducts}
                    onChange={() => {
                      setLlmsSettings({
                        ...llmsSettings,
                        includeProducts: !llmsSettings.includeProducts,
                      });
                    }}
                  />
                  <Checkbox
                    label="Collections"
                    checked={llmsSettings.includeCollections}
                    onChange={() => {
                      setLlmsSettings({
                        ...llmsSettings,
                        includeCollections: !llmsSettings.includeCollections,
                      });
                    }}
                  />
                  <Checkbox
                    label="Pages"
                    checked={llmsSettings.includePages}
                    onChange={() => {
                      setLlmsSettings({
                        ...llmsSettings,
                        includePages: !llmsSettings.includePages,
                      });
                    }}
                  />
                  <Checkbox
                    label="Articles"
                    checked={llmsSettings.includeArticles}
                    onChange={() => {
                      setLlmsSettings({
                        ...llmsSettings,
                        includeArticles: !llmsSettings.includeArticles,
                      });
                    }}
                  />
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Fixed save button in bottom right corner */}
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 1000,
          }}
        >
          <Button variant="primary" size="large" onClick={saveSettings}>
            Save Settings
          </Button>
        </div>

        {toastMarkup}
      </Page>
    </Frame>
  );
}
