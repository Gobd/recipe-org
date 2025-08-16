import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Save,
  Upload,
  X,
} from 'lucide-react';
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
  const [recipeUrl, setRecipeUrl] = useState('');
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
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies(loadRecipe): suppress dependency loadRecipe
  // biome-ignore lint/correctness/useExhaustiveDependencies(loadAvailableTags): suppress dependency loadAvailableTags
  // biome-ignore lint/correctness/useExhaustiveDependencies(loadNavigation): suppress dependency loadNavigation
  // biome-ignore lint/correctness/useExhaustiveDependencies(id): suppress dependency id
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
        setRecipeUrl(recipeData.url || '');
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
    const hasUrlChanges = recipeUrl !== (recipe.url || '');
    const hasNotesChanges = recipeNotes !== (recipe.notes || '');

    if (
      !hasNameChanges &&
      !hasPageChanges &&
      !hasUrlChanges &&
      !hasNotesChanges
    )
      return;

    try {
      setSaving(true);
      const updates: {
        name?: string;
        page?: string;
        url?: string;
        notes?: string;
      } = {};

      if (hasNameChanges) {
        updates.name = recipeName;
      }

      if (hasPageChanges) {
        updates.page = recipePage;
      }

      if (hasUrlChanges) {
        updates.url = recipeUrl;
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

  const handleTagClick = (tag: string) => {
    navigate(`/?tags=${encodeURIComponent(tag)}`);
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

  const handleFileUpload = async (files: FileList) => {
    if (!id || !files.length) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await RecipeDB.uploadFile(id, file);
      }
      // Reload recipe to get updated files list
      loadRecipe();
    } catch (error) {
      console.error('Failed to upload file:', error);
      setError('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleFileDelete = async (fileId: number) => {
    if (!id) return;

    try {
      await RecipeDB.deleteFile(fileId);
      // Reload recipe to get updated files list
      loadRecipe();
    } catch (error) {
      console.error('Failed to delete file:', error);
      setError('Failed to delete file');
    }
  };

  const handleFileDownload = async (fileId: number) => {
    try {
      await RecipeDB.downloadFile(fileId);
    } catch (error) {
      console.error('Failed to download file:', error);
      setError('Failed to download file');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
    // Reset input so same file can be uploaded again if needed
    e.target.value = '';
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
    recipeUrl !== (recipe.url || '') ||
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
              <Label htmlFor="recipe-url">URL</Label>
              <Input
                id="recipe-url"
                type="url"
                value={recipeUrl}
                onChange={(e) => setRecipeUrl(e.target.value)}
                placeholder="Enter recipe URL..."
                className="mt-1"
              />
            </div>

            {recipe.url && (
              <p className="text-sm text-blue-600 mb-2 font-medium">
                <a
                  href={recipe.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="hover:underline"
                >
                  🔗 {recipe.url}
                </a>
              </p>
            )}

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
                  onTagClick={handleTagClick}
                  placeholder="Add new tags (press Enter to add)..."
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Label>Files</Label>

            {/* File Upload Area */}
            {/* biome-ignore lint/a11y/useSemanticElements: File upload drop zone needs div for drag/drop functionality */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragOver
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              role="button"
              tabIndex={0}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  document.getElementById('file-upload')?.click();
                }
              }}
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop files here or click to browse
              </p>
              <input
                type="file"
                multiple
                onChange={handleFileInputChange}
                className="hidden"
                id="file-upload"
                disabled={uploading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={uploading}
                className="mx-auto"
              >
                {uploading ? 'Uploading...' : 'Choose Files'}
              </Button>
            </div>

            {/* Files List */}
            {recipe?.files && recipe.files.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Uploaded Files ({recipe.files.length})
                </p>
                {recipe.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">
                        {file.filename}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleFileDownload(file.id)}
                        className="flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleFileDelete(file.id)}
                        className="flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
