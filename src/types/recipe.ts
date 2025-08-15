export interface Recipe {
  id: number;
  name: string;
  page?: string;
  tags: string[];
  createdAt: Date;
}

export interface RecipeStore {
  recipes: Recipe[];
  searchTerm: string;
  selectedTags: string[];
}
