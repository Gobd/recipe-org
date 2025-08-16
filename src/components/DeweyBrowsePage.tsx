import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RecipeDB } from '@/lib/database';
import type { DeweyCategory, Recipe } from '@/types/recipe';

export function DeweyBrowsePage() {
  const navigate = useNavigate();
  const [deweyCategories, setDeweyCategories] = useState<DeweyCategory[]>([]);
  const [currentPath, setCurrentPath] = useState<DeweyCategory[]>([]);
  const [availableCategories, setAvailableCategories] = useState<
    DeweyCategory[]
  >([]);
  const [categoryRecipes, setCategoryRecipes] = useState<{
    [key: string]: Recipe[];
  }>({});
  const [loading, setLoading] = useState(true);

  // biome-ignore lint/correctness/useExhaustiveDependencies(loadDeweyCategories): suppress dependency loadDeweyCategories
  useEffect(() => {
    loadDeweyCategories();
  }, []);

  const loadDeweyCategories = async () => {
    try {
      const categories = await RecipeDB.getAllDeweyCategories();
      setDeweyCategories(categories);
    } catch (error) {
      console.error('Failed to load Dewey categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecipesForCategories = async () => {
    try {
      const recipes: { [key: string]: Recipe[] } = {};

      // For each available category, get recipes that match its dewey code
      for (const category of availableCategories) {
        const categoryRecipes = await RecipeDB.getRecipesByDeweyCode(
          category.deweyCode,
        );
        if (categoryRecipes.length > 0) {
          recipes[category.deweyCode] = categoryRecipes;
        }
      }

      setCategoryRecipes(recipes);
    } catch (error) {
      console.error('Failed to load recipes for categories:', error);
    }
  };

  // Update available categories based on current path
  // biome-ignore lint/correctness/useExhaustiveDependencies(loadRecipesForCategories): suppress dependency loadRecipesForCategories
  useEffect(() => {
    if (currentPath.length === 0) {
      // Show root categories
      const rootCategories = deweyCategories.filter(
        (cat) => !cat.parentCode && cat.isActive,
      );
      setAvailableCategories(rootCategories);
    } else {
      // Show children of the last category in path
      const lastCategory = currentPath[currentPath.length - 1];
      if (lastCategory) {
        const childCategories = deweyCategories.filter(
          (cat) => cat.parentCode === lastCategory.deweyCode && cat.isActive,
        );
        setAvailableCategories(childCategories);
      } else {
        setAvailableCategories([]);
      }
    }

    // Load recipes for all available categories
    loadRecipesForCategories();
  }, [
    currentPath,
    deweyCategories, // Load recipes for all available categories
  ]);

  const handleCategoryClick = (category: DeweyCategory) => {
    // Check if this category has children
    const hasChildren = deweyCategories.some(
      (cat) => cat.parentCode === category.deweyCode && cat.isActive,
    );

    if (hasChildren) {
      // Navigate to this level to show children
      const newPath = [...currentPath, category];
      setCurrentPath(newPath);
    } else {
      // This is a leaf category, show recipes if any
      const recipes = categoryRecipes[category.deweyCode] || [];
      if (recipes.length > 0) {
        // Navigate to home page filtered by this dewey code
        navigate(`/?dewey=${encodeURIComponent(category.deweyCode)}`);
      }
    }
  };

  const handleBackNavigation = (targetIndex: number) => {
    if (targetIndex === -1) {
      // Go back to root
      setCurrentPath([]);
    } else {
      // Go back to specific level
      const newPath = currentPath.slice(0, targetIndex + 1);
      setCurrentPath(newPath);
    }
  };

  const handleBackClick = () => {
    navigate('/');
  };

  const getCategoryHasChildren = (category: DeweyCategory) => {
    return deweyCategories.some(
      (cat) => cat.parentCode === category.deweyCode && cat.isActive,
    );
  };

  const getRecipeCount = (category: DeweyCategory): number => {
    return categoryRecipes[category.deweyCode]?.length || 0;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8 max-w-4xl">
        <div className="text-center">Loading Dewey categories...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={handleBackClick}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Recipes
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">
          Browse by Dewey Categories
        </h1>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <button
          type="button"
          onClick={() => handleBackNavigation(-1)}
          className={`px-3 py-2 rounded hover:bg-gray-100 ${
            currentPath.length === 0
              ? 'bg-blue-100 font-medium'
              : 'text-blue-600'
          }`}
        >
          All Categories
        </button>

        {currentPath.map((category, index) => (
          <React.Fragment key={category.id}>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <button
              type="button"
              onClick={() => handleBackNavigation(index)}
              className={`px-3 py-2 rounded hover:bg-gray-100 ${
                index === currentPath.length - 1
                  ? 'bg-blue-100 font-medium'
                  : 'text-blue-600'
              }`}
            >
              <span className="font-mono text-sm mr-2">
                {category.deweyCode}
              </span>
              {category.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {availableCategories.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              {currentPath.length === 0
                ? 'No Dewey categories found. Import categories through the admin interface.'
                : 'No subcategories available at this level.'}
              {currentPath.length > 0 && (
                <Button
                  onClick={() => handleBackNavigation(currentPath.length - 2)}
                  variant="outline"
                  size="sm"
                  className="mt-4 flex items-center gap-2 mx-auto"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Go Back
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {availableCategories.map((category) => {
            const hasChildren = getCategoryHasChildren(category);
            const recipeCount = getRecipeCount(category);

            return (
              <Card
                key={category.id}
                onClick={() => handleCategoryClick(category)}
                className="hover:shadow-md transition-shadow cursor-pointer"
              >
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-medium text-blue-600 min-w-[100px]">
                        {category.deweyCode}
                      </span>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {category.name}
                        </h3>
                        {hasChildren && (
                          <p className="text-sm text-gray-600">
                            {
                              deweyCategories.filter(
                                (cat) =>
                                  cat.parentCode === category.deweyCode &&
                                  cat.isActive,
                              ).length
                            }{' '}
                            subcategories
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {recipeCount > 0 && (
                        <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded">
                          {recipeCount} recipe{recipeCount !== 1 ? 's' : ''}
                        </span>
                      )}

                      {hasChildren && (
                        <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded flex items-center gap-1">
                          Browse <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Show sample recipes if any */}
                  {recipeCount > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-gray-600 mb-2">
                        Sample recipes:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {categoryRecipes[category.deweyCode]
                          ?.slice(0, 3)
                          .map((recipe) => (
                            <span
                              key={recipe.id}
                              className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded"
                            >
                              {recipe.name}
                            </span>
                          ))}
                        {recipeCount > 3 && (
                          <span className="text-sm text-gray-500">
                            +{recipeCount - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
