import * as React from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "../../lib/utils"

interface CollapsibleProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    className?: string;
}

export function Collapsible({ title, children, defaultOpen = false, className }: CollapsibleProps) {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);

    return (
        <div className={cn("rounded-lg overflow-hidden bg-muted/30", className)}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center w-full px-4 py-2 font-medium text-left hover:bg-muted/50 transition-colors focus:outline-none cursor-pointer"
                style={{ fontSize: 'var(--font-message)' }}
            >
                {isOpen ? <ChevronDown className="w-4 h-4 mr-2 text-primary" /> : <ChevronRight className="w-4 h-4 mr-2 text-primary" />}
                <span className="text-muted-foreground">{title}</span>
            </button>
            <div
                className={cn(
                    "grid transition-all duration-200 ease-in-out",
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
            >
                <div className="overflow-hidden">
                    <div className="p-4 pt-0 font-mono text-muted-foreground" style={{ fontSize: 'var(--font-message)' }}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}
