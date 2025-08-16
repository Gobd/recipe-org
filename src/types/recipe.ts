export interface RecipeFile {
  id: number;
  filename: string;
}

export interface Recipe {
  id: number;
  name: string;
  page?: string;
  url?: string;
  tags: string[];
  files?: RecipeFile[];
  createdAt: Date;
  notes?: string;
  rating?: number;
}
