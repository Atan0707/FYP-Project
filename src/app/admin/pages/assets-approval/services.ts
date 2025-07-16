import { AssetActionProps } from './types';

/**
 * Fetches all assets from the API (pending, approved, rejected)
 */
export const fetchPendingAssets = async () => {
  const response = await fetch('/api/admin/pending-assets');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

/**
 * Approves or rejects an asset
 */
export const approveOrRejectAsset = async ({ id, action }: AssetActionProps) => {
  const response = await fetch(`/api/admin/pending-assets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
}; 