'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, Pencil, Trash2, FileText, Upload, Download, MapPin, X, MapPin as LocationIcon } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import {
  GoogleMap,
  LoadScript,
  Marker,
  Libraries
} from '@react-google-maps/api';
import React from 'react';

// Define libraries to load with Google Maps
const googleMapsLibraries: Libraries = ['places'];

// Extend Window interface to include Google Maps
declare global {
  interface Window {
    google?: {
      maps: {
        Geocoder: new () => {
          geocode: (
            request: { address?: string; location?: { lat: number; lng: number } },
            callback: (
              results: Array<{ formatted_address: string; geometry: { location: { lat: () => number; lng: () => number } } }>,
              status: string
            ) => void
          ) => void;
        };
        GeocoderStatus: { OK: string };
        MapMouseEvent: { latLng?: { lat: () => number; lng: () => number } };
        places: {
          AutocompleteService: new () => {
            getPlacePredictions: (
              request: {
                input: string;
                componentRestrictions?: { country: string };
              },
              callback: (
                predictions: Array<{ description: string }> | null,
                status: string
              ) => void
            ) => void;
          };
          PlacesServiceStatus: { OK: string };
        };
      };
    };
  }
}

interface Asset {
  id: string;
  name: string;
  type: string;
  value: number;
  description?: string;
  pdfFile?: string;
  createdAt?: string;
  distribution?: {
    id: string;
    type: string;
    status: string;
    agreement?: {
      id: string;
      status: string;
      adminSignedAt?: string;
    };
  } | null;
  propertyAddress?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

interface PendingAsset {
  id: string;
  name: string;
  type: string;
  value: number;
  description?: string;
  pdfFile?: string;
  status: string;
  createdAt: string;
}

interface FamilyMember {
  id: string;
  fullName: string;
  relationship: string;
}

interface FamilyAsset {
  familyMember: FamilyMember;
  assets: Array<Asset & { user: { fullName: string }, createdAt: string }>;
}

const assetTypes = [
  'Property',
  'Vehicle',
  'Investment',
  'Savings',
  'Insurance',
  'Others',
];

// API functions
const fetchAssets = async () => {
  const response = await fetch('/api/asset');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const fetchPendingAssets = async () => {
  const response = await fetch('/api/pending-asset');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const fetchFamilyAssets = async () => {
  const response = await fetch('/api/family-assets');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const createAsset = async (data: Omit<Asset, 'id'>) => {
  const response = await fetch('/api/pending-asset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const updateAsset = async ({ id, ...data }: Asset) => {
  const response = await fetch('/api/asset', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const deleteAsset = async (id: string) => {
  const response = await fetch(`/api/asset/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

// Map styles and container
const defaultCenter = {
  lat: 3.1390, // Default to Malaysia's coordinates
  lng: 101.6869,
};

// For demo purposes - replace with your actual API key in production
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyC7MA3-v6oc_rZSjyGmnjSF0dx0zLecE4o";

// Add this helper function for badge styling
const getStatusBadge = (distribution: Asset['distribution']) => {
  if (!distribution) {
    return <Badge variant="secondary">Not Yet</Badge>;
  }

  // Handle pending_admin status which means all users have signed
  if (distribution.status === 'pending_admin' || 
     (distribution.agreement && distribution.agreement.status === 'pending_admin')) {
    return (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
        Pending Admin
      </Badge>
    );
  }

  switch (distribution.status) {
    case 'in_progress':
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">In Progress</Badge>;
    case 'completed':
      if (distribution.type === 'waqf') {
        return <Badge className="bg-green-500 text-white w-full py-1 flex justify-center">{distribution.type}</Badge>;
      }
      return <Badge variant="success" className="bg-green-100 text-green-800">Completed</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="outline">{distribution.status}</Badge>;
  }
};

export default function AssetsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [currentAssetType, setCurrentAssetType] = useState(assetTypes[0]);
  const [propertyAddress, setPropertyAddress] = useState('');
  const [mapPosition, setMapPosition] = useState(defaultCenter);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  
  // Queries
  const { data: assets = [], isLoading, error } = useQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
  });

  const { 
    data: pendingAssets = [], 
    isLoading: isPendingAssetsLoading, 
    error: pendingAssetsError 
  } = useQuery<PendingAsset[]>({
    queryKey: ['pendingAssets'],
    queryFn: fetchPendingAssets,
  });

  const { 
    data: familyAssets = [], 
    isLoading: isFamilyAssetsLoading, 
    error: familyAssetsError 
  } = useQuery({
    queryKey: ['familyAssets'],
    queryFn: fetchFamilyAssets,
  });

  // Watch for changes in pendingAssets
  React.useEffect(() => {
    if (pendingAssets.some(asset => asset.status === 'approved')) {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    }
  }, [pendingAssets, queryClient]);

  // Handle marker drag end to update position
  const handleMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (!window.google || !window.google.maps) {
      return;
    }
    
    if (e.latLng) {
      setMapPosition({
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      });
      
      // Reverse geocode to get address
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat: e.latLng.lat(), lng: e.latLng.lng() } }, (results, status) => {
        if (status === window.google.maps.GeocoderStatus.OK && results && results[0]) {
          setPropertyAddress(results[0].formatted_address);
        }
      });
    }
  }, []);

  // Handle address input change with debounce for suggestions
  const handleAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPropertyAddress(value);
    
    if (value.trim().length > 2) {
      // Show suggestions panel
      setShowSuggestions(true);
      
      // Fetch suggestions using the service
      if (window.google && window.google.maps && window.google.maps.places) {
        try {
          const service = new window.google.maps.places.AutocompleteService();
          service.getPlacePredictions(
            {
              input: value,
              componentRestrictions: { country: 'my' }, // Restrict to Malaysia
            },
            (predictions, status) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                setSuggestions(predictions.map(p => p.description));
              } else {
                setSuggestions([]);
              }
            }
          );
        } catch (error) {
          console.error("Error with Places API:", error);
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: string) => {
    setPropertyAddress(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
    
    // Get coordinates for this address
    if (window.google && window.google.maps) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: suggestion }, (results, status) => {
        if (status === window.google.maps.GeocoderStatus.OK && results && results[0]) {
          const location = results[0].geometry.location;
          setMapPosition({
            lat: location.lat(),
            lng: location.lng()
          });
        }
      });
    }
  };

  // Close suggestions when clicking outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
      setShowSuggestions(false);
    }
  }, []);

  // Add event listener for clicking outside
  React.useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: createAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingAssets'] });
      toast.success('Asset submitted for approval');
      setIsOpen(false);
      setUploadedFilePath(null);
      setPropertyAddress('');
      setMapPosition(defaultCenter);
    },
    onError: (error) => {
      toast.error('Failed to add asset: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset updated successfully');
      setIsOpen(false);
      setUploadedFilePath(null);
      setPropertyAddress('');
      setMapPosition(defaultCenter);
    },
    onError: (error) => {
      toast.error('Failed to update asset: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete asset: ' + error.message);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/uploadFile', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload file');
      }

      const data = await response.json();
      setUploadedFilePath(data.fileUrl);
      toast.success('File uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload file: ' + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const assetData = {
      name: formData.get('name') as string,
      type: formData.get('type') as string,
      value: parseFloat(formData.get('value') as string),
      description: formData.get('description') as string,
      pdfFile: uploadedFilePath || editingAsset?.pdfFile,
      // Add property address and location for property type
      propertyAddress: currentAssetType === 'Property' ? propertyAddress : undefined,
      location: currentAssetType === 'Property' ? mapPosition : undefined,
    };

    if (editingAsset) {
      updateMutation.mutate({ ...assetData, id: editingAsset.id });
    } else {
      if (!assetData.pdfFile) {
        toast.error('Please upload a PDF file');
        return;
      }
      createMutation.mutate(assetData);
    }
  };

  const handleOpenDialog = (asset: Asset | null = null) => {
    setEditingAsset(asset);
    setUploadedFilePath(null);
    if (asset) {
      setCurrentAssetType(asset.type);
      setPropertyAddress(asset.propertyAddress || '');
      setMapPosition(asset.location || defaultCenter);
    } else {
      setCurrentAssetType(assetTypes[0]);
      setPropertyAddress('');
      setMapPosition(defaultCenter);
    }
    setIsOpen(true);
  };

  const handleAssetTypeChange = (value: string) => {
    setCurrentAssetType(value);
  };

  if (isLoading) {
    return <div className="p-4 flex justify-center">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {(error as Error).message}</div>;
  }

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Assets</h1>

        {/* Add assets */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-3xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>{editingAsset ? 'Edit' : 'Add'} Asset</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Asset Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingAsset?.name}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Asset Type</Label>
                  <Select 
                    name="type" 
                    defaultValue={editingAsset?.type || assetTypes[0]}
                    onValueChange={handleAssetTypeChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset type" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="value">Value (RM)</Label>
                  <Input
                    id="value"
                    name="value"
                    type="number"
                    step="0.01"
                    defaultValue={editingAsset?.value}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    name="description"
                    defaultValue={editingAsset?.description}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pdfFile">PDF Document</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Label
                      htmlFor="pdfFile"
                      className="flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? 'Uploading...' : 'Upload PDF'}
                    </Label>
                    <Input
                      id="pdfFile"
                      name="pdfFile"
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      disabled={uploading}
                    />
                    {(uploadedFilePath || editingAsset?.pdfFile) && (
                      <span className="text-sm text-green-600 flex items-center">
                        <FileText className="mr-1 h-4 w-4" /> PDF uploaded
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload a PDF document (max 5MB)
                  </p>
                </div>

                {/* Property Address and Google Maps Integration */}
                {currentAssetType === 'Property' && (
                  <div className="grid gap-4 mt-4 border-t pt-4">
                    <div className="grid gap-2">
                      <Label htmlFor="propertyAddress" className="flex items-center">
                        <LocationIcon className="mr-2 h-4 w-4" />
                        Property Address
                      </Label>
                      <div className="flex flex-wrap items-center gap-2 relative">
                        <Input
                          id="propertyAddress"
                          value={propertyAddress}
                          onChange={handleAddressChange}
                          placeholder="Enter property address"
                          className="flex-grow min-w-[200px] pr-10"
                          ref={inputRef}
                        />
                        {propertyAddress && (
                          <button
                            type="button"
                            onClick={() => {
                              setPropertyAddress('');
                              setSuggestions([]);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          className="mt-2 sm:mt-0 w-full sm:w-auto"
                          onClick={() => {
                            if (propertyAddress && window.google?.maps) {
                              const geocoder = new window.google.maps.Geocoder();
                              geocoder.geocode({ address: propertyAddress }, (results, status) => {
                                if (status === window.google.maps.GeocoderStatus.OK && results?.[0]) {
                                  const location = results[0].geometry.location;
                                  setMapPosition({
                                    lat: location.lat(),
                                    lng: location.lng()
                                  });
                                } else {
                                  toast.error("Could not find this address on the map");
                                }
                              });
                            }
                          }}
                        >
                          Find on Map
                        </Button>

                        {/* Address suggestions */}
                        {showSuggestions && suggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-[200px] overflow-y-auto">
                            <ul className="py-1">
                              {suggestions.map((suggestion, index) => (
                                <li 
                                  key={index}
                                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-start"
                                  onClick={() => handleSelectSuggestion(suggestion)}
                                >
                                  <MapPin className="h-4 w-4 mr-2 mt-0.5 shrink-0 text-gray-500" />
                                  <span className="text-sm">{suggestion}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Enter the property&apos;s address or drop a pin on the map
                      </p>
                    </div>
                    
                    <LoadScript 
                      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
                      libraries={googleMapsLibraries}
                      loadingElement={<div className="h-[200px] sm:h-[250px] w-full bg-slate-100 animate-pulse rounded-md"></div>}
                    >
                      <div className="rounded-md overflow-hidden border w-full max-w-full">
                        <GoogleMap
                          mapContainerStyle={{
                            width: '100%',
                            height: '200px',
                            borderRadius: '0.375rem',
                          }}
                          center={mapPosition}
                          zoom={15}
                          options={{
                            zoomControl: true,
                            mapTypeControl: false,
                            streetViewControl: false,
                            fullscreenControl: false,
                          }}
                        >
                          <Marker
                            position={mapPosition}
                            draggable={true}
                            onDragEnd={handleMarkerDragEnd}
                          />
                        </GoogleMap>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Note: To use this feature in production, you need to set up a Google Maps API key in your .env.local file.
                      </p>
                    </LoadScript>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={uploading}>
                {editingAsset ? 'Update' : 'Submit for Approval'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* My Assets Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">My Assets</h2>
          
          {/* Desktop view - Table */}
          <div className="hidden md:block border rounded-lg overflow-x-auto">
            <div className="min-w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Distribution</TableHead>
                    <TableHead>Created On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6 text-red-500">
                        Error loading assets: {(error as Error).message}
                      </TableCell>
                    </TableRow>
                  ) : assets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                        No assets found. Add your first asset using the button above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    assets.map((asset: Asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">
                          <a 
                            href={`/pages/assets/${asset.id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                          >
                            {asset.name}
                          </a>
                        </TableCell>
                        <TableCell>{asset.type}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat('en-MY', {
                            style: 'currency',
                            currency: 'MYR',
                          }).format(asset.value)}
                        </TableCell>
                        <TableCell>{asset.description || '-'}</TableCell>
                        <TableCell>
                          {asset.pdfFile ? (
                            <a
                              href={`/api/download/${encodeURIComponent(asset.pdfFile.replace('https://storage.googleapis.com/', ''))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-blue-600 hover:text-blue-800"
                            >
                              <Download className="mr-1 h-4 w-4" />
                              View PDF
                            </a>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(asset.distribution)}</TableCell>
                        <TableCell>{format(new Date(asset.createdAt || ''), 'dd/MM/yy')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(asset)}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="hidden sm:inline ml-1">Edit</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => deleteMutation.mutate(asset.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="hidden sm:inline ml-1">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile view - Cards */}
          <div className="md:hidden space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="text-center py-6 text-red-500">
                Error loading assets: {(error as Error).message}
              </div>
            ) : assets.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground border rounded-lg">
                No assets found. Add your first asset using the button above.
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                {assets.map((asset: Asset) => (
                  <div key={asset.id} className="border-b last:border-b-0">
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <a 
                            href={`/pages/assets/${asset.id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium block mb-1"
                          >
                            {asset.name}
                          </a>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            {asset.type} •
                            <span className="font-medium">
                              RM {asset.value.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500"
                            onClick={() => handleOpenDialog(asset)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500"
                            onClick={() => deleteMutation.mutate(asset.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {asset.pdfFile && (
                            <a
                              href={`/api/download/${encodeURIComponent(asset.pdfFile.replace('https://storage.googleapis.com/', ''))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-blue-600"
                            >
                              <Download className="mr-1 h-4 w-4" />
                              <span className="text-sm">PDF</span>
                            </a>
                          )}
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(asset.createdAt || ''), 'dd/MM/yy')}
                          </span>
                        </div>
                        
                        <div className="text-right">
                          {asset.distribution?.status === 'completed' && asset.distribution?.type === 'waqf' ? (
                            <div className="mt-1 text-center">
                              <Badge className="bg-green-500 text-white px-4 py-1">
                                waqf
                              </Badge>
                              <div className="text-xs text-muted-foreground mt-1">Completed</div>
                            </div>
                          ) : asset.distribution?.status === 'in_progress' ? (
                            <div className="text-sm text-blue-800">In Progress</div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              {asset.distribution?.status || 'Not Yet'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pending Assets Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Pending Approval</h2>
          
          {/* Desktop view */}
          <div className="hidden md:block border rounded-lg overflow-x-auto">
            <div className="min-w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Name</TableHead>
                    <TableHead className="hidden md:table-cell">Type</TableHead>
                    <TableHead className="hidden md:table-cell">Value (RM)</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead className="hidden md:table-cell">Document</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Submitted On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isPendingAssetsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : pendingAssetsError ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-red-500">
                        Error loading pending assets: {(pendingAssetsError as Error).message}
                      </TableCell>
                    </TableRow>
                  ) : pendingAssets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                        No pending assets found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingAssets.map((asset: PendingAsset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">
                          {asset.name}
                          <div className="md:hidden text-xs text-muted-foreground mt-1">
                            {asset.type} • RM{asset.value.toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{asset.type}</TableCell>
                        <TableCell className="hidden md:table-cell">{asset.value.toFixed(2)}</TableCell>
                        <TableCell className="hidden md:table-cell">{asset.description}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {asset.pdfFile ? (
                            <a
                              href={`/api/download/${encodeURIComponent(asset.pdfFile.replace('https://storage.googleapis.com/', ''))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-blue-600 hover:text-blue-800"
                            >
                              <Download className="mr-1 h-4 w-4" />
                              <span className="hidden sm:inline">View PDF</span>
                            </a>
                          ) : (
                            <span className="text-gray-400">No document</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {asset.status === 'pending' && (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                          {asset.status === 'approved' && (
                            <Badge variant="success">Approved</Badge>
                          )}
                          {asset.status === 'rejected' && (
                            <Badge variant="destructive">Rejected</Badge>
                          )}
                          <div className="md:hidden mt-2 flex flex-wrap gap-2 text-xs">
                            {asset.pdfFile && (
                              <a
                                href={`/api/download/${encodeURIComponent(asset.pdfFile.replace('https://storage.googleapis.com/', ''))}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-blue-600"
                              >
                                <Download className="mr-1 h-3 w-3" />
                                PDF
                              </a>
                            )}
                            <span>{format(new Date(asset.createdAt), 'dd/MM/yy')}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {format(new Date(asset.createdAt), 'dd/MM/yyyy')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          
          {/* Mobile view - Cards */}
          <div className="md:hidden space-y-4">
            {isPendingAssetsLoading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : pendingAssetsError ? (
              <div className="text-center py-6 text-red-500">
                Error loading pending assets: {(pendingAssetsError as Error).message}
              </div>
            ) : pendingAssets.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground border rounded-lg">
                No pending assets found.
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                {pendingAssets.map((asset: PendingAsset) => (
                  <div key={asset.id} className="border-b last:border-b-0 p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium mb-1">{asset.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          {asset.type} •
                          <span className="font-medium">
                            RM {asset.value.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div>
                        {asset.status === 'pending' && (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                        {asset.status === 'approved' && (
                          <Badge variant="success">Approved</Badge>
                        )}
                        {asset.status === 'rejected' && (
                          <Badge variant="destructive">Rejected</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {asset.pdfFile && (
                          <a
                            href={`/api/download/${encodeURIComponent(asset.pdfFile.replace('https://storage.googleapis.com/', ''))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-blue-600"
                          >
                            <Download className="mr-1 h-4 w-4" />
                            <span className="text-sm">PDF</span>
                          </a>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(asset.createdAt), 'dd/MM/yy')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Family Assets Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Family Assets</h2>
          {isFamilyAssetsLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : familyAssetsError ? (
            <div className="text-center py-10 text-red-500">
              Error loading family assets: {(familyAssetsError as Error).message}
            </div>
          ) : familyAssets.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border rounded-lg">
              No family members with assets found. Family members need to be registered users and have assets for them to appear here.
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {familyAssets.map((familyAssetGroup: FamilyAsset) => (
                <AccordionItem 
                  key={familyAssetGroup.familyMember.id} 
                  value={familyAssetGroup.familyMember.id}
                >
                  <AccordionTrigger className="hover:bg-accent hover:text-accent-foreground px-4 rounded-md">
                    <div className="flex flex-wrap items-center gap-y-2">
                      <span className="font-medium mr-2">{familyAssetGroup.familyMember.fullName}</span>
                      <Badge variant="outline" className="capitalize">
                        {familyAssetGroup.familyMember.relationship}
                      </Badge>
                      <Badge variant="secondary" className="ml-2">
                        {familyAssetGroup.assets.length} assets
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="border rounded-lg mt-2 overflow-x-auto">
                      <div className="min-w-full">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[120px]">Name</TableHead>
                              <TableHead className="hidden md:table-cell">Type</TableHead>
                              <TableHead className="hidden md:table-cell">Value (RM)</TableHead>
                              <TableHead className="hidden md:table-cell">Description</TableHead>
                              <TableHead className="hidden md:table-cell">Document</TableHead>
                              <TableHead className="hidden md:table-cell">Added On</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {familyAssetGroup.assets.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                                  No assets found for this family member.
                                </TableCell>
                              </TableRow>
                            ) : (
                              familyAssetGroup.assets.map((asset) => (
                                <TableRow key={asset.id}>
                                  <TableCell className="font-medium">
                                    <a 
                                      href={`/pages/assets/${asset.id}`}
                                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                    >
                                      {asset.name}
                                    </a>
                                    <div className="md:hidden text-xs text-muted-foreground mt-1">
                                      {asset.type} • RM{asset.value.toFixed(2)}
                                      <br />
                                      {format(new Date(asset.createdAt || ''), 'dd/MM/yy')}
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">{asset.type}</TableCell>
                                  <TableCell className="hidden md:table-cell">{asset.value.toFixed(2)}</TableCell>
                                  <TableCell className="hidden md:table-cell">{asset.description}</TableCell>
                                  <TableCell className="hidden md:table-cell">
                                    {asset.pdfFile ? (
                                      <a
                                        href={`/api/download/${encodeURIComponent(asset.pdfFile.replace('https://storage.googleapis.com/', ''))}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center text-blue-600 hover:text-blue-800"
                                      >
                                        <Download className="mr-1 h-4 w-4" />
                                        <span className="hidden sm:inline">View PDF</span>
                                      </a>
                                    ) : (
                                      <span className="text-gray-400">No document</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">
                                    {format(new Date(asset.createdAt || ''), 'dd/MM/yyyy')}
                                  </TableCell>
                                  <TableCell className="md:hidden">
                                    {asset.pdfFile && (
                                      <a
                                        href={`/api/download/${encodeURIComponent(asset.pdfFile.replace('https://storage.googleapis.com/', ''))}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center text-blue-600 hover:text-blue-800"
                                      >
                                        <Download className="h-4 w-4" />
                                      </a>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>
    </div>
  );
}