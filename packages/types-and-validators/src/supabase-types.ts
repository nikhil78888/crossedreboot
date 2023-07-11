export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      _prisma_migrations: {
        Row: {
          applied_steps_count: number
          checksum: string
          finished_at: string | null
          id: string
          logs: string | null
          migration_name: string
          rolled_back_at: string | null
          started_at: string
        }
        Insert: {
          applied_steps_count?: number
          checksum: string
          finished_at?: string | null
          id: string
          logs?: string | null
          migration_name: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Update: {
          applied_steps_count?: number
          checksum?: string
          finished_at?: string | null
          id?: string
          logs?: string | null
          migration_name?: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Relationships: []
      }
      crosswords: {
        Row: {
          category: Database["public"]["Enums"]["CrosswordCategory"]
          clues: Json
          difficulty: number
          id: string
          isPublished: boolean
          puzzle: string[] | null
          size: number
          solution: string[] | null
          source: Database["public"]["Enums"]["CrosswordSource"]
        }
        Insert: {
          category: Database["public"]["Enums"]["CrosswordCategory"]
          clues: Json
          difficulty: number
          id?: string
          isPublished: boolean
          puzzle?: string[] | null
          size: number
          solution?: string[] | null
          source: Database["public"]["Enums"]["CrosswordSource"]
        }
        Update: {
          category?: Database["public"]["Enums"]["CrosswordCategory"]
          clues?: Json
          difficulty?: number
          id?: string
          isPublished?: boolean
          puzzle?: string[] | null
          size?: number
          solution?: string[] | null
          source?: Database["public"]["Enums"]["CrosswordSource"]
        }
        Relationships: []
      }
      gamePlayers: {
        Row: {
          gamesId: string
          profilesId: string
        }
        Insert: {
          gamesId: string
          profilesId: string
        }
        Update: {
          gamesId?: string
          profilesId?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamePlayers_gamesId_fkey"
            columns: ["gamesId"]
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gamePlayers_profilesId_fkey"
            columns: ["profilesId"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      games: {
        Row: {
          createdAt: string
          crosswordsId: string
          gameDurationInSeconds: number
          gameState: Json | null
          gameType: Database["public"]["Enums"]["GameType"]
          id: string
          playState: Database["public"]["Enums"]["PlayState"]
          startedAt: string | null
        }
        Insert: {
          createdAt?: string
          crosswordsId: string
          gameDurationInSeconds: number
          gameState?: Json | null
          gameType: Database["public"]["Enums"]["GameType"]
          id?: string
          playState: Database["public"]["Enums"]["PlayState"]
          startedAt?: string | null
        }
        Update: {
          createdAt?: string
          crosswordsId?: string
          gameDurationInSeconds?: number
          gameState?: Json | null
          gameType?: Database["public"]["Enums"]["GameType"]
          id?: string
          playState?: Database["public"]["Enums"]["PlayState"]
          startedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_crosswordsId_fkey"
            columns: ["crosswordsId"]
            referencedRelation: "crosswords"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          country: string | null
          createdAt: string
          email: string | null
          id: string
          name: string | null
          userId: string
          username: string
        }
        Insert: {
          avatar?: string | null
          country?: string | null
          createdAt?: string
          email?: string | null
          id?: string
          name?: string | null
          userId: string
          username: string
        }
        Update: {
          avatar?: string | null
          country?: string | null
          createdAt?: string
          email?: string | null
          id?: string
          name?: string | null
          userId?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      CrosswordCategory:
        | "general"
        | "sports"
        | "history"
        | "geography"
        | "science"
        | "politics"
        | "movies"
        | "television"
        | "pop_culture"
      CrosswordSource: "wizium"
      GameType: "SOLO" | "FRIENDLY" | "RANKED"
      PlayState: "WAITING_FOR_OPPONENT" | "PLAYING" | "COMPLETED" | "ABORTED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
