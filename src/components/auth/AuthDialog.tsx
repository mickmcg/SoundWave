import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AuthMode = "signin" | "signup" | "forgot-password";

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { requiresEmailConfirmation } = await signUp(email, password);
        if (requiresEmailConfirmation) {
          setSuccess(
            "Please check your email for the confirmation link to complete your registration.",
          );
        } else {
          onOpenChange(false);
        }
      } else if (mode === "signin") {
        await signIn(email, password);
        onOpenChange(false);
      } else if (mode === "forgot-password") {
        await resetPassword(email);
        setSuccess(
          "If an account exists with this email, you will receive a password reset link.",
        );
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError("");
    setSuccess("");
    setPassword("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "signin" && "Sign In"}
            {mode === "signup" && "Create Account"}
            {mode === "forgot-password" && "Reset Password"}
          </DialogTitle>
          {mode === "signup" && (
            <DialogDescription>
              Create an account to upload and share your tracks.
            </DialogDescription>
          )}
          {mode === "forgot-password" && (
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your
              password.
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {mode !== "forgot-password" && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={loading}>
              {mode === "signin" && "Sign In"}
              {mode === "signup" && "Sign Up"}
              {mode === "forgot-password" && "Send Reset Link"}
            </Button>

            <div className="flex flex-col gap-1">
              {mode === "signin" && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => switchMode("signup")}
                    disabled={loading}
                  >
                    Don't have an account? Sign up
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => switchMode("forgot-password")}
                    disabled={loading}
                    className="text-orange-500 hover:text-orange-600"
                  >
                    Forgot your password?
                  </Button>
                </>
              )}
              {(mode === "signup" || mode === "forgot-password") && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => switchMode("signin")}
                  disabled={loading}
                >
                  Back to Sign In
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}