import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type React from "react"
import {
    createContext,
    forwardRef,
    useCallback,
    useContext,
    useImperativeHandle,
    useRef
} from "react"

const DEFAULT_TEXTAREA_HEIGHT = 44 // Default height for the textarea

type PromptInputContextType = {
    isLoading: boolean
    maxHeight: number | string
    onSubmit?: () => void
    disabled?: boolean
    textareaRef: React.RefObject<HTMLTextAreaElement | null>
}

const PromptInputContext = createContext<PromptInputContextType>({
    isLoading: false,
    maxHeight: 240,
    onSubmit: undefined,
    disabled: false,
    textareaRef: { current: null }
})

function usePromptInput() {
    const context = useContext(PromptInputContext)
    if (!context) {
        throw new Error("usePromptInput must be used within a PromptInput")
    }
    return context
}

export type PromptInputRef = {
    getValue: () => string
    setValue: (value: string) => void
    clear: () => void
    focus: () => void
}

type PromptInputProps = {
    isLoading?: boolean
    maxHeight?: number | string
    onSubmit?: () => void
    children: React.ReactNode
    className?: string
}

const PromptInput = forwardRef<PromptInputRef, PromptInputProps>(
    ({ className, isLoading = false, maxHeight = 240, onSubmit, children }, ref) => {
        const textareaRef = useRef<HTMLTextAreaElement>(null)

        useImperativeHandle(
            ref,
            () => ({
                getValue: () => textareaRef.current?.value || "",
                setValue: (value: string) => {
                    if (textareaRef.current) {
                        textareaRef.current.value = value
                    }
                },
                clear: () => {
                    if (textareaRef.current) {
                        textareaRef.current.value = ""
                        textareaRef.current.style.height = `${DEFAULT_TEXTAREA_HEIGHT}px`
                        localStorage.removeItem("user-input")
                    }
                },
                focus: () => {
                    textareaRef.current?.focus()
                }
            }),
            []
        )

        return (
            <TooltipProvider>
                <PromptInputContext.Provider
                    value={{
                        isLoading,
                        maxHeight,
                        onSubmit,
                        textareaRef
                    }}
                >
                    <div
                        className={cn(
                            "rounded-t-lg border-2 border-input bg-background/80 p-2 shadow-xs backdrop-blur-lg md:rounded-lg dark:bg-input/70",
                            className
                        )}
                    >
                        {children}
                    </div>
                </PromptInputContext.Provider>
            </TooltipProvider>
        )
    }
)

PromptInput.displayName = "PromptInput"

export type PromptInputTextareaProps = {
    disableAutosize?: boolean
} & React.ComponentProps<typeof Textarea>

function PromptInputTextarea({
    className,
    onKeyDown,
    disableAutosize = false,
    ...props
}: PromptInputTextareaProps) {
    const { maxHeight, onSubmit, disabled, textareaRef } = usePromptInput()

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                onSubmit?.()
            }
            onKeyDown?.(e)
        },
        [onSubmit, onKeyDown]
    )

    const handleInput = useCallback(
        (e: React.FormEvent<HTMLTextAreaElement>) => {
            if (disableAutosize) return

            const target = e.target as HTMLTextAreaElement
            target.style.height = "auto"

            // If textarea is empty, reset to default height
            if (target.value.trim() === "") {
                target.style.height = `${DEFAULT_TEXTAREA_HEIGHT}px`
            } else {
                target.style.height =
                    typeof maxHeight === "number"
                        ? `${Math.min(target.scrollHeight, maxHeight)}px`
                        : `min(${target.scrollHeight}px, ${maxHeight})`
            }

            localStorage.setItem("user-input", target.value)
        },
        [disableAutosize, maxHeight]
    )

    return (
        <Textarea
            defaultValue={
                typeof window !== "undefined" ? localStorage.getItem("user-input") || "" : ""
            }
            ref={textareaRef}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            className={cn(
                "min-h-[44px] w-full resize-none border-none bg-transparent text-foreground shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
                className
            )}
            rows={1}
            disabled={disabled}
            {...props}
        />
    )
}

type PromptInputActionsProps = React.HTMLAttributes<HTMLDivElement>

function PromptInputActions({ children, className, ...props }: PromptInputActionsProps) {
    return (
        <div className={cn("flex items-center gap-2", className)} {...props}>
            {children}
        </div>
    )
}

type PromptInputActionProps = {
    className?: string
    tooltip: React.ReactNode
    children: React.ReactNode
    side?: "top" | "bottom" | "left" | "right"
} & React.ComponentProps<typeof Tooltip>

function PromptInputAction({
    tooltip,
    children,
    className,
    side = "top",
    ...props
}: PromptInputActionProps) {
    const { disabled } = usePromptInput()

    return (
        <Tooltip {...props}>
            <TooltipTrigger asChild disabled={disabled}>
                {children}
            </TooltipTrigger>
            <TooltipContent side={side} className={className}>
                {tooltip}
            </TooltipContent>
        </Tooltip>
    )
}

export { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction }
