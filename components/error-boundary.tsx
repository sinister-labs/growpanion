"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface ErrorBoundaryProps {
    children: ReactNode
    fallback?: ReactNode
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = {
            hasError: false,
            error: null
        }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            error
        }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error("ErrorBoundary caught an error:", error, errorInfo)
    }

    resetError = () => {
        this.setState({
            hasError: false,
            error: null
        })
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div className="min-h-[200px] flex flex-col items-center justify-center rounded-3xl border border-destructive/30 bg-destructive/10 p-8 text-foreground">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                        <h2 className="text-xl font-semibold">Ein Fehler ist aufgetreten</h2>
                    </div>

                    <p className="mb-6 text-muted-foreground text-center max-w-lg">
                        In dieser Komponente ist ein unerwarteter Fehler aufgetreten.
                        Die Anwendung kann weiterhin funktionieren, aber diese Komponente wird
                        möglicherweise nicht korrekt angezeigt.
                    </p>

                    {this.state.error && (
                        <div className="mb-6 w-full max-w-lg overflow-auto rounded-[1rem] border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
                            <p className="font-bold mb-1">Fehler:</p>
                            <p>{this.state.error.message}</p>
                        </div>
                    )}

                    <Button onClick={this.resetError} variant="outline" className="border-destructive/40 hover:bg-destructive/10">
                        Zurücksetzen und erneut versuchen
                    </Button>
                </div>
            )
        }

        return this.props.children
    }
}


export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    fallback?: ReactNode
): React.FC<P> {
    const WrappedComponent = (props: P) => (
        <ErrorBoundary fallback={fallback}>
            <Component {...props} />
        </ErrorBoundary>
    )
    WrappedComponent.displayName = `WithErrorBoundary(${Component.displayName || Component.name || 'Component'})`
    return WrappedComponent
} 
