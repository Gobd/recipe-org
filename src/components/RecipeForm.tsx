import { useState } from 'react';
import { TagInput } from '@/components/TagInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Recipe } from '@/types/recipe';

interface RecipeFormProps {
  availableTags: string[];
  onAddRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt'>) => void;
}

export function RecipeForm({ availableTags, onAddRecipe }: RecipeFormProps) {
  const [recipeName, setRecipeName] = useState('');
  const [recipePage, setRecipePage] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipeName.trim()) return;

    const newRecipe: Omit<Recipe, 'id' | 'createdAt'> = {
      name: recipeName.trim(),
      page: recipePage.trim() || undefined,
      tags: tags,
    };

    onAddRecipe(newRecipe);
    setRecipeName('');
    setRecipePage('');
    setTags([]);
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
            <Label htmlFor="recipe-page">Page</Label>
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

          <Button type="submit" className="w-full">
            Add Recipe
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
