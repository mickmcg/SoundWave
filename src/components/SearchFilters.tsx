import { Badge } from "@/components/ui/badge";
import { MUSICAL_KEYS, MUSICAL_MODES } from "@/lib/constants";
import type { Track } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useSearch } from "@/lib/SearchContext";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { format } from "date-fns";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SearchFiltersProps {
  tracks: Track[];
}

export function SearchFilters({ tracks }: SearchFiltersProps) {
  const {
    isRemix,
    setIsRemix,
    isReleased,
    setIsReleased,
    selectedArtist,
    setSelectedArtist,
    selectedTags,
    setSelectedTags,
    selectedGenre,
    setSelectedGenre,
    durationRange,
    setDurationRange,
    bpmRange,
    setBpmRange,
    selectedKey,
    setSelectedKey,
    selectedMode,
    setSelectedMode,
    dateRange,
    setDateRange,
    clearFilters,
  } = useSearch();

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const hasActiveFilters =
    selectedTags.length > 0 ||
    selectedGenre !== null ||
    selectedKey !== null ||
    selectedMode !== null ||
    durationRange[0] !== 0 ||
    durationRange[1] !== 600 ||
    bpmRange[0] !== 0 ||
    bpmRange[1] !== 200 ||
    dateRange[0] ||
    dateRange[1] ||
    isRemix !== null ||
    isReleased !== null;

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg">
      {/* Artist */}
      <Collapsible>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Artist</h3>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-0 h-auto">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-2">
          <div className="flex flex-wrap gap-2">
            {/* Not set option for Artist */}
            <Badge
              variant={selectedArtist === "not-set" ? "default" : "outline"}
              className={cn(
                "cursor-pointer flex items-center gap-2",
                selectedArtist === "not-set"
                  ? "bg-orange-500 hover:bg-orange-600 text-white"
                  : "hover:bg-muted",
              )}
              onClick={() =>
                setSelectedArtist(
                  selectedArtist === "not-set" ? null : "not-set",
                )
              }
            >
              <span>Not set</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-xs",
                  selectedArtist === "not-set"
                    ? "bg-white/20"
                    : "bg-muted-foreground/20",
                )}
              >
                {tracks.filter((track) => !track.artist).length}
              </span>
            </Badge>

            {Array.from(
              new Set(tracks.map((track) => track.artist).filter(Boolean)),
            ).map((artist) => {
              const count = tracks.filter(
                (track) => track.artist === artist,
              ).length;
              return (
                <Badge
                  key={artist}
                  variant={selectedArtist === artist ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer flex items-center gap-2",
                    selectedArtist === artist
                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                      : "hover:bg-muted",
                  )}
                  onClick={() =>
                    setSelectedArtist(selectedArtist === artist ? null : artist)
                  }
                >
                  <span>{artist}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-full text-xs",
                      selectedArtist === artist
                        ? "bg-white/20"
                        : "bg-muted-foreground/20",
                    )}
                  >
                    {count}
                  </span>
                </Badge>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Genre */}
      <Collapsible>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Genre</h3>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-0 h-auto">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-2">
          <div className="flex flex-wrap gap-2">
            {/* Not set option for Genre */}
            <Badge
              variant={selectedGenre === "not-set" ? "default" : "outline"}
              className={cn(
                "cursor-pointer flex items-center gap-2",
                selectedGenre === "not-set"
                  ? "bg-orange-500 hover:bg-orange-600 text-white"
                  : "hover:bg-muted",
              )}
              onClick={() =>
                setSelectedGenre(selectedGenre === "not-set" ? null : "not-set")
              }
            >
              <span>Not set</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-xs",
                  selectedGenre === "not-set"
                    ? "bg-white/20"
                    : "bg-muted-foreground/20",
                )}
              >
                {tracks.filter((track) => !track.genre).length}
              </span>
            </Badge>

            {Array.from(
              new Set(tracks.map((track) => track.genre).filter(Boolean)),
            ).map((genre) => {
              const count = tracks.filter(
                (track) => track.genre === genre,
              ).length;
              return (
                <Badge
                  key={genre}
                  variant={selectedGenre === genre ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer flex items-center gap-2",
                    selectedGenre === genre
                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                      : "hover:bg-muted",
                  )}
                  onClick={() =>
                    setSelectedGenre(selectedGenre === genre ? null : genre)
                  }
                >
                  <span>{genre}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-full text-xs",
                      selectedGenre === genre
                        ? "bg-white/20"
                        : "bg-muted-foreground/20",
                    )}
                  >
                    {count}
                  </span>
                </Badge>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Tags */}
      <Collapsible>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Tags</h3>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-0 h-auto">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-2">
          <div className="flex flex-wrap gap-2">
            {/* Not set option for Tags */}
            <Badge
              variant={selectedTags.includes("not-set") ? "default" : "outline"}
              className={cn(
                "cursor-pointer flex items-center gap-2",
                selectedTags.includes("not-set")
                  ? "bg-orange-500 hover:bg-orange-600 text-white"
                  : "hover:bg-muted",
              )}
              onClick={() => toggleTag("not-set")}
            >
              <span>Not set</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-xs",
                  selectedTags.includes("not-set")
                    ? "bg-white/20"
                    : "bg-muted-foreground/20",
                )}
              >
                {
                  tracks.filter(
                    (track) => !track.tags || track.tags.length === 0,
                  ).length
                }
              </span>
            </Badge>

            {Array.from(
              new Set(tracks.flatMap((track) => track.tags || [])),
            ).map((tag) => {
              const count = tracks.filter((track) =>
                track.tags?.includes(tag),
              ).length;
              return (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer flex items-center gap-2",
                    selectedTags.includes(tag)
                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                      : "hover:bg-muted",
                  )}
                  onClick={() => toggleTag(tag)}
                >
                  <span>{tag}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-full text-xs",
                      selectedTags.includes(tag)
                        ? "bg-white/20"
                        : "bg-muted-foreground/20",
                    )}
                  >
                    {count}
                  </span>
                </Badge>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Duration Range */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Duration</h3>
        <Slider
          value={durationRange}
          min={0}
          max={600}
          step={30}
          onValueChange={(value) => setDurationRange(value as [number, number])}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatDuration(durationRange[0])}</span>
          <span>{formatDuration(durationRange[1])}</span>
        </div>
      </div>

      {/* BPM Range */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium">BPM Range</h3>
          <div className="text-xs text-muted-foreground">
            {bpmRange[0]} - {bpmRange[1]} BPM
          </div>
        </div>
        <Slider
          value={bpmRange}
          min={0}
          max={200}
          step={1}
          minStepsBetweenThumbs={1}
          onValueChange={(value) => setBpmRange(value as [number, number])}
          className="w-full"
        />
      </div>

      {/* Musical Key */}
      <Collapsible>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Musical Key</h3>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-0 h-auto">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-2">
          <div className="flex flex-wrap gap-2">
            {/* Not set option for Key */}
            <Badge
              variant={selectedKey === "not-set" ? "default" : "outline"}
              className={cn(
                "cursor-pointer flex items-center gap-2",
                selectedKey === "not-set"
                  ? "bg-orange-500 hover:bg-orange-600 text-white"
                  : "hover:bg-muted",
              )}
              onClick={() =>
                setSelectedKey(selectedKey === "not-set" ? null : "not-set")
              }
            >
              <span>Not set</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-xs",
                  selectedKey === "not-set"
                    ? "bg-white/20"
                    : "bg-muted-foreground/20",
                )}
              >
                {tracks.filter((track) => !track.metadata?.key).length}
              </span>
            </Badge>

            {MUSICAL_KEYS.map((key) => {
              const count = tracks.filter((track) =>
                track.metadata?.key?.startsWith(key),
              ).length;
              if (count === 0) return null;
              return (
                <Badge
                  key={key}
                  variant={selectedKey === key ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer flex items-center gap-2",
                    selectedKey === key
                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                      : "hover:bg-muted",
                  )}
                  onClick={() =>
                    setSelectedKey(selectedKey === key ? null : key)
                  }
                >
                  <span>{key}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-full text-xs",
                      selectedKey === key
                        ? "bg-white/20"
                        : "bg-muted-foreground/20",
                    )}
                  >
                    {count}
                  </span>
                </Badge>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Musical Mode */}
      <Collapsible>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Musical Mode</h3>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-0 h-auto">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-2">
          <div className="flex flex-wrap gap-2">
            {/* Not set option for Mode */}
            <Badge
              variant={selectedMode === "not-set" ? "default" : "outline"}
              className={cn(
                "cursor-pointer flex items-center gap-2",
                selectedMode === "not-set"
                  ? "bg-orange-500 hover:bg-orange-600 text-white"
                  : "hover:bg-muted",
              )}
              onClick={() =>
                setSelectedMode(selectedMode === "not-set" ? null : "not-set")
              }
            >
              <span>Not set</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-xs",
                  selectedMode === "not-set"
                    ? "bg-white/20"
                    : "bg-muted-foreground/20",
                )}
              >
                {tracks.filter((track) => !track.metadata?.key).length}
              </span>
            </Badge>

            {MUSICAL_MODES.map((mode) => {
              const count = tracks.filter((track) =>
                track.metadata?.key?.includes(mode),
              ).length;
              if (count === 0) return null;
              return (
                <Badge
                  key={mode}
                  variant={selectedMode === mode ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer flex items-center gap-2",
                    selectedMode === mode
                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                      : "hover:bg-muted",
                  )}
                  onClick={() =>
                    setSelectedMode(selectedMode === mode ? null : mode)
                  }
                >
                  <span>{mode}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-full text-xs",
                      selectedMode === mode
                        ? "bg-white/20"
                        : "bg-muted-foreground/20",
                    )}
                  >
                    {count}
                  </span>
                </Badge>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Date Range */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Upload Date</h3>
        <div className="grid gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateRange[0] && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange[0] ? (
                  format(dateRange[0], "LLL dd, y")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{
                  from: dateRange[0] || undefined,
                  to: dateRange[1] || undefined,
                }}
                onSelect={(range) =>
                  setDateRange([range?.from || null, range?.to || null])
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Released Status */}
      <Collapsible>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Released?</h3>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-0 h-auto">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-2">
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={isReleased === true ? "default" : "outline"}
              className={cn(
                "cursor-pointer flex items-center gap-2",
                isReleased === true
                  ? "bg-orange-500 hover:bg-orange-600 text-white"
                  : "hover:bg-muted",
              )}
              onClick={() => setIsReleased(isReleased === true ? null : true)}
            >
              <span>Released</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-xs",
                  isReleased === true
                    ? "bg-white/20"
                    : "bg-muted-foreground/20",
                )}
              >
                {tracks.filter((track) => track.is_released).length}
              </span>
            </Badge>
            <Badge
              variant={isReleased === false ? "default" : "outline"}
              className={cn(
                "cursor-pointer flex items-center gap-2",
                isReleased === false
                  ? "bg-orange-500 hover:bg-orange-600 text-white"
                  : "hover:bg-muted",
              )}
              onClick={() => setIsReleased(isReleased === false ? null : false)}
            >
              <span>Unreleased</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-xs",
                  isReleased === false
                    ? "bg-white/20"
                    : "bg-muted-foreground/20",
                )}
              >
                {tracks.filter((track) => !track.is_released).length}
              </span>
            </Badge>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Remix Status */}
      <Collapsible>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Remix?</h3>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-0 h-auto">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-2">
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={isRemix === false ? "default" : "outline"}
              className={cn(
                "cursor-pointer flex items-center gap-2",
                isRemix === false
                  ? "bg-orange-500 hover:bg-orange-600 text-white"
                  : "hover:bg-muted",
              )}
              onClick={() => setIsRemix(isRemix === false ? null : false)}
            >
              <span>Original</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-xs",
                  isRemix === false ? "bg-white/20" : "bg-muted-foreground/20",
                )}
              >
                {tracks.filter((track) => !track.is_remix).length}
              </span>
            </Badge>
            <Badge
              variant={isRemix === true ? "default" : "outline"}
              className={cn(
                "cursor-pointer flex items-center gap-2",
                isRemix === true
                  ? "bg-orange-500 hover:bg-orange-600 text-white"
                  : "hover:bg-muted",
              )}
              onClick={() => setIsRemix(isRemix === true ? null : true)}
            >
              <span>Remix</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-xs",
                  isRemix === true ? "bg-white/20" : "bg-muted-foreground/20",
                )}
              >
                {tracks.filter((track) => track.is_remix).length}
              </span>
            </Badge>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" className="w-full mt-2" onClick={clearFilters}>
          <X className="mr-2 h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
