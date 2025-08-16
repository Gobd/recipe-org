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
  deweyDecimal?: string;
}

export interface DeweyCategory {
  id: number;
  deweyCode: string;
  name: string;
  level: number;
  parentCode?: string;
  isActive: boolean;
}
