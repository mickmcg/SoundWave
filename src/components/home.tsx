import React, { useEffect, useState, useMemo, useRef } from "react";
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
import { Heart, Play, Share2, Filter, Edit, ShoppingCart } from "lucide-react";
import { AuthDialog } from "./auth/AuthDialog";
import { useToast } from "@/components/ui/use-toast";

const Home = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [likedTracks, setLikedTracks] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const spacebarRef = useRef<boolean>(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    searchQuery,
    selectedArtist,
    selectedTags,
    selectedGenre,
    selectedKey,
    selectedMode,
    durationRange,
    bpmRange,
    dateRange,
    isRemix,
    isReleased,
    clearFilters,
  } = useSearch();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === "Space" && !spacebarRef.current) {
        e.preventDefault();
        spacebarRef.current = true;
        if (selectedTrack) {
          setIsPlaying(!isPlaying);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spacebarRef.current = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [selectedTrack, isPlaying]);

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
          No tracks match your search criteria.{" "}
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
                  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=50&h=50&fit=crop&auto=format"
                }
                onError={(e) => {
                  e.currentTarget.src =
                    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=50&h=50&fit=crop&auto=format";
                }}
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
                      {track.metadata?.key && (
                        <Badge variant="outline" className="text-xs">
                          {track.metadata.key}
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
                      {track.buy_link && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(track.buy_link, "_blank");
                          }}
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </Button>
                      )}
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTrack(track);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  useEffect(() => {
    const fetchTracks = async () => {
      const { data } = await supabase
        .from("tracks")
        .select("*")
        .order("created_at", { ascending: false });
      setTracks(data || []);
    };

    fetchTracks();

    // Subscribe to changes
    const channel = supabase
      .channel("tracks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tracks" },
        () => fetchTracks(),
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Fetch liked tracks
  useEffect(() => {
    if (!user) {
      setLikedTracks([]);
      return;
    }

    const fetchLikedTracks = async () => {
      const { data } = await supabase
        .from("track_likes")
        .select("track_id")
        .eq("user_id", user.id);

      setLikedTracks((data || []).map((like) => like.track_id));
    };

    fetchLikedTracks();

    // Subscribe to changes
    const channel = supabase
      .channel(`track_likes:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "track_likes",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchLikedTracks(),
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const handleTrackSelect = (track: Track) => {
    if (track.id === selectedTrack?.id) {
      // Toggle play/pause if clicking the same track
      setIsPlaying(!isPlaying);
    } else {
      // Play new track immediately when selected
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

    try {
      if (likedTracks.includes(track.id)) {
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

  const handleCopyLink = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    const url = `${window.location.origin}/?track=${track.id}`;
    navigator.clipboard.writeText(url);
    toast({
      description: "Link copied to clipboard",
    });
  };

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

      // Artist
      if (selectedArtist === "not-set") {
        if (track.artist) return false;
      } else if (selectedArtist && track.artist !== selectedArtist) {
        return false;
      }

      // Genre
      if (selectedGenre === "not-set") {
        if (track.genre) return false;
      } else if (selectedGenre && track.genre !== selectedGenre) {
        return false;
      }

      // Tags
      if (selectedTags.includes("not-set")) {
        if (track.tags && track.tags.length > 0) return false;
      } else if (
        selectedTags.length > 0 &&
        !selectedTags.every((tag) => track.tags?.includes(tag))
      ) {
        return false;
      }

      // Musical Key
      if (selectedKey === "not-set") {
        if (track.metadata?.key) return false;
      } else if (
        selectedKey &&
        (!track.metadata?.key || !track.metadata.key.startsWith(selectedKey))
      ) {
        return false;
      }

      // Musical Mode
      if (selectedMode === "not-set") {
        if (track.metadata?.key) return false;
      } else if (
        selectedMode &&
        (!track.metadata?.key || !track.metadata.key.includes(selectedMode))
      ) {
        return false;
      }

      // BPM Range
      if (
        track.metadata?.bpm &&
        (track.metadata.bpm < bpmRange[0] || track.metadata.bpm > bpmRange[1])
      ) {
        return false;
      }

      // Duration Range
      if (
        track.duration &&
        (track.duration < durationRange[0] || track.duration > durationRange[1])
      ) {
        return false;
      }

      // Remix Status
      if (isRemix !== null && track.is_remix !== isRemix) {
        return false;
      }

      // Released Status
      if (isReleased !== null && track.is_released !== isReleased) {
        return false;
      }

      // Date Range
      if (dateRange[0] || dateRange[1]) {
        const trackDate = new Date(track.created_at);
        if (
          (dateRange[0] && trackDate < dateRange[0]) ||
          (dateRange[1] && trackDate > dateRange[1])
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    tracks,
    searchQuery,
    selectedArtist,
    selectedGenre,
    selectedTags,
    selectedKey,
    selectedMode,
    bpmRange,
    durationRange,
    dateRange,
    isRemix,
    isReleased,
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="flex gap-6">
          <div className="w-64 hidden md:block">
            <SearchFilters tracks={tracks} />
          </div>

          <div className="flex-1 space-y-6">
            <div className="md:hidden">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                {showFilters ? "Hide Filters" : "Show Filters"}
              </Button>

              {showFilters && (
                <div className="mt-4">
                  <SearchFilters tracks={tracks} />
                </div>
              )}
            </div>

            {renderContent()}
          </div>
        </div>
      </main>

      {selectedTrack && (
        <TrackPlayer
          trackTitle={selectedTrack.title}
          artistName={selectedTrack.artist}
          coverArt={selectedTrack.cover_art_url}
          trackId={selectedTrack.id}
          audioUrl={selectedTrack.audio_url}
          genre={selectedTrack.genre}
          metadata={selectedTrack.metadata}
          plays={selectedTrack.plays}
          likes={selectedTrack.likes}
          isLiked={likedTracks.includes(selectedTrack.id)}
          isPlaying={isPlaying}
          onPlayingChange={setIsPlaying}
        />
      )}

      {editingTrack && (
        <EditTrackDialog
          open={!!editingTrack}
          onOpenChange={(open) => !open && setEditingTrack(null)}
          track={editingTrack}
        />
      )}

      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </div>
  );
};

export default Home;
