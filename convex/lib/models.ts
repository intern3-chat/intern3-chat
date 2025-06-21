import { createAnthropic } from "@ai-sdk/anthropic"
import { createFal } from "@ai-sdk/fal"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createGroq } from "@ai-sdk/groq"
import { createOpenAI } from "@ai-sdk/openai"
import type { ProviderV1 } from "@ai-sdk/provider"
import { createLLMGateway } from "@llmgateway/ai-sdk-provider"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"

import type { ModelAbility } from "../schema/settings"

export const CoreProviders = ["openai", "anthropic", "google", "groq", "fal"] as const
export type CoreProvider = (typeof CoreProviders)[number]
export type ModelDefinitionProviders =
    | CoreProvider // user BYOK key
    | `i3-${CoreProvider}` // internal API key
    | "openrouter"
    | "llmgateway"

export type RegistryKey = `${ModelDefinitionProviders | string}:${string}`
export type Provider = RegistryKey extends `${infer P}:${string}` ? P : never

export type BaseAspects = "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "2:3" | "3:2"
export type BaseResolution = `${number}x${number}`
export type AllAspects = (BaseAspects | `${BaseAspects}-hd`) & {}
export type ImageSize = (AllAspects | BaseResolution) & {}

export type SharedModel<Abilities extends ModelAbility[] = ModelAbility[]> = {
    id: string
    name: string
    shortName?: string
    adapters: RegistryKey[]
    abilities: Abilities
    mode?: "text" | "image" | "speech-to-text"
    contextLength?: number
    maxTokens?: number
    supportedImageSizes?: ImageSize[]
    customIcon?: "stability-ai" | "openai" | "bflabs" | "google" | "meta"
    supportsDisablingReasoning?: boolean
}

export const MODELS_SHARED: SharedModel[] = [
    {
        id: "gpt-4o",
        name: "GPT 4o",
        shortName: "4o",
        adapters: ["openai:gpt-4o", "openrouter:openai/gpt-4o"],
        abilities: ["vision", "function_calling", "pdf"]
    },
    {
        id: "gpt-4o-mini",
        name: "GPT 4o mini",
        shortName: "4o mini",
        adapters: ["i3-openai:gpt-4o-mini", "openai:gpt-4o-mini", "openrouter:openai/gpt-4o-mini"],
        abilities: ["vision", "function_calling", "pdf"]
    },
    {
        id: "o3-mini",
        name: "o3 mini",
        adapters: ["openai:o3-mini", "openrouter:openai/o3-mini"],
        abilities: ["reasoning", "function_calling", "effort_control"]
    },
    {
        id: "o4-mini",
        name: "o4 mini",
        adapters: ["openai:o4-mini", "openrouter:openai/o4-mini"],
        abilities: ["reasoning", "vision", "function_calling", "pdf", "effort_control"]
    },
    {
        id: "o3",
        name: "o3",
        adapters: ["openai:o3", "openrouter:openai/o3"],
        abilities: ["reasoning", "vision", "function_calling", "pdf", "effort_control"]
    },
    {
        id: "o3-pro",
        name: "o3 pro",
        adapters: ["openai:o3-pro", "openrouter:openai/o3-pro"],
        abilities: ["reasoning", "vision", "function_calling", "pdf", "effort_control"]
    },
    {
        id: "gpt-4.1",
        name: "GPT 4.1",
        adapters: ["openai:gpt-4.1", "openrouter:openai/gpt-4.1"],
        abilities: ["vision", "function_calling", "pdf"]
    },
    {
        id: "gpt-4.1-mini",
        name: "GPT 4.1 mini",
        shortName: "4.1 mini",
        adapters: [
            "i3-openai:gpt-4.1-mini",
            "openai:gpt-4.1-mini",
            "openrouter:openai/gpt-4.1-mini"
        ],
        abilities: ["vision", "function_calling", "pdf"]
    },
    {
        id: "gpt-4.1-nano",
        name: "GPT 4.1 nano",
        shortName: "4.1 nano",
        adapters: [
            "i3-openai:gpt-4.1-nano",
            "openai:gpt-4.1-nano",
            "openrouter:openai/gpt-4.1-nano"
        ],
        abilities: ["vision", "function_calling", "pdf"]
    },
    {
        id: "claude-opus-4",
        name: "Claude Opus 4",
        shortName: "Opus 4",
        adapters: ["anthropic:claude-opus-4-0", "openrouter:anthropic/claude-opus-4"],
        abilities: ["reasoning", "vision", "function_calling", "pdf", "effort_control"],
        supportsDisablingReasoning: true
    },
    {
        id: "claude-sonnet-4",
        name: "Claude Sonnet 4",
        shortName: "Sonnet 4",
        adapters: ["anthropic:claude-sonnet-4-0", "openrouter:anthropic/claude-sonnet-4"],
        abilities: ["reasoning", "vision", "function_calling", "pdf", "effort_control"],
        supportsDisablingReasoning: true
    },
    {
        id: "claude-3-7-sonnet",
        name: "Claude Sonnet 3.7",
        shortName: "Sonnet 3.7",
        adapters: ["anthropic:claude-3-7-sonnet", "openrouter:anthropic/claude-3.7-sonnet"],
        abilities: ["reasoning", "vision", "function_calling", "pdf", "effort_control"],
        supportsDisablingReasoning: true
    },
    {
        id: "claude-3-5-sonnet",
        name: "Claude Sonnet 3.5",
        shortName: "Sonnet 3.5",
        adapters: ["anthropic:claude-3-5-sonnet", "openrouter:anthropic/claude-3.5-sonnet"],
        abilities: ["vision", "function_calling", "pdf"]
    },
    {
        id: "gemini-2.0-flash-lite",
        name: "Gemini 2.0 Flash Lite",
        shortName: "2.0 Flash Lite",
        adapters: [
            "i3-google:gemini-2.0-flash-lite",
            "google:gemini-2.0-flash-lite",
            "openrouter:google/gemini-2.0-flash-lite-001"
        ],
        abilities: ["vision", "function_calling", "pdf"]
    },
    {
        id: "gemini-2.0-flash-image-generation",
        name: "Gemini 2.0 Flash Imagen",
        shortName: "2.0 Flash Imagen",
        adapters: ["i3-google:gemini-2.0-flash-exp", "google:gemini-2.0-flash-exp"],
        abilities: ["vision"]
    },
    {
        id: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        shortName: "2.5 Flash",
        adapters: [
            "i3-google:gemini-2.5-flash",
            "google:gemini-2.5-flash",
            "openrouter:google/gemini-2.5-flash"
        ],
        abilities: ["vision", "function_calling", "reasoning", "pdf", "effort_control"],
        supportsDisablingReasoning: true
    },
    {
        id: "gemini-2.5-flash-lite",
        name: "Gemini 2.5 Flash Lite",
        shortName: "2.5 Flash Lite",
        adapters: [
            "i3-google:gemini-2.5-flash-lite-preview-06-17",
            "google:gemini-2.5-flash-lite-preview-06-17",
            "openrouter:google/gemini-2.5-flash-lite-preview-06-17"
        ],
        abilities: ["vision", "function_calling", "reasoning", "pdf", "effort_control"],
        supportsDisablingReasoning: true
    },
    {
        id: "gemini-2.0-flash",
        name: "Gemini 2.0 Flash",
        shortName: "2.0 Flash",
        adapters: [
            "i3-google:gemini-2.0-flash",
            "google:gemini-2.0-flash",
            "openrouter:google/gemini-2.0-flash-001"
        ],
        abilities: ["vision", "function_calling", "pdf"]
    },
    {
        id: "gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        shortName: "2.5 Pro",
        adapters: ["google:gemini-2.5-pro", "openrouter:google/gemini-2.5-pro"],
        abilities: ["reasoning", "vision", "function_calling", "pdf", "effort_control"],
        supportsDisablingReasoning: true
    },
    // Image Generation Models
    {
        id: "gpt-image-1",
        name: "GPT Image 1",
        adapters: ["openai:gpt-image-1"],
        abilities: [],
        mode: "image",
        supportedImageSizes: ["1024x1024", "1536x1024", "1024x1536"]
    },
    {
        id: "sdxl-lightning",
        name: "SDXL Lightning",
        shortName: "SDXL",
        adapters: ["i3-fal:fal-ai/fast-lightning-sdxl", "fal:fal-ai/fast-lightning-sdxl"],
        abilities: [],
        mode: "image",
        customIcon: "stability-ai",
        supportedImageSizes: ["1:1", "1:1-hd", "3:4", "4:3", "9:16", "16:9"]
    },
    {
        id: "flux-schnell",
        name: "FLUX.1 [schnell]",
        shortName: "flux.schnell",
        adapters: ["i3-fal:fal-ai/flux/schnell", "fal:fal-ai/flux/schnell"],
        abilities: [],
        mode: "image",
        customIcon: "bflabs",
        supportedImageSizes: ["1:1", "1:1-hd", "3:4", "4:3", "9:16", "16:9"]
    },
    {
        id: "flux-dev",
        name: "FLUX.1 [dev]",
        shortName: "flux.dev",
        adapters: ["fal:fal-ai/flux/dev"],
        abilities: [],
        mode: "image",
        customIcon: "bflabs",
        supportedImageSizes: ["1:1", "1:1-hd", "3:4", "4:3", "9:16", "16:9"]
    },
    {
        id: "google-imagen-3-fast",
        name: "Google Imagen 3 (Fast)",
        shortName: "Imagen 3 (Fast)",
        adapters: ["fal:fal-ai/imagen3/fast"],
        abilities: [],
        mode: "image",
        customIcon: "google",
        supportedImageSizes: ["1:1-hd", "16:9-hd", "9:16-hd", "3:4-hd", "4:3-hd"]
    },
    {
        id: "google-imagen-3",
        name: "Google Imagen 3",
        shortName: "Imagen 3",
        adapters: ["fal:fal-ai/imagen3"],
        abilities: [],
        mode: "image",
        customIcon: "google",
        supportedImageSizes: ["1:1-hd", "16:9-hd", "9:16-hd", "3:4-hd", "4:3-hd"]
    },
    {
        id: "google-imagen-4",
        name: "Google Imagen 4",
        shortName: "Imagen 4",
        adapters: ["fal:fal-ai/imagen4/preview"],
        abilities: [],
        mode: "image",
        customIcon: "google",
        supportedImageSizes: ["1:1-hd", "16:9-hd", "9:16-hd", "3:4-hd", "4:3-hd"]
    },
    {
        id: "llama-4-scout-17b-16e-instruct",
        name: "Llama 4 Scout 17B 16E",
        shortName: "Llama 4 Scout 17B",
        adapters: [
            "i3-groq:meta-llama/llama-4-scout-17b-16e-instruct",
            "groq:meta-llama/llama-4-scout-17b-16e-instruct"
        ],
        abilities: ["vision"],
        customIcon: "meta"
    },
    {
        id: "llama-4-maverick-17b-128e-instruct",
        name: "Llama 4 Maverick 17B 128E Instruct",
        shortName: "Llama 4 Maverick 17B",
        adapters: ["groq:meta-llama/llama-4-maverick-17b-128e-instruct"],
        abilities: ["vision"],
        customIcon: "meta"
    },
    {
        id: "llama-3-1-8b-instant",
        name: "Llama 3.1 8B Instant",
        shortName: "Llama 3.1 8B",
        adapters: ["i3-groq:llama-3.1-8b-instant", "groq:llama-3.1-8b-instant"],
        abilities: [],
        customIcon: "meta"
    },
    {
        id: "whisper-large-v3-turbo",
        name: "Whisper Large v3 Turbo",
        adapters: ["groq:whisper-large-v3-turbo"],
        abilities: [],
        mode: "speech-to-text"
    }
] as const

export const createProvider = (
    providerId: CoreProvider | "openrouter" | "fal" | "llmgateway",
    apiKey: string | "internal"
): Omit<ProviderV1, "textEmbeddingModel"> => {
    if (apiKey !== "internal" && (!apiKey || apiKey.trim() === "")) {
        throw new Error("API key is required for non-internal providers")
    }

    switch (providerId) {
        case "openai":
            return createOpenAI({
                apiKey: apiKey === "internal" ? process.env.OPENAI_API_KEY : apiKey,
                compatibility: "strict"
            })
        case "anthropic":
            return createAnthropic({
                apiKey: apiKey === "internal" ? process.env.ANTHROPIC_API_KEY : apiKey
            })
        case "google":
            return createGoogleGenerativeAI({
                apiKey: apiKey === "internal" ? process.env.GOOGLE_API_KEY : apiKey
            })
        case "groq":
            return createGroq({
                apiKey: apiKey === "internal" ? process.env.GROQ_API_KEY : apiKey
            })
        case "openrouter":
            return createOpenRouter({
                apiKey
            })
        case "fal":
            return createFal({
                apiKey: apiKey === "internal" ? process.env.FAL_API_KEY : apiKey
            })
        case "llmgateway":
            return createLLMGateway({
                apiKey: apiKey === "internal" ? process.env.LLM_GATEWAY_API_KEY : apiKey
            })
        default: {
            const exhaustiveCheck: never = providerId
            throw new Error(`Unknown provider: ${exhaustiveCheck}`)
        }
    }
}
