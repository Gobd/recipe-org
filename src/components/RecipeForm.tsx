import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TagInput } from '@/components/TagInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [shouldNavigateToRecipe, setShouldNavigateToRecipe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipeName.trim()) return;

    const newRecipe: Omit<Recipe, 'id' | 'createdAt'> = {
      name: recipeName.trim(),
      page: recipePage.trim() || undefined,
      tags: tags,
    };

    onAddRecipe(newRecipe, shouldNavigateToRecipe);
    setRecipeName('');
    setRecipePage('');
    setTags([]);
    setShouldNavigateToRecipe(false);
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
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate('/tags')}
            >
              View All Tags
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
