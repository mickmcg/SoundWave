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
import { Heart, Play, Share2, Filter } from "lucide-react";
import { AuthDialog } from "./auth/AuthDialog";
import { useToast } from "@/components/ui/use-toast";

const Home = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [likedTracks, setLikedTracks] = useState<string[]>([]);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [showFilters, setShowFilters] = useState(false);
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

  // Refs to track current state without triggering effect reruns
  const selectedTrackRef = useRef<string | null>(null);
  const editingTrackRef = useRef<string | null>(null);

  // Update refs when state changes
  useEffect(() => {
    selectedTrackRef.current = selectedTrack?.id || null;
  }, [selectedTrack]);

  useEffect(() => {
    editingTrackRef.current = editingTrack?.id || null;
  }, [editingTrack]);

  // Add keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.code === "Space" && selectedTrack) {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isPlaying, selectedTrack]);

  // Initial tracks fetch
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
  }, []);

  // Track changes subscription
  useEffect(() => {
    console.log("Setting up realtime subscription...");
    const channel = supabase
      .channel("tracks_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tracks" },
        (payload: any) => {
          console.log("Track change received:", payload);

          if (payload.eventType === "INSERT") {
            const newTrack = payload.new as Track;
            console.log("Track inserted:", newTrack);
            setTracks((current) => [newTrack, ...current]);
            if (!selectedTrackRef.current) {
              setSelectedTrack(newTrack);
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedTrack = payload.new as Track;
            console.log("Track updated:", updatedTrack);

            // Update tracks list
            setTracks((current) => {
              const newTracks = current.map((track) =>
                track.id === updatedTrack.id ? updatedTrack : track,
              );
              console.log("Updated tracks:", newTracks);
              return newTracks;
            });

            // Update selected track if it's the one being edited
            if (selectedTrackRef.current === updatedTrack.id) {
              console.log("Updating selected track");
              setSelectedTrack(updatedTrack);
            }

            // Close edit dialog if this track was being edited
            if (editingTrackRef.current === updatedTrack.id) {
              console.log("Closing edit dialog");
              setEditingTrack(null);
            }
          } else if (payload.eventType === "DELETE") {
            const deletedTrackId = payload.old.id;
            console.log("Track deleted:", deletedTrackId);
            setTracks((current) =>
              current.filter((track) => track.id !== deletedTrackId),
            );
            if (selectedTrackRef.current === deletedTrackId) {
              setSelectedTrack(null);
            }
            if (editingTrackRef.current === deletedTrackId) {
              setEditingTrack(null);
            }
          }
        },
      )
      .subscribe();

    console.log("Subscription set up successfully");
    return () => {
      channel.unsubscribe();
    };
  }, []); // Empty dependency array since we're using refs

  // Filter tracks based on search criteria
  const filteredTracks = useMemo(() => {
    return tracks.filter((track) => {
      // Text search
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

      // BPM
      if (
        track.metadata?.bpm &&
        (track.metadata.bpm < bpmRange[0] || track.metadata.bpm > bpmRange[1])
      ) {
        return false;
      }

      // Date range
      if (dateRange[0] || dateRange[1]) {
        const trackDate = new Date(track.created_at);
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
    setSelectedTrack(track);
    setIsPlaying(true);
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
        setLikedTracks(likedTracks.filter((id) => id !== track.id));
      } else {
        await supabase
          .from("track_likes")
          .insert({ track_id: track.id, user_id: user.id });
        setLikedTracks([...likedTracks, track.id]);
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
      description: "Track link copied to clipboard",
    });
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
        <div className="max-w-[1512px] mx-auto">
          <div className="mb-4 md:hidden">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full"
            >
              <Filter className="mr-2 h-4 w-4" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
          <div className="grid md:grid-cols-[250px,1fr] gap-6">
            <div className={`${!showFilters ? "hidden" : ""} md:block`}>
              <SearchFilters />
            </div>
            <div className="space-y-4">{renderContent()}</div>
          </div>
        </div>
      </div>

      {selectedTrack && (
        <div className="border-t bg-card">
          <div className="max-w-[1512px] mx-auto">
            <TrackPlayer
              trackTitle={selectedTrack.title}
              artistName={selectedTrack.artist}
              coverArt={selectedTrack.cover_art_url || undefined}
              genre={selectedTrack.genre}
              trackId={selectedTrack.id}
              audioUrl={selectedTrack.audio_url}
              isPlaying={isPlaying}
              plays={selectedTrack.plays}
              likes={selectedTrack.likes}
              isLiked={likedTracks.includes(selectedTrack.id)}
              onPlayingChange={setIsPlaying}
              metadata={selectedTrack.metadata}
            />
          </div>
        </div>
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
