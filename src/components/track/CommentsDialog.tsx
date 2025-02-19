import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { AuthDialog } from "../auth/AuthDialog";
import { supabase } from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  timestamp: number;
  created_at: string;
  user_email?: string;
}

interface CommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comments: Comment[];
  duration: number;
  trackId?: string;
  currentTime?: number;
}

const CommentsDialog = ({
  open,
  onOpenChange,
  comments,
  duration,
  trackId,
  currentTime = 0,
}: CommentsDialogProps) => {
  const [sortBy, setSortBy] = React.useState("track-time");
  const [newComment, setNewComment] = useState("");
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const { user } = useAuth();

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === "newest") {
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sortBy === "oldest") {
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    } else {
      // Track time
      return a.timestamp - b.timestamp;
    }
  });

  const handleSubmitComment = async () => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }

    if (!trackId || !newComment.trim()) return;

    try {
      const { error } = await supabase.from("comments").insert({
        track_id: trackId,
        user_id: user.id,
        content: newComment.trim(),
        timestamp: currentTime,
      });

      if (error) throw error;
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center justify-between w-full mr-8">
              <div>
                <DialogTitle className="text-base">
                  {comments.length} comments
                </DialogTitle>
                <DialogDescription>
                  View and manage track comments
                </DialogDescription>
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] text-xs">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="track-time">Track Time</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DialogHeader>

          {/* Add comment form */}
          <div className="flex gap-3 pb-4">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-orange-500 text-white">
                {user?.email?.[0].toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitComment();
                  }
                }}
              />
              <Button
                size="default"
                onClick={handleSubmitComment}
                disabled={!newComment.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {sortedComments.map((comment) => (
                <div key={comment.id} className="flex gap-3 group">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-orange-500 text-white">
                      {comment.user_email?.[0].toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-sm">
                          {comment.user_email?.split("@")[0] || "Anonymous"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          at {formatTime(comment.timestamp)}
                        </span>
                      </div>
                      {user && comment.user_id === user.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </>
  );
};

// Helper function to format time in MM:SS
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export default CommentsDialog;
