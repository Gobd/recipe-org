import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StarRating } from '@/components/ui/star-rating';
import type { Recipe } from '@/types/recipe';

interface RecipeListProps {
  recipes: Recipe[];
  onDeleteRecipe: (id: string | number) => void;
  onRemoveTag?: (recipeId: string | number, tagToRemove: string) => void;
  onRatingChange?: (recipeId: string | number, rating: number) => void;
}

export function RecipeList({
  recipes,
  onDeleteRecipe,
  onRemoveTag,
  onRatingChange,
}: RecipeListProps) {
  if (recipes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No recipes found. Add your first recipe above!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recipes.map((recipe) => (
        <Card key={recipe.id} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="flex justify-between items-start">
              <Link
                to={`/recipe/${recipe.id}`}
                className="flex-1 cursor-pointer hover:bg-gray-50 -m-4 p-4 rounded-lg transition-colors"
              >
                <h3 className="text-lg font-semibold mb-2 text-blue-700 hover:text-blue-900">
                  {recipe.name}
                </h3>

                {recipe.page && (
                  <p className="text-sm text-gray-600 mb-2 font-medium">
                    📖 {recipe.page}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mb-3">
                  {recipe.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-sm rounded-md"
                    >
                      {tag}
                      {onRemoveTag && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onRemoveTag(recipe.id, tag);
                          }}
                          className="hover:bg-green-200 p-0.5 ml-1"
                          title={`Remove ${tag} tag`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>

                <div className="mb-3">
                  <StarRating
                    rating={recipe.rating}
                    onRatingChange={
                      onRatingChange
                        ? (rating) => {
                            onRatingChange(recipe.id, rating);
                          }
                        : undefined
                    }
                    size="sm"
                  />
                </div>

                <p className="text-sm text-gray-500">
                  Added {recipe.createdAt.toLocaleDateString()}
                </p>
              </Link>

              <Button
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDeleteRecipe(recipe.id);
                }}
                className="ml-4 flex-shrink-0"
              >
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
