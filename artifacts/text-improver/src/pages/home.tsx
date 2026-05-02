import { useState, useRef, useEffect, useCallback } from "react";
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
  AlertCircle,
  History,
  PenLine,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { useThemeContext } from "@/components/theme-provider";
import { useHistory, HistoryEntry } from "@/hooks/use-history";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImproveTextBodyMode } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

type AppState = "idle" | "writing" | "processing" | "streaming" | "done" | "error";

const MODES: {
  value: ImproveTextBodyMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
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

function wordCount(text: string) {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

export default function Home() {
  const { theme, setTheme } = useThemeContext();
  const { history, addEntry } = useHistory();

  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [errorText, setErrorText] = useState("");
  const [mode, setMode] = useState<ImproveTextBodyMode>("professional");
  const [appState, setAppState] = useState<AppState>("idle");
  const [isCopied, setIsCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const isProcessing = appState === "processing" || appState === "streaming";
  const isDone = appState === "done";
  const isError = appState === "error";

  useEffect(() => {
    if (outputRef.current && appState === "streaming") {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputText, appState]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (appState === "idle" && e.target.value.length > 0) {
      setAppState("writing");
    } else if (e.target.value.length === 0) {
      setAppState("idle");
    }
  };

  const handleNewText = useCallback(() => {
    setInputText("");
    setOutputText("");
    setErrorText("");
    setAppState("idle");
    setIsCopied(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  const handleProcess = async () => {
    if (!inputText.trim() || isProcessing) return;

    setAppState("processing");
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

      setAppState("streaming");

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
        setAppState("done");
      } else {
        setAppState("idle");
      }
    } catch (error) {
      setErrorText(
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado. Inténtalo de nuevo."
      );
      setAppState("error");
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
    setAppState("done");
    setIsCopied(false);
    setSidebarOpen(false);
  };

  const showOutput = isProcessing || isDone || isError;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:relative inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-card",
          "w-72 transition-transform duration-300 ease-in-out md:flex-shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="h-14 border-b border-border flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
            <History className="w-4 h-4 text-muted-foreground" />
            Historial
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-14 px-4 text-muted-foreground">
              <div className="bg-muted w-12 h-12 rounded-full flex items-center justify-center mb-3">
                <Clock className="w-5 h-5 opacity-40" />
              </div>
              <p className="text-sm font-medium mb-1">Sin historial aún</p>
              <p className="text-xs opacity-60 leading-relaxed">
                Los textos que proceses<br />aparecerán aquí
              </p>
            </div>
          ) : (
            history.map((entry, i) => (
              <button
                key={entry.id}
                className={cn(
                  "w-full text-left group relative p-3 rounded-xl border border-transparent",
                  "hover:border-border hover:bg-muted/40 transition-all duration-150",
                  "animate-in fade-in slide-in-from-left-3"
                )}
                style={{ animationDelay: `${i * 35}ms` }}
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
                <p className="text-xs text-foreground/75 line-clamp-2 leading-relaxed">
                  {entry.inputText}
                </p>
                <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 flex-shrink-0 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarOpen(true)}
              title="Ver historial"
            >
              <History className="w-4 h-4" />
              {history.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Button>
            <div className="flex items-center gap-2.5">
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

          <div className="flex items-center gap-1">
            {(isDone || isError) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewText}
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground hidden sm:flex"
              >
                <PenLine className="w-3.5 h-3.5" />
                Nuevo texto
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full text-muted-foreground hover:text-foreground h-8 w-8"
              title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
          </div>
        </header>

        {/* Workspace */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8 md:space-y-10">

            {/* Hero */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                Mejora tu texto con IA
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mt-2 leading-relaxed">
                Pega tu texto, elige un modo y obtén una versión mejorada en segundos.
              </p>
            </div>

            {/* Input card */}
            <section className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Texto de entrada
                </label>
                {inputText && (
                  <button
                    onClick={handleNewText}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                    title="Limpiar texto"
                  >
                    <Trash2 className="w-3 h-3" />
                    Limpiar
                  </button>
                )}
              </div>

              <div
                className={cn(
                  "rounded-2xl border transition-all duration-200 overflow-hidden",
                  appState === "writing"
                    ? "border-primary/60 shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]"
                    : "border-border shadow-sm hover:border-border/80",
                  isProcessing && "opacity-60 pointer-events-none"
                )}
              >
                <Textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={handleInputChange}
                  placeholder="Pega o escribe tu texto aquí..."
                  className="min-h-[200px] md:min-h-[220px] resize-y text-sm md:text-base leading-relaxed p-4 md:p-5 border-0 focus-visible:ring-0 bg-card rounded-2xl"
                  data-testid="input-text"
                />
                {inputText && (
                  <div className="px-5 py-2 border-t border-border/50 bg-muted/30 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      {wordCount(inputText)} palabras · {inputText.length} caracteres
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-medium transition-colors",
                        appState === "writing"
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                    >
                      {appState === "writing" ? "Escribiendo..." : "Listo para procesar"}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* Mode selection */}
            <section className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Modo de mejora
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {MODES.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMode(m.value)}
                    disabled={isProcessing}
                    data-testid={`button-mode-${m.value}`}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all duration-200",
                      "hover:shadow-md active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
                      mode === m.value
                        ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                        : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                  >
                    <span
                      className={cn(
                        "flex-shrink-0 p-2 rounded-lg transition-all duration-200",
                        mode === m.value
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {m.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold leading-tight text-foreground">
                        {m.label}
                      </div>
                      <div className="text-xs text-muted-foreground leading-snug mt-0.5">
                        {m.description}
                      </div>
                    </div>
                    {mode === m.value && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 mt-1">
                <Button
                  onClick={handleProcess}
                  disabled={isProcessing || !inputText.trim()}
                  className="flex-1 h-12 text-sm font-semibold shadow-sm"
                  data-testid="button-process"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <ProcessingDots />
                      Procesando tu texto...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Procesar texto
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>

                {(isDone || isError) && (
                  <Button
                    variant="outline"
                    onClick={handleNewText}
                    className="sm:w-auto h-12 gap-2 text-sm sm:flex-none"
                    data-testid="button-new-text"
                  >
                    <PenLine className="w-4 h-4" />
                    Nuevo texto
                  </Button>
                )}
              </div>
            </section>

            {/* Output section */}
            {showOutput && (
              <section
                className="space-y-3 animate-in fade-in slide-in-from-bottom-6 duration-500"
                data-testid="output-section"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Resultado
                    </label>
                    {appState === "streaming" && (
                      <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        Generando...
                      </span>
                    )}
                    {isDone && (
                      <span className="flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400 font-medium animate-in fade-in">
                        <Check className="w-3 h-3" />
                        Listo
                      </span>
                    )}
                  </div>

                  {outputText && isDone && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyToClipboard}
                      className={cn(
                        "h-8 gap-1.5 text-xs transition-all duration-300",
                        isCopied &&
                          "border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10"
                      )}
                      data-testid="button-copy"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Texto copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copiar resultado
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Error */}
                {isError && errorText && (
                  <div className="flex items-start gap-3 p-4 rounded-xl border border-destructive/40 bg-destructive/8 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-destructive dark:text-red-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-destructive dark:text-red-400 font-medium mb-1">
                        Error al procesar
                      </p>
                      <p className="text-xs text-destructive/80 dark:text-red-400/80">
                        {errorText}
                      </p>
                    </div>
                    <button
                      onClick={handleProcess}
                      className="flex-shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reintentar
                    </button>
                  </div>
                )}

                {/* Processing skeleton */}
                {appState === "processing" && (
                  <div className="rounded-2xl border border-border bg-card p-5 md:p-6 min-h-[160px] flex flex-col justify-center gap-3">
                    <div className="space-y-2.5">
                      {[85, 72, 90, 60, 78].map((w, i) => (
                        <div
                          key={i}
                          className="h-3.5 bg-muted animate-pulse rounded-full"
                          style={{
                            width: `${w}%`,
                            animationDelay: `${i * 100}ms`,
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                      La IA está analizando tu texto...
                    </p>
                  </div>
                )}

                {/* Result text */}
                {(appState === "streaming" || isDone) && outputText && (
                  <div
                    ref={outputRef}
                    className={cn(
                      "rounded-2xl border bg-card overflow-hidden shadow-sm",
                      isDone ? "border-border" : "border-primary/30"
                    )}
                  >
                    <div
                      className="p-5 md:p-6 text-sm md:text-base leading-relaxed text-foreground whitespace-pre-wrap max-h-[480px] overflow-y-auto"
                      data-testid="output-text"
                    >
                      {outputText}
                      {appState === "streaming" && (
                        <span className="inline-block w-0.5 h-[1.1em] bg-primary animate-pulse ml-0.5 align-middle" />
                      )}
                    </div>

                    {isDone && (
                      <div className="px-5 py-2.5 border-t border-border/50 bg-muted/30 flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">
                          {wordCount(outputText)} palabras · {outputText.length} caracteres
                        </span>
                        {wordCount(inputText) > 0 && wordCount(outputText) > 0 && (
                          <span className="text-[11px] text-muted-foreground">
                            {wordCount(outputText) < wordCount(inputText)
                              ? `−${wordCount(inputText) - wordCount(outputText)} palabras`
                              : `+${wordCount(outputText) - wordCount(inputText)} palabras`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function ProcessingDots() {
  return (
    <span className="flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary-foreground/80 animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}
