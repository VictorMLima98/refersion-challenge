export type LeaderboardEntry = {
  rank: number;
  affiliateId: number;
  name: string;
  commissionCents: number;
};

export type LeaderboardResponse = {
  entries: LeaderboardEntry[];
};

export type CustomField = {
  label: string;
  value: string | null;
};

export type Affiliate = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  performance: {
    total: {
      commission: number;
    } | null;
  } | null;
};
