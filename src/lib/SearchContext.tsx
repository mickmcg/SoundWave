import React, { createContext, useContext, useState } from "react";

type SearchContextType = {
  isRemix: boolean | null;
  setIsRemix: (isRemix: boolean | null) => void;
  isReleased: boolean | null;
  setIsReleased: (isReleased: boolean | null) => void;
  selectedArtist: string | null;
  setSelectedArtist: (artist: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
  selectedKey: string | null;
  setSelectedKey: (key: string | null) => void;
  selectedMode: string | null;
  setSelectedMode: (mode: string | null) => void;
  selectedGenre: string | null;
  setSelectedGenre: (genre: string | null) => void;
  durationRange: [number, number];
  setDurationRange: (range: [number, number]) => void;
  bpmRange: [number, number];
  setBpmRange: (range: [number, number]) => void;
  dateRange: [Date | null, Date | null];
  setDateRange: (range: [Date | null, Date | null]) => void;
  clearFilters: () => void;
};

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isRemix, setIsRemix] = useState<boolean | null>(null);
  const [isReleased, setIsReleased] = useState<boolean | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [durationRange, setDurationRange] = useState<[number, number]>([
    0, 600,
  ]); // 0-10 minutes
  const [bpmRange, setBpmRange] = useState<[number, number]>([0, 200]); // 0-200 BPM
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ]);

  const clearFilters = () => {
    setIsRemix(null);
    setIsReleased(null);
    setSelectedArtist(null);
    setSearchQuery("");
    setSelectedTags([]);
    setSelectedGenre(null);
    setSelectedKey(null);
    setSelectedMode(null);
    setDurationRange([0, 600]);
    setBpmRange([0, 200]);
    setDateRange([null, null]);
  };

  return (
    <SearchContext.Provider
      value={{
        isRemix,
        setIsRemix,
        isReleased,
        setIsReleased,
        selectedArtist,
        setSelectedArtist,
        searchQuery,
        setSearchQuery,
        selectedTags,
        setSelectedTags,
        selectedGenre,
        setSelectedGenre,
        selectedKey,
        setSelectedKey,
        selectedMode,
        setSelectedMode,
        durationRange,
        setDurationRange,
        bpmRange,
        setBpmRange,
        dateRange,
        setDateRange,
        clearFilters,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}
