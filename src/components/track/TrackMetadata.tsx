import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Heart, Play, Share2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { AuthDialog } from "../auth/AuthDialog";

interface TrackMetadataProps {
  id: string;
  title?: string;
  artist?: string;
  uploadDate?: string;
  duration?: string;
  likes?: number;
  plays?: number;
  tags?: string[];
  isLiked?: boolean;
}

const TrackMetadata = ({
  id,
  title = "Untitled Track",
  artist = "Unknown Artist",
  uploadDate = "2024-01-01",
  duration = "3:00",
  likes = 0,
  plays = 0,
  tags = ["electronic", "ambient", "experimental"],
  isLiked = false,
}: TrackMetadataProps) => {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [currentLikes, setCurrentLikes] = useState(likes);
  const [isCurrentlyLiked, setIsCurrentlyLiked] = useState(isLiked);
  const { user } = useAuth();

  // Fetch initial liked state
  useEffect(() => {
    if (!user) {
      setIsCurrentlyLiked(false);
      return;
    }

    const fetchLikeStatus = async () => {
      const { data } = await supabase
        .from("track_likes")
        .select()
        .match({ track_id: id, user_id: user.id })
        .single();
      setIsCurrentlyLiked(!!data);
    };

    fetchLikeStatus();
  }, [id, user]);

  // Subscribe to likes changes
  useEffect(() => {
    const channel = supabase
      .channel(`track_likes:${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "track_likes",
          filter: `track_id=eq.${id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setCurrentLikes((prev) => prev + 1);
            if (user && payload.new.user_id === user.id) {
              setIsCurrentlyLiked(true);
            }
          } else if (payload.eventType === "DELETE") {
            setCurrentLikes((prev) => prev - 1);
            if (user && payload.old.user_id === user.id) {
              setIsCurrentlyLiked(false);
            }
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [id, user]);

  const handleLike = async () => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }

    try {
      if (isCurrentlyLiked) {
        // Unlike
        const { error } = await supabase
          .from("track_likes")
          .delete()
          .match({ track_id: id, user_id: user.id });

        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from("track_likes")
          .insert({ track_id: id, user_id: user.id });

        if (error) throw error;
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleShare = () => {
    setShowShareDialog(true);
  };

  const shareUrl = `${window.location.origin}/?track=${id}`;

  return (
    <>
      <Card className="w-[300px] p-6 bg-card text-card-foreground">
        <div className="space-y-6">
          {/* Track Info */}
          <div className="space-y-2">
            <h2 className="text-xl font-bold truncate">{title}</h2>
            <p className="text-muted-foreground">{artist}</p>
          </div>

          {/* Stats */}
          <div className="flex justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              <span>{plays}</span>
            </div>
            <div>
              <span>{duration}</span>
            </div>
            <div>
              <span>{uploadDate}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isCurrentlyLiked ? "default" : "outline"}
                    size="icon"
                    className={`flex-1 ${isCurrentlyLiked ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                    onClick={handleLike}
                  >
                    <Heart
                      className={`w-4 h-4 ${isCurrentlyLiked ? "fill-current" : ""}`}
                    />
                    <span className="ml-2">{currentLikes}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isCurrentlyLiked ? "Unlike" : "Like"} this track</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="flex-1"
                    onClick={handleShare}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Share this track</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Tag className="w-4 h-4" />
              <span>Tags</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Track</DialogTitle>
            <DialogDescription>
              Share this track with others using the link below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Share Link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={shareUrl}
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auth Dialog */}
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </>
  );
};

export default TrackMetadata;
