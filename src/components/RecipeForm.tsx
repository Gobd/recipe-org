import { Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DeweyAutoSelector } from '@/components/DeweyAutoSelector';
import { TagInput } from '@/components/TagInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RecipeDB } from '@/lib/database';
import type { DeweyCategory, Recipe } from '@/types/recipe';

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
  const [deweyCategories, setDeweyCategories] = useState<DeweyCategory[]>([]);
  const [shouldNavigateToRecipe, setShouldNavigateToRecipe] = useState(false);

  const loadDeweyCategories = async () => {
    try {
      const categories = await RecipeDB.getAllDeweyCategories();
      setDeweyCategories(categories);
    } catch (error) {
      console.error('Failed to load Dewey categories:', error);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies(loadDeweyCategories): suppress dependency loadDeweyCategories
  useEffect(() => {
    loadDeweyCategories();
  }, []);

  // Generate hierarchical Dewey tags from a Dewey code
  const getDeweyHierarchyTags = (deweyCode: string): string[] => {
    if (!deweyCode) return [];

    const hierarchyTags: string[] = [];
    const levels = buildDeweyHierarchy(deweyCode);

    for (const levelCode of levels) {
      const category = deweyCategories.find(
        (cat) => cat.deweyCode === levelCode,
      );
      if (category) {
        hierarchyTags.push(`${category.deweyCode} ${category.name}`);
      }
    }

    return hierarchyTags;
  };

  // Build all parent levels for a Dewey code
  const buildDeweyHierarchy = (deweyCode: string): string[] => {
    const levels: string[] = [];
    let currentCode = deweyCode;

    // Add the current code
    levels.unshift(currentCode);

    // Build parent codes
    while (currentCode) {
      const parentCode = getDeweyParent(currentCode);
      if (parentCode) {
        levels.unshift(parentCode);
        currentCode = parentCode;
      } else {
        break;
      }
    }

    return levels;
  };

  // Get parent code for a Dewey code
  const getDeweyParent = (deweyCode: string): string | undefined => {
    if (!deweyCode) return undefined;

    // Handle decimal hierarchy: "000.00" -> "000.0" -> "000"
    if (deweyCode.includes('.')) {
      const lastDotIndex = deweyCode.lastIndexOf('.');
      const beforeDot = deweyCode.substring(0, lastDotIndex);
      const afterDot = deweyCode.substring(lastDotIndex + 1);

      if (afterDot.length > 1) {
        // Remove last digit after decimal: "000.00" -> "000.0"
        return `${beforeDot}.${afterDot.slice(0, -1)}`;
      } else {
        // Remove decimal part: "000.0" -> "000"
        return beforeDot;
      }
    }

    // Handle digit hierarchy: "000" -> "00" -> "0" -> undefined
    if (deweyCode.length <= 1) return undefined;
    return deweyCode.slice(0, -1);
  };

  const handleDeweySelect = (deweyCode: string) => {
    setDeweyDecimal(deweyCode);

    // Auto-generate hierarchical tags
    if (deweyCode) {
      const hierarchyTags = getDeweyHierarchyTags(deweyCode);

      // Merge with existing tags, removing duplicates
      const allTags = [...tags];

      // Remove any existing Dewey tags first (tags that look like "### Name")
      const nonDeweyTags = allTags.filter((tag) => !/^\d+(\.\d+)*\s/.test(tag));

      // Add the new hierarchy tags
      const mergedTags = [...nonDeweyTags, ...hierarchyTags];

      setTags(mergedTags);
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
          `Upload recipes from "${file.name}"? This will add new recipes to the database.`,
        )
      ) {
        return;
      }

      try {
        const result = await RecipeDB.uploadCSV(file);

        if (result.success) {
          let message = `Successfully imported ${result.importedCount} recipes!`;

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

          // Refresh the page to show new recipes
          window.location.reload();
        }
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
