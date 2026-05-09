import OpenAI from "openai"

const config = useRuntimeConfig()

// In OpenAI v4, we use the OpenAI class directly
export const openai = new OpenAI({
  apiKey: config.openai.apiKey
})
