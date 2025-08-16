export interface Recipe {
  id: number;
  name: string;
  page?: string;
  tags: string[];
  createdAt: Date;
  notes?: string;
  rating?: number;
}

export interface RecipeStore {
  recipes: Recipe[];
  searchTerm: string;
  selectedTags: string[];
}
