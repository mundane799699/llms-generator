import { LoaderFunctionArgs } from "@remix-run/node";
import db from "../db.server"; // Changed to relative path

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get("shop");

  if (!shopDomain) {
    // This case should ideally not happen if Shopify App Proxy is configured correctly,
    // as Shopify should always append the shop query parameter.
    console.error("llms.txt proxy: shop query parameter is missing.");
    return new Response("# Error: Shop domain missing from request.", {
      status: 400, // Bad Request
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  try {
    const cachedData = await db.llmContentCache.findUnique({
      where: { shop: shopDomain },
    });

    if (cachedData && cachedData.content) {
      return new Response(cachedData.content, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          // Optional: Add browser/CDN caching. Adjust max-age as needed.
          "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        },
      });
    } else {
      // Cache miss: content not found for this shop or not generated yet.
      // Return a minimal, valid llms.txt or a specific message.
      console.warn(`llms.txt proxy: Cache miss for shop ${shopDomain}.`);
      const defaultContent = `# ${shopDomain}\n# Content is being generated. Please try again later.`; // Provide a basic robots.txt like default
      return new Response(defaultContent, {
        status: 200, // Still return 200 OK for crawlers
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  } catch (error) {
    console.error(
      `llms.txt proxy: Error fetching content for shop ${shopDomain}:`,
      error,
    );
    // Critical error fetching from DB.
    const errorContent = `# ${shopDomain}\n# Error retrieving content.`; // Disallow everything on critical error
    return new Response(errorContent, {
      status: 500, // Internal Server Error
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
};
