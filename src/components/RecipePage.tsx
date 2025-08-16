import { ArrowLeft, ChevronLeft, ChevronRight, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TagInput } from '@/components/TagInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StarRating } from '@/components/ui/star-rating';
import { RecipeDB } from '@/lib/database';
import type { Recipe } from '@/types/recipe';

export function RecipePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [recipeName, setRecipeName] = useState('');
  const [recipePage, setRecipePage] = useState('');
  const [recipeNotes, setRecipeNotes] = useState('');
  const [recipeRating, setRecipeRating] = useState<number | undefined>(
    undefined,
  );
  const [tags, setTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [nextRecipe, setNextRecipe] = useState<Recipe | null>(null);
  const [previousRecipe, setPreviousRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies(loadRecipe): suppress dependency loadRecipe
  // biome-ignore lint/correctness/useExhaustiveDependencies(loadAvailableTags): suppress dependency loadAvailableTags
  // biome-ignore lint/correctness/useExhaustiveDependencies(loadNavigation): suppress dependency loadNavigation
  useEffect(() => {
    loadRecipe();
    loadAvailableTags();
    loadNavigation();
  }, [id]);

  const loadRecipe = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const recipeData = await RecipeDB.getRecipeById(id);
      if (recipeData) {
        setRecipe(recipeData);
        setRecipeName(recipeData.name);
        setRecipePage(recipeData.page || '');
        setRecipeNotes(recipeData.notes || '');
        setRecipeRating(recipeData.rating);
        setTags(recipeData.tags);
      } else {
        setError('Recipe not found');
      }
    } catch (error) {
      console.error('Failed to load recipe:', error);
      setError('Failed to load recipe');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTags = async () => {
    try {
      const tagsData = await RecipeDB.getAllTags();
      setAvailableTags(tagsData);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const loadNavigation = async () => {
    if (!id) return;

    try {
      const next = await RecipeDB.getNextRecipe(id);
      const previous = await RecipeDB.getPreviousRecipe(id);
      setNextRecipe(next);
      setPreviousRecipe(previous);
    } catch (error) {
      console.error('Failed to load navigation:', error);
    }
  };

  const handleSave = async () => {
    if (!id || !recipe) return;

    const hasNameChanges = recipeName !== recipe.name;
    const hasPageChanges = recipePage !== (recipe.page || '');
    const hasNotesChanges = recipeNotes !== (recipe.notes || '');

    if (!hasNameChanges && !hasPageChanges && !hasNotesChanges) return;

    try {
      setSaving(true);
      const updates: {
        name?: string;
        page?: string;
        notes?: string;
      } = {};

      if (hasNameChanges) {
        updates.name = recipeName;
      }

      if (hasPageChanges) {
        updates.page = recipePage;
      }

      if (hasNotesChanges) {
        updates.notes = recipeNotes;
      }

      const updatedRecipe = await RecipeDB.updateRecipe(id, updates);
      setRecipe(updatedRecipe);
    } catch (error) {
      console.error('Failed to save recipe:', error);
      setError('Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  const handleTagsChange = async (newTags: string[]) => {
    if (!id || !recipe) return;

    setTags(newTags);

    // Auto-save tags immediately
    try {
      const updatedRecipe = await RecipeDB.updateRecipe(id, {
        tags: newTags,
      });
      setRecipe(updatedRecipe);
      loadAvailableTags(); // Refresh available tags in case new ones were added
    } catch (error) {
      console.error('Failed to save tags:', error);
      setError('Failed to save tags');
    }
  };

  const handleRatingChange = async (newRating: number) => {
    if (!id || !recipe) return;

    setRecipeRating(newRating);

    // Auto-save rating immediately
    try {
      const updatedRecipe = await RecipeDB.updateRecipe(id, {
        rating: newRating,
      });
      setRecipe(updatedRecipe);
    } catch (error) {
      console.error('Failed to save rating:', error);
      setError('Failed to save rating');
    }
  };

  const handleDeleteRecipe = async () => {
    if (!id || !recipe) return;

    if (confirm(`Are you sure you want to delete "${recipe.name}"?`)) {
      try {
        await RecipeDB.deleteRecipe(id);
        navigate('/');
      } catch (error) {
        console.error('Failed to delete recipe:', error);
        setError('Failed to delete recipe');
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8 max-w-4xl">
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="container mx-auto p-8 max-w-4xl">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error || 'Recipe not found'}</p>
          <Link to="/" className="text-blue-600 hover:underline">
            ← Back to recipes
          </Link>
        </div>
      </div>
    );
  }

  const hasChanges =
    recipeName !== recipe.name ||
    recipePage !== (recipe.page || '') ||
    recipeNotes !== (recipe.notes || '');

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to recipes
        </Link>

        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            {previousRecipe && (
              <Link
                to={`/recipe/${previousRecipe.id}`}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                {previousRecipe.name}
              </Link>
            )}
          </div>
          <div className="flex gap-2">
            {nextRecipe && (
              <Link
                to={`/recipe/${nextRecipe.id}`}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {nextRecipe.name}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            )}
          </div>
        </div>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Edit Recipe
            </h1>
            <p className="text-gray-600">
              Created {recipe.createdAt.toLocaleDateString()}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>

            <Button
              variant="destructive"
              onClick={handleDeleteRecipe}
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div>
              <Label htmlFor="recipe-name">Recipe Name</Label>
              <Input
                id="recipe-name"
                type="text"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="recipe-page">Location</Label>
              <Input
                id="recipe-page"
                type="text"
                value={recipePage}
                onChange={(e) => setRecipePage(e.target.value)}
                placeholder="Enter page reference..."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="recipe-notes">Notes</Label>
              <textarea
                id="recipe-notes"
                value={recipeNotes}
                onChange={(e) => setRecipeNotes(e.target.value)}
                placeholder="Add your notes about this recipe..."
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
              />
            </div>

            <div>
              <Label>Rating (auto-saved)</Label>
              <div className="mt-2">
                <StarRating
                  rating={recipeRating}
                  onRatingChange={handleRatingChange}
                  size="md"
                />
              </div>
            </div>

            <div>
              <Label>Tags (auto-saved)</Label>
              <div className="mt-2">
                <TagInput
                  tags={tags}
                  availableTags={availableTags}
                  onTagsChange={handleTagsChange}
                  placeholder="Add new tags (press Enter to add)..."
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-yellow-800 text-sm">
            You have unsaved changes. Don't forget to save!
          </p>
        </div>
      )}
    </div>
  );
}
