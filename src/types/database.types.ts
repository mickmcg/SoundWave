import { MusicGenre } from "@/lib/constants";

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  audio_url: string;
  cover_art_url?: string;
  genre?: MusicGenre | null;
  likes: number;
  plays: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  user_id: string;
  buy_link?: string | null;
  is_remix: boolean;
  is_released: boolean;
  metadata?: {
    album?: string | null;
    year?: string | null;
    bpm?: number | null;
    key?: string | null;
    isrc?: string | null;
  };
}

export interface Comment {
  id: string;
  track_id: string;
  user_id: string;
  content: string;
  timestamp: number;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      tracks: {
        Row: Track;
        Insert: Omit<
          Track,
          "id" | "likes" | "plays" | "created_at" | "updated_at"
        >;
        Update: Partial<Track>;
      };
      comments: {
        Row: Comment;
        Insert: Omit<Comment, "id" | "created_at">;
        Update: Partial<Comment>;
      };
      track_likes: {
        Row: {
          track_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          track_id: string;
          user_id: string;
        };
        Update: {
          track_id?: string;
          user_id?: string;
        };
      };
    };
  };
}
