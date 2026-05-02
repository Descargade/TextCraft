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

  // Close sidebar on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && sidebarOpen) setSidebarOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sidebarOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (appState === "idle" && e.target.value.length > 0) setAppState("writing");
    else if (e.target.value.length === 0) setAppState("idle");
  };

  const handleNewText = useCallback(() => {
    setInputText("");
    setOutputText("");
    setErrorText("");
    setAppState("idle");
    setIsCopied(false);
    setTimeout(() => textareaRef.current?.focus(), 60);
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

      if (!response.ok) throw new Error("Error al conectar con el servidor");

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
              if (payload.error) throw new Error("Error al procesar el texto con la IA");
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
        error instanceof Error ? error.message : "Ocurrió un error inesperado."
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
    } catch {}
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
    <div className="relative flex h-screen w-full bg-background overflow-hidden font-sans">

      {/* ── Sidebar drawer (overlay on all screen sizes) ── */}
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={() => setSidebarOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Drawer panel */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-80 bg-card border-r border-border shadow-2xl",
          "transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-border flex-shrink-0 bg-card">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <History className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Historial</p>
              <p className="text-[10px] text-muted-foreground">
                {history.length === 0 ? "Sin entradas" : `${history.length} ${history.length === 1 ? "entrada" : "entradas"}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar historial"
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full",
              "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground",
              "transition-all duration-150 active:scale-95"
            )}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-5 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 opacity-35" />
              </div>
              <p className="text-sm font-semibold mb-1.5">Aún no hay textos</p>
              <p className="text-xs opacity-60 leading-relaxed max-w-[180px]">
                Los textos que proceses con la IA aparecerán aquí
              </p>
            </div>
          ) : (
            history.map((entry, i) => (
              <button
                key={entry.id}
                onClick={() => loadHistoryEntry(entry)}
                data-testid={`card-history-${entry.id}`}
                className={cn(
                  "w-full text-left group relative p-3.5 rounded-xl border border-transparent",
                  "hover:border-border hover:bg-muted/50 transition-all duration-150",
                  "animate-in fade-in slide-in-from-left-2"
                )}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary">
                    {MODE_LABELS[entry.mode]}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-xs text-foreground/75 line-clamp-2 leading-relaxed pr-4">
                  {entry.inputText}
                </p>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 h-full">

        {/* Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 flex-shrink-0 bg-background/90 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">

            {/* History toggle button */}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Ver historial"
              className={cn(
                "relative flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-150",
                "hover:bg-muted active:scale-95",
                sidebarOpen
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-transparent border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <History className="w-4 h-4" />
              {history.length > 0 && !sidebarOpen && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary border-2 border-background" />
              )}
            </button>

            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="bg-primary/15 p-1.5 rounded-xl">
                <Wand2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-foreground text-sm leading-tight tracking-tight">
                  TextCraft
                </h1>
                <p className="text-[10px] text-muted-foreground hidden sm:block leading-tight">
                  Mejora tu escritura con IA
                </p>
              </div>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {(isDone || isError) && (
              <button
                onClick={handleNewText}
                className={cn(
                  "hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                  "border border-border bg-muted/40 text-muted-foreground",
                  "hover:bg-muted hover:text-foreground transition-all duration-150 active:scale-95"
                )}
              >
                <PenLine className="w-3.5 h-3.5" />
                Nuevo texto
              </button>
            )}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
              className={cn(
                "flex items-center justify-center w-9 h-9 rounded-xl border border-border",
                "bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground",
                "transition-all duration-150 active:scale-95"
              )}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Workspace */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8">

            {/* Hero */}
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight leading-tight">
                Mejora tu texto<br className="hidden sm:block" /> con inteligencia artificial
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mt-2.5 leading-relaxed">
                Pega tu texto, elige un modo y obtén una versión mejorada al instante.
              </p>
            </div>

            {/* Input section */}
            <section className="space-y-2.5 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-75">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Texto de entrada
                </label>
                {inputText && (
                  <button
                    onClick={handleNewText}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors duration-150"
                  >
                    <Trash2 className="w-3 h-3" />
                    Limpiar
                  </button>
                )}
              </div>

              <div
                className={cn(
                  "rounded-2xl border overflow-hidden transition-all duration-200",
                  appState === "writing"
                    ? "border-primary/50 shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]"
                    : "border-border shadow-sm",
                  isProcessing && "opacity-60 pointer-events-none"
                )}
              >
                <Textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={handleInputChange}
                  placeholder="Pega o escribe tu texto aquí..."
                  className="min-h-[200px] md:min-h-[220px] resize-y text-sm leading-relaxed p-5 border-0 shadow-none focus-visible:ring-0 bg-card rounded-t-2xl rounded-b-none"
                  data-testid="input-text"
                />
                <div className="px-5 py-2.5 border-t border-border/50 bg-muted/20 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {inputText
                      ? `${wordCount(inputText)} palabras · ${inputText.length} caracteres`
                      : "0 palabras"}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-medium transition-colors duration-200",
                      appState === "writing" ? "text-primary" : "text-muted-foreground/60"
                    )}
                  >
                    {appState === "writing"
                      ? "Escribiendo..."
                      : inputText
                      ? "Listo para procesar"
                      : ""}
                  </span>
                </div>
              </div>
            </section>

            {/* Mode + action */}
            <section className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
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
                      "flex items-center gap-3 px-4 py-4 rounded-2xl border text-left",
                      "transition-all duration-200 active:scale-[0.98]",
                      "disabled:pointer-events-none disabled:opacity-50",
                      mode === m.value
                        ? "border-primary/60 bg-primary/8 shadow-sm ring-1 ring-primary/20"
                        : "border-border bg-card hover:bg-muted/40 hover:border-border/80"
                    )}
                  >
                    <span
                      className={cn(
                        "flex-shrink-0 p-2 rounded-xl transition-all duration-200",
                        mode === m.value
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {m.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground leading-tight">
                        {m.label}
                      </p>
                      <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                        {m.description}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "w-4 h-4 flex-shrink-0 rounded-full border-2 transition-all duration-200 flex items-center justify-center",
                        mode === m.value
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {mode === m.value && (
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      )}
                    </span>
                  </button>
                ))}
              </div>

              {/* Action row */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={handleProcess}
                  disabled={isProcessing || !inputText.trim()}
                  data-testid="button-process"
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2.5 h-12 px-6 rounded-2xl",
                    "text-sm font-semibold transition-all duration-200 active:scale-[0.98]",
                    "bg-primary text-primary-foreground shadow-md hover:opacity-90",
                    "disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none"
                  )}
                >
                  {isProcessing ? (
                    <>
                      <ProcessingDots />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <span>Procesar texto</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {(isDone || isError) && (
                  <button
                    onClick={handleNewText}
                    data-testid="button-new-text"
                    className={cn(
                      "flex items-center justify-center gap-2 h-12 px-5 rounded-2xl",
                      "text-sm font-medium border border-border bg-card",
                      "hover:bg-muted transition-all duration-150 active:scale-[0.98]",
                      "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <PenLine className="w-4 h-4" />
                    Nuevo texto
                  </button>
                )}
              </div>
            </section>

            {/* Output section */}
            {showOutput && (
              <section
                className="space-y-3 animate-in fade-in slide-in-from-bottom-5 duration-500"
                data-testid="output-section"
              >
                {/* Output header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Resultado
                    </label>
                    {appState === "streaming" && (
                      <span className="flex items-center gap-1.5 text-xs text-primary font-medium animate-in fade-in">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        Generando...
                      </span>
                    )}
                    {isDone && (
                      <span className="flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400 font-semibold animate-in fade-in">
                        <Check className="w-3 h-3" />
                        Listo
                      </span>
                    )}
                  </div>

                  {outputText && isDone && (
                    <button
                      onClick={copyToClipboard}
                      data-testid="button-copy"
                      className={cn(
                        "flex items-center gap-1.5 h-8 px-3 rounded-xl border text-xs font-medium",
                        "transition-all duration-200 active:scale-95",
                        isCopied
                          ? "border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400"
                          : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
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
                    </button>
                  )}
                </div>

                {/* Error state */}
                {isError && errorText && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl border border-destructive/30 bg-destructive/8 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-destructive dark:text-red-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-destructive dark:text-red-400 mb-0.5">
                        Error al procesar
                      </p>
                      <p className="text-xs text-destructive/75 dark:text-red-400/75">
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

                {/* Skeleton loader */}
                {appState === "processing" && (
                  <div className="rounded-2xl border border-border bg-card p-6 min-h-[160px] space-y-3">
                    {[88, 73, 91, 65, 80].map((w, i) => (
                      <div
                        key={i}
                        className="h-3.5 bg-muted animate-pulse rounded-full"
                        style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }}
                      />
                    ))}
                    <p className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                      La IA está analizando tu texto...
                    </p>
                  </div>
                )}

                {/* Streaming + done text */}
                {(appState === "streaming" || isDone) && outputText && (
                  <div
                    ref={outputRef}
                    className={cn(
                      "rounded-2xl border bg-card overflow-hidden shadow-sm transition-all duration-300",
                      isDone ? "border-border" : "border-primary/30"
                    )}
                  >
                    <div
                      className="p-5 md:p-6 text-sm leading-relaxed text-foreground whitespace-pre-wrap max-h-[480px] overflow-y-auto"
                      data-testid="output-text"
                    >
                      {outputText}
                      {appState === "streaming" && (
                        <span className="inline-block w-0.5 h-[1.1em] bg-primary animate-pulse ml-0.5 align-middle" />
                      )}
                    </div>

                    {isDone && (
                      <div className="px-5 py-3 border-t border-border/50 bg-muted/20 flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {wordCount(outputText)} palabras · {outputText.length} caracteres
                        </span>
                        {wordCount(inputText) > 0 && (
                          <span
                            className={cn(
                              "text-[11px] font-medium tabular-nums",
                              wordCount(outputText) < wordCount(inputText)
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-green-600 dark:text-green-400"
                            )}
                          >
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
    <span className="flex items-center gap-1">
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
