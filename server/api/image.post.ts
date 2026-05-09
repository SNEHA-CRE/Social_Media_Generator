import { geminiModel } from "../utils/gemini"

const generateFreePrompt = async (url: string) => {
  try {
    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: `Create a 3D illustration prompt for an article about: ${url}. White background.` }]}]
    });
    return result.response.text();
  } catch (e) {
    // If Gemini fails, we just use a generic prompt based on the URL
    return `3D digital illustration for technology article, modern web design style, clean background`;
  }
};

const generateFreeImage = async (prompt: string) => {
  const encodedPrompt = encodeURIComponent(prompt);
  const imageURL = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;

  const res = (await $fetch(imageURL, {
    responseType: "arrayBuffer",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36..."
    }
  })) as ArrayBuffer;

  return `data:image/jpeg;base64,${Buffer.from(res).toString("base64")}`;
};

export default defineEventHandler(async (event) => {
  const { url } = await readBody(event);

  try {
    const aiPrompt = await generateFreePrompt(url);
    
    try {
      return await generateFreeImage(aiPrompt);
    } catch (imageError) {
      // Final fallback to a very reliable placeholder service
      const fallbackUrl = `https://loremflickr.com/512/512/technology,business`;
      const res = await $fetch<ArrayBuffer>(fallbackUrl, { responseType: "arrayBuffer" });
      return `data:image/jpeg;base64,${Buffer.from(res).toString("base64")}`;
    }
  } catch (error: any) {
    console.error("Image API Error:", error);
    throw createError({ statusCode: 500, message: "Unable to generate image" });
  }
});