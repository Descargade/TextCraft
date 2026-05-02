import { useState, useRef, useEffect } from "react";
import {
  Moon,
  Sun,
  Wand2,
  AlignLeft,
  Sparkles,
  Copy,
  Check,
  Clock,
  ChevronRight,
  X,
  ArrowRight,
  Loader2,
  AlertCircle,
  History,
} from "lucide-react";
import { useThemeContext } from "@/components/theme-provider";
import { useHistory, HistoryEntry } from "@/hooks/use-history";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImproveTextBodyMode } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const MODES: { value: ImproveTextBodyMode; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: "professional",
    label: "Profesional",
    description: "Tono formal y corporativo",
    icon: <Wand2 className="w-4 h-4" />,
  },
  {
    value: "summarize",
    label: "Resumir",
    description: "Versión corta con ideas clave",
    icon: <AlignLeft className="w-4 h-4" />,
  },
  {
    value: "simplify",
    label: "Simplificar",
    description: "Más claro y fácil de entender",
    icon: <Sparkles className="w-4 h-4" />,
  },
];

const MODE_LABELS: Record<ImproveTextBodyMode, string> = {
  professional: "Profesional",
  summarize: "Resumido",
  simplify: "Simplificado",
};

export default function Home() {
  const { theme, setTheme } = useThemeContext();
  const { history, addEntry } = useHistory();

  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [errorText, setErrorText] = useState("");
  const [mode, setMode] = useState<ImproveTextBodyMode>("professional");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current && isProcessing) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputText, isProcessing]);

  const handleProcess = async () => {
    if (!inputText.trim() || isProcessing) return;

    setIsProcessing(true);
    setOutputText("");
    setErrorText("");
    let finalResult = "";

    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/improve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText, mode }),
      });

      if (!response.ok) {
        throw new Error("Error al conectar con el servidor");
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.content) {
                finalResult += payload.content;
                setOutputText(finalResult);
              }
              if (payload.error) {
                throw new Error("Error al procesar el texto con la IA");
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }

      if (finalResult.trim()) {
        addEntry({ inputText, outputText: finalResult, mode });
      }
    } catch (error) {
      setErrorText(
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado. Inténtalo de nuevo."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const loadHistoryEntry = (entry: HistoryEntry) => {
    setInputText(entry.inputText);
    setOutputText(entry.outputText);
    setErrorText("");
    setMode(entry.mode);
    setSidebarOpen(false);
  };

  const hasOutput = outputText || isProcessing || errorText;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:relative inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-card transition-transform duration-300 ease-in-out",
          "w-72 md:w-72",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          "md:flex-shrink-0"
        )}
      >
        <div className="h-14 border-b border-border flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
            <History className="w-4 h-4 text-muted-foreground" />
            <span>Historial</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setSidebarOpen(false)}
            data-testid="button-close-sidebar"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 px-4 text-muted-foreground">
              <div className="bg-muted w-12 h-12 rounded-full flex items-center justify-center mb-3">
                <Clock className="w-5 h-5 opacity-40" />
              </div>
              <p className="text-sm font-medium mb-1">Sin historial aún</p>
              <p className="text-xs opacity-70">
                Tus textos procesados aparecerán aquí
              </p>
            </div>
          ) : (
            history.map((entry, i) => (
              <button
                key={entry.id}
                className={cn(
                  "w-full text-left group relative p-3 rounded-lg border border-transparent",
                  "hover:border-border hover:bg-muted/50 cursor-pointer transition-all duration-150",
                  "animate-in fade-in slide-in-from-left-3"
                )}
                style={{ animationDelay: `${i * 40}ms` }}
                onClick={() => loadHistoryEntry(entry)}
                data-testid={`card-history-${entry.id}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-primary">
                    {MODE_LABELS[entry.mode]}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed">
                  {entry.inputText}
                </p>
                <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 flex-shrink-0 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarOpen(true)}
              data-testid="button-open-sidebar"
              title="Ver historial"
            >
              <History className="w-4 h-4" />
              {history.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
              )}
            </Button>
            <div className="flex items-center gap-2">
              <div className="bg-primary/15 p-1.5 rounded-lg">
                <Wand2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold text-foreground text-sm leading-tight">
                  TextCraft
                </h1>
                <p className="text-[10px] text-muted-foreground hidden sm:block leading-tight">
                  Mejora tu escritura con IA
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full text-muted-foreground hover:text-foreground h-8 w-8"
            data-testid="button-toggle-theme"
            title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>
        </header>

        {/* Workspace */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-6 md:space-y-8">

            {/* Hero hint */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight">
                Mejora tu texto con IA
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Pega tu texto, elige un modo y obtén una versión mejorada al instante.
              </p>
            </div>

            {/* Input section */}
            <section className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Texto de entrada
              </label>
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Pega o escribe tu texto aquí..."
                className="min-h-[200px] md:min-h-[240px] resize-y text-sm md:text-base leading-relaxed p-4 md:p-5 focus-visible:ring-primary bg-card border-border"
                data-testid="input-text"
              />
              <p className="text-xs text-muted-foreground text-right">
                {inputText.length > 0 && `${inputText.trim().split(/\s+/).length} palabras · ${inputText.length} caracteres`}
              </p>
            </section>

            {/* Mode selection + action */}
            <section className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Modo de mejora
              </label>

              {/* Mode buttons — stacked on mobile, row on desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {MODES.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMode(m.value)}
                    data-testid={`button-mode-${m.value}`}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200",
                      "hover:shadow-sm active:scale-[0.98]",
                      mode === m.value
                        ? "border-primary bg-primary/10 text-foreground shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-muted/40"
                    )}
                  >
                    <span
                      className={cn(
                        "flex-shrink-0 p-1.5 rounded-lg transition-colors",
                        mode === m.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {m.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold leading-tight text-foreground">
                        {m.label}
                      </div>
                      <div className="text-xs text-muted-foreground leading-tight mt-0.5 hidden sm:block">
                        {m.description}
                      </div>
                    </div>
                    {mode === m.value && (
                      <Check className="w-4 h-4 text-primary ml-auto flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <Button
                onClick={handleProcess}
                disabled={isProcessing || !inputText.trim()}
                className="w-full h-11 text-sm font-semibold shadow-sm mt-1"
                data-testid="button-process"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Procesando texto...
                  </>
                ) : (
                  <>
                    Procesar texto
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </section>

            {/* Output section */}
            {hasOutput && (
              <section className="space-y-3 animate-in fade-in slide-in-from-bottom-6 duration-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Resultado
                    </label>
                    {isProcessing && (
                      <span className="flex items-center gap-1.5 text-xs text-primary">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        Generando...
                      </span>
                    )}
                  </div>

                  {outputText && !isProcessing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyToClipboard}
                      className={cn(
                        "h-8 gap-1.5 text-xs transition-all duration-200",
                        isCopied && "border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10"
                      )}
                      data-testid="button-copy"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          ¡Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copiar
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Error state */}
                {errorText && (
                  <div className="flex items-start gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive dark:text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">{errorText}</p>
                  </div>
                )}

                {/* Result panel */}
                {(outputText || isProcessing) && (
                  <div
                    ref={outputRef}
                    className={cn(
                      "min-h-[160px] max-h-[480px] overflow-y-auto rounded-xl border border-border bg-card p-5 md:p-6",
                      "text-sm md:text-base leading-relaxed text-foreground whitespace-pre-wrap",
                      "shadow-sm transition-all duration-300"
                    )}
                    data-testid="output-text"
                  >
                    {outputText ? (
                      outputText
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="inline-block w-0.5 h-5 bg-primary animate-pulse rounded-full" />
                      </div>
                    )}
                  </div>
                )}

                {outputText && !isProcessing && (
                  <p className="text-xs text-muted-foreground text-right">
                    {outputText.trim().split(/\s+/).length} palabras · {outputText.length} caracteres
                  </p>
                )}
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
