import * as agents from "@/agents"
import { geminiModel } from "../utils/gemini"

const generateChatResponse = async ({
  agent,
  url,
  messages,
  temperature = 1
}: any) => {
  if (!Object.keys(agents).includes(`${agent}Agent`)) {
    throw createError({ statusCode: 400, message: "Invalid agent" })
  }

  // Generate the configuration from the agent logic
  const agentKey = `${agent}Agent` as keyof typeof agents;
  if (typeof agents[agentKey] !== 'function') {
    throw createError({ statusCode: 400, message: "Invalid agent" })
  }
  const agentConfig = (agents[agentKey] as Function)({ url, messages }) as any;

  // Convert the OpenAI messages format to Gemini format
  const contents = agentConfig.messages.map((m: any) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }))

  let text = "";
  try {
    // Try Google Gemini first (Free Tier)
    const result = await geminiModel.generateContent({
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: agentConfig.max_tokens || 800
      }
    });
    text = result.response.text();
  } catch (geminiError: any) {
    console.error("Gemini Error, falling back to Pollinations:", geminiError.message);
    
    // Fallback 1: Try Pollinations.ai (Key-less)
    try {
      const systemPrompt = agentConfig.messages.find((m: any) => m.role === "system")?.content || "";
      const lastUserPrompt = agentConfig.messages.findLast((m: any) => m.role === "user")?.content || "";
      const apiURL = `https://text.pollinations.ai/${encodeURIComponent(lastUserPrompt)}?system=${encodeURIComponent(systemPrompt)}`;
      text = await $fetch<string>(apiURL);
    } catch (pollinationsError) {
      console.error("All AI failed, generating basic fallback post.");
      
      // Fallback 2: Human-like basic post based on URL
      if (agent.includes("twitter")) {
        text = `Check out this interesting article I found: ${url} 🚀 #newpost #blog`;
      } else {
        text = `I just read this fascinating article and wanted to share it with you all! Check it out here: ${url}`;
      }
    }
  }

  return {
    choices: [
      {
        message: {
          role: "assistant",
          content: text.trim()
        }
      }
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
  }
}

const handleErrorResponse = (error: any) => {
  console.error("Critical AI Error:", error);
  throw createError({ statusCode: 500, message: "Unable to generate post" })
}

export default defineEventHandler(async (event) => {
  const session = await useSession(event, {
    password: "ccb3264a-5f90-4493-a6ae-beecf976c78e"
  })
  const storageKey = session.id + ":messages"

  const { message, agent, url, temperature = 1 } = await readBody(event)

  if (agent === agents.AgentTypes.CustomerSupport) {
    try {
      const messages = (await getMessages(storageKey)) || []

      messages.push({
        role: "user",
        content: message
      })

      const data = await generateChatResponse({
        agent,
        messages,
        temperature,
        url
      })

      const reply = data.choices[0].message
      messages.push({
        role: "assistant",
        content: reply?.content as string
      })

      await setMessages(storageKey, messages)

      return data
    } catch (error: any) {
      handleErrorResponse(error)
    }
  }

  try {
    const data = await generateChatResponse({
      agent,
      url,
      temperature
    })

    return data
  } catch (error: any) {
    handleErrorResponse(error)
  }
})
