import { useState, useRef, useEffect } from "react";
import { Moon, Sun, Wand2, AlignLeft, Sparkles, Copy, Check, Clock, ChevronRight, X, ArrowLeftRight } from "lucide-react";
import { useThemeContext } from "@/components/theme-provider";
import { useHistory, HistoryEntry } from "@/hooks/use-history";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ImproveTextBodyMode } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const { theme, setTheme } = useThemeContext();
  const { history, addEntry } = useHistory();
  
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [mode, setMode] = useState<ImproveTextBodyMode>("professional");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputText]);

  const handleProcess = async () => {
    if (!inputText.trim() || isProcessing) return;

    setIsProcessing(true);
    setOutputText("");
    let finalResult = "";

    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/improve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText, mode }),
      });

      if (!response.ok) {
        throw new Error("Failed to process text");
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.content) {
                finalResult += payload.content;
                setOutputText(finalResult);
              }
              if (payload.done || payload.error) break;
            } catch (e) {
              console.error("Error parsing SSE JSON", e);
            }
          }
        }
      }

      if (finalResult.trim()) {
        addEntry({
          inputText,
          outputText: finalResult,
          mode,
        });
      }
    } catch (error) {
      console.error(error);
      setOutputText("An error occurred while processing the text.");
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };

  const loadHistoryEntry = (entry: HistoryEntry) => {
    setInputText(entry.inputText);
    setOutputText(entry.outputText);
    setMode(entry.mode);
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Sidebar */}
      <div 
        className={cn(
          "flex-shrink-0 border-r border-border bg-card/50 transition-all duration-300 ease-in-out flex flex-col relative",
          sidebarOpen ? "w-80" : "w-0 opacity-0"
        )}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>History</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setSidebarOpen(false)} data-testid="button-close-sidebar">
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-10 px-4 text-muted-foreground">
              <div className="bg-muted w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-5 h-5 opacity-50" />
              </div>
              <p className="text-sm">Your past edits will appear here.</p>
            </div>
          ) : (
            history.map((entry, i) => (
              <div 
                key={entry.id} 
                className="group relative p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 cursor-pointer transition-colors animate-in fade-in slide-in-from-left-4"
                style={{ animationDelay: `${i * 50}ms` }}
                onClick={() => loadHistoryEntry(entry)}
                data-testid={`card-history-${entry.id}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-primary">
                    {entry.mode}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
                  {entry.inputText}
                </p>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background shadow-sm rounded p-1">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setSidebarOpen(true)} data-testid="button-open-sidebar">
                    <Clock className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View history</TooltipContent>
              </Tooltip>
            )}
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-1.5 rounded-md">
                <Wand2 className="w-4 h-4 text-primary" />
              </div>
              <h1 className="font-semibold text-foreground">TextCraft</h1>
            </div>
          </div>
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full text-muted-foreground hover:text-foreground"
              data-testid="button-toggle-theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </header>

        {/* Workspace */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Input Section */}
            <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-foreground">Input Text</h2>
              </div>
              
              <Textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste your text here..."
                className="min-h-[240px] resize-y bg-card border-border text-base leading-relaxed p-5 focus-visible:ring-primary"
                data-testid="input-text"
              />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/30 p-2 rounded-lg border border-border">
                <div className="flex items-center gap-2 w-full sm:w-auto p-1">
                  <ModeButton 
                    active={mode === "professional"} 
                    onClick={() => setMode("professional")}
                    icon={<Wand2 className="w-4 h-4" />}
                    label="Professional"
                  />
                  <ModeButton 
                    active={mode === "summarize"} 
                    onClick={() => setMode("summarize")}
                    icon={<AlignLeft className="w-4 h-4" />}
                    label="Summarize"
                  />
                  <ModeButton 
                    active={mode === "simplify"} 
                    onClick={() => setMode("simplify")}
                    icon={<Sparkles className="w-4 h-4" />}
                    label="Simplify"
                  />
                </div>
                
                <Button 
                  onClick={handleProcess} 
                  disabled={isProcessing || !inputText.trim()}
                  className="w-full sm:w-auto min-w-[140px] h-10 shadow-sm"
                  data-testid="button-process"
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      <span>Improving...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>Process Text</span>
                      <ArrowLeftRight className="w-4 h-4" />
                    </div>
                  )}
                </Button>
              </div>
            </section>

            {/* Output Section */}
            <section className={cn(
              "space-y-4 transition-all duration-700",
              (outputText || isProcessing) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"
            )}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <span>Result</span>
                  {isProcessing && <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />}
                </h2>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={copyToClipboard}
                  disabled={!outputText}
                  className="h-8 gap-2 text-xs"
                  data-testid="button-copy"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopied ? "Copied!" : "Copy"}
                </Button>
              </div>
              
              <div 
                ref={outputRef}
                className="min-h-[240px] max-h-[500px] overflow-y-auto bg-card border border-border rounded-lg p-6 font-sans text-base leading-relaxed text-foreground shadow-sm whitespace-pre-wrap"
                data-testid="output-text"
              >
                {outputText ? (
                  <span className="animate-in fade-in">{outputText}</span>
                ) : (
                  <span className="text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-primary animate-pulse" />
                  </span>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function ModeButton({ 
  active, 
  onClick, 
  icon, 
  label 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string 
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 relative",
        active 
          ? "text-primary-foreground bg-primary shadow-sm" 
          : "text-muted-foreground hover:text-foreground hover:bg-card"
      )}
      data-testid={`button-mode-${label.toLowerCase()}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
