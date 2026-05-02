import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useThemeContext } from "@/components/theme-provider";

export default function NotFound() {
  const { theme } = useThemeContext();
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 font-sans">
      <Card className="w-full max-w-md mx-auto border-border bg-card shadow-lg animate-in fade-in zoom-in-95 duration-300">
        <CardContent className="pt-8 pb-8 text-center flex flex-col items-center">
          <div className="bg-destructive/10 p-3 rounded-full mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">404 Page Not Found</h1>
          <p className="text-sm text-muted-foreground">
            The page you are looking for does not exist.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
