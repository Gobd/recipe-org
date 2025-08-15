import type { Recipe } from '@/types/recipe';

const API_BASE = '/api';

export class RecipeDB {
  static async getAllRecipes(): Promise<Recipe[]> {
    const response = await fetch(`${API_BASE}/recipes`);
    const recipes = await response.json();
    return recipes.map((recipe: any) => ({
      ...recipe,
      createdAt: new Date(recipe.createdAt),
    }));
  }

  static async addRecipe(
    recipe: Omit<Recipe, 'id' | 'createdAt'>,
  ): Promise<Recipe> {
    const response = await fetch(`${API_BASE}/recipes`, {
      body: JSON.stringify(recipe),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const newRecipe = await response.json();
    return {
      ...newRecipe,
      createdAt: new Date(newRecipe.createdAt),
    };
  }

  static async searchRecipes(
    searchTerm: string,
    selectedTags: string[],
  ): Promise<Recipe[]> {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (selectedTags.length > 0)
      params.set('tags', JSON.stringify(selectedTags));

    const response = await fetch(`${API_BASE}/recipes?${params}`);
    const recipes = await response.json();
    return recipes.map((recipe: any) => ({
      ...recipe,
      createdAt: new Date(recipe.createdAt),
    }));
  }

  static async getAllTags(): Promise<string[]> {
    const response = await fetch(`${API_BASE}/tags`);
    return response.json();
  }

  static async getRecipeById(id: string | number): Promise<Recipe | null> {
    const response = await fetch(`${API_BASE}/recipes/${id}`);
    if (response.status === 404) {
      return null;
    }
    const recipe = await response.json();
    return {
      ...recipe,
      createdAt: new Date(recipe.createdAt),
    };
  }

  static async updateRecipe(
    id: string | number,
    updates: { name?: string; page?: string; tags?: string[] },
  ): Promise<Recipe> {
    const response = await fetch(`${API_BASE}/recipes/${id}`, {
      body: JSON.stringify(updates),
      headers: { 'Content-Type': 'application/json' },
      method: 'PUT',
    });
    const recipe = await response.json();
    return {
      ...recipe,
      createdAt: new Date(recipe.createdAt),
    };
  }

  static async deleteRecipe(id: string | number): Promise<void> {
    await fetch(`${API_BASE}/recipes/${id}`, {
      method: 'DELETE',
    });
  }
}
