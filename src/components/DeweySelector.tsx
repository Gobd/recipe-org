import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { DeweyCategory } from '@/types/recipe';

interface DeweySelectorProps {
  onSelect: (deweyCode: string) => void;
  selectedCode?: string;
  deweyCategories: DeweyCategory[];
}

export function DeweySelector({
  onSelect,
  selectedCode,
  deweyCategories,
}: DeweySelectorProps) {
  const [currentPath, setCurrentPath] = useState<DeweyCategory[]>([]);
  const [availableCategories, setAvailableCategories] = useState<
    DeweyCategory[]
  >([]);

  // Initialize or update the current path based on selected code
  useEffect(() => {
    if (selectedCode) {
      // Build the path to the selected category
      const path: DeweyCategory[] = [];
      let currentCode = selectedCode;

      while (currentCode) {
        const category = deweyCategories.find(
          (cat) => cat.deweyCode === currentCode,
        );
        if (category) {
          path.unshift(category);
          currentCode = category.parentCode || '';
        } else {
          break;
        }
      }

      setCurrentPath(path);
    } else {
      setCurrentPath([]);
    }
  }, [selectedCode, deweyCategories]);

  // Update available categories based on current path
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
  }, [currentPath, deweyCategories]);

  const handleCategorySelect = (category: DeweyCategory) => {
    // Check if this category has children
    const hasChildren = deweyCategories.some(
      (cat) => cat.parentCode === category.deweyCode && cat.isActive,
    );

    if (hasChildren) {
      // Navigate to this level to show children
      const newPath = [...currentPath, category];
      setCurrentPath(newPath);
    } else {
      // This is a leaf category, select it
      onSelect(category.deweyCode);
    }
  };

  const handleFinalSelect = (category: DeweyCategory) => {
    // Allow selecting any category, even if it has children
    onSelect(category.deweyCode);
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

  const handleClear = () => {
    onSelect('');
    setCurrentPath([]);
  };

  const isSelected = (category: DeweyCategory) => {
    return selectedCode === category.deweyCode;
  };

  const getCategoryHasChildren = (category: DeweyCategory) => {
    return deweyCategories.some(
      (cat) => cat.parentCode === category.deweyCode && cat.isActive,
    );
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="dewey_decimal_classification"
            className="text-sm font-medium text-gray-700"
          >
            Dewey Decimal Classification
          </label>
          {selectedCode && (
            <Button onClick={handleClear} variant="outline" size="sm">
              Clear Selection
            </Button>
          )}
        </div>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 mb-3 text-sm">
          <button
            type="button"
            onClick={() => handleBackNavigation(-1)}
            className={`px-2 py-1 rounded hover:bg-gray-100 ${
              currentPath.length === 0
                ? 'bg-blue-100 font-medium'
                : 'text-blue-600'
            }`}
          >
            Root
          </button>

          {currentPath.map((category, index) => (
            <React.Fragment key={category.id}>
              <ChevronRight className="w-3 h-3 text-gray-400" />
              <button
                type="button"
                onClick={() => handleBackNavigation(index)}
                className={`px-2 py-1 rounded hover:bg-gray-100 ${
                  index === currentPath.length - 1
                    ? 'bg-blue-100 font-medium'
                    : 'text-blue-600'
                }`}
              >
                <span className="font-mono text-xs mr-1">
                  {category.deweyCode}
                </span>
                {category.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Selected Category Display */}
        {selectedCode && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 mb-3">
            <span className="font-medium">Selected: </span>
            <span className="font-mono">{selectedCode}</span>
            {deweyCategories.find((cat) => cat.deweyCode === selectedCode) && (
              <span>
                {' '}
                -{' '}
                {
                  deweyCategories.find((cat) => cat.deweyCode === selectedCode)
                    ?.name
                }
              </span>
            )}
          </div>
        )}
      </div>

      {/* Category Selection */}
      <div className="border rounded-lg max-h-80 overflow-y-auto bg-white">
        {availableCategories.length > 0 ? (
          <div className="divide-y">
            {availableCategories.map((category) => {
              const hasChildren = getCategoryHasChildren(category);
              const selected = isSelected(category);

              return (
                <div
                  key={category.id}
                  className={`flex items-center justify-between p-3 hover:bg-gray-50 ${
                    selected ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-gray-600 min-w-[80px]">
                        {category.deweyCode}
                      </span>
                      <span className="text-sm font-medium">
                        {category.name}
                      </span>
                      {hasChildren && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {
                            deweyCategories.filter(
                              (cat) =>
                                cat.parentCode === category.deweyCode &&
                                cat.isActive,
                            ).length
                          }{' '}
                          subcategories
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleFinalSelect(category)}
                      size="sm"
                      variant={selected ? 'default' : 'outline'}
                      className="text-xs"
                    >
                      {selected ? 'Selected' : 'Select'}
                    </Button>

                    {hasChildren && (
                      <Button
                        onClick={() => handleCategorySelect(category)}
                        size="sm"
                        variant="ghost"
                        className="text-xs flex items-center gap-1"
                      >
                        Browse <ChevronRight className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500">
            {currentPath.length === 0
              ? 'No Dewey categories available. Please add categories through the admin interface.'
              : 'No subcategories available at this level.'}
            {currentPath.length > 0 && (
              <Button
                onClick={() => handleBackNavigation(currentPath.length - 2)}
                variant="outline"
                size="sm"
                className="mt-2 flex items-center gap-1 mx-auto"
              >
                <ChevronLeft className="w-3 h-3" />
                Go Back
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
