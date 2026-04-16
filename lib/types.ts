export interface Option {
  id: string;
  name: string;
  description: string | null;
  is_writein: boolean;
  added_by: string | null;
  created_at: string;
}

export interface Vote {
  voter_name: string;
  voter_display_name: string;
  option_id: string;
  updated_at: string;
}

export interface Tally {
  option_id: string;
  count: number;
  voters: string[];
}

export interface AppState {
  options: Option[];
  votes: Vote[];
  tallies: Record<string, Tally>;
}
