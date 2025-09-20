import { Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DeweyAutoSelector } from '@/components/DeweyAutoSelector';
import { TagInput } from '@/components/TagInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRecipeStore } from '@/store/recipeStore';
import type { Recipe } from '@/types/recipe';

interface RecipeFormProps {
  availableTags: string[];
  onAddRecipe: (
    recipe: Omit<Recipe, 'id' | 'createdAt'>,
    shouldNavigate?: boolean,
  ) => void;
}

export function RecipeForm({ availableTags, onAddRecipe }: RecipeFormProps) {
  const navigate = useNavigate();
  const [recipeName, setRecipeName] = useState('');
  const [recipePage, setRecipePage] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [deweyDecimal, setDeweyDecimal] = useState('');
  const [shouldNavigateToRecipe, setShouldNavigateToRecipe] = useState(false);

  const { deweyCategories, loadDeweyCategories, uploadCSV } = useRecipeStore();

  useEffect(() => {
    loadDeweyCategories();
  }, [loadDeweyCategories]);

  // Generate hierarchical Dewey tags from a Dewey code
  const getDeweyHierarchyTags = (deweyCode: string): string[] => {
    if (!deweyCode) return [];

    // For generated sequences like "411.21.001", we need to use the base code "411.21"
    // to build the hierarchy since the sequence doesn't exist in the database yet
    let baseCode = deweyCode;
    const isGeneratedSequence = deweyCode.match(/\.\d{3}$/); // ends with .### pattern

    if (isGeneratedSequence) {
      // Extract base code by removing the last .### part
      const lastDotIndex = deweyCode.lastIndexOf('.');
      baseCode = deweyCode.substring(0, lastDotIndex);
    }

    const hierarchyTags: string[] = [];
    const levels = buildDeweyHierarchy(baseCode);

    for (const levelCode of levels) {
      const category = deweyCategories.find(
        (cat) => cat.deweyCode === levelCode,
      );
      if (category) {
        hierarchyTags.push(category.name);
      }
    }

    return hierarchyTags;
  };

  // Build all parent levels for a Dewey code using actual database relationships
  const buildDeweyHierarchy = (deweyCode: string): string[] => {
    const levels: string[] = [];
    let currentCode = deweyCode;

    // Start with the selected code and work up the hierarchy
    while (currentCode) {
      levels.unshift(currentCode);

      // Find the category and get its parent code
      const category = deweyCategories.find(
        (cat) => cat.deweyCode === currentCode,
      );
      if (category && category.parentCode) {
        currentCode = category.parentCode;
      } else {
        break;
      }
    }

    return levels;
  };

  const handleDeweySelect = (deweyCode: string) => {
    setDeweyDecimal(deweyCode);

    // Auto-generate hierarchical tags
    const allTags = [...tags];

    // Get all dewey category names to identify existing dewey tags
    const allDeweyNames = deweyCategories.map((cat) => cat.name);

    // Remove any existing Dewey category tags
    const nonDeweyTags = allTags.filter((tag) => !allDeweyNames.includes(tag));

    if (deweyCode) {
      const hierarchyTags = getDeweyHierarchyTags(deweyCode);
      // Add the new hierarchy tags
      const mergedTags = [...nonDeweyTags, ...hierarchyTags];
      setTags(mergedTags);
    } else {
      // If dewey code is cleared, just keep non-dewey tags
      setTags(nonDeweyTags);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipeName.trim()) return;

    const newRecipe: Omit<Recipe, 'id' | 'createdAt'> = {
      deweyDecimal: deweyDecimal || undefined,
      name: recipeName.trim(),
      page: recipePage.trim() || undefined,
      tags: tags,
    };

    onAddRecipe(newRecipe, shouldNavigateToRecipe);
    setRecipeName('');
    setRecipePage('');
    setTags([]);
    setDeweyDecimal('');
    setShouldNavigateToRecipe(false);
  };

  const handleUploadCSV = async () => {
    // Create file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.style.display = 'none';

    fileInput.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (
        !confirm(
          `Upload recipes from "${file.name}"? This will add new recipes and update existing ones based on ID matches.`,
        )
      ) {
        return;
      }

      try {
        const result = await uploadCSV(file);

        let message = `Successfully processed CSV:`;
        if (result.importedCount > 0) {
          message += `\n- Imported ${result.importedCount} new recipes`;
        }
        if (result.updatedCount > 0) {
          message += `\n- Updated ${result.updatedCount} existing recipes`;
        }

        if (result.errorCount > 0) {
          message += `\n\nThere were ${result.errorCount} errors during import:`;
          result.errors.forEach((error, index) => {
            if (index < 3) {
              message += `\n- ${error}`;
            }
          });
          if (result.errors.length > 3) {
            message += `\n... and ${result.errors.length - 3} more errors`;
          }
        }

        alert(message);
      } catch (error) {
        console.error('Failed to upload CSV:', error);
        alert(
          `Failed to upload CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      } finally {
        document.body.removeChild(fileInput);
      }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="recipe-name">Recipe Name</Label>
            <Input
              id="recipe-name"
              type="text"
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              placeholder="Enter recipe name..."
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
              placeholder="Enter location reference..."
              className="mt-1"
            />
          </div>

          <div>
            <Label>Tags</Label>
            <div className="mt-1">
              <TagInput
                tags={tags}
                availableTags={availableTags}
                onTagsChange={setTags}
                placeholder="Add tags (press Enter to add)..."
              />
            </div>
          </div>

          <div>
            <DeweyAutoSelector
              onSelect={handleDeweySelect}
              selectedCode={deweyDecimal}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="navigate-checkbox"
              type="checkbox"
              checked={shouldNavigateToRecipe}
              onChange={(e) => setShouldNavigateToRecipe(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <Label htmlFor="navigate-checkbox" className="cursor-pointer">
              Go to recipe page after adding
            </Label>
          </div>

          <div className="space-y-2">
            <Button type="submit" className="w-full">
              Add Recipe
            </Button>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/tags')}
              >
                View All Tags
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dewey-admin')}
              >
                Dewey Admin
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleUploadCSV}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload CSV
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
