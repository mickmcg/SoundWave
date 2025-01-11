import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { AuthDialog } from "../auth/AuthDialog";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  timestamp: number;
  created_at: string;
  user?: {
    email: string;
  };
}

interface CommentTimelineProps {
  trackId?: string;
  currentTime?: number;
  duration?: number;
}

const CommentTimeline = ({
  trackId,
  currentTime = 0,
  duration = 180,
}: CommentTimelineProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!trackId) return;

    const fetchComments = async () => {
      const { data, error } = await supabase
        .from("comments")
        .select(`*, user:user_id(email)`)
        .eq("track_id", trackId)
        .order("timestamp", { ascending: true });

      if (!error && data) {
        setComments(data);
      }
    };

    fetchComments();

    // Subscribe to new comments
    const channel = supabase
      .channel(`comments:${trackId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `track_id=eq.${trackId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            // Fetch the user data for the new comment
            const { data: userData } = await supabase
              .from("auth.users")
              .select("email")
              .eq("id", payload.new.user_id)
              .single();

            setComments((current) => [
              ...current,
              { ...payload.new, user: userData } as Comment,
            ]);
          } else if (payload.eventType === "DELETE") {
            setComments((current) =>
              current.filter((comment) => comment.id !== payload.old.id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [trackId]);

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
      <div className="w-full bg-card p-6 rounded-lg">
        <div className="flex flex-col h-[300px]">
          <ScrollArea className="flex-1 mb-4">
            <div className="relative">
              {/* Timeline ruler */}
              <div className="absolute left-0 w-full h-1 bg-muted top-4" />

              {/* Comments */}
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="relative mb-6"
                  style={{
                    marginLeft: `${(comment.timestamp / duration) * 100}%`,
                  }}
                >
                  <div className="absolute -left-1 top-4 w-2 h-2 bg-orange-500 rounded-full" />
                  <div className="pt-8 pl-2">
                    <div className="flex items-start gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback>
                          {comment.user?.email?.[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">
                          {comment.user?.email?.split("@")[0] || "Anonymous"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatTime(comment.timestamp)}
                        </div>
                        <p className="mt-1 text-sm">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Comment input */}
          <div className="flex gap-2 items-center mt-4">
            <MessageCircle className="w-5 h-5 text-muted-foreground" />
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment at current timestamp..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitComment();
                }
              }}
            />
            <Button
              size="icon"
              onClick={handleSubmitComment}
              disabled={!newComment.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

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

export default CommentTimeline;
