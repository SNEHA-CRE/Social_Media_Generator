import { GoogleGenerativeAI } from "@google/generative-ai"

const config = useRuntimeConfig()

// Use the Gemini Flash 2.0 model for its free and fast generation
const genAI = new GoogleGenerativeAI(config.gemini.apiKey || "")

export const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
