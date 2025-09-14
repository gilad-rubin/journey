import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiService, FunctionCatalog as FunctionCatalogType } from "@/lib/api";
import { AlertCircle, Code2, Loader2, Search, Zap } from "lucide-react";
import React, { useEffect, useState } from "react";

interface FunctionCatalogProps {
    onSelectFunction?: (functionName: string) => void;
    selectedFunction?: string;
}

export const FunctionCatalog: React.FC<FunctionCatalogProps> = ({
    onSelectFunction,
    selectedFunction,
}) => {
    const [catalog, setCatalog] = useState<FunctionCatalogType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    useEffect(() => {
        loadFunctionCatalog();
    }, []);

    const loadFunctionCatalog = async () => {
        try {
            setLoading(true);
            setError(null);
            const catalogData = await apiService.getFunctionCatalog();
            setCatalog(catalogData);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load function catalog");
        } finally {
            setLoading(false);
        }
    };

    const filteredFunctions = catalog?.functions.filter((func) => {
        const matchesSearch = func.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            func.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "all" || func.category === selectedCategory;
        return matchesSearch && matchesCategory;
    }) || [];

    const getTypeColor = (type: string): string => {
        switch (type) {
            case "string": return "bg-blue-100 text-blue-800";
            case "number": return "bg-green-100 text-green-800";
            case "boolean": return "bg-purple-100 text-purple-800";
            case "array": return "bg-slate-100 text-slate-800";
            case "object": return "bg-red-100 text-red-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    const getCategoryColor = (category: string): string => {
        switch (category) {
            case "transformation": return "bg-indigo-100 text-indigo-800";
            case "condition": return "bg-yellow-100 text-yellow-800";
            case "utility": return "bg-teal-100 text-teal-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        Function Catalog
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="ml-2">Loading functions...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        Function Catalog
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                    <Button onClick={loadFunctionCatalog} className="mt-4">
                        Retry
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Function Catalog
                    <Badge variant="secondary">{catalog?.functions.length || 0} functions</Badge>
                </CardTitle>

                {/* Search and Filter Controls */}
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search functions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>

                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {catalog?.categories.map((category) => (
                                <SelectItem key={category} value={category}>
                                    {category}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>

            <CardContent>
                <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                        {filteredFunctions.map((func) => (
                            <Card
                                key={func.id}
                                className={`cursor-pointer transition-colors ${selectedFunction === func.name ? "ring-2 ring-primary" : "hover:bg-muted/50"
                                    }`}
                                onClick={() => onSelectFunction?.(func.name)}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Code2 className="w-4 h-4" />
                                            <h4 className="font-semibold">{func.name}</h4>
                                        </div>
                                        <Badge
                                            className={getCategoryColor(func.category)}
                                            variant="secondary"
                                        >
                                            {func.category}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{func.description}</p>
                                </CardHeader>

                                <CardContent className="pt-0">
                                    {/* Function Signature */}
                                    <div className="mb-3">
                                        <h5 className="text-xs font-medium text-muted-foreground mb-2">SIGNATURE</h5>
                                        <code className="text-xs bg-muted px-2 py-1 rounded">
                                            {func.name}(
                                            {func.arguments.map((arg, index) => (
                                                <span key={arg.name}>
                                                    {arg.name}: {arg.type}
                                                    {!arg.required && "?"}
                                                    {index < func.arguments.length - 1 && ", "}
                                                </span>
                                            ))}
                                            ) → {func.return_type}
                                        </code>
                                    </div>

                                    {/* Arguments */}
                                    {func.arguments.length > 0 && (
                                        <div className="mb-3">
                                            <h5 className="text-xs font-medium text-muted-foreground mb-2">ARGUMENTS</h5>
                                            <div className="space-y-1">
                                                {func.arguments.map((arg) => (
                                                    <div key={arg.name} className="flex items-center justify-between text-xs">
                                                        <span className="font-medium">{arg.name}</span>
                                                        <div className="flex items-center gap-1">
                                                            <Badge
                                                                className={getTypeColor(arg.type)}
                                                                variant="secondary"
                                                            >
                                                                {arg.type}
                                                            </Badge>
                                                            {!arg.required && (
                                                                <Badge variant="outline">optional</Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Examples */}
                                    {func.examples.length > 0 && (
                                        <div>
                                            <h5 className="text-xs font-medium text-muted-foreground mb-2">EXAMPLES</h5>
                                            <div className="space-y-1">
                                                {func.examples.map((example, index) => (
                                                    <code key={index} className="block text-xs bg-muted px-2 py-1 rounded">
                                                        {example}
                                                    </code>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}

                        {filteredFunctions.length === 0 && (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">No functions found matching your criteria.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}; 