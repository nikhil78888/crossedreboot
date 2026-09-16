export type Json = string | number | boolean | null | {
    [key: string]: Json | undefined;
} | Json[];
export interface Database {
    public: {
        Tables: {
            _prisma_migrations: {
                Row: {
                    applied_steps_count: number;
                    checksum: string;
                    finished_at: string | null;
                    id: string;
                    logs: string | null;
                    migration_name: string;
                    rolled_back_at: string | null;
                    started_at: string;
                };
                Insert: {
                    applied_steps_count?: number;
                    checksum: string;
                    finished_at?: string | null;
                    id: string;
                    logs?: string | null;
                    migration_name: string;
                    rolled_back_at?: string | null;
                    started_at?: string;
                };
                Update: {
                    applied_steps_count?: number;
                    checksum?: string;
                    finished_at?: string | null;
                    id?: string;
                    logs?: string | null;
                    migration_name?: string;
                    rolled_back_at?: string | null;
                    started_at?: string;
                };
                Relationships: [];
            };
            crosswords: {
                Row: {
                    category: Database["public"]["Enums"]["CrosswordCategory"];
                    clues: Json;
                    createdAt: string;
                    difficulty: number;
                    id: string;
                    isPublished: boolean;
                    puzzle: string[] | null;
                    size: number;
                    solution: string[] | null;
                    source: Database["public"]["Enums"]["CrosswordSource"];
                    usedWords: string[] | null;
                };
                Insert: {
                    category: Database["public"]["Enums"]["CrosswordCategory"];
                    clues: Json;
                    createdAt?: string;
                    difficulty: number;
                    id?: string;
                    isPublished: boolean;
                    puzzle?: string[] | null;
                    size: number;
                    solution?: string[] | null;
                    source: Database["public"]["Enums"]["CrosswordSource"];
                    usedWords?: string[] | null;
                };
                Update: {
                    category?: Database["public"]["Enums"]["CrosswordCategory"];
                    clues?: Json;
                    createdAt?: string;
                    difficulty?: number;
                    id?: string;
                    isPublished?: boolean;
                    puzzle?: string[] | null;
                    size?: number;
                    solution?: string[] | null;
                    source?: Database["public"]["Enums"]["CrosswordSource"];
                    usedWords?: string[] | null;
                };
                Relationships: [];
            };
            gamePlayers: {
                Row: {
                    gamesId: string;
                    profilesId: string;
                    score: number;
                };
                Insert: {
                    gamesId: string;
                    profilesId: string;
                    score?: number;
                };
                Update: {
                    gamesId?: string;
                    profilesId?: string;
                    score?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: "gamePlayers_gamesId_fkey";
                        columns: ["gamesId"];
                        isOneToOne: false;
                        referencedRelation: "games";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "gamePlayers_profilesId_fkey";
                        columns: ["profilesId"];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "gamePlayers_profilesId_fkey";
                        columns: ["profilesId"];
                        isOneToOne: false;
                        referencedRelation: "random_bot_profiles";
                        referencedColumns: ["id"];
                    }
                ];
            };
            games: {
                Row: {
                    createdAt: string;
                    crosswordsId: string | null;
                    gameDurationInSeconds: number;
                    gameState: Json | null;
                    gameType: Database["public"]["Enums"]["GameType"];
                    id: string;
                    playState: Database["public"]["Enums"]["PlayState"];
                    startedAt: string | null;
                    winnerId: string | null;
                    rematchGamesId: string | null;
                    invitedProfileId: string | null;
                    gameVariant: string;
                    sudokusId: string | null;
                    resolvedClues: Json | null;
                    difficulty: string;
                };
                Insert: {
                    createdAt?: string;
                    crosswordsId?: string | null;
                    gameDurationInSeconds: number;
                    gameState?: Json | null;
                    gameType: Database["public"]["Enums"]["GameType"];
                    id?: string;
                    playState: Database["public"]["Enums"]["PlayState"];
                    startedAt?: string | null;
                    winnerId?: string | null;
                    rematchGamesId?: string | null;
                    invitedProfileId?: string | null;
                    gameVariant?: string;
                    sudokusId?: string | null;
                    resolvedClues?: Json | null;
                    difficulty?: string;
                };
                Update: {
                    createdAt?: string;
                    crosswordsId?: string | null;
                    gameDurationInSeconds?: number;
                    gameState?: Json | null;
                    gameType?: Database["public"]["Enums"]["GameType"];
                    id?: string;
                    playState?: Database["public"]["Enums"]["PlayState"];
                    startedAt?: string | null;
                    winnerId?: string | null;
                    rematchGamesId?: string | null;
                    invitedProfileId?: string | null;
                    gameVariant?: string;
                    sudokusId?: string | null;
                    resolvedClues?: Json | null;
                    difficulty?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "games_crosswordsId_fkey";
                        columns: ["crosswordsId"];
                        isOneToOne: false;
                        referencedRelation: "crosswords";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "games_crosswordsId_fkey";
                        columns: ["crosswordsId"];
                        isOneToOne: false;
                        referencedRelation: "random_crossword";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "games_winnerId_fkey";
                        columns: ["winnerId"];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "games_winnerId_fkey";
                        columns: ["winnerId"];
                        isOneToOne: false;
                        referencedRelation: "random_bot_profiles";
                        referencedColumns: ["id"];
                    }
                ];
            };
            sudokus: {
                Row: {
                    id: string;
                    puzzle: Json;
                    solution: Json;
                    difficulty: string;
                    isPublished: boolean;
                    createdAt: string;
                };
                Insert: {
                    id?: string;
                    puzzle: Json;
                    solution: Json;
                    difficulty?: string;
                    isPublished?: boolean;
                    createdAt?: string;
                };
                Update: {
                    id?: string;
                    puzzle?: Json;
                    solution?: Json;
                    difficulty?: string;
                    isPublished?: boolean;
                    createdAt?: string;
                };
                Relationships: [];
            };
            friendships: {
                Row: {
                    id: string;
                    requesterId: string;
                    addresseeId: string;
                    status: string;
                    createdAt: string;
                    updatedAt: string;
                };
                Insert: {
                    id?: string;
                    requesterId: string;
                    addresseeId: string;
                    status?: string;
                    createdAt?: string;
                    updatedAt?: string;
                };
                Update: {
                    id?: string;
                    requesterId?: string;
                    addresseeId?: string;
                    status?: string;
                    createdAt?: string;
                    updatedAt?: string;
                };
                Relationships: [];
            };
            analyticsEvents: {
                Row: {
                    id: string;
                    name: string;
                    profilesId: string | null;
                    properties: Json | null;
                    platform: string | null;
                    createdAt: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    profilesId?: string | null;
                    properties?: Json | null;
                    platform?: string | null;
                    createdAt?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    profilesId?: string | null;
                    properties?: Json | null;
                    platform?: string | null;
                    createdAt?: string;
                };
                Relationships: [];
            };
            tournamentQueue: {
                Row: {
                    profilesId: string;
                    gameVariant: string;
                    difficulty: string;
                    joinedAt: string;
                };
                Insert: {
                    profilesId: string;
                    gameVariant?: string;
                    difficulty?: string;
                    joinedAt?: string;
                };
                Update: {
                    profilesId?: string;
                    gameVariant?: string;
                    difficulty?: string;
                    joinedAt?: string;
                };
                Relationships: [];
            };
            rankedQueue: {
                Row: {
                    profilesId: string;
                    rating: number;
                    joinedAt: string;
                    lastSeenAt: string;
                    gameVariant: string;
                    difficulty: string;
                };
                Insert: {
                    profilesId: string;
                    rating?: number;
                    joinedAt?: string;
                    lastSeenAt?: string;
                    gameVariant?: string;
                    difficulty?: string;
                };
                Update: {
                    profilesId?: string;
                    rating?: number;
                    joinedAt?: string;
                    lastSeenAt?: string;
                    gameVariant?: string;
                    difficulty?: string;
                };
                Relationships: [];
            };
            tournaments: {
                Row: {
                    id: string;
                    status: string;
                    size: number;
                    winnerId: string | null;
                    createdAt: string;
                    startedAt: string | null;
                    completedAt: string | null;
                    gameVariant: string;
                    isPrivate: boolean;
                    createdByProfileId: string | null;
                    difficulty: string;
                };
                Insert: {
                    id?: string;
                    status?: string;
                    size?: number;
                    winnerId?: string | null;
                    createdAt?: string;
                    startedAt?: string | null;
                    completedAt?: string | null;
                    gameVariant?: string;
                    isPrivate?: boolean;
                    createdByProfileId?: string | null;
                    difficulty?: string;
                };
                Update: {
                    id?: string;
                    status?: string;
                    size?: number;
                    winnerId?: string | null;
                    createdAt?: string;
                    startedAt?: string | null;
                    completedAt?: string | null;
                    gameVariant?: string;
                    isPrivate?: boolean;
                    createdByProfileId?: string | null;
                    difficulty?: string;
                };
                Relationships: [];
            };
            tournamentInvites: {
                Row: {
                    id: string;
                    tournamentsId: string;
                    invitedProfileId: string;
                    status: string;
                    createdAt: string;
                };
                Insert: {
                    id?: string;
                    tournamentsId: string;
                    invitedProfileId: string;
                    status?: string;
                    createdAt?: string;
                };
                Update: {
                    id?: string;
                    tournamentsId?: string;
                    invitedProfileId?: string;
                    status?: string;
                    createdAt?: string;
                };
                Relationships: [];
            };
            seenClues: {
                Row: {
                    profilesId: string;
                    word: string;
                    clue: string;
                    createdAt: string;
                };
                Insert: {
                    profilesId: string;
                    word: string;
                    clue: string;
                    createdAt?: string;
                };
                Update: {
                    profilesId?: string;
                    word?: string;
                    clue?: string;
                    createdAt?: string;
                };
                Relationships: [];
            };
            wordClues: {
                Row: {
                    id: string;
                    word: string;
                    clue: string;
                    difficulty: string;
                };
                Insert: {
                    id?: string;
                    word: string;
                    clue: string;
                    difficulty?: string;
                };
                Update: {
                    id?: string;
                    word?: string;
                    clue?: string;
                    difficulty?: string;
                };
                Relationships: [];
            };
            tournamentPlayers: {
                Row: {
                    id: string;
                    tournamentsId: string;
                    profilesId: string;
                    seat: number | null;
                    isBot: boolean;
                    eliminated: boolean;
                    joinedAt: string;
                };
                Insert: {
                    id?: string;
                    tournamentsId: string;
                    profilesId: string;
                    seat?: number | null;
                    isBot?: boolean;
                    eliminated?: boolean;
                    joinedAt?: string;
                };
                Update: {
                    id?: string;
                    tournamentsId?: string;
                    profilesId?: string;
                    seat?: number | null;
                    isBot?: boolean;
                    eliminated?: boolean;
                    joinedAt?: string;
                };
                Relationships: [];
            };
            tournamentMatches: {
                Row: {
                    id: string;
                    tournamentsId: string;
                    round: number;
                    matchIndex: number;
                    playerOneId: string | null;
                    playerTwoId: string | null;
                    gamesId: string | null;
                    winnerId: string | null;
                    status: string;
                    createdAt: string;
                };
                Insert: {
                    id?: string;
                    tournamentsId: string;
                    round: number;
                    matchIndex: number;
                    playerOneId?: string | null;
                    playerTwoId?: string | null;
                    gamesId?: string | null;
                    winnerId?: string | null;
                    status?: string;
                    createdAt?: string;
                };
                Update: {
                    id?: string;
                    tournamentsId?: string;
                    round?: number;
                    matchIndex?: number;
                    playerOneId?: string | null;
                    playerTwoId?: string | null;
                    gamesId?: string | null;
                    winnerId?: string | null;
                    status?: string;
                    createdAt?: string;
                };
                Relationships: [];
            };
            profiles: {
                Row: {
                    avatar: string | null;
                    country: string | null;
                    createdAt: string;
                    eloRating: number;
                    ratingDeviation: number;
                    volatility: number;
                    eloRatingSudoku: number;
                    ratingDeviationSudoku: number;
                    volatilitySudoku: number;
                    eloRatingWordSearch: number;
                    ratingDeviationWordSearch: number;
                    volatilityWordSearch: number;
                    eloRatingTrivia: number;
                    ratingDeviationTrivia: number;
                    volatilityTrivia: number;
                    email: string | null;
                    id: string;
                    name: string | null;
                    type: Database["public"]["Enums"]["ProfileType"];
                    userId: string;
                    username: string;
                    lastSeenAt: string | null;
                };
                Insert: {
                    avatar?: string | null;
                    country?: string | null;
                    createdAt?: string;
                    eloRating?: number;
                    ratingDeviation?: number;
                    volatility?: number;
                    eloRatingSudoku?: number;
                    ratingDeviationSudoku?: number;
                    volatilitySudoku?: number;
                    eloRatingWordSearch?: number;
                    ratingDeviationWordSearch?: number;
                    volatilityWordSearch?: number;
                    eloRatingTrivia?: number;
                    ratingDeviationTrivia?: number;
                    volatilityTrivia?: number;
                    email?: string | null;
                    id?: string;
                    name?: string | null;
                    type?: Database["public"]["Enums"]["ProfileType"];
                    userId: string;
                    username: string;
                    lastSeenAt?: string | null;
                };
                Update: {
                    avatar?: string | null;
                    country?: string | null;
                    createdAt?: string;
                    eloRating?: number;
                    ratingDeviation?: number;
                    volatility?: number;
                    eloRatingSudoku?: number;
                    ratingDeviationSudoku?: number;
                    volatilitySudoku?: number;
                    eloRatingWordSearch?: number;
                    ratingDeviationWordSearch?: number;
                    volatilityWordSearch?: number;
                    eloRatingTrivia?: number;
                    ratingDeviationTrivia?: number;
                    volatilityTrivia?: number;
                    email?: string | null;
                    id?: string;
                    name?: string | null;
                    type?: Database["public"]["Enums"]["ProfileType"];
                    userId?: string;
                    username?: string;
                    lastSeenAt?: string | null;
                };
                Relationships: [];
            };
            words: {
                Row: {
                    clue: string | null;
                    id: number;
                    lastUsed: string | null;
                    score: number | null;
                    word: string;
                    wordLength: number;
                };
                Insert: {
                    clue?: string | null;
                    id?: number;
                    lastUsed?: string | null;
                    score?: number | null;
                    word: string;
                    wordLength?: number;
                };
                Update: {
                    clue?: string | null;
                    id?: number;
                    lastUsed?: string | null;
                    score?: number | null;
                    word?: string;
                    wordLength?: number;
                };
                Relationships: [];
            };
        };
        Views: {
            random_bot_profiles: {
                Row: {
                    avatar: string | null;
                    country: string | null;
                    createdAt: string | null;
                    eloRating: number | null;
                    email: string | null;
                    id: string | null;
                    name: string | null;
                    type: Database["public"]["Enums"]["ProfileType"] | null;
                    userId: string | null;
                    username: string | null;
                };
                Insert: {
                    avatar?: string | null;
                    country?: string | null;
                    createdAt?: string | null;
                    eloRating?: number | null;
                    email?: string | null;
                    id?: string | null;
                    name?: string | null;
                    type?: Database["public"]["Enums"]["ProfileType"] | null;
                    userId?: string | null;
                    username?: string | null;
                };
                Update: {
                    avatar?: string | null;
                    country?: string | null;
                    createdAt?: string | null;
                    eloRating?: number | null;
                    email?: string | null;
                    id?: string | null;
                    name?: string | null;
                    type?: Database["public"]["Enums"]["ProfileType"] | null;
                    userId?: string | null;
                    username?: string | null;
                };
                Relationships: [];
            };
            random_crossword: {
                Row: {
                    category: Database["public"]["Enums"]["CrosswordCategory"] | null;
                    clues: Json | null;
                    createdAt: string | null;
                    difficulty: number | null;
                    id: string | null;
                    isPublished: boolean | null;
                    puzzle: string[] | null;
                    size: number | null;
                    solution: string[] | null;
                    source: Database["public"]["Enums"]["CrosswordSource"] | null;
                    usedWords: string[] | null;
                };
                Insert: {
                    category?: Database["public"]["Enums"]["CrosswordCategory"] | null;
                    clues?: Json | null;
                    createdAt?: string | null;
                    difficulty?: number | null;
                    id?: string | null;
                    isPublished?: boolean | null;
                    puzzle?: string[] | null;
                    size?: number | null;
                    solution?: string[] | null;
                    source?: Database["public"]["Enums"]["CrosswordSource"] | null;
                    usedWords?: string[] | null;
                };
                Update: {
                    category?: Database["public"]["Enums"]["CrosswordCategory"] | null;
                    clues?: Json | null;
                    createdAt?: string | null;
                    difficulty?: number | null;
                    id?: string | null;
                    isPublished?: boolean | null;
                    puzzle?: string[] | null;
                    size?: number | null;
                    solution?: string[] | null;
                    source?: Database["public"]["Enums"]["CrosswordSource"] | null;
                    usedWords?: string[] | null;
                };
                Relationships: [];
            };
            random_words: {
                Row: {
                    clue: string | null;
                    id: number | null;
                    score: number | null;
                    word: string | null;
                    wordLength: number | null;
                };
                Insert: {
                    clue?: string | null;
                    id?: number | null;
                    score?: number | null;
                    word?: string | null;
                    wordLength?: number | null;
                };
                Update: {
                    clue?: string | null;
                    id?: number | null;
                    score?: number | null;
                    word?: string | null;
                    wordLength?: number | null;
                };
                Relationships: [];
            };
        };
        Functions: {
            claim_tournament_seat: {
                Args: {
                    p_tournament: string;
                    p_profile: string;
                    p_is_bot?: boolean;
                };
                Returns: string;
            };
            claim_tournament_start: {
                Args: {
                    p_tournament: string;
                };
                Returns: boolean;
            };
            acquire_matchmaker_lease: {
                Args: {
                    p_holder: string;
                    p_ttl_seconds: number;
                };
                Returns: boolean;
            };
            acquire_lease: {
                Args: {
                    p_name: string;
                    p_holder: string;
                    p_ttl_seconds: number;
                };
                Returns: boolean;
            };
            prune_seen_clues: {
                Args: Record<string, never>;
                Returns: undefined;
            };
            head_to_head: {
                Args: {
                    viewer_id: string;
                    opponent_id: string;
                };
                Returns: {
                    viewer_wins: number;
                    opponent_wins: number;
                    ties: number;
                    total: number;
                }[];
            };
            get_available_crossword: {
                Args: {
                    profileid: string;
                };
                Returns: {
                    id: string;
                    size: number;
                    difficulty: number;
                    isPublished: boolean;
                    source: Database["public"]["Enums"]["CrosswordSource"];
                    category: Database["public"]["Enums"]["CrosswordCategory"];
                    puzzle: string[];
                    solution: string[];
                    clues: Json;
                    createdAt: string;
                    usedWords: string[];
                }[];
            };
            get_available_ranked_crossword: {
                Args: {
                    player_one_id: string;
                    player_two_id: string;
                };
                Returns: {
                    category: Database["public"]["Enums"]["CrosswordCategory"];
                    clues: Json;
                    createdAt: string;
                    difficulty: number;
                    id: string;
                    isPublished: boolean;
                    puzzle: string[] | null;
                    size: number;
                    solution: string[] | null;
                    source: Database["public"]["Enums"]["CrosswordSource"];
                    usedWords: string[] | null;
                }[];
            };
            get_available_sudoku: {
                Args: {
                    profileid: string;
                    is_hard?: boolean;
                };
                Returns: {
                    id: string;
                    puzzle: Json;
                    solution: Json;
                    difficulty: string;
                    isPublished: boolean;
                    createdAt: string;
                }[];
            };
            get_available_ranked_sudoku: {
                Args: {
                    player_one_id: string;
                    player_two_id: string;
                    is_hard?: boolean;
                };
                Returns: {
                    id: string;
                    puzzle: Json;
                    solution: Json;
                    difficulty: string;
                    isPublished: boolean;
                    createdAt: string;
                }[];
            };
        };
        Enums: {
            CrosswordCategory: "general" | "sports" | "history" | "geography" | "science" | "politics" | "movies" | "television" | "pop_culture";
            CrosswordSource: "wizium" | "aicross";
            GameType: "SOLO" | "FRIENDLY" | "RANKED" | "RANKED_BOT" | "TOURNAMENT";
            PlayState: "WAITING_FOR_OPPONENT" | "PLAYING" | "COMPLETED" | "ABORTED";
            ProfileType: "USER" | "BOT";
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
}
export type Tables<PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] & Database["public"]["Views"]) | {
    schema: keyof Database;
}, TableName extends PublicTableNameOrOptions extends {
    schema: keyof Database;
} ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] & Database[PublicTableNameOrOptions["schema"]]["Views"]) : never = never> = PublicTableNameOrOptions extends {
    schema: keyof Database;
} ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] & Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
    Row: infer R;
} ? R : never : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] & Database["public"]["Views"]) ? (Database["public"]["Tables"] & Database["public"]["Views"])[PublicTableNameOrOptions] extends {
    Row: infer R;
} ? R : never : never;
export type TablesInsert<PublicTableNameOrOptions extends keyof Database["public"]["Tables"] | {
    schema: keyof Database;
}, TableName extends PublicTableNameOrOptions extends {
    schema: keyof Database;
} ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"] : never = never> = PublicTableNameOrOptions extends {
    schema: keyof Database;
} ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I;
} ? I : never : PublicTableNameOrOptions extends keyof Database["public"]["Tables"] ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I;
} ? I : never : never;
export type TablesUpdate<PublicTableNameOrOptions extends keyof Database["public"]["Tables"] | {
    schema: keyof Database;
}, TableName extends PublicTableNameOrOptions extends {
    schema: keyof Database;
} ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"] : never = never> = PublicTableNameOrOptions extends {
    schema: keyof Database;
} ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U;
} ? U : never : PublicTableNameOrOptions extends keyof Database["public"]["Tables"] ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U;
} ? U : never : never;
export type Enums<PublicEnumNameOrOptions extends keyof Database["public"]["Enums"] | {
    schema: keyof Database;
}, EnumName extends PublicEnumNameOrOptions extends {
    schema: keyof Database;
} ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"] : never = never> = PublicEnumNameOrOptions extends {
    schema: keyof Database;
} ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName] : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"] ? Database["public"]["Enums"][PublicEnumNameOrOptions] : never;
//# sourceMappingURL=supabase-types.d.ts.map