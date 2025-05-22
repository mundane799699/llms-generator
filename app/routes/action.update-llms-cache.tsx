import { ActionFunctionArgs, json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server"; // Prisma client - Changed import

// Define interfaces for the node types we expect from GraphQL
interface ShopifyProductNode {
  id: string;
  title: string;
  handle: string;
  onlineStoreUrl: string | null;
  productType: string;
  priceRangeV2: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  options: Array<{ name: string; values: string[] }> | null;
}

interface ShopifyCollectionNode {
  id: string;
  title: string;
  handle: string;
  // onlineStoreUrl: string | null; // This field doesn't exist on the Collection type directly
}

interface ShopifyPageNode {
  id: string;
  title: string;
  handle: string;
  // onlineStoreUrl: string | null; // This field doesn't exist on the Page type directly
}

// Helper function to fetch all items with pagination
async function fetchAllShopifyResources<T_Node>(
  admin: any, // Shopify Admin API client
  query: string,
  variables: Record<string, any>,
  extractEdges: (data: any) => Array<{ cursor: string; node: T_Node }>,
  resourceName: string,
): Promise<T_Node[]> {
  let allItems: T_Node[] = [];
  let hasNextPage = true;
  let cursor = null;
  const BATCH_SIZE = 50;

  console.log(`Starting to fetch ${resourceName}...`);

  while (hasNextPage) {
    const response = await admin.graphql(query, {
      variables: { ...variables, first: BATCH_SIZE, after: cursor },
    });
    const responseJson = await response.json();

    if (responseJson.errors) {
      console.error(
        `GraphQL errors while fetching ${resourceName}:`,
        JSON.stringify(responseJson.errors, null, 2),
      );
      throw new Error(
        `Failed to fetch ${resourceName}: ${JSON.stringify(responseJson.errors)}`,
      );
    }

    const dataContainer = responseJson.data;
    if (!dataContainer) {
      console.error(
        `No data container in response for ${resourceName}:`,
        JSON.stringify(responseJson, null, 2),
      );
      throw new Error(`No data received for ${resourceName}`);
    }

    const edges = extractEdges(dataContainer);
    if (!edges) {
      console.warn(
        `No edges found for ${resourceName} in current batch. Data:`,
        JSON.stringify(dataContainer, null, 2),
      );
      hasNextPage = false;
      continue;
    }

    allItems = allItems.concat(
      edges.map((edge: { node: T_Node }) => edge.node),
    ); // Added type for edge

    let pageInfoPath = query.match(/(\w+)\s*\(/);
    let pageInfo = null;
    if (pageInfoPath && dataContainer[pageInfoPath[1]]) {
      pageInfo = dataContainer[pageInfoPath[1]].pageInfo;
    } else if (dataContainer.nodes && dataContainer.nodes.pageInfo) {
      pageInfo = dataContainer.nodes.pageInfo;
    } else if (Object.keys(dataContainer).length === 1) {
      pageInfo = dataContainer[Object.keys(dataContainer)[0]].pageInfo;
    }

    if (pageInfo) {
      hasNextPage = pageInfo.hasNextPage;
      if (hasNextPage && edges.length > 0) {
        cursor = edges[edges.length - 1].cursor;
      } else {
        hasNextPage = false;
      }
    } else {
      console.warn(
        `pageInfo not found for ${resourceName}. Assuming no more pages.`,
      );
      hasNextPage = false;
    }
  }
  console.log(`Fetched a total of ${allItems.length} ${resourceName}.`);
  return allItems;
}

const GET_PRODUCTS_QUERY = `#graphql
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after, query: "status:active") {
      edges {
        cursor
        node {
          id
          title
          handle
          onlineStoreUrl
          productType
          priceRangeV2 {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          options(first: 3) { # For things like 'Color'
            name
            values
          }
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

const GET_COLLECTIONS_QUERY = `#graphql
  query GetCollections($first: Int!, $after: String) {
    collections(first: $first, after: $after) { 
      edges {
        cursor
        node {
          id
          title
          handle
          # onlineStoreUrl # Removed from query
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

const GET_PAGES_QUERY = `#graphql
  query GetPages($first: Int!, $after: String) {
    pages(first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          title
          handle
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop; // This is the myshopify.com domain

  if (!admin) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("Starting llms.txt content generation for shop:", shop);
    let llmsTxtContent = "";

    // Use session.shop directly as it's guaranteed to be the myshopify.com domain for Admin API context
    const shopDomain = shop;
    // Fetch shop name for a friendlier display, fallback to part of domain if needed
    const shopDataResponse = await admin.graphql(
      `query GetShopData { shop { name } }`,
    );
    const shopDataJson = await shopDataResponse.json();
    const shopName = shopDataJson.data?.shop?.name || shopDomain.split(".")[0];
    console.log("get shop data success.");

    llmsTxtContent += `# [${shopName}](https://${shopDomain})\n\n`;

    // --- Fetch Products ---
    const products = await fetchAllShopifyResources<ShopifyProductNode>(
      admin,
      GET_PRODUCTS_QUERY,
      {},
      (data) => data.products.edges,
      "products",
    );
    if (products.length > 0) {
      console.log("fetch products success.");
      llmsTxtContent += "## Products\n";
      products.forEach((product) => {
        // product is now ShopifyProductNode
        const productUrl =
          product.onlineStoreUrl ||
          `https://${shopDomain}/products/${product.handle}`;
        llmsTxtContent += `- [${product.title}](${productUrl})  \n`;
        llmsTxtContent += `  Price: ${product.priceRangeV2.minVariantPrice.amount} ${product.priceRangeV2.minVariantPrice.currencyCode}\n`;
        product.options?.forEach((option) => {
          // option is now { name: string; values: string[] }
          if (
            option.name.toLowerCase() === "color" &&
            option.values.length > 0
          ) {
            llmsTxtContent += `  ${option.name}: ${option.values.join(", ")}\n`;
          }
        });
      });
      llmsTxtContent += "\n";
    }

    // --- Fetch Collections ---
    const collections = await fetchAllShopifyResources<ShopifyCollectionNode>(
      admin,
      GET_COLLECTIONS_QUERY,
      {},
      (data) => data.collections.edges,
      "collections",
    );
    if (collections.length > 0) {
      console.log("fetch collections success.");
      llmsTxtContent += "## Product Categories\n";
      collections.forEach((collection) => {
        // Construct the onlineStoreUrl for collections dynamically
        const collectionUrl = `https://${shopDomain}/collections/${collection.handle}`;
        llmsTxtContent += `- [${collection.title}](${collectionUrl})\n`;
      });
      llmsTxtContent += "\n";
    }

    // --- Fetch Pages ---
    const pages = await fetchAllShopifyResources<ShopifyPageNode>(
      admin,
      GET_PAGES_QUERY,
      {},
      (data) => data.pages.edges,
      "pages",
    );
    if (pages.length > 0) {
      console.log("fetch pages success.");
      llmsTxtContent += "## Pages\n";
      pages.forEach((page) => {
        // Construct the onlineStoreUrl for pages dynamically
        const pageUrl = `https://${shopDomain}/pages/${page.handle}`;
        llmsTxtContent += `- [${page.title}](${pageUrl})\n`;
      });
      llmsTxtContent += "\n";
    }

    const trimmedContent = llmsTxtContent.trim();

    await db.llmContentCache.upsert({
      where: { shop: shopDomain }, // Ensure using the consistent shopDomain variable
      update: { content: trimmedContent, updatedAt: new Date() },
      create: { shop: shopDomain, content: trimmedContent },
    });

    console.log("llms.txt content updated successfully for shop:", shopDomain);
    return json({
      success: true,
      message: "LLMs.txt cache updated.",
      charCount: trimmedContent.length,
    });
  } catch (error: any) {
    console.error("Error updating LLMs.txt cache:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};
