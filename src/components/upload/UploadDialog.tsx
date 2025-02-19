import { useState, useCallback, useEffect } from "react";
import * as jsmediatags from "jsmediatags/dist/jsmediatags.min.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, X, AlertCircle, ImagePlus } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import {
  MUSIC_GENRES,
  MUSICAL_KEYS,
  MUSICAL_MODES,
  KEY_MAPPING,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACCEPTED_FILE_TYPES = [".wav", ".aiff", ".mp3"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_COVER_SIZE = 1024 * 1024; // 1MB

export function UploadDialog({ open, onOpenChange }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const [bpm, setBpm] = useState<number | null>(null);
  const [musicalKey, setMusicalKey] = useState<string | null>(null);
  const [musicalMode, setMusicalMode] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [album, setAlbum] = useState<string | null>(null);
  const [buyLink, setBuyLink] = useState("");
  const [isRemix, setIsRemix] = useState(false);
  const [isReleased, setIsReleased] = useState(false);
  const [coverArt, setCoverArt] = useState<string | null>(null);
  const [coverArtFile, setCoverArtFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [recentTags, setRecentTags] = useState<string[]>([]);
  const { user } = useAuth();

  // Fetch recent tags
  useEffect(() => {
    const fetchRecentTags = async () => {
      const { data } = await supabase
        .from("tracks")
        .select("tags")
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        const tags = data.flatMap((track) => track.tags || []).filter(Boolean);
        const uniqueTags = Array.from(new Set(tags));
        setRecentTags(uniqueTags.slice(0, 10)); // Keep only top 10 recent tags
      }
    };

    fetchRecentTags();
  }, []);

  const analyzeAudio = async (file: File) => {
    try {
      console.log("Starting audio analysis...");
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const audioData = audioBuffer.getChannelData(0);

      // Enhanced BPM detection with more debug info
      const sampleRate = audioBuffer.sampleRate;
      console.log("Sample rate:", sampleRate);
      console.log("Audio duration:", audioBuffer.duration);

      const bufferSize = 2048;
      const peaks = [];
      let threshold = 0.15;
      let prevPeak = 0;
      let minPeakDistance = sampleRate * 0.2;

      // Calculate RMS to help set threshold
      let rms = 0;
      for (let i = 0; i < audioData.length; i++) {
        rms += audioData[i] * audioData[i];
      }
      rms = Math.sqrt(rms / audioData.length);
      console.log("RMS value:", rms);

      // Adjust threshold based on RMS
      threshold = Math.max(0.15, rms * 1.5);
      console.log("Using threshold:", threshold);

      for (let i = 0; i < audioData.length; i += bufferSize) {
        const chunk = audioData.slice(i, i + bufferSize);
        const peak = Math.max(...chunk.map(Math.abs));

        if (peak > threshold && i - prevPeak > minPeakDistance) {
          peaks.push(i / sampleRate);
          prevPeak = i;
        }
      }

      console.log("Number of peaks found:", peaks.length);

      const intervals = peaks.slice(1).map((peak, i) => peak - peaks[i]);
      console.log("Peak intervals:", intervals);

      const sortedIntervals = intervals.sort((a, b) => a - b);
      console.log("Sorted intervals:", sortedIntervals);

      // Take the middle 60% of intervals to avoid outliers
      const validIntervals = sortedIntervals.slice(
        Math.floor(sortedIntervals.length * 0.2),
        Math.floor(sortedIntervals.length * 0.8),
      );
      console.log("Valid intervals:", validIntervals);

      const avgInterval =
        validIntervals.reduce((a, b) => a + b, 0) / validIntervals.length;
      console.log("Average interval:", avgInterval);

      let estimatedBPM = Math.round(60 / avgInterval);
      console.log("Initial BPM estimate:", estimatedBPM);

      // More intelligent BPM adjustment
      let adjustedBPM = estimatedBPM;

      // If BPM is too high, try to find a more reasonable multiple
      if (estimatedBPM > 150) {
        const possibleBPMs = [
          estimatedBPM / 2,
          estimatedBPM / 3,
          estimatedBPM / 4,
        ];

        // Find the closest multiple that's in a reasonable range (70-150 BPM)
        adjustedBPM =
          possibleBPMs.find((bpm) => bpm >= 70 && bpm <= 150) ||
          Math.round(estimatedBPM / 2);
      }

      console.log("BPM adjustment:", {
        original: estimatedBPM,
        adjusted: adjustedBPM,
        reason:
          estimatedBPM !== adjustedBPM
            ? "Too high, found better multiple"
            : "No adjustment needed",
      });

      estimatedBPM = Math.round(adjustedBPM);

      console.log(
        "Analysis complete. Raw BPM:",
        estimatedBPM * 2,
        "Halved BPM:",
        estimatedBPM,
      );
      return {
        duration: audioBuffer.duration,
        bpm: estimatedBPM,
      };
    } catch (error) {
      console.error("Error analyzing audio:", error);
      throw error;
    }
  };

  const extractMetadata = async (file: File) => {
    setAnalyzing(true);
    setAnalysisError("");
    try {
      console.log("Starting metadata extraction...");

      // Read ID3 tags using jsmediatags
      await new Promise((resolve, reject) => {
        jsmediatags.read(file, {
          onSuccess: function (tag) {
            console.log("Read ID3 tags:", tag);

            // Extract basic metadata
            if (tag.tags) {
              setTitle(tag.tags.title || file.name.replace(/\.[^/.]+$/, ""));
              setArtist(tag.tags.artist || "");
              setYear(tag.tags.year?.toString() || null);
              setAlbum(tag.tags.album || null);

              // Handle genre
              if (tag.tags.genre) {
                const genreStr = tag.tags.genre.toString();
                const matchedGenre = MUSIC_GENRES.find((g) =>
                  genreStr.toLowerCase().includes(g.toLowerCase()),
                );
                if (matchedGenre) {
                  setGenre(matchedGenre);
                }
              }

              // Try to get key from TKEY frame
              const tkey = tag.tags.TKEY;
              if (tkey) {
                console.log("Found TKEY:", tkey);
                const normalizedKey = normalizeKey(tkey.data);
                if (normalizedKey) {
                  console.log("Setting normalized key:", normalizedKey);
                  setMusicalKey(normalizedKey);
                  setMusicalMode("Major"); // Default to Major if not specified
                }
              }

              // Extract album art
              if (tag.tags.picture) {
                const { data, format } = tag.tags.picture;
                const base64String = btoa(
                  data.reduce(
                    (acc, byte) => acc + String.fromCharCode(byte),
                    "",
                  ),
                );
                const imageUrl = `data:${format};base64,${base64String}`;
                console.log("Found album art:", format);
                setCoverArt(imageUrl);

                // Convert base64 to File object
                fetch(imageUrl)
                  .then((res) => res.blob())
                  .then((blob) => {
                    const file = new File([blob], "cover.jpg", {
                      type: format,
                    });
                    setCoverArtFile(file);
                  });
              }
            }
            resolve(null);
          },
          onError: function (error) {
            console.log("Error reading ID3:", error);
            resolve(null); // Continue even if ID3 reading fails
          },
        });
      });

      // Always analyze audio for BPM
      console.log("Starting BPM analysis...");
      const analysis = await analyzeAudio(file);
      console.log("Using analyzed BPM:", analysis.bpm);
      setBpm(analysis.bpm);
    } catch (error) {
      console.error("Error during analysis:", error);
      setAnalysisError(
        "Failed to analyze audio. You can set the metadata manually.",
      );
      setBpm(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCoverArtChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const fileType = file.type.toLowerCase();
      if (
        !fileType.startsWith("image/jpeg") &&
        !fileType.startsWith("image/png")
      ) {
        setError("Cover art must be a JPG or PNG file");
        return;
      }

      // Validate file size
      if (file.size > MAX_COVER_SIZE) {
        setError("Cover art must be less than 1MB");
        return;
      }

      // Clear any previous errors
      setError("");

      // Create object URL for preview
      const url = URL.createObjectURL(file);

      // Update state
      setCoverArt(url);
      setCoverArtFile(file);
    }
  };

  // Helper function to normalize musical keys
  const normalizeKey = (key: string): string | null => {
    if (!key) return null;

    // Remove any whitespace and convert to uppercase
    const cleanKey = key.trim().toUpperCase();
    console.log("Normalizing key:", cleanKey);

    // Check direct match first
    if (MUSICAL_KEYS.includes(cleanKey as any)) {
      console.log("Found direct key match:", cleanKey);
      return cleanKey;
    }

    // Try mapping
    const mappedKey = KEY_MAPPING[cleanKey];
    if (mappedKey && MUSICAL_KEYS.includes(mappedKey as any)) {
      console.log("Found mapped key:", mappedKey);
      return mappedKey;
    }

    // If no match found, log and return null
    console.log("No valid key mapping found for:", cleanKey);
    return null;
  };

  const handleFile = async (file: File) => {
    setError("");
    setAnalysisError("");
    setBpm(null);
    setMusicalKey(null);
    setMusicalMode(null);
    setCoverArt(null);
    setCoverArtFile(null);

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
      setError(
        `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
      return;
    }

    setFile(file);
    await extractMetadata(file);
  };

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      await handleFile(droppedFile);
    }
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await handleFile(selectedFile);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag],
    );
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setUploading(true);
    setProgress(0);
    setError("");

    try {
      // Upload audio file
      const audioFileName = `${Date.now()}-${file.name}`;
      const { error: uploadError, data: audioData } = await supabase.storage
        .from("tracks")
        .upload(audioFileName, file, {
          cacheControl: "3600",
          upsert: false,
          onUploadProgress: (progress) => {
            setProgress((progress.loaded / progress.total) * 100);
          },
        });

      if (uploadError) throw uploadError;

      // Upload cover art if provided
      let coverArtUrl = null;
      if (coverArtFile) {
        const coverFileName = `covers/${Date.now()}-cover.jpg`;
        const { error: coverUploadError } = await supabase.storage
          .from("tracks")
          .upload(coverFileName, coverArtFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (coverUploadError) {
          console.error("Error uploading cover art:", coverUploadError);
        } else {
          const {
            data: { publicUrl },
          } = supabase.storage.from("tracks").getPublicUrl(coverFileName);
          coverArtUrl = publicUrl;
        }
      }

      // Get public URL for the uploaded file
      const {
        data: { publicUrl: audioUrl },
      } = supabase.storage.from("tracks").getPublicUrl(audioFileName);

      // Create track record in database
      const { error: dbError } = await supabase.from("tracks").insert({
        title: title.trim(),
        artist: artist.trim(),
        audio_url: audioUrl,
        cover_art_url: coverArtUrl,
        duration: 0, // TODO: Get actual duration
        genre: genre,
        buy_link: buyLink.trim() || null,
        is_remix: isRemix,
        is_released: isReleased,
        user_id: user.id,
        metadata: {
          bpm: bpm ? parseInt(bpm.toString(), 10) : null,
          key:
            musicalKey && musicalMode ? `${musicalKey} ${musicalMode}` : null,
          album,
          year,
        },
      });

      if (dbError) throw dbError;

      // Reset all state variables after successful upload
      setFile(null);
      setTitle("");
      setArtist("");
      setGenre(null);
      setBpm(null);
      setMusicalKey(null);
      setMusicalMode(null);
      setYear(null);
      setAlbum(null);
      setCoverArt(null);
      setCoverArtFile(null);
      setProgress(0);
      onOpenChange(false);
    } catch (error) {
      console.error("Error uploading track:", error);
      setError("Failed to upload track. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Track</DialogTitle>
          <DialogDescription>
            Upload your track and add metadata. WAV, AIFF, and MP3 formats are
            supported.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!file ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center ${isDragging ? "border-primary bg-primary/10" : "border-muted"}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop your audio file here, or
                </p>
                <label htmlFor="file-upload">
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept={ACCEPTED_FILE_TYPES.join(",")}
                    onChange={handleFileChange}
                  />
                  <Button
                    variant="outline"
                    className="cursor-pointer"
                    type="button"
                  >
                    Choose File
                  </Button>
                </label>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
              <div className="flex-1 truncate">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setFile(null);
                  setTitle("");
                  setArtist("");
                  setGenre(null);
                  setBpm(null);
                  setMusicalKey(null);
                  setMusicalMode(null);
                  setYear(null);
                  setAlbum(null);
                  setCoverArt(null);
                  setCoverArtFile(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {file && (
            <div className="space-y-4">
              {(uploading || analyzing) && (
                <div className="space-y-2">
                  {uploading && <Progress value={progress} />}
                  <p className="text-sm text-center text-muted-foreground">
                    {uploading
                      ? `Uploading... ${Math.round(progress)}%`
                      : "Analyzing audio..."}
                    {analyzing && (
                      <span className="block text-xs mt-1">
                        Detecting BPM and extracting metadata...
                      </span>
                    )}
                  </p>
                </div>
              )}

              {analysisError && (
                <Alert variant="warning">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{analysisError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>Cover Art</Label>
                <div className="flex items-start gap-4">
                  {coverArt ? (
                    <div className="relative group">
                      <img
                        src={coverArt}
                        alt="Cover Art Preview"
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-lg">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white"
                          onClick={() => {
                            setCoverArt(null);
                            setCoverArtFile(null);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <label className="flex-1">
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      className="hidden"
                      onChange={handleCoverArtChange}
                    />
                    <Button variant="outline" className="w-full" type="button">
                      <ImagePlus className="w-4 h-4 mr-2" />
                      {coverArt ? "Change Cover Art" : "Add Cover Art"}
                    </Button>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="artist">Artist</Label>
                <Input
                  id="artist"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  required
                />
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

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="default"
                      className="cursor-pointer bg-orange-500 hover:bg-orange-600 flex items-center gap-1"
                    >
                      {tag}
                      <X
                        className="h-3 w-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTags(
                            selectedTags.filter((t) => t !== tag),
                          );
                        }}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.currentTarget.value) {
                        e.preventDefault();
                        const newTag = e.currentTarget.value
                          .trim()
                          .toLowerCase();
                        if (newTag && !selectedTags.includes(newTag)) {
                          setSelectedTags([...selectedTags, newTag]);
                          e.currentTarget.value = "";
                        }
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {recentTags.length > 0 && (
                    <>
                      <p className="text-sm text-muted-foreground mb-1 w-full">
                        Recent tags:
                      </p>
                      {recentTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={
                            selectedTags.includes(tag) ? "default" : "outline"
                          }
                          className="cursor-pointer"
                          onClick={() => toggleTag(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bpm">BPM {analyzing && "(Analyzing...)"}</Label>
                <Input
                  id="bpm"
                  type="number"
                  value={bpm || ""}
                  onChange={(e) =>
                    setBpm(e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder="120"
                  disabled={analyzing}
                  className={analyzing ? "opacity-50 cursor-wait" : ""}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="key">
                    Key {analyzing && "(Analyzing...)"}
                  </Label>
                  <Select
                    value={musicalKey || ""}
                    onValueChange={(value) => setMusicalKey(value || null)}
                    disabled={analyzing}
                  >
                    <SelectTrigger id="key">
                      <SelectValue placeholder="Select key" />
                    </SelectTrigger>
                    <SelectContent>
                      {MUSICAL_KEYS.map((key) => (
                        <SelectItem key={key} value={key}>
                          {key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mode">
                    Mode/Scale {analyzing && "(Analyzing...)"}
                  </Label>
                  <Select
                    value={musicalMode || ""}
                    onValueChange={(value) => setMusicalMode(value || null)}
                    disabled={analyzing}
                  >
                    <SelectTrigger id="mode">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {MUSICAL_MODES.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {mode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="buy-link">Buy Link</Label>
                <Input
                  id="buy-link"
                  type="url"
                  value={buyLink}
                  onChange={(e) => setBuyLink(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is-remix"
                    checked={isRemix}
                    onCheckedChange={(checked) =>
                      setIsRemix(checked as boolean)
                    }
                  />
                  <Label htmlFor="is-remix">Remix</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is-released"
                    checked={isReleased}
                    onCheckedChange={(checked) =>
                      setIsReleased(checked as boolean)
                    }
                  />
                  <Label htmlFor="is-released">Released</Label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={year || ""}
                    onChange={(e) =>
                      setYear(e.target.value ? e.target.value : null)
                    }
                    placeholder="2024"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="album">Album</Label>
                  <Input
                    id="album"
                    value={album || ""}
                    onChange={(e) =>
                      setAlbum(e.target.value ? e.target.value : null)
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>

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
                  disabled={!file || !title || !artist || uploading}
                >
                  Upload
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
