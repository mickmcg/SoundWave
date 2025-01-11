import React, { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface WaveformProps {
  audioUrl?: string;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onSeek?: (position: number) => void;
  currentTime?: number;
  duration?: number;
  minimal?: boolean;
}

const Waveform = ({
  audioUrl,
  isPlaying = false,
  onPlayPause = () => {},
  onSeek = () => {},
  currentTime = 0,
  duration = 180,
  minimal = false,
}: WaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext>();
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const loadAudio = async () => {
      if (!audioUrl) {
        setWaveformData(Array(200).fill(0.1)); // Default empty waveform
        return;
      }

      try {
        // Create AudioContext on user interaction
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext ||
            (window as any).webkitAudioContext)();
        }

        const response = await fetch(audioUrl);
        if (!response.ok) throw new Error("Failed to load audio file");

        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer =
          await audioContextRef.current.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0);

        // Process audio data with more segments
        const samples = 200; // Increased number of segments
        const blockSize = Math.floor(channelData.length / samples);
        const dataPoints: number[] = [];

        for (let i = 0; i < samples; i++) {
          const blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[blockStart + j]);
          }
          dataPoints.push(sum / blockSize);
        }

        // Normalize
        const maxAmplitude = Math.max(...dataPoints);
        const normalizedData = dataPoints.map((point) => point / maxAmplitude);
        setWaveformData(normalizedData);
        setError("");
      } catch (err) {
        console.error("Error loading audio:", err);
        setWaveformData(Array(200).fill(0.1));
        setError("Unable to load audio waveform");
      }
    };

    loadAudio();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current?.state !== "closed" &&
          audioContextRef.current.close();
      }
    };
  }, [audioUrl]);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData.length) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);

    const barWidth = rect.width / waveformData.length;
    const barGap = 0.5; // Add small gap between bars
    const centerY = rect.height / 2;
    const progress = currentTime / duration;

    waveformData.forEach((amplitude, index) => {
      const x = index * barWidth;
      const height = amplitude * (rect.height * 0.8);
      const position = index / waveformData.length;

      // Create gradient effect near the progress point
      let color;
      const transitionWidth = 0.02; // Width of the gradient effect

      if (position < progress) {
        // Played section
        color = "#FF5500";
      } else if (position < progress + transitionWidth) {
        // Gradient transition
        const fade = 1 - (position - progress) / transitionWidth;
        const rgb = Math.round(255 * (1 - fade));
        color = `rgb(${255}, ${Math.round(85 * fade)}, ${Math.round(0 * fade)})`;
      } else {
        // Unplayed section
        color = "var(--muted)";
      }

      ctx.beginPath();
      ctx.roundRect(
        x + barGap / 2,
        centerY - height / 2,
        barWidth - barGap,
        height,
        2,
      );
      ctx.fillStyle = color;
      ctx.fill();
    });
  }, [waveformData, currentTime, duration]);

  const handleWaveformClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = (x / rect.width) * duration;
    if (!isPlaying) {
      onPlayPause();
    }
    onSeek(position);
  };

  if (minimal) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPlayPause}
          className="h-8 w-8"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        <div className="flex-1 relative">
          <canvas
            ref={canvasRef}
            className="w-full h-8 cursor-pointer"
            onClick={handleWaveformClick}
          />
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              {error}
            </div>
          )}
        </div>
        <div className="text-xs text-muted-foreground min-w-[70px] text-right">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-card p-6 rounded-lg">
      <div className="relative w-full">
        <canvas
          ref={canvasRef}
          className="w-full h-[200px] bg-muted rounded-lg cursor-pointer"
          onClick={handleWaveformClick}
        />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            {error}
          </div>
        )}

        <div className="mt-4 flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={onPlayPause}
            className="h-10 w-10"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <div className="flex-1">
            <Slider
              value={[currentTime]}
              max={duration}
              step={1}
              onValueChange={(value) => onSeek(value[0])}
              className="w-full"
            />
          </div>

          <div className="text-sm text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>
    </div>
  );
};

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export default Waveform;
