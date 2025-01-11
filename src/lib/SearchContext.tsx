import React, { createContext, useContext, useState } from "react";

type SearchContextType = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [durationRange, setDurationRange] = useState<[number, number]>([
    0, 600,
  ]); // 0-10 minutes
  const [bpmRange, setBpmRange] = useState<[number, number]>([0, 200]); // 0-200 BPM
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTags([]);
    setSelectedGenre(null);
    setDurationRange([0, 600]);
    setBpmRange([0, 200]);
    setDateRange([null, null]);
  };

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
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
