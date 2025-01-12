import { useEffect, useState } from "react";
import { MUSIC_GENRES, MUSICAL_KEYS, MUSICAL_MODES } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Track } from "@/types/database.types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditTrackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: Track;
}

const COMMON_TAGS = [
  "electronic",
  "ambient",
  "rock",
  "jazz",
  "classical",
  "pop",
];

export function EditTrackDialog({
  open,
  onOpenChange,
  track,
}: EditTrackDialogProps) {
  const [title, setTitle] = useState(track.title);
  const [artist, setArtist] = useState(track.artist);
  const [selectedTags, setSelectedTags] = useState<string[]>(track.tags || []);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(
    track.genre || null,
  );
  const [bpm, setBpm] = useState<number | null>(track.metadata?.bpm || null);
  const [musicalKey, setMusicalKey] = useState<string | null>(
    track.metadata?.key?.split(" ")[0] || null,
  );
  const [musicalMode, setMusicalMode] = useState<string | null>(
    track.metadata?.key?.split(" ").slice(1).join(" ") || null,
  );
  const [coverArtUrl, setCoverArtUrl] = useState(track.cover_art_url || "");
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Update local state when track prop changes
  useEffect(() => {
    setTitle(track.title);
    setArtist(track.artist);
    setSelectedTags(track.tags || []);
    setSelectedGenre(track.genre || null);
    setBpm(track.metadata?.bpm || null);
    setMusicalKey(track.metadata?.key?.split(" ")[0] || null);
    setMusicalMode(track.metadata?.key?.split(" ").slice(1).join(" ") || null);
    setCoverArtUrl(track.cover_art_url || "");
  }, [track]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        title: title.trim(),
        artist: artist.trim(),
        tags: selectedTags,
        genre: selectedGenre,
        cover_art_url: coverArtUrl.trim() || null,
        updated_at: new Date().toISOString(),
        metadata: {
          ...track.metadata,
          bpm: bpm ? parseInt(bpm.toString(), 10) : null,
          key:
            musicalKey && musicalMode ? `${musicalKey} ${musicalMode}` : null,
        },
      };

      console.log("Updating track:", track.id, "with:", updates);

      const { data, error } = await supabase
        .from("tracks")
        .update(updates)
        .eq("id", track.id)
        .select()
        .single();

      if (error) throw error;

      console.log("Track updated successfully:", data);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating track:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      // Delete the track record
      const { error: dbError } = await supabase
        .from("tracks")
        .delete()
        .eq("id", track.id);
      if (dbError) throw dbError;

      // Delete the audio file
      const audioFileName = track.audio_url.split("/").pop();
      if (audioFileName) {
        const { error: storageError } = await supabase.storage
          .from("tracks")
          .remove([audioFileName]);
        if (storageError)
          console.error("Error deleting audio file:", storageError);
      }

      // Delete the cover art if it exists
      if (track.cover_art_url) {
        const coverFileName = track.cover_art_url.split("/").pop();
        if (coverFileName) {
          const { error: coverError } = await supabase.storage
            .from("tracks")
            .remove([`covers/${coverFileName}`]);
          if (coverError)
            console.error("Error deleting cover art:", coverError);
        }
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting track:", error);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag],
    );
  };

  return (
    <div>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Track</DialogTitle>
            <DialogDescription>
              Update your track&apos;s metadata and customize its appearance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="artist">Artist</Label>
              <Input
                id="artist"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverArt">Cover Art URL</Label>
              <Input
                id="coverArt"
                value={coverArtUrl}
                onChange={(e) => setCoverArtUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bpm">BPM</Label>
              <Input
                id="bpm"
                type="number"
                value={bpm || ""}
                onChange={(e) =>
                  setBpm(e.target.value ? Number(e.target.value) : null)
                }
                placeholder="120"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="key">Key</Label>
                <Select
                  value={musicalKey || ""}
                  onValueChange={(value) => setMusicalKey(value || null)}
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
                <Label htmlFor="mode">Mode/Scale</Label>
                <Select
                  value={musicalMode || ""}
                  onValueChange={(value) => setMusicalMode(value || null)}
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
              <Label>Genre</Label>
              <div className="flex flex-wrap gap-2">
                {MUSIC_GENRES.map((genre) => (
                  <Badge
                    key={genre}
                    variant={selectedGenre === genre ? "default" : "outline"}
                    className={`cursor-pointer ${selectedGenre === genre ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                    onClick={() =>
                      setSelectedGenre(selectedGenre === genre ? null : genre)
                    }
                  >
                    {genre}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_TAGS.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Track
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Track</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this track? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
