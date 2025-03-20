import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Upload, LogOut, User } from "lucide-react";
import { UploadDialog } from "./upload/UploadDialog";
import { AuthDialog } from "./auth/AuthDialog";
import { useSearch } from "@/lib/SearchContext";
import { useAuth } from "@/lib/AuthContext";
import { ThemeToggle } from "./ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Header = () => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const { searchQuery, setSearchQuery } = useSearch();
  const { user, signOut } = useAuth();

  const handleUploadClick = () => {
    if (!user) {
      setAuthDialogOpen(true);
    } else {
      setUploadDialogOpen(true);
    }
  };

  return (
    <header className="w-full border-b px-6 py-4 bg-background">
      <div className="max-w-[1512px] mx-auto flex items-center justify-between gap-6">
        <div className="flex items-center">
          <img
            src="/sondica-logo-160px-transparent.png"
            alt="Sondica Music"
            className="h-8"
          />
        </div>

        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />

          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleUploadClick}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Track
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {user.email?.[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" onClick={() => setAuthDialogOpen(true)}>
              <User className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          )}
        </div>

        <UploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
        />
        <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
      </div>
    </header>
  );
};

export default Header;
