import { Shuffle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RecipeForm } from '@/components/RecipeForm';
import { RecipeList } from '@/components/RecipeList';
import { SearchBar } from '@/components/SearchBar';
import { Button } from '@/components/ui/button';
import { RecipeDB } from '@/lib/database';
import type { Recipe } from '@/types/recipe';

export function HomePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const loadRecipes = async (searchTerm: string, selectedTags: string[]) => {
    // Update URL params to reflect current search state
    const newParams = new URLSearchParams();
    if (searchTerm) {
      newParams.set('search', searchTerm);
    }
    if (selectedTags.length > 0) {
      newParams.set('tags', selectedTags.join(','));
    }
    setSearchParams(newParams);

    try {
      const [recipesData, tagsData] = await Promise.all([
        searchTerm || selectedTags.length > 0
          ? RecipeDB.searchRecipes(searchTerm, selectedTags)
          : RecipeDB.getAllRecipes(),
        RecipeDB.getAllTags(),
      ]);
      setRecipes(recipesData);
      setAvailableTags(tagsData);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies(loadRecipes): suppress dependency loadRecipes
  useEffect(() => {
    const tagsParam = searchParams.get('tags');
    const searchParam = searchParams.get('search');

    if (tagsParam || searchParam) {
      const tags = tagsParam ? tagsParam.split(',') : [];
      setSelectedTags(tags);
      setSearchTerm(searchParam || '');
      loadRecipes(searchParam || '', tags);
    } else {
      loadRecipes('', []);
    }
  }, [searchParams]);

  const handleAddRecipe = async (recipe: Omit<Recipe, 'id' | 'createdAt'>) => {
    try {
      await RecipeDB.addRecipe(recipe);
      loadRecipes(searchTerm, selectedTags);
    } catch (error) {
      console.error('Failed to add recipe:', error);
    }
  };

  const handleDeleteRecipe = async (id: string | number) => {
    try {
      await RecipeDB.deleteRecipe(id);
      loadRecipes(searchTerm, selectedTags);
    } catch (error) {
      console.error('Failed to delete recipe:', error);
    }
  };

  const handleRemoveTag = async (
    recipeId: string | number,
    tagToRemove: string,
  ) => {
    try {
      const recipe = recipes.find((r) => r.id === recipeId);
      if (recipe) {
        const newTags = recipe.tags.filter((tag) => tag !== tagToRemove);
        await RecipeDB.updateRecipe(recipeId, { tags: newTags });
        loadRecipes(searchTerm, selectedTags);
      }
    } catch (error) {
      console.error('Failed to remove tag:', error);
    }
  };

  const handleRandomRecipe = () => {
    if (recipes.length === 0) {
      return; // No recipes to select from
    }

    const randomIndex = Math.floor(Math.random() * recipes.length);
    const randomRecipe = recipes[randomIndex] || { id: 0 };
    navigate(`/recipe/${randomRecipe.id}`);
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Recipe Manager
        </h1>
        <p className="text-gray-600">
          Organize your recipes with tags and search
        </p>
      </div>

      <RecipeForm availableTags={availableTags} onAddRecipe={handleAddRecipe} />

      <SearchBar
        searchTerm={searchTerm}
        selectedTags={selectedTags}
        availableTags={availableTags}
        onSearchTermChange={(t) => {
          setSearchTerm(t);
          loadRecipes(t, selectedTags);
        }}
        onSelectedTagsChange={(t) => {
          setSelectedTags(t);
          loadRecipes(searchTerm, t);
        }}
      />

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {searchTerm || selectedTags.length > 0
            ? `Found ${recipes.length} recipe${recipes.length !== 1 ? 's' : ''}`
            : `${recipes.length} recipe${recipes.length !== 1 ? 's' : ''}`}
        </h2>

        <Button
          onClick={handleRandomRecipe}
          disabled={recipes.length === 0}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Shuffle className="w-4 h-4" />
          Random Recipe
        </Button>
      </div>

      <RecipeList
        recipes={recipes}
        onDeleteRecipe={handleDeleteRecipe}
        onRemoveTag={handleRemoveTag}
      />
    </div>
  );
}
