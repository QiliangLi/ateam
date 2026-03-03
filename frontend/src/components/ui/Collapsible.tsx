import * as React from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "../../lib/utils"

export function Collapsible({ title, children, defaultOpen = false, className }: { title: string, children: React.ReactNode, defaultOpen?: boolean, className?: string }) {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);

    return (
        <div className={cn("border rounded-md overflow-hidden bg-slate-50", className)}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center w-full px-4 py-2 text-sm font-medium text-left hover:bg-slate-100 transition-colors focus:outline-none"
            >
                {isOpen ? <ChevronDown className="w-4 h-4 mr-2" /> : <ChevronRight className="w-4 h-4 mr-2" />}
                {title}
            </button>
            <div
                className={cn(
                    "grid transition-all duration-200 ease-in-out",
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
            >
                <div className="overflow-hidden">
                    <div className="p-4 pt-0 text-sm font-mono text-gray-600 bg-slate-50">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}
