import React, { useEffect, useState, useMemo } from "react";
import Header from "./Header";
import TrackPlayer from "./track/TrackPlayer";
import { SearchFilters } from "./SearchFilters";
import { supabase } from "@/lib/supabase";
import { useSearch } from "@/lib/SearchContext";
import { useAuth } from "@/lib/AuthContext";
import type { Track } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditTrackDialog } from "./track/EditTrackDialog";
import { Heart, Play, Share2 } from "lucide-react";
import { AuthDialog } from "./auth/AuthDialog";
import { useToast } from "@/components/ui/use-toast";

const Home = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [likedTracks, setLikedTracks] = useState<string[]>([]);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const {
    searchQuery,
    selectedTags,
    selectedGenre,
    durationRange,
    bpmRange,
    dateRange,
    clearFilters,
  } = useSearch();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchTracks = async () => {
      const { data, error } = await supabase
        .from("tracks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching tracks:", error);
        return;
      }

      setTracks(data);
      if (data.length > 0 && !selectedTrack) {
        setSelectedTrack(data[0]);
      }
    };

    fetchTracks();

    // Subscribe to track changes
    const channel = supabase
      .channel("tracks_channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tracks" },
        (payload: any) => {
          setTracks((current) => [payload.new as Track, ...current]);
          if (!selectedTrack) {
            setSelectedTrack(payload.new as Track);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tracks" },
        (payload: any) => {
          setTracks((current) =>
            current.map((track) =>
              track.id === payload.new.id
                ? { ...track, ...payload.new }
                : track,
            ),
          );
          if (selectedTrack?.id === payload.new.id) {
            setSelectedTrack({ ...selectedTrack, ...payload.new });
          }
          if (editingTrack?.id === payload.new.id) {
            setEditingTrack({ ...editingTrack, ...payload.new });
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Fetch liked tracks for the current user
  useEffect(() => {
    const fetchLikedTracks = async () => {
      if (!user) {
        setLikedTracks([]);
        return;
      }

      const { data, error } = await supabase
        .from("track_likes")
        .select("track_id")
        .eq("user_id", user.id);

      if (!error && data) {
        setLikedTracks(data.map((like) => like.track_id));
      }
    };

    fetchLikedTracks();

    // Subscribe to changes in likes
    const channel = supabase
      .channel("likes_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "track_likes" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setLikedTracks((current) => [...current, payload.new.track_id]);
          } else if (payload.eventType === "DELETE") {
            setLikedTracks((current) =>
              current.filter((id) => id !== payload.old.track_id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  // Filter tracks
  const filteredTracks = useMemo(() => {
    return tracks.filter((track) => {
      // Search query
      if (
        searchQuery &&
        !track.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !track.artist.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Tags
      if (
        selectedTags.length > 0 &&
        !selectedTags.every((tag) => track.tags?.includes(tag))
      ) {
        return false;
      }

      // Genre
      if (selectedGenre && track.genre !== selectedGenre) {
        return false;
      }

      // Duration
      if (
        track.duration < durationRange[0] ||
        track.duration > durationRange[1]
      ) {
        return false;
      }

      // BPM Range
      if (track.metadata?.bpm) {
        if (
          track.metadata.bpm < bpmRange[0] ||
          track.metadata.bpm > bpmRange[1]
        ) {
          return false;
        }
      }

      // Date range
      if (dateRange[0] || dateRange[1]) {
        const trackDate = new Date(track.created_at || "");
        if (dateRange[0] && trackDate < dateRange[0]) return false;
        if (dateRange[1] && trackDate > dateRange[1]) return false;
      }

      return true;
    });
  }, [
    tracks,
    searchQuery,
    selectedTags,
    selectedGenre,
    durationRange,
    bpmRange,
    dateRange,
  ]);

  const handleTrackSelect = (track: Track) => {
    if (track.id === selectedTrack?.id) {
      // If clicking the same track, toggle play/pause
      setIsPlaying(!isPlaying);
    } else {
      // If clicking a different track, select it and start playing
      setSelectedTrack(track);
      setIsPlaying(true);
    }
  };

  const handleLike = async (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    if (!user) {
      setShowAuthDialog(true);
      return;
    }

    const isLiked = likedTracks.includes(track.id);
    try {
      if (isLiked) {
        await supabase
          .from("track_likes")
          .delete()
          .match({ track_id: track.id, user_id: user.id });
      } else {
        await supabase
          .from("track_likes")
          .insert({ track_id: track.id, user_id: user.id });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleCopyLink = async (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    const url = `${window.location.origin}/?track=${track.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        description: "Link copied to clipboard!",
        duration: 2000,
      });
    } catch (error) {
      console.error("Failed to copy link:", error);
      toast({
        variant: "destructive",
        description: "Failed to copy link",
        duration: 2000,
      });
    }
  };

  const renderContent = () => {
    if (tracks.length === 0) {
      return (
        <div className="text-center text-muted-foreground">
          No tracks available. Upload one to get started!
        </div>
      );
    }

    if (filteredTracks.length === 0) {
      return (
        <div className="text-center text-muted-foreground">
          No tracks match your search criteria.
          <Button
            variant="link"
            onClick={clearFilters}
            className="text-orange-500 hover:text-orange-600"
          >
            Clear filters
          </Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-2">
        {filteredTracks.map((track) => (
          <div
            key={track.id}
            className={`p-3 rounded-lg cursor-pointer transition-colors ${track.id === selectedTrack?.id ? "bg-muted" : "bg-card hover:bg-muted"}`}
            onClick={() => handleTrackSelect(track)}
          >
            <div className="flex items-center gap-4">
              <img
                src={
                  track.cover_art_url ||
                  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=50&h=50&fit=crop"
                }
                alt={track.title}
                className="w-12 h-12 rounded object-cover"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{track.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {track.artist}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {track.genre && (
                        <Badge
                          variant="default"
                          className="text-xs bg-orange-500 hover:bg-orange-600"
                        >
                          {track.genre}
                        </Badge>
                      )}
                      {track.metadata?.bpm && (
                        <Badge variant="outline" className="text-xs">
                          {track.metadata.bpm} BPM
                        </Badge>
                      )}
                      {track.tags?.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Play className="h-4 w-4" />
                        <span className="text-sm">{track.plays || 0}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`flex items-center gap-1 ${likedTracks.includes(track.id) ? "text-orange-500" : "text-muted-foreground"}`}
                        onClick={(e) => handleLike(e, track)}
                      >
                        <Heart
                          className={`h-4 w-4 ${likedTracks.includes(track.id) ? "fill-current" : ""}`}
                        />
                        <span className="text-sm">{track.likes || 0}</span>
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={(e) => handleCopyLink(e, track)}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    {user && track.user_id === user.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-orange-500 hover:text-orange-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTrack(track);
                        }}
                      >
                        Edit Track
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-[1512px] mx-auto grid grid-cols-[250px,1fr] gap-6">
          <SearchFilters />
          <div className="space-y-4">{renderContent()}</div>
        </div>
      </div>

      {/* Fixed Player at Bottom - Always show if there's a selected track */}
      {selectedTrack && (
        <div className="border-t bg-card">
          <div className="max-w-[1512px] mx-auto">
            <TrackPlayer
              trackTitle={selectedTrack.title}
              artistName={selectedTrack.artist}
              coverArt={selectedTrack.cover_art_url || undefined}
              trackId={selectedTrack.id}
              audioUrl={selectedTrack.audio_url}
              isPlaying={isPlaying}
              plays={selectedTrack.plays}
              likes={selectedTrack.likes}
              isLiked={likedTracks.includes(selectedTrack.id)}
              onPlayingChange={setIsPlaying}
            />
          </div>
        </div>
      )}

      {/* Edit Track Dialog */}
      {editingTrack && (
        <EditTrackDialog
          open={!!editingTrack}
          onOpenChange={(open) => !open && setEditingTrack(null)}
          track={editingTrack}
        />
      )}

      {/* Auth Dialog */}
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </div>
  );
};

export default Home;
