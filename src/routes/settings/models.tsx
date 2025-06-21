import { SettingsLayout } from "@/components/settings/settings-layout"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { api } from "@/convex/_generated/api"
import type { ModelAbility } from "@/convex/schema/settings"
import { useSession } from "@/hooks/auth-hooks"
import {
    type CustomModelFormData,
    type DisplayModel,
    getAbilityIcon,
    getAbilityLabel,
    getProviderDisplayName,
    useAvailableModels
} from "@/lib/models-providers-shared"
import { cn } from "@/lib/utils"
import { useConvexQuery } from "@convex-dev/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useMutation } from "convex/react"
import { Box, Check, Image, Plus, SquarePen, Trash2, X } from "lucide-react"
import { memo, useMemo, useState } from "react"
import { toast } from "sonner"

export const Route = createFileRoute("/settings/models")({
    component: ModelsSettings
})

type ModelCardProps = {
    model: DisplayModel
    currentProviders: {
        core: Record<string, { enabled: boolean; encryptedKey: string }>
        custom: Record<
            string,
            { name: string; enabled: boolean; endpoint: string; encryptedKey: string }
        >
    }
    onEdit?: (modelId: string) => void
    onDelete?: (modelId: string) => void
}

const ModelCard = memo(({ model, currentProviders, onEdit, onDelete }: ModelCardProps) => {
    // Determine the active provider following priority: BYOK Core > Custom > OpenRouter > i3-internal
    const getActiveProvider = () => {
        // Handle custom models differently - they have a direct providerId reference
        if ("isCustom" in model && model.isCustom) {
            const providerId = model.providerId

            // Check if it's a core provider
            if (currentProviders.core[providerId]?.enabled) {
                return {
                    name: `${getProviderDisplayName(providerId, currentProviders)} BYOK`,
                    available: true
                }
            }

            // Check if it's a custom provider
            if (currentProviders.custom[providerId]?.enabled) {
                return { name: currentProviders.custom[providerId].name, available: true }
            }

            return { name: "Provider not found", available: false }
        }

        // Handle shared models with adapters
        const sharedModel = model as any

        // Check BYOK core providers first
        for (const adapter of sharedModel.adapters) {
            const providerId = adapter.split(":")[0]
            if (currentProviders.core[providerId]?.enabled) {
                return {
                    name: `${getProviderDisplayName(providerId, currentProviders)} BYOK`,
                    available: true
                }
            }
        }

        // Check OpenRouter and LLM Gateway
        for (const adapter of sharedModel.adapters) {
            const providerId = adapter.split(":")[0]
            if (providerId === "openrouter" && currentProviders.core.openrouter?.enabled) {
                return { name: "OpenRouter", available: true }
            }
            if (providerId === "llmgateway" && currentProviders.core.llmgateway?.enabled) {
                return { name: "LLM Gateway", available: true }
            }
        }

        // Check i3-internal (always available)
        for (const adapter of sharedModel.adapters) {
            const providerId = adapter.split(":")[0]
            if (providerId.startsWith("i3-")) {
                return { name: "Built-in", available: true }
            }
        }

        return { name: "No provider configured", available: false }
    }

    const activeProvider = getActiveProvider()
    const isCustomModel = "isCustom" in model && model.isCustom

    return (
        <Card
            className={cn(
                "px-4 py-3 shadow-xs",
                !activeProvider.available && "bg-muted/20 opacity-50"
            )}
        >
            <div className="flex flex-col items-start justify-between max-sm:gap-1 sm:flex-row sm:items-center">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{model.name}</h4>
                        {isCustomModel && (
                            <Badge variant="outline" className="text-xs">
                                Custom
                            </Badge>
                        )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-0.75">
                        {model.mode === "image" && (
                            <Badge variant="secondary" className="gap-1.5 px-1.5 text-xs">
                                <Image className="size-3" />
                                Image generation
                            </Badge>
                        )}
                        {model.abilities
                            .filter((ability) => ability !== "effort_control")
                            .map((ability) => {
                                const Icon = getAbilityIcon(ability)
                                return (
                                    <Badge
                                        key={ability}
                                        variant="secondary"
                                        className="gap-1.5 px-1.5 text-xs"
                                    >
                                        <Icon className="size-3" />
                                        {getAbilityLabel(ability)}
                                    </Badge>
                                )
                            })}
                    </div>
                </div>
                <div className="flex items-start gap-3 sm:items-center">
                    <div className="text-right">
                        <p
                            className={cn(
                                "text-xs",
                                activeProvider.available
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                            )}
                        >
                            {activeProvider.name}
                        </p>
                    </div>
                    {isCustomModel && onEdit && onDelete && (
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEdit(model.id)}
                                className="h-7 w-7 p-0"
                            >
                                <SquarePen className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Custom Model</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Are you sure you want to delete "{model.name}"? This
                                            action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => onDelete(model.id)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                            Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    )
})

function ModelsSettings() {
    const session = useSession()
    const userSettings = useConvexQuery(
        api.settings.getUserSettings,
        session.user?.id ? {} : "skip"
    )
    const updateSettings = useMutation(api.settings.updateUserSettingsPartial)

    const [loading, setLoading] = useState(false)
    const [addingCustomModel, setAddingCustomModel] = useState(false)
    const [editingCustomModel, setEditingCustomModel] = useState<string | null>(null)
    const [customModelForm, setCustomModelForm] = useState<CustomModelFormData>({
        name: "",
        modelId: "",
        providerId: "",
        contextLength: 4096,
        maxTokens: 1024,
        abilities: [],
        enabled: true
    })

    const { availableModels, unavailableModels, currentProviders } =
        useAvailableModels(userSettings)

    // Get available provider IDs for dropdown
    const availableProviders = useMemo(() => {
        const providers = new Set<string>()

        // Add core providers that are enabled
        for (const [id, provider] of Object.entries(currentProviders.core)) {
            if (provider.enabled) {
                providers.add(id)
            }
        }

        // Add custom providers that are enabled
        for (const [id, provider] of Object.entries(currentProviders.custom)) {
            if (provider.enabled) {
                providers.add(id)
            }
        }

        return Array.from(providers)
    }, [currentProviders])

    const handleSaveCustomModel = async () => {
        if (!session.user?.id) return

        setLoading(true)
        try {
            const modelId = `custom-${Date.now()}`
            await updateSettings({
                customModelUpdates: {
                    [modelId]: {
                        enabled: customModelForm.enabled,
                        name: customModelForm.name,
                        modelId: customModelForm.modelId,
                        providerId: customModelForm.providerId,
                        contextLength: customModelForm.contextLength,
                        maxTokens: customModelForm.maxTokens,
                        abilities: customModelForm.abilities
                    }
                }
            })

            toast.success("Custom model added")
            setAddingCustomModel(false)
            setCustomModelForm({
                name: "",
                modelId: "",
                providerId: "",
                contextLength: 4096,
                maxTokens: 1024,
                abilities: [],
                enabled: true
            })
        } catch (error) {
            toast.error("Failed to save custom model")
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleEditCustomModel = (modelId: string) => {
        const model = userSettings?.customModels?.[modelId]
        if (!model) return

        setCustomModelForm({
            name: model.name || "",
            modelId: model.modelId,
            providerId: model.providerId,
            contextLength: model.contextLength,
            maxTokens: model.maxTokens,
            abilities: model.abilities,
            enabled: model.enabled
        })
        setEditingCustomModel(modelId)
    }

    const handleSaveCustomModelEdit = async () => {
        if (!session.user?.id || !editingCustomModel) return

        setLoading(true)
        try {
            await updateSettings({
                customModelUpdates: {
                    [editingCustomModel]: {
                        enabled: customModelForm.enabled,
                        name: customModelForm.name,
                        modelId: customModelForm.modelId,
                        providerId: customModelForm.providerId,
                        contextLength: customModelForm.contextLength,
                        maxTokens: customModelForm.maxTokens,
                        abilities: customModelForm.abilities
                    }
                }
            })

            toast.success("Custom model updated")
            setEditingCustomModel(null)
            setCustomModelForm({
                name: "",
                modelId: "",
                providerId: "",
                contextLength: 4096,
                maxTokens: 1024,
                abilities: [],
                enabled: true
            })
        } catch (error) {
            toast.error("Failed to update custom model")
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteCustomModel = async (modelId: string) => {
        if (!session.user?.id) return

        setLoading(true)
        try {
            await updateSettings({
                customModelUpdates: {
                    [modelId]: null
                }
            })
            toast.success("Custom model deleted")
        } catch (error) {
            toast.error("Failed to delete custom model")
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    if (!session.user?.id) {
        return (
            <SettingsLayout
                title="Models"
                description="View available models and configure custom models from your providers."
            >
                <p className="text-muted-foreground text-sm">Sign in to manage your models.</p>
            </SettingsLayout>
        )
    }

    if (!userSettings || "error" in userSettings) {
        return (
            <SettingsLayout
                title="Models"
                description="View available models and configure custom models from your providers."
            >
                <p className="text-muted-foreground text-sm">Loading model settings...</p>
            </SettingsLayout>
        )
    }

    return (
        <SettingsLayout
            title="Models"
            description="View available models and configure custom models from your providers."
        >
            <div className="space-y-6">
                <div className="space-y-1.5">
                    <div className="space-y-0.25">
                        <h3 className="font-semibold text-base">Available Models</h3>
                        <p className="text-muted-foreground text-xs">
                            Models available from your configured providers
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        {/* Available Models */}
                        {availableModels.map((model) => (
                            <ModelCard
                                key={model.id}
                                model={model}
                                currentProviders={currentProviders}
                                onEdit={handleEditCustomModel}
                                onDelete={handleDeleteCustomModel}
                            />
                        ))}

                        {/* Divider */}
                        {unavailableModels.length > 0 && (
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-4 py-4">
                                    <div className="h-px flex-1 bg-border" />
                                    <span className="text-muted-foreground text-sm">
                                        Unavailable Models
                                    </span>
                                    <div className="h-px flex-1 bg-border" />
                                </div>
                                <span className="text-muted-foreground text-xs">
                                    Configure a provider to use these models
                                </span>
                            </div>
                        )}

                        {/* Unavailable Models */}
                        {unavailableModels.map((model) => (
                            <ModelCard
                                key={model.id}
                                model={model}
                                currentProviders={currentProviders}
                                onEdit={handleEditCustomModel}
                                onDelete={handleDeleteCustomModel}
                            />
                        ))}

                        {/* Edit Custom Model */}
                        {editingCustomModel && (
                            <Card className="p-4 shadow-xs">
                                <div className="space-y-4">
                                    <h4 className="font-semibold">Edit Custom Model</h4>

                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id="edit-custom-model-enabled"
                                                checked={customModelForm.enabled}
                                                onCheckedChange={(checked) =>
                                                    setCustomModelForm((prev) => ({
                                                        ...prev,
                                                        enabled: checked
                                                    }))
                                                }
                                            />
                                            <Label htmlFor="edit-custom-model-enabled">
                                                Enable Model
                                            </Label>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="edit-custom-model-name">
                                                    Model Name
                                                </Label>
                                                <Input
                                                    id="edit-custom-model-name"
                                                    value={customModelForm.name}
                                                    onChange={(e) =>
                                                        setCustomModelForm((prev) => ({
                                                            ...prev,
                                                            name: e.target.value
                                                        }))
                                                    }
                                                    placeholder="GPT-4 Custom"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="edit-custom-model-id">
                                                    Model ID
                                                </Label>
                                                <Input
                                                    id="edit-custom-model-id"
                                                    value={customModelForm.modelId}
                                                    onChange={(e) =>
                                                        setCustomModelForm((prev) => ({
                                                            ...prev,
                                                            modelId: e.target.value
                                                        }))
                                                    }
                                                    placeholder="gpt-4-custom"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="edit-custom-model-provider">
                                                Provider
                                            </Label>
                                            <Select
                                                value={customModelForm.providerId}
                                                onValueChange={(value) =>
                                                    setCustomModelForm((prev) => ({
                                                        ...prev,
                                                        providerId: value
                                                    }))
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a provider" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableProviders.map((providerId) => (
                                                        <SelectItem
                                                            key={providerId}
                                                            value={providerId}
                                                        >
                                                            {getProviderDisplayName(
                                                                providerId,
                                                                currentProviders
                                                            )}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="edit-custom-model-context">
                                                    Context Length
                                                </Label>
                                                <Input
                                                    id="edit-custom-model-context"
                                                    type="number"
                                                    value={customModelForm.contextLength}
                                                    onChange={(e) =>
                                                        setCustomModelForm((prev) => ({
                                                            ...prev,
                                                            contextLength:
                                                                Number.parseInt(e.target.value) ||
                                                                4096
                                                        }))
                                                    }
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="edit-custom-model-tokens">
                                                    Max Tokens
                                                </Label>
                                                <Input
                                                    id="edit-custom-model-tokens"
                                                    type="number"
                                                    value={customModelForm.maxTokens}
                                                    onChange={(e) =>
                                                        setCustomModelForm((prev) => ({
                                                            ...prev,
                                                            maxTokens:
                                                                Number.parseInt(e.target.value) ||
                                                                1024
                                                        }))
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Abilities</Label>
                                            <div className="flex gap-2">
                                                {(
                                                    [
                                                        "vision",
                                                        "reasoning",
                                                        "function_calling"
                                                    ] as ModelAbility[]
                                                ).map((ability) => {
                                                    const Icon = getAbilityIcon(ability)
                                                    const isSelected =
                                                        customModelForm.abilities.includes(ability)
                                                    return (
                                                        <Button
                                                            key={ability}
                                                            variant={
                                                                isSelected ? "default" : "outline"
                                                            }
                                                            size="sm"
                                                            onClick={() => {
                                                                setCustomModelForm((prev) => ({
                                                                    ...prev,
                                                                    abilities: isSelected
                                                                        ? prev.abilities.filter(
                                                                              (a) => a !== ability
                                                                          )
                                                                        : [
                                                                              ...prev.abilities,
                                                                              ability
                                                                          ]
                                                                }))
                                                            }}
                                                        >
                                                            <Icon className="h-4 w-4" />
                                                            {getAbilityLabel(ability)}
                                                        </Button>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                onClick={handleSaveCustomModelEdit}
                                                disabled={
                                                    loading ||
                                                    !customModelForm.name ||
                                                    !customModelForm.modelId ||
                                                    !customModelForm.providerId
                                                }
                                                size="sm"
                                            >
                                                <Check className="h-4 w-4" />
                                                {loading ? "Updating..." : "Update Model"}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setEditingCustomModel(null)
                                                    setCustomModelForm({
                                                        name: "",
                                                        modelId: "",
                                                        providerId: "",
                                                        contextLength: 4096,
                                                        maxTokens: 1024,
                                                        abilities: [],
                                                        enabled: true
                                                    })
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {!editingCustomModel && addingCustomModel ? (
                            <Card className="p-4 shadow-xs">
                                <div className="space-y-4">
                                    <h4 className="font-semibold">Add Custom Model</h4>

                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id="custom-model-enabled"
                                                checked={customModelForm.enabled}
                                                onCheckedChange={(checked) =>
                                                    setCustomModelForm((prev) => ({
                                                        ...prev,
                                                        enabled: checked
                                                    }))
                                                }
                                            />
                                            <Label htmlFor="custom-model-enabled">
                                                Enable Model
                                            </Label>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="custom-model-name">
                                                    Model Name
                                                </Label>
                                                <Input
                                                    id="custom-model-name"
                                                    value={customModelForm.name}
                                                    onChange={(e) =>
                                                        setCustomModelForm((prev) => ({
                                                            ...prev,
                                                            name: e.target.value
                                                        }))
                                                    }
                                                    placeholder="GPT-4 Custom"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="custom-model-id">Model ID</Label>
                                                <Input
                                                    id="custom-model-id"
                                                    value={customModelForm.modelId}
                                                    onChange={(e) =>
                                                        setCustomModelForm((prev) => ({
                                                            ...prev,
                                                            modelId: e.target.value
                                                        }))
                                                    }
                                                    placeholder="gpt-4-custom"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="custom-model-provider">Provider</Label>
                                            <Select
                                                value={customModelForm.providerId}
                                                onValueChange={(value) =>
                                                    setCustomModelForm((prev) => ({
                                                        ...prev,
                                                        providerId: value
                                                    }))
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a provider" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableProviders.map((providerId) => (
                                                        <SelectItem
                                                            key={providerId}
                                                            value={providerId}
                                                        >
                                                            {getProviderDisplayName(
                                                                providerId,
                                                                currentProviders
                                                            )}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="custom-model-context">
                                                    Context Length
                                                </Label>
                                                <Input
                                                    id="custom-model-context"
                                                    type="number"
                                                    value={customModelForm.contextLength}
                                                    onChange={(e) =>
                                                        setCustomModelForm((prev) => ({
                                                            ...prev,
                                                            contextLength:
                                                                Number.parseInt(e.target.value) ||
                                                                4096
                                                        }))
                                                    }
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="custom-model-tokens">
                                                    Max Tokens
                                                </Label>
                                                <Input
                                                    id="custom-model-tokens"
                                                    type="number"
                                                    value={customModelForm.maxTokens}
                                                    onChange={(e) =>
                                                        setCustomModelForm((prev) => ({
                                                            ...prev,
                                                            maxTokens:
                                                                Number.parseInt(e.target.value) ||
                                                                1024
                                                        }))
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Abilities</Label>
                                            <div className="flex gap-2">
                                                {(
                                                    [
                                                        "vision",
                                                        "reasoning",
                                                        "function_calling"
                                                    ] as ModelAbility[]
                                                ).map((ability) => {
                                                    const Icon = getAbilityIcon(ability)
                                                    const isSelected =
                                                        customModelForm.abilities.includes(ability)
                                                    return (
                                                        <Button
                                                            key={ability}
                                                            variant={
                                                                isSelected ? "default" : "outline"
                                                            }
                                                            size="sm"
                                                            onClick={() => {
                                                                setCustomModelForm((prev) => ({
                                                                    ...prev,
                                                                    abilities: isSelected
                                                                        ? prev.abilities.filter(
                                                                              (a) => a !== ability
                                                                          )
                                                                        : [
                                                                              ...prev.abilities,
                                                                              ability
                                                                          ]
                                                                }))
                                                            }}
                                                        >
                                                            <Icon className="h-4 w-4" />
                                                            {getAbilityLabel(ability)}
                                                        </Button>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                onClick={handleSaveCustomModel}
                                                disabled={
                                                    loading ||
                                                    !customModelForm.name ||
                                                    !customModelForm.modelId ||
                                                    !customModelForm.providerId
                                                }
                                                size="sm"
                                            >
                                                <Check className="h-4 w-4" />
                                                {loading ? "Adding..." : "Add Model"}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setAddingCustomModel(false)}
                                            >
                                                <X className="h-4 w-4" />
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ) : !editingCustomModel ? (
                            <Card className="border-dashed p-4 shadow-xs">
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-muted">
                                        <Box className="size-6" />
                                    </div>
                                    <h4 className="mb-2 font-semibold">Add Custom Model</h4>
                                    <p className="mb-4 text-muted-foreground text-sm">
                                        Add a custom model from any of your configured providers
                                    </p>
                                    <Button
                                        variant="outline"
                                        onClick={() => setAddingCustomModel(true)}
                                        disabled={availableProviders.length === 0}
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Model
                                    </Button>
                                    {availableProviders.length === 0 && (
                                        <p className="mt-2 text-muted-foreground text-xs">
                                            Configure a provider first to add custom models
                                        </p>
                                    )}
                                </div>
                            </Card>
                        ) : null}
                    </div>
                </div>
            </div>
        </SettingsLayout>
    )
}
