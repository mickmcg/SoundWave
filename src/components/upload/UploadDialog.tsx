import { useState, useCallback } from "react";
import * as mm from "music-metadata";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { MUSIC_GENRES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACCEPTED_FILE_TYPES = [".wav", ".aiff", ".mp3"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function UploadDialog({ open, onOpenChange }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const [bpm, setBpm] = useState<number | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [album, setAlbum] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const { user } = useAuth();

  const extractMetadata = async (file: File) => {
    try {
      const metadata = await mm.parseBlob(file);
      const { common, format } = metadata;
      console.log("Extracted metadata:", metadata);

      // Extract basic metadata
      if (common.title) setTitle(common.title);
      if (common.artist) setArtist(common.artist);
      if (common.album) setAlbum(common.album);
      if (common.year) setYear(common.year.toString());
      if (common.bpm) setBpm(common.bpm);

      // Handle genre - try to match with our predefined genres
      if (common.genre && common.genre.length > 0) {
        const extractedGenre = common.genre[0];
        const matchedGenre = MUSIC_GENRES.find(
          (g) =>
            g.toLowerCase() === extractedGenre.toLowerCase() ||
            extractedGenre.toLowerCase().includes(g.toLowerCase()),
        );
        if (matchedGenre) setGenre(matchedGenre);
      }

      // Handle embedded artwork
      if (common.picture && common.picture.length > 0) {
        const picture = common.picture[0];
        const blob = new Blob([picture.data], { type: picture.format });
        const coverFile = new File(
          [blob],
          `cover.${picture.format.split("/")[1]}`,
          { type: picture.format },
        );

        // Upload artwork to storage
        const coverFileName = `covers/${user?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${coverFile.name.split(".").pop()}`;
        const { error: coverError, data: coverData } = await supabase.storage
          .from("tracks")
          .upload(coverFileName, coverFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (!coverError) {
          const {
            data: { publicUrl: coverUrl },
          } = supabase.storage.from("tracks").getPublicUrl(coverFileName);
          return { coverUrl, duration: format.duration };
        }
      }

      return { duration: format.duration };
    } catch (error) {
      console.error("Error extracting metadata:", error);
      setError("Error extracting metadata. Using default values.");
      return {};
    }
  };

  const handleFile = async (file: File) => {
    setError("");

    // Validate file type
    const fileType = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (!ACCEPTED_FILE_TYPES.includes(fileType)) {
      setError(
        `Invalid file type. Accepted types: ${ACCEPTED_FILE_TYPES.join(", ")}`,
      );
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError("File size must be less than 50MB");
      return;
    }

    setFile(file);
    setTitle(file.name.split(".")[0]); // Default title as filename

    // Extract metadata
    const metadata = await extractMetadata(file);
    if (metadata.coverUrl) {
      (file as any).coverUrl = metadata.coverUrl;
    }
    if (metadata.duration) {
      (file as any).duration = metadata.duration;
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      await handleFile(droppedFile);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await handleFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !title.trim() || !user) return;

    try {
      setUploading(true);
      setProgress(0);

      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from("tracks")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("tracks").getPublicUrl(fileName);

      // Create track record in database
      const { error: dbError } = await supabase.from("tracks").insert({
        title,
        artist: artist || user.email?.split("@")[0] || "Anonymous",
        audio_url: publicUrl,
        cover_art_url: (file as any).coverUrl || null,
        duration: (file as any).duration || 0,
        genre: genre,
        user_id: user.id,
        tags: [],
        metadata: {
          album,
          year,
          bpm,
        },
      });

      if (dbError) throw dbError;

      // Reset form and close dialog
      setFile(null);
      setTitle("");
      setArtist("");
      setGenre(null);
      setBpm(null);
      setYear(null);
      setAlbum(null);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Upload error:", error);
      setError(error.message || "Failed to upload track. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Track</DialogTitle>
          <DialogDescription>
            Upload your audio track in WAV, AIFF, or MP3 format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!file ? (
            <div
              className={`flex flex-col items-center justify-center gap-4 p-8 border-2 ${isDragging ? "border-orange-500 bg-orange-500/10" : "border-dashed"} rounded-lg transition-colors`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload
                className={`w-8 h-8 ${isDragging ? "text-orange-500" : "text-gray-400"}`}
              />
              <div className="text-center">
                <Label
                  htmlFor="audio-upload"
                  className="text-orange-500 hover:text-orange-600 cursor-pointer"
                >
                  Choose a file
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  or drag and drop here
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  WAV, AIFF, or MP3 (max. 50MB)
                </p>
              </div>
              <Input
                id="audio-upload"
                type="file"
                accept={ACCEPTED_FILE_TYPES.join(",")}
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded">
                <div className="flex-1 truncate">{file.name}</div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Track Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter track title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="artist">Artist Name</Label>
                <Input
                  id="artist"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Enter artist name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="album">Album</Label>
                <Input
                  id="album"
                  value={album || ""}
                  onChange={(e) => setAlbum(e.target.value)}
                  placeholder="Enter album name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    value={year || ""}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="YYYY"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bpm">BPM</Label>
                  <Input
                    id="bpm"
                    type="number"
                    value={bpm || ""}
                    onChange={(e) => setBpm(Number(e.target.value))}
                    placeholder="120"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Genre</Label>
                <div className="flex flex-wrap gap-2">
                  {MUSIC_GENRES.map((g) => (
                    <Badge
                      key={g}
                      variant={genre === g ? "default" : "outline"}
                      className={`cursor-pointer ${genre === g ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                      onClick={() => setGenre(genre === g ? null : g)}
                    >
                      {g}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                Uploading... {Math.round(progress)}%
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || !title.trim() || uploading}
            >
              Upload
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
