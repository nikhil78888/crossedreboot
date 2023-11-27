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
          createdAt: string
          difficulty: number
          id: string
          isPublished: boolean
          puzzle: string[] | null
          size: number
          solution: string[] | null
          source: Database["public"]["Enums"]["CrosswordSource"]
          usedWords: string[] | null
        }
        Insert: {
          category: Database["public"]["Enums"]["CrosswordCategory"]
          clues: Json
          createdAt?: string
          difficulty: number
          id?: string
          isPublished: boolean
          puzzle?: string[] | null
          size: number
          solution?: string[] | null
          source: Database["public"]["Enums"]["CrosswordSource"]
          usedWords?: string[] | null
        }
        Update: {
          category?: Database["public"]["Enums"]["CrosswordCategory"]
          clues?: Json
          createdAt?: string
          difficulty?: number
          id?: string
          isPublished?: boolean
          puzzle?: string[] | null
          size?: number
          solution?: string[] | null
          source?: Database["public"]["Enums"]["CrosswordSource"]
          usedWords?: string[] | null
        }
        Relationships: []
      }
      gamePlayers: {
        Row: {
          gamesId: string
          profilesId: string
          score: number
        }
        Insert: {
          gamesId: string
          profilesId: string
          score?: number
        }
        Update: {
          gamesId?: string
          profilesId?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "gamePlayers_gamesId_fkey"
            columns: ["gamesId"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gamePlayers_profilesId_fkey"
            columns: ["profilesId"]
            isOneToOne: false
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
          winnerId: string | null
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
          winnerId?: string | null
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
          winnerId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_crosswordsId_fkey"
            columns: ["crosswordsId"]
            isOneToOne: false
            referencedRelation: "crosswords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_crosswordsId_fkey"
            columns: ["crosswordsId"]
            isOneToOne: false
            referencedRelation: "random_crossword"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_winnerId_fkey"
            columns: ["winnerId"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          country: string | null
          createdAt: string
          eloRating: number
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
          eloRating?: number
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
          eloRating?: number
          email?: string | null
          id?: string
          name?: string | null
          userId?: string
          username?: string
        }
        Relationships: []
      }
      words: {
        Row: {
          clue: string | null
          id: number
          lastUsed: string | null
          score: number | null
          word: string
          wordLength: number
        }
        Insert: {
          clue?: string | null
          id?: number
          lastUsed?: string | null
          score?: number | null
          word: string
          wordLength?: number
        }
        Update: {
          clue?: string | null
          id?: number
          lastUsed?: string | null
          score?: number | null
          word?: string
          wordLength?: number
        }
        Relationships: []
      }
    }
    Views: {
      random_crossword: {
        Row: {
          category: Database["public"]["Enums"]["CrosswordCategory"] | null
          clues: Json | null
          createdAt: string | null
          difficulty: number | null
          id: string | null
          isPublished: boolean | null
          puzzle: string[] | null
          size: number | null
          solution: string[] | null
          source: Database["public"]["Enums"]["CrosswordSource"] | null
          usedWords: string[] | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["CrosswordCategory"] | null
          clues?: Json | null
          createdAt?: string | null
          difficulty?: number | null
          id?: string | null
          isPublished?: boolean | null
          puzzle?: string[] | null
          size?: number | null
          solution?: string[] | null
          source?: Database["public"]["Enums"]["CrosswordSource"] | null
          usedWords?: string[] | null
        }
        Update: {
          category?: Database["public"]["Enums"]["CrosswordCategory"] | null
          clues?: Json | null
          createdAt?: string | null
          difficulty?: number | null
          id?: string | null
          isPublished?: boolean | null
          puzzle?: string[] | null
          size?: number | null
          solution?: string[] | null
          source?: Database["public"]["Enums"]["CrosswordSource"] | null
          usedWords?: string[] | null
        }
        Relationships: []
      }
      random_words: {
        Row: {
          clue: string | null
          id: number | null
          score: number | null
          word: string | null
          wordLength: number | null
        }
        Insert: {
          clue?: string | null
          id?: number | null
          score?: number | null
          word?: string | null
          wordLength?: number | null
        }
        Update: {
          clue?: string | null
          id?: number | null
          score?: number | null
          word?: string | null
          wordLength?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_available_crossword: {
        Args: {
          profileid: string
        }
        Returns: {
          id: string
          size: number
          difficulty: number
          isPublished: boolean
          source: Database["public"]["Enums"]["CrosswordSource"]
          category: Database["public"]["Enums"]["CrosswordCategory"]
          puzzle: string[]
          solution: string[]
          clues: Json
          createdAt: string
          usedWords: string[]
        }[]
      }
      get_available_ranked_crossword: {
        Args: {
          player_one_id: string
          player_two_id: string
        }
        Returns: {
          category: Database["public"]["Enums"]["CrosswordCategory"]
          clues: Json
          createdAt: string
          difficulty: number
          id: string
          isPublished: boolean
          puzzle: string[] | null
          size: number
          solution: string[] | null
          source: Database["public"]["Enums"]["CrosswordSource"]
          usedWords: string[] | null
        }[]
      }
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
      CrosswordSource: "wizium" | "aicross"
      GameType: "SOLO" | "FRIENDLY" | "RANKED"
      PlayState: "WAITING_FOR_OPPONENT" | "PLAYING" | "COMPLETED" | "ABORTED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
