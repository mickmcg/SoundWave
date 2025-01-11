import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import Waveform from "./Waveform";

interface TrackPlayerProps {
  trackTitle?: string;
  artistName?: string;
  coverArt?: string;
  trackId?: string;
  audioUrl?: string;
  isPlaying?: boolean;
  onPlayingChange?: (isPlaying: boolean) => void;
}

const TrackPlayer = ({
  trackTitle = "Untitled Track",
  artistName = "Unknown Artist",
  coverArt = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop",
  trackId,
  audioUrl,
  isPlaying: externalIsPlaying = false,
  onPlayingChange,
}: TrackPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasStartedPlaying = useRef(false);

  // Sync with external playing state
  useEffect(() => {
    setIsPlaying(externalIsPlaying);
  }, [externalIsPlaying]);

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

  return (
    <div className="flex items-center gap-4 p-4 h-24">
      <img
        src={coverArt}
        alt="Track Cover Art"
        className="w-16 h-16 rounded object-cover"
      />
      <div className="flex-1 min-w-0">
        <div className="mb-2">
          <h2 className="text-sm font-medium truncate">{trackTitle}</h2>
          <p className="text-xs text-muted-foreground truncate">{artistName}</p>
        </div>
        <div className="flex-1">
          <Waveform
            audioUrl={audioUrl}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            currentTime={currentTime}
            duration={duration}
            minimal
          />
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
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
  );
};

export default TrackPlayer;
