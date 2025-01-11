import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, Heart, Play } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { AuthDialog } from "../auth/AuthDialog";
import Waveform from "./Waveform";
import CommentTimeline from "./CommentTimeline";

interface TrackPlayerProps {
  trackTitle?: string;
  artistName?: string;
  coverArt?: string;
  trackId?: string;
  audioUrl?: string;
  isPlaying?: boolean;
  genre?: string | null;
  onPlayingChange?: (isPlaying: boolean) => void;
  metadata?: {
    bpm?: number | null;
  };
  plays?: number;
  likes?: number;
  isLiked?: boolean;
}

export const TrackPlayer = ({
  trackTitle = "Untitled Track",
  artistName = "Unknown Artist",
  coverArt = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop",
  trackId,
  audioUrl,
  genre,
  isPlaying: externalIsPlaying = false,
  onPlayingChange,
  metadata,
  plays = 0,
  likes = 0,
  isLiked = false,
}: TrackPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentLikes, setCurrentLikes] = useState(likes);
  const [isCurrentlyLiked, setIsCurrentlyLiked] = useState(isLiked);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasStartedPlaying = useRef<boolean>(false);
  const { user } = useAuth();

  // Sync with external playing state
  useEffect(() => {
    setIsPlaying(externalIsPlaying);
  }, [externalIsPlaying]);

  // Fetch initial liked state
  useEffect(() => {
    if (!user || !trackId) {
      setIsCurrentlyLiked(false);
      return;
    }

    const fetchLikeStatus = async () => {
      const { data } = await supabase
        .from("track_likes")
        .select()
        .match({ track_id: trackId, user_id: user.id })
        .single();
      setIsCurrentlyLiked(!!data);
    };

    fetchLikeStatus();
  }, [trackId, user]);

  // Subscribe to likes changes
  useEffect(() => {
    if (!trackId) return;

    const channel = supabase
      .channel(`track_likes:${trackId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "track_likes",
          filter: `track_id=eq.${trackId}`,
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
  }, [trackId, user]);

  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
    });

    audio.addEventListener("timeupdate", () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      onPlayingChange?.(false);
      setCurrentTime(0);
      hasStartedPlaying.current = false;
    });

    // Auto-play when audio is loaded
    if (externalIsPlaying) {
      audio.play().catch(console.error);
    }

    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.play().catch((error) => {
        console.error("Error playing audio:", error);
        setIsPlaying(false);
        onPlayingChange?.(false);
      });

      // Increment play count when track starts playing
      if (!hasStartedPlaying.current && trackId) {
        hasStartedPlaying.current = true;
        supabase
          .from("tracks")
          .select("plays")
          .eq("id", trackId)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              const currentPlays = data.plays || 0;
              supabase
                .from("tracks")
                .update({ plays: currentPlays + 1 })
                .eq("id", trackId)
                .then(({ error }) => {
                  if (error) console.error("Error updating play count:", error);
                });
            }
          });
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const handlePlayPause = () => {
    const newIsPlaying = !isPlaying;
    setIsPlaying(newIsPlaying);
    onPlayingChange?.(newIsPlaying);
  };

  const handleSeek = (position: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = position;
    setCurrentTime(position);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    setIsMuted(value[0] === 0);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    setVolume(isMuted ? 1 : 0);
  };

  const handleLike = async () => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }

    if (!trackId) return;

    try {
      if (isCurrentlyLiked) {
        await supabase
          .from("track_likes")
          .delete()
          .match({ track_id: trackId, user_id: user.id });
      } else {
        await supabase
          .from("track_likes")
          .insert({ track_id: trackId, user_id: user.id });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t">
      <div className="max-w-[1512px] mx-auto p-4">
        <div className="flex items-center gap-4">
          <img
            src={coverArt}
            alt="Track Cover Art"
            className="w-16 h-16 rounded object-cover"
          />
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium truncate">{trackTitle}</h2>
                <div className="flex items-center gap-2">
                  {genre && (
                    <Badge
                      variant="default"
                      className="text-xs bg-orange-500 hover:bg-orange-600"
                    >
                      {genre}
                    </Badge>
                  )}
                  {metadata?.bpm && (
                    <Badge variant="outline" className="text-xs">
                      {metadata.bpm} BPM
                    </Badge>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {artistName}
              </p>
            </div>
            <div className="space-y-1">
              <Waveform
                audioUrl={audioUrl}
                isPlaying={isPlaying}
                onPlayPause={handlePlayPause}
                onSeek={handleSeek}
                currentTime={currentTime}
                duration={duration}
                minimal
              />
              <CommentTimeline
                trackId={trackId}
                currentTime={currentTime}
                duration={duration}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Play className="h-4 w-4" />
                <span>{plays}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className={`flex items-center gap-1 ${isCurrentlyLiked ? "text-orange-500" : "text-muted-foreground"}`}
                onClick={handleLike}
              >
                <Heart
                  className={`h-4 w-4 ${isCurrentlyLiked ? "fill-current" : ""}`}
                />
                <span>{currentLikes}</span>
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="text-muted-foreground hover:text-foreground"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <div className="w-20">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </div>
  );
};

export default TrackPlayer;
