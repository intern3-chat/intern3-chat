import {
    BraveIcon,
    ClaudeIcon,
    FalAIIcon,
    GeminiIcon,
    GroqIcon,
    LLMGatewayIcon,
    OpenAIIcon,
    OpenRouterIcon,
    SerperDevIcon,
    TavilyIcon
} from "@/components/brand-icons"
import { type CoreProvider, MODELS_SHARED, type SharedModel } from "@/convex/lib/models"
import type { ModelAbility, UserSettings } from "@/convex/schema/settings"
import type { Infer } from "convex/values"
import { Brain, Code, Eye, File, Key } from "lucide-react"

export type DisplayModel =
    | SharedModel
    | {
          id: string
          name: string
          abilities: ModelAbility[]
          isCustom: true
          providerId: string
          mode?: "text" | "image"
      }

export type CoreProviderInfo = {
    id: CoreProvider | "openrouter" | "llmgateway"
    name: string
    description: string
    placeholder: string
    icon: React.ComponentType<{ className?: string }> | string
}

export const CORE_PROVIDERS: CoreProviderInfo[] = [
    {
        id: "openrouter",
        name: "OpenRouter",
        description: "Access a wide variety of models through OpenRouter",
        placeholder: "sk-or-...",
        icon: OpenRouterIcon
    },
    {
        id: "llmgateway",
        name: "LLM Gateway",
        description: "Access a wide variety of models through LLM Gateway",
        placeholder: "llmgtwy_...",
        icon: LLMGatewayIcon
    },
    {
        id: "openai",
        name: "OpenAI",
        description: "Access GPT-4, GPT-4o, o3, and other OpenAI models",
        placeholder: "sk-...",
        icon: OpenAIIcon
    },
    {
        id: "anthropic",
        name: "Anthropic",
        description: "Access Claude Sonnet, Opus, and other Anthropic models",
        placeholder: "sk-ant-...",
        icon: ClaudeIcon
    },
    {
        id: "google",
        name: "Google",
        description: "Access Gemini 2.5, 2.0 Flash and other Google AI models",
        placeholder: "AIza...",
        icon: GeminiIcon
    },
    {
        id: "groq",
        name: "Groq",
        description: "Access Llama, Speech-to-text, and other models with ultra-fast inference",
        placeholder: "gsk_...",
        icon: GroqIcon
    },
    {
        id: "fal",
        name: "Fal AI",
        description: "Access open-souce image generation models",
        placeholder: "key_secret:key_id",
        icon: FalAIIcon
    }
]

export type SearchProviderInfo = {
    id: "firecrawl" | "brave" | "tavily" | "serper"
    name: string
    description: string
    placeholder: string
    icon: React.ComponentType<{ className?: string }> | string
}

export const SEARCH_PROVIDERS: SearchProviderInfo[] = [
    {
        id: "firecrawl",
        name: "Firecrawl",
        description: "Advanced web scraping with content extraction and markdown support",
        placeholder: "fc-...",
        icon: "🔥"
    },
    {
        id: "brave",
        name: "Brave Search",
        description: "Fast, privacy-focused search results from Brave's independent index",
        placeholder: "BSA...",
        icon: BraveIcon
    },
    {
        id: "tavily",
        name: "Tavily",
        description: "AI-powered search with advanced content chunking and source analysis",
        placeholder: "tvly-...",
        icon: TavilyIcon
    },
    {
        id: "serper",
        name: "Serper",
        description: "Google-powered search with smart content scraping and context management",
        placeholder: "...",
        icon: SerperDevIcon
    }
]

export function useAvailableModels(userSettings: Infer<typeof UserSettings> | undefined) {
    const currentProviders = {
        core: userSettings?.coreAIProviders || {},
        custom: userSettings?.customAIProviders || {}
    }

    const availableModels: DisplayModel[] = []
    const unavailableModels: DisplayModel[] = []

    // Add shared models
    MODELS_SHARED.forEach((model) => {
        const hasProvider = model.adapters.some((adapter) => {
            const providerId = adapter.split(":")[0]
            if (providerId.startsWith("i3-")) return true
            if (providerId === "openrouter") return currentProviders.core.openrouter?.enabled
            return currentProviders.core[providerId as CoreProvider]?.enabled
        })

        if (hasProvider) {
            availableModels.push(model)
        } else {
            unavailableModels.push(model)
        }
    })

    // Add custom models
    Object.entries(userSettings?.customModels || {}).forEach(([id, customModel]) => {
        if (!customModel.enabled) return

        const hasProvider =
            currentProviders.core[customModel.providerId]?.enabled ||
            currentProviders.custom[customModel.providerId]?.enabled

        const modelData = {
            id,
            name: customModel.name || customModel.modelId,
            abilities: customModel.abilities,
            isCustom: true as const,
            providerId: customModel.providerId
        }

        if (hasProvider) {
            availableModels.push(modelData)
        } else {
            unavailableModels.push(modelData)
        }
    })

    return { availableModels, unavailableModels, currentProviders }
}

export const getAbilityIcon = (ability: ModelAbility) => {
    switch (ability) {
        case "vision":
            return Eye
        case "reasoning":
            return Brain
        case "function_calling":
            return Code
        case "pdf":
            return File
        default:
            return Key
    }
}

export const getAbilityLabel = (ability: ModelAbility) => {
    switch (ability) {
        case "function_calling":
            return "Function Calling"
        case "vision":
            return "Vision"
        case "reasoning":
            return "Reasoning"
        case "pdf":
            return "PDF"
        default:
            return ability
    }
}

export const getProviderDisplayName = (
    providerId: string,
    currentProviders: {
        core: Record<string, { enabled: boolean; encryptedKey: string }>
        custom: Record<
            string,
            { name: string; enabled: boolean; endpoint: string; encryptedKey: string }
        >
    }
) => {
    // Check if it's a core provider
    const coreProvider = CORE_PROVIDERS.find((p) => p.id === providerId)
    if (coreProvider) {
        return coreProvider.name
    }

    // Check if it's a custom provider
    const customProvider = currentProviders.custom[providerId]
    if (customProvider) {
        return customProvider.name
    }

    return providerId
}

export type CustomModelFormData = {
    name: string
    modelId: string
    providerId: string
    contextLength: number
    maxTokens: number
    abilities: ModelAbility[]
    enabled: boolean
}
