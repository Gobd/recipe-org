import { useEffect, useState } from 'react';
import { DeweySelector } from '@/components/DeweySelector';
import { useRecipeStore } from '@/store/recipeStore';

interface DeweyAutoSelectorProps {
  onSelect: (deweyCode: string) => void;
  selectedCode?: string;
}

export function DeweyAutoSelector({
  onSelect,
  selectedCode,
}: DeweyAutoSelectorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    deweyCategories,
    loadDeweyCategories,
    getNextDeweySequence,
    deweyCategoriesLoading,
  } = useRecipeStore();

  useEffect(() => {
    loadDeweyCategories();
  }, [loadDeweyCategories]);

  const handleBaseCodeSelect = async (deweyCode: string) => {
    // Check if this is a complete path that can generate a sequence
    const selectedCategory = deweyCategories.find(
      (cat) => cat.deweyCode === deweyCode,
    );

    if (selectedCategory) {
      // Check if there are any child categories
      const hasChildren = deweyCategories.some(
        (cat) => cat.parentCode === deweyCode,
      );

      if (!hasChildren && selectedCategory.level >= 4) {
        // This is a leaf node and at level 4 or higher, we can generate a sequence
        try {
          setIsGenerating(true);
          const sequence = await getNextDeweySequence(deweyCode);
          onSelect(sequence);
        } catch (error) {
          console.error('Failed to get next sequence:', error);
          // Fallback to base code if sequence generation fails
          onSelect(deweyCode);
        } finally {
          setIsGenerating(false);
        }
      } else {
        // No sequence generation, just use the base code
        onSelect(deweyCode);
      }
    }
  };

  if (deweyCategoriesLoading) {
    return (
      <div className="w-full p-4">
        <div className="text-center text-gray-500">
          Loading Dewey categories...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <DeweySelector
        onSelect={handleBaseCodeSelect}
        selectedCode={selectedCode}
        deweyCategories={deweyCategories}
        isLoading={deweyCategoriesLoading}
      />

      {isGenerating && (
        <div className="border-t pt-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              Generating sequence number...
            </div>
          </div>
        </div>
      )}

      {selectedCode && (
        <div className="text-sm text-gray-600">
          <strong>Current Selection:</strong>{' '}
          <span className="font-mono">{selectedCode}</span>
        </div>
      )}
    </div>
  );
}
