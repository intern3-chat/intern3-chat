import { ChatError } from "@/lib/errors"
import { type OpenAIProvider, createOpenAI } from "@ai-sdk/openai"
import type { ImageModelV1, LanguageModelV1 } from "@ai-sdk/provider"
import { internal } from "../_generated/api"
import type { ActionCtx } from "../_generated/server"
import { getUserIdentity } from "../lib/identity"
import { type CoreProvider, CoreProviders, MODELS_SHARED, createProvider } from "../lib/models"

export const getModel = async (ctx: ActionCtx, modelId: string) => {
    const user = await getUserIdentity(ctx.auth, { allowAnons: false })
    if ("error" in user) throw new ChatError("unauthorized:chat")

    const registry = await ctx.runQuery(internal.settings.getUserRegistryInternal, {
        userId: user.id
    })

    if (!(modelId in registry.models)) return new ChatError("bad_model:api")

    const model = registry.models[modelId]
    if (!model) return new ChatError("bad_model:api")
    if (!model.adapters.length) return new ChatError("bad_model:api", "No adapters found for model")

    // Priority sorting: BYOK Core Providers > OpenRouter > Server (i3-)
    const sortedAdapters = model.adapters.sort((a, b) => {
        const providerA = a.split(":")[0]
        const providerB = b.split(":")[0]

        const getPriority = (provider: string) => {
            if (CoreProviders.includes(provider as CoreProvider)) return 1
            if (provider === "openrouter") return 2
            if (provider === "llmgateway") return 3
            if (provider.startsWith("i3-")) return 4
            return 5
        }

        return getPriority(providerA) - getPriority(providerB)
    })

    console.log("[getModel] model", model, "sortedAdapters", sortedAdapters)
    let finalModel: LanguageModelV1 | ImageModelV1 | undefined = undefined

    for (const adapter of sortedAdapters) {
        const providerIdRaw = model.customProviderId ?? adapter.split(":")[0]
        const providerSpecificModelId = model.customProviderId ? model.id : adapter.split(":")[1]
        if (providerIdRaw.startsWith("i3-")) {
            const providerId = providerIdRaw.slice(3) as CoreProvider
            const sdk_provider = createProvider(providerId, "internal")

            //last check that this model actually is in MODELS_SHARED
            if (
                !MODELS_SHARED.some((m) =>
                    m.adapters.some((a) => a === `i3-${providerId}:${providerSpecificModelId}`)
                )
            ) {
                console.error(`Model ${providerSpecificModelId} not found in internal modelset`)
                continue
            }

            if (model.mode === "image") {
                if (!sdk_provider.imageModel) {
                    console.error(`Provider ${providerId} does not support image models`)
                    continue
                }
                finalModel = sdk_provider.imageModel(providerSpecificModelId)
            } else {
                if (providerId === "openai") {
                    finalModel = (sdk_provider as OpenAIProvider).responses(providerSpecificModelId)
                } else {
                    finalModel = sdk_provider.languageModel(providerSpecificModelId)
                }
            }
            break
        }

        const provider = registry.providers[providerIdRaw]
        if (!provider) {
            console.error(`Provider ${providerIdRaw} not found`)
            continue
        }

        if (["openrouter", "llmgateway", ...CoreProviders].includes(providerIdRaw)) {
            const sdk_provider = createProvider(providerIdRaw as CoreProvider, provider.key)
            if (model.mode === "image") {
                if (!sdk_provider.imageModel) {
                    console.error(`Provider ${providerIdRaw} does not support image models`)
                    continue
                }
                finalModel = sdk_provider.imageModel(providerSpecificModelId)
            } else {
                if (providerIdRaw === "openai") {
                    finalModel = (sdk_provider as OpenAIProvider).responses(providerSpecificModelId)
                } else {
                    finalModel = sdk_provider.languageModel(providerSpecificModelId)
                }
            }
            break
        }

        //custom openai-compatible provider
        if (!provider.endpoint) {
            console.error(`Provider ${providerIdRaw} does not have a valid endpoint`)
            continue
        }
        const sdk_provider = createOpenAI({
            baseURL: provider.endpoint,
            apiKey: provider.key,
            compatibility: "compatible",
            name: provider.name
        })
        if (model.mode === "image") {
            if (!sdk_provider.imageModel) {
                console.error(`Provider ${providerIdRaw} does not support image models`)
                continue
            }
            finalModel = sdk_provider.imageModel(providerSpecificModelId)
        } else {
            finalModel = sdk_provider.languageModel(providerSpecificModelId)
        }
        break
    }

    if (!finalModel) return new ChatError("bad_model:api")

    Object.assign(finalModel, {
        modelType: "maxImagesPerCall" in finalModel ? "image" : "text"
    })

    return {
        model: finalModel as
            | (LanguageModelV1 & { modelType: "text" })
            | (ImageModelV1 & { modelType: "image" }),
        abilities: model.abilities,
        registry,
        modelId: model.id,
        modelName: model.name ?? model.id
    }
}
