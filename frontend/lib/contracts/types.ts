// ===== Contract Data Types =====

export interface Room {
  id: string;
  host: string;
  name: string;
  max_players: number;
  num_teams: number;
  total_rounds: number;
  current_round: number;
  is_active: boolean;
  is_complete: boolean;
  player_count: number;
}

export interface Player {
  username: string;
  xp: number;
  games_played: number;
}

export interface Guess {
  guess_text: string;
  xp_awarded: number;
  explanation: string;
}

export interface RoundResult {
  [address: string]: Guess;
}

export interface LeaderboardEntry {
  username: string;
  room_xp: number;
  global_xp: number;
  team_id?: string;
}

export interface Leaderboard {
  [address: string]: LeaderboardEntry;
}

export interface TeamInfo {
  name: string;
  total_xp: number;
  member_count: number;
  members: string[];
}

export interface RoomPlayer {
  username: string;
  team_id?: string;
}

export interface TransactionReceipt {
  status: number;
  statusName: string;
  data: any;
  [key: string]: any;
}
