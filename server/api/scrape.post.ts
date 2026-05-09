const getTitleFromHtmlString = (html: string) => {
  const h1Regex = /<h1[^>]*>(.*?)<\/h1>/is;
  const h1Match = h1Regex.exec(html);
  if (h1Match) {
    return h1Match[1].replace(/<[^>]+>/g, "").trim();
  }

  const titleRegex = /<title[^>]*>(.*?)<\/title>/is;
  const titleMatch = titleRegex.exec(html);
  return titleMatch ? titleMatch[1].trim() : "Untitled Article";
};

const urlCache: { [key: string]: string } = {};

export default defineEventHandler(async (event) => {
  const { url } = await readBody(event);

  try {
    new URL(url);
  } catch (error) {
    throw createError({ statusCode: 400, message: "Invalid URL" });
  }

  // Check if the URL is already in the cache
  if (urlCache[url]) {
    return { title: urlCache[url] };
  }

  let html: string;
  try {
    html = await $fetch<string>(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
      },
    });
  } catch (error: any) {
    throw createError({
      statusCode: error?.response?.status || 400,
      message: error?.message || "Unable to scrape the provided URL",
    });
  }

  const title = getTitleFromHtmlString(html);

  // Cache the URL
  urlCache[url] = title;

  return {
    title,
  };
});
