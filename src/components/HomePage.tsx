import { Download, Shuffle } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RecipeForm } from '@/components/RecipeForm';
import { RecipeList } from '@/components/RecipeList';
import { SearchBar } from '@/components/SearchBar';
import { Button } from '@/components/ui/button';
import { useRecipeStore } from '@/store/recipeStore';
import type { Recipe } from '@/types/recipe';

export function HomePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Zustand store
  const {
    recipes,
    tags: availableTags,
    searchTerm,
    selectedTags,
    setSearchTerm,
    setSelectedTags,
    loadRecipes,
    addRecipe,
    deleteRecipe,
    removeTagFromRecipe,
    updateRecipeRating,
    getAllRecipesForExport,
  } = useRecipeStore();

  // Update URL params when search state changes
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (searchTerm) {
      newParams.set('search', searchTerm);
    }
    if (selectedTags.length > 0) {
      newParams.set('tags', selectedTags.join(','));
    }
    setSearchParams(newParams);
  }, [searchTerm, selectedTags, setSearchParams]);

  // Initialize from URL params on mount
  useEffect(() => {
    const tagsParam = searchParams.get('tags');
    const searchParam = searchParams.get('search');

    if (tagsParam || searchParam) {
      const tags = tagsParam ? tagsParam.split(',') : [];
      const search = searchParam || '';

      // Set store state to match URL without triggering search yet
      useRecipeStore.setState({
        searchTerm: search,
        selectedTags: tags,
      });

      loadRecipes(search, tags);
    } else {
      loadRecipes('', []);
    }
  }, [loadRecipes, searchParams]);

  const handleAddRecipe = async (
    recipe: Omit<Recipe, 'id' | 'createdAt'>,
    shouldNavigate?: boolean,
  ) => {
    try {
      const newRecipe = await addRecipe(recipe);
      if (shouldNavigate) {
        navigate(`/recipe/${newRecipe.id}`);
      }
    } catch (error) {
      console.error('Failed to add recipe:', error);
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

  const handleDownloadCSV = async () => {
    try {
      // Always get all recipes for CSV export, not just filtered ones
      const allRecipes = await getAllRecipesForExport();

      // Create CSV headers
      const headers = [
        'ID',
        'Name',
        'Page',
        'URL',
        'Notes',
        'Rating',
        'Tags',
        'Created Date',
      ];

      // Convert recipes to CSV rows
      const csvRows = allRecipes.map((recipe) => [
        recipe.id,
        `"${(recipe.name || '').replace(/"/g, '""')}"`, // Escape quotes in name
        `"${(recipe.page || '').replace(/"/g, '""')}"`, // Escape quotes in page
        `"${(recipe.url || '').replace(/"/g, '""')}"`, // Escape quotes in url
        `"${(recipe.notes || '').replace(/"/g, '""')}"`, // Escape quotes in notes
        recipe.rating || '',
        `"${recipe.tags.join(', ')}"`, // Comma-separated tags in single column
        recipe.createdAt.toLocaleDateString(),
      ]);

      // Combine headers and rows
      const csvContent = [headers, ...csvRows]
        .map((row) => row.join(','))
        .join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `recipes_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Failed to download CSV:', error);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <RecipeForm availableTags={availableTags} onAddRecipe={handleAddRecipe} />

      <SearchBar
        searchTerm={searchTerm}
        selectedTags={selectedTags}
        availableTags={availableTags}
        onSearchTermChange={setSearchTerm}
        onSelectedTagsChange={setSelectedTags}
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
        onDeleteRecipe={deleteRecipe}
        onRemoveTag={removeTagFromRecipe}
        onRatingChange={updateRecipeRating}
      />

      <div className="mt-8 text-center">
        <Button
          onClick={handleDownloadCSV}
          variant="outline"
          className="flex items-center gap-2 mx-auto"
        >
          <Download className="w-4 h-4" />
          Download Recipe Info (CSV)
        </Button>

        <p className="text-xs text-gray-500 mt-4">
          Favicon from{' '}
          <a
            href="https://www.flaticon.com/authors/photo3idea-studio"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-700"
          >
            photo3idea-studio
          </a>
        </p>
      </div>
    </div>
  );
}
