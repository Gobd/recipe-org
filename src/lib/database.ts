import type { Recipe } from '@/types/recipe';

const API_BASE = '/api';

export const RecipeDB = {
  addRecipe: async (
    recipe: Omit<Recipe, 'id' | 'createdAt'>,
  ): Promise<Recipe> => {
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
  },

  async deleteFile(fileId: number): Promise<void> {
    const response = await fetch(`${API_BASE}/files/${fileId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete file');
    }
  },

  async deleteRecipe(id: string | number): Promise<void> {
    await fetch(`${API_BASE}/recipes/${id}`, {
      method: 'DELETE',
    });
  },

  async downloadFile(fileId: number): Promise<void> {
    const response = await fetch(`${API_BASE}/files/${fileId}`);

    if (!response.ok) {
      throw new Error('Failed to download file');
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    const filename =
      contentDisposition?.match(/filename="(.+)"/)?.[1] || 'download';

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
  getAllRecipes: async (): Promise<Recipe[]> => {
    const response = await fetch(`${API_BASE}/recipes`);
    const recipes = await response.json();
    return recipes.map((recipe: any) => ({
      ...recipe,
      createdAt: new Date(recipe.createdAt),
    }));
  },

  getAllTags: async (): Promise<string[]> => {
    const response = await fetch(`${API_BASE}/tags`);
    return response.json();
  },

  getNextRecipe: async (currentId: string | number): Promise<Recipe | null> => {
    const response = await fetch(`${API_BASE}/recipes/${currentId}/next`);
    const recipe = await response.json();
    if (!recipe) return null;
    return {
      ...recipe,
      createdAt: new Date(recipe.createdAt),
    };
  },

  getPreviousRecipe: async (
    currentId: string | number,
  ): Promise<Recipe | null> => {
    const response = await fetch(`${API_BASE}/recipes/${currentId}/previous`);
    const recipe = await response.json();
    if (!recipe) return null;
    return {
      ...recipe,
      createdAt: new Date(recipe.createdAt),
    };
  },

  getRecipeById: async (id: string | number): Promise<Recipe | null> => {
    const response = await fetch(`${API_BASE}/recipes/${id}`);
    if (response.status === 404) {
      return null;
    }
    const recipe = await response.json();
    return {
      ...recipe,
      createdAt: new Date(recipe.createdAt),
    };
  },

  getTagsWithCounts: async (): Promise<
    Array<{ name: string; count: number }>
  > => {
    const response = await fetch(`${API_BASE}/tags/counts`);
    return response.json();
  },

  searchRecipes: async (
    searchTerm: string,
    selectedTags: string[],
  ): Promise<Recipe[]> => {
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
  },

  async updateRecipe(
    id: string | number,
    updates: {
      name?: string;
      page?: string;
      url?: string;
      notes?: string;
      rating?: number;
      tags?: string[];
    },
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
  },

  // File operations
  async uploadFile(
    recipeId: string | number,
    file: File,
  ): Promise<{ id: number; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/recipes/${recipeId}/files`, {
      body: formData,
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to upload file');
    }

    return response.json();
  },
};
