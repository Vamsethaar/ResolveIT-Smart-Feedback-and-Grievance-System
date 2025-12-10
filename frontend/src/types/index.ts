export type UserRole = 'ADMIN' | 'OFFICER' | 'CITIZEN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type SubmissionType = 'FEEDBACK' | 'GRIEVANCE';

export interface FeedbackPayload {
  title: string;
  description: string;
  isPublic: boolean;
  isAnonymous: boolean;
  photoUrl?: string | null;
  type: FeedbackType;
  submissionType: SubmissionType;
}

export interface FeedbackStatusItem {
  id: string;
  title: string;
  description?: string;
  type?: FeedbackType;
  submissionType?: SubmissionType;
  createdAt: string;
  status: 'SUBMITTED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED' | 'ESCALATED' | 'WITHDRAWN';
  lastUpdatedAt: string;
  deadline?: string | null;
  escalationLevel?: number;
  photoUrl?: string | null;
  adminMessage?: string | null;
  rating?: number | null;
  ratingComment?: string | null;
  officerName?: string | null;
  officerEmail?: string | null;
}

export interface OfficerRating {
  officerEmail: string;
  averageRating: number | null;
  totalRatings: number;
}

export interface StatisticsResponse {
  totalGrievances: number;
  totalFeedbacks: number;
  submitted: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  escalated: number;
  statusDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
  submissionTypeDistribution: Record<string, number>;
}

export type FeedbackType =
  | 'INFRASTRUCTURE'
  | 'PUBLIC_SAFETY'
  | 'HEALTH_SANITATION'
  | 'EDUCATION'
  | 'ELECTRICITY'
  | 'WATER_SUPPLY'
  | 'TRANSPORT'
  | 'ENVIRONMENT'
  | 'CORRUPTION_GOVERNANCE'
  | 'SOCIAL_WELFARE'
  | 'OTHERS';





