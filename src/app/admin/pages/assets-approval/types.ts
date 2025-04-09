export type AssetStatus = 'pending' | 'approved' | 'rejected';

export interface PendingAsset {
  id: string;
  name: string;
  type: string;
  value: number;
  description?: string;
  pdfFile?: string;
  status: AssetStatus;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface AssetTypeDistribution {
  [key: string]: number;
}

export interface AssetActionProps {
  id: string;
  action: 'approve' | 'reject';
} 