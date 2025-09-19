import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PhotoUploadProps {
  currentAvatar?: string;
  onAvatarChange: (url: string) => void;
  userName?: string;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({ 
  currentAvatar, 
  onAvatarChange, 
  userName 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPreviewUrl(result);
      };
      reader.readAsDataURL(file);

      // Create a data URL that will persist
      const dataURL = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
      
      // Save to localStorage for persistence
      localStorage.setItem('user-avatar', dataURL);
      
      onAvatarChange(dataURL);
      setPreviewUrl(null);
      setIsUploading(false);
      toast({
        title: "Avatar updated",
        description: "Your profile photo has been updated successfully"
      });

    } catch (error) {
      console.error('Error uploading photo:', error);
      setIsUploading(false);
      toast({
        title: "Upload failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive"
      });
    }
  };

  const removePhoto = () => {
    localStorage.removeItem('user-avatar');
    onAvatarChange('');
    setPreviewUrl(null);
    toast({
      title: "Avatar removed",
      description: "Profile photo has been removed"
    });
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar className="h-32 w-32 ring-4 ring-background shadow-lg flex-shrink-0">
          <AvatarImage 
            src={previewUrl || currentAvatar || '/placeholder.svg'} 
            alt="Profile" 
            className={`object-cover w-full h-full ${isUploading ? 'opacity-50' : ''}`}
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
          <AvatarFallback className="text-2xl">
            {userName?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full cursor-pointer">
          <Camera className="h-8 w-8 text-white" />
        </div>
      </div>

      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          disabled={isUploading}
          onClick={() => document.getElementById('photo-upload')?.click()}
          className="glass-card"
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? 'Uploading...' : 'Upload Photo'}
        </Button>
        
        {currentAvatar && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={removePhoto}
            disabled={isUploading}
            className="text-destructive hover:text-destructive-foreground"
          >
            <X className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </div>

      <Input
        id="photo-upload"
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />
      
      <p className="text-xs text-muted-foreground text-center max-w-sm">
        Upload a profile photo. JPG, PNG or GIF up to 5MB.
      </p>
    </div>
  );
};