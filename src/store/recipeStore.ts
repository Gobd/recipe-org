import { create } from 'zustand';
import { RecipeDB } from '@/lib/database';
import type { DeweyCategory, Recipe } from '@/types/recipe';

interface RecipeStore {
  // State
  recipes: Recipe[];
  tags: string[];
  deweyCategories: DeweyCategory[];
  loading: boolean;
  error: string | null;
  deweyCategoriesLoaded: boolean;
  deweyCategoriesLoading: boolean;

  // Search state
  searchTerm: string;
  selectedTags: string[];

  // Actions
  setSearchTerm: (term: string) => void;
  setSelectedTags: (tags: string[]) => void;

  // Recipe operations
  loadRecipes: (searchTerm?: string, selectedTags?: string[]) => Promise<void>;
  getAllRecipesForExport: () => Promise<Recipe[]>;
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt'>) => Promise<Recipe>;
  updateRecipe: (
    id: string | number,
    updates: Partial<Recipe>,
  ) => Promise<void>;
  deleteRecipe: (id: string | number) => Promise<void>;
  getRecipeById: (id: string | number) => Promise<Recipe | null>;
  getNextRecipe: (currentId: string | number) => Promise<Recipe | null>;
  getPreviousRecipe: (currentId: string | number) => Promise<Recipe | null>;

  // Tag operations
  loadTags: () => Promise<void>;
  removeTagFromRecipe: (
    recipeId: string | number,
    tagToRemove: string,
  ) => Promise<void>;

  // Rating operations
  updateRecipeRating: (
    recipeId: string | number,
    rating: number,
  ) => Promise<void>;

  // Dewey operations
  loadDeweyCategories: () => Promise<void>;
  getNextDeweySequence: (baseCode: string) => Promise<string>;
  addDeweyCategory: (
    category: Omit<DeweyCategory, 'id'>,
  ) => Promise<DeweyCategory>;
  updateDeweyCategory: (
    id: number,
    updates: Partial<DeweyCategory>,
  ) => Promise<DeweyCategory>;
  deleteDeweyCategory: (id: number) => Promise<void>;

  // Tag operations with counts
  getTagsWithCounts: () => Promise<Array<{ name: string; count: number }>>;

  // File operations
  uploadFile: (recipeId: string | number, file: File) => Promise<void>;
  deleteFile: (fileId: number, recipeId: string | number) => Promise<void>;
  downloadFile: (fileId: number) => Promise<void>;

  // CSV operations
  uploadCSV: (file: File) => Promise<{
    success: boolean;
    importedCount: number;
    updatedCount: number;
    errorCount: number;
    errors: string[];
  }>;

  // Utility
  clearError: () => void;
  setError: (error: string) => void;
}

export const useRecipeStore = create<RecipeStore>((set, get) => ({
  addDeweyCategory: async (category) => {
    try {
      const newCategory = await RecipeDB.addDeweyCategory(category);
      const { deweyCategories } = get();
      set({ deweyCategories: [...deweyCategories, newCategory] });
      return newCategory;
    } catch (error) {
      console.error('Failed to add Dewey category:', error);
      set({ error: 'Failed to add Dewey category' });
      throw error;
    }
  },
  addRecipe: async (recipe) => {
    set({ error: null, loading: true });
    try {
      const newRecipe = await RecipeDB.addRecipe(recipe);

      // Optimistic update - add to current recipes if it matches current search
      const { searchTerm, selectedTags, recipes } = get();
      const matchesSearch =
        !searchTerm ||
        newRecipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        newRecipe.page?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((tag) => newRecipe.tags.includes(tag));

      if (matchesSearch && matchesTags) {
        set({ loading: false, recipes: [newRecipe, ...recipes] });
      } else {
        set({ loading: false });
      }

      // Refresh tags in case new ones were added
      get().loadTags();

      return newRecipe;
    } catch (error) {
      console.error('Failed to add recipe:', error);
      set({ error: 'Failed to add recipe', loading: false });
      throw error;
    }
  },

  // Utility
  clearError: () => set({ error: null }),

  deleteDeweyCategory: async (id) => {
    try {
      await RecipeDB.deleteDeweyCategory(id);
      const { deweyCategories } = get();
      const filteredCategories = deweyCategories.filter((cat) => cat.id !== id);
      set({ deweyCategories: filteredCategories });
    } catch (error) {
      console.error('Failed to delete Dewey category:', error);
      set({ error: 'Failed to delete Dewey category' });
      throw error;
    }
  },

  deleteFile: async (fileId, recipeId) => {
    try {
      await RecipeDB.deleteFile(fileId);
      // Refresh the specific recipe to get updated files list
      const recipe = await RecipeDB.getRecipeById(recipeId);
      if (recipe) {
        const { recipes } = get();
        const updatedRecipes = recipes.map((r) =>
          r.id === recipeId ? recipe : r,
        );
        set({ recipes: updatedRecipes });
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      set({ error: 'Failed to delete file' });
      throw error;
    }
  },

  deleteRecipe: async (id) => {
    try {
      // Optimistic update
      const { recipes } = get();
      const filteredRecipes = recipes.filter((recipe) => recipe.id !== id);
      set({ recipes: filteredRecipes });

      await RecipeDB.deleteRecipe(id);

      // Refresh tags in case some became unused
      get().loadTags();
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      set({ error: 'Failed to delete recipe' });
      // Revert optimistic update
      get().loadRecipes(get().searchTerm, get().selectedTags);
      throw error;
    }
  },
  deweyCategories: [],
  deweyCategoriesLoaded: false,
  deweyCategoriesLoading: false,

  downloadFile: async (fileId) => {
    try {
      await RecipeDB.downloadFile(fileId);
    } catch (error) {
      console.error('Failed to download file:', error);
      set({ error: 'Failed to download file' });
      throw error;
    }
  },
  error: null,

  getAllRecipesForExport: async () => {
    try {
      return await RecipeDB.getAllRecipes();
    } catch (error) {
      console.error('Failed to get all recipes for export:', error);
      set({ error: 'Failed to get all recipes for export' });
      throw error;
    }
  },

  getNextDeweySequence: async (baseCode) => {
    try {
      return await RecipeDB.getNextDeweySequence(baseCode);
    } catch (error) {
      console.error('Failed to get next Dewey sequence:', error);
      set({ error: 'Failed to get next Dewey sequence' });
      throw error;
    }
  },

  getNextRecipe: async (currentId) => {
    try {
      return await RecipeDB.getNextRecipe(currentId);
    } catch (error) {
      console.error('Failed to get next recipe:', error);
      set({ error: 'Failed to load next recipe' });
      throw error;
    }
  },

  getPreviousRecipe: async (currentId) => {
    try {
      return await RecipeDB.getPreviousRecipe(currentId);
    } catch (error) {
      console.error('Failed to get previous recipe:', error);
      set({ error: 'Failed to load previous recipe' });
      throw error;
    }
  },

  getRecipeById: async (id) => {
    set({ error: null, loading: true });
    try {
      const recipe = await RecipeDB.getRecipeById(id);
      set({ loading: false });
      return recipe;
    } catch (error) {
      console.error('Failed to get recipe:', error);
      set({ error: 'Failed to load recipe', loading: false });
      throw error;
    }
  },

  // Tag operations with counts
  getTagsWithCounts: async () => {
    try {
      return await RecipeDB.getTagsWithCounts();
    } catch (error) {
      console.error('Failed to get tags with counts:', error);
      set({ error: 'Failed to get tags with counts' });
      throw error;
    }
  },

  // Dewey operations
  loadDeweyCategories: async () => {
    const { deweyCategoriesLoaded, deweyCategoriesLoading } = get();

    // Prevent duplicate calls
    if (deweyCategoriesLoaded || deweyCategoriesLoading) {
      return;
    }

    set({ deweyCategoriesLoading: true });
    try {
      const categories = await RecipeDB.getAllDeweyCategories();
      set({
        deweyCategories: categories,
        deweyCategoriesLoaded: true,
        deweyCategoriesLoading: false,
      });
    } catch (error) {
      console.error('Failed to load Dewey categories:', error);
      set({
        deweyCategoriesLoading: false,
        error: 'Failed to load Dewey categories',
      });
    }
  },
  loading: false,

  // Recipe operations
  loadRecipes: async (searchTerm = '', selectedTags = []) => {
    set({ error: null, loading: true });
    try {
      const [recipesData, tagsData] = await Promise.all([
        searchTerm || selectedTags.length > 0
          ? RecipeDB.searchRecipes(searchTerm, selectedTags)
          : RecipeDB.getAllRecipes(),
        RecipeDB.getAllTags(),
      ]);
      set({ loading: false, recipes: recipesData, tags: tagsData });
    } catch (error) {
      console.error('Failed to load recipes:', error);
      set({ error: 'Failed to load recipes', loading: false });
    }
  },

  // Tag operations
  loadTags: async () => {
    try {
      const tagsData = await RecipeDB.getAllTags();
      set({ tags: tagsData });
    } catch (error) {
      console.error('Failed to load tags:', error);
      set({ error: 'Failed to load tags' });
    }
  },
  // Initial state
  recipes: [],

  removeTagFromRecipe: async (recipeId, tagToRemove) => {
    try {
      const { recipes } = get();
      const recipe = recipes.find((r) => r.id === recipeId);
      if (recipe) {
        const newTags = recipe.tags.filter((tag) => tag !== tagToRemove);
        await get().updateRecipe(recipeId, { tags: newTags });
      }
    } catch (error) {
      console.error('Failed to remove tag:', error);
      set({ error: 'Failed to remove tag' });
      throw error;
    }
  },
  searchTerm: '',
  selectedTags: [],
  setError: (error) => set({ error }),

  // Search actions
  setSearchTerm: (term) => {
    set({ searchTerm: term });
    get().loadRecipes(term, get().selectedTags);
  },

  setSelectedTags: (tags) => {
    set({ selectedTags: tags });
    get().loadRecipes(get().searchTerm, tags);
  },
  tags: [],

  updateDeweyCategory: async (id, updates) => {
    try {
      const updatedCategory = await RecipeDB.updateDeweyCategory(id, updates);
      const { deweyCategories } = get();
      const updatedCategories = deweyCategories.map((cat) =>
        cat.id === id ? updatedCategory : cat,
      );
      set({ deweyCategories: updatedCategories });
      return updatedCategory;
    } catch (error) {
      console.error('Failed to update Dewey category:', error);
      set({ error: 'Failed to update Dewey category' });
      throw error;
    }
  },

  updateRecipe: async (id, updates) => {
    try {
      // Optimistic update
      const { recipes } = get();
      const updatedRecipes = recipes.map((recipe) =>
        recipe.id === id ? { ...recipe, ...updates } : recipe,
      );
      set({ recipes: updatedRecipes });

      await RecipeDB.updateRecipe(id, updates);

      // Refresh tags if tags were updated
      if (updates.tags) {
        get().loadTags();
      }
    } catch (error) {
      console.error('Failed to update recipe:', error);
      set({ error: 'Failed to update recipe' });
      // Revert optimistic update
      get().loadRecipes(get().searchTerm, get().selectedTags);
      throw error;
    }
  },

  // Rating operations
  updateRecipeRating: async (recipeId, rating) => {
    try {
      await get().updateRecipe(recipeId, { rating });
    } catch (error) {
      console.error('Failed to update rating:', error);
      set({ error: 'Failed to update rating' });
      throw error;
    }
  },

  // CSV operations
  uploadCSV: async (file) => {
    set({ error: null, loading: true });
    try {
      const result = await RecipeDB.uploadCSV(file);
      // Refresh recipes after CSV upload
      await get().loadRecipes(get().searchTerm, get().selectedTags);
      set({ loading: false });
      return result;
    } catch (error) {
      console.error('Failed to upload CSV:', error);
      set({ error: 'Failed to upload CSV', loading: false });
      throw error;
    }
  },

  // File operations
  uploadFile: async (recipeId, file) => {
    try {
      await RecipeDB.uploadFile(recipeId, file);
      // Refresh the specific recipe to get updated files list
      const recipe = await RecipeDB.getRecipeById(recipeId);
      if (recipe) {
        const { recipes } = get();
        const updatedRecipes = recipes.map((r) =>
          r.id === recipeId ? recipe : r,
        );
        set({ recipes: updatedRecipes });
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      set({ error: 'Failed to upload file' });
      throw error;
    }
  },
}));
