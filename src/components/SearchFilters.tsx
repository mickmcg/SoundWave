import { Badge } from "@/components/ui/badge";
import { MUSIC_GENRES } from "@/lib/constants";
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

const COMMON_TAGS = [
  "electronic",
  "ambient",
  "rock",
  "jazz",
  "classical",
  "pop",
];

export function SearchFilters() {
  const {
    selectedTags,
    setSelectedTags,
    selectedGenre,
    setSelectedGenre,
    durationRange,
    setDurationRange,
    bpmRange,
    setBpmRange,
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
    durationRange[0] !== 0 ||
    durationRange[1] !== 600 ||
    bpmRange[0] !== 0 ||
    bpmRange[1] !== 200 ||
    dateRange[0] ||
    dateRange[1];

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg">
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
            {MUSIC_GENRES.map((genre) => (
              <Badge
                key={genre}
                variant={selectedGenre === genre ? "default" : "outline"}
                className={cn(
                  "cursor-pointer",
                  selectedGenre === genre
                    ? "bg-orange-500 hover:bg-orange-600 text-white"
                    : "hover:bg-muted",
                )}
                onClick={() =>
                  setSelectedGenre(selectedGenre === genre ? null : genre)
                }
              >
                {genre}
              </Badge>
            ))}
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
            {COMMON_TAGS.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer",
                  selectedTags.includes(tag)
                    ? "bg-orange-500 hover:bg-orange-600 text-white"
                    : "hover:bg-muted",
                )}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
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

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            className="w-full mt-2"
            onClick={clearFilters}
          >
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
