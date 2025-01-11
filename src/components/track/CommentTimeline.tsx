import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import CommentsDialog from "./CommentsDialog";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  timestamp: number;
  created_at: string;
  user_email?: string;
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
}: CommentTimelineProps = {}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});
  const [showCommentsDialog, setShowCommentsDialog] = useState(false);
  const { user } = useAuth();

  // Fetch user emails for given user IDs
  const fetchUserEmails = async (userIds: string[]) => {
    if (userIds.length === 0) return {};

    try {
      const { data, error } = await supabase.rpc("get_users_email", {
        user_ids: userIds,
      });

      if (error) throw error;

      const emailMap = (data || []).reduce(
        (acc, user) => ({ ...acc, [user.id]: user.email }),
        {} as Record<string, string>,
      );

      setUserEmails((prev) => ({ ...prev, ...emailMap }));
      return emailMap;
    } catch (error) {
      console.error("Error fetching user emails:", error);
      return {};
    }
  };

  // Update comments with user emails
  const updateCommentsWithEmails = (
    comments: Comment[],
    emailMap: Record<string, string>,
  ) => {
    return comments.map((comment) => ({
      ...comment,
      user_email:
        emailMap[comment.user_id] ||
        userEmails[comment.user_id] ||
        (comment.user_id === user?.id ? user.email : undefined),
    }));
  };

  // Fetch comments and their user emails
  useEffect(() => {
    if (!trackId) return;

    const fetchComments = async () => {
      try {
        const { data: commentsData, error: commentsError } = await supabase
          .from("comments")
          .select("*")
          .eq("track_id", trackId)
          .order("timestamp", { ascending: true });

        if (commentsError) throw commentsError;
        if (!commentsData) return;

        const missingUserIds = [
          ...new Set(
            commentsData
              .filter((c) => !userEmails[c.user_id] && c.user_id !== user?.id)
              .map((c) => c.user_id),
          ),
        ];

        let newEmailMap = {};
        if (missingUserIds.length > 0) {
          newEmailMap = await fetchUserEmails(missingUserIds);
        }

        const combinedEmailMap = { ...userEmails, ...newEmailMap };
        if (user) {
          combinedEmailMap[user.id] = user.email;
        }

        const commentsWithUsers = updateCommentsWithEmails(
          commentsData,
          combinedEmailMap,
        );
        setComments(commentsWithUsers);
      } catch (error) {
        console.error("Error fetching comments:", error);
      }
    };

    fetchComments();

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
            const newComment = payload.new;
            let email = userEmails[newComment.user_id];

            if (!email && newComment.user_id !== user?.id) {
              const newEmailMap = await fetchUserEmails([newComment.user_id]);
              email = newEmailMap[newComment.user_id];
            } else if (newComment.user_id === user?.id) {
              email = user.email;
            }

            setComments((current) => [
              ...current,
              { ...newComment, user_email: email },
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
  }, [trackId, user?.id, user?.email]);

  useEffect(() => {
    setComments((current) => updateCommentsWithEmails(current, userEmails));
  }, [userEmails]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="text-sm text-muted-foreground hover:text-foreground"
          onClick={() => setShowCommentsDialog(true)}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          {comments.length} comments
        </Button>
      </div>

      {/* Comment markers */}
      <div className="relative h-2">
        {comments.map((comment) => (
          <TooltipProvider key={comment.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="absolute top-0 w-0.5 h-2 bg-orange-500 cursor-pointer hover:bg-orange-600 transition-colors"
                  style={{
                    left: `${(comment.timestamp / duration) * 100}%`,
                  }}
                />
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="bg-orange-500 text-white text-xs">
                        {comment.user_email?.[0].toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">
                        {comment.user_email?.split("@")[0] || "Anonymous"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(comment.timestamp)}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm max-w-[200px] break-words">
                    {comment.content}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      <CommentsDialog
        open={showCommentsDialog}
        onOpenChange={setShowCommentsDialog}
        comments={comments}
        duration={duration}
        trackId={trackId}
        currentTime={currentTime}
      />
    </div>
  );
};

// Helper function to format time in MM:SS
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export default CommentTimeline;
