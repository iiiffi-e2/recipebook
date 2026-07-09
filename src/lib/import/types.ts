export interface ImportImageMeta {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  captureTime: number;
  previewUrl?: string;
  thumbnail?: string;
}

export interface RecipeGroup {
  id: string;
  imageIds: string[];
  confidence: number;
  needsReview: boolean;
}
