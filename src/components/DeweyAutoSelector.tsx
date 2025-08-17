import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DeweySelector } from '@/components/DeweySelector';
import { Button } from '@/components/ui/button';
import { useRecipeStore } from '@/store/recipeStore';

interface DeweyAutoSelectorProps {
  onSelect: (deweyCode: string) => void;
  selectedCode?: string;
}

export function DeweyAutoSelector({
  onSelect,
  selectedCode,
}: DeweyAutoSelectorProps) {
  const [selectedBaseCode, setSelectedBaseCode] = useState<string>('');
  const [nextSequence, setNextSequence] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    deweyCategories,
    loadDeweyCategories,
    getNextDeweySequence,
    loading,
  } = useRecipeStore();

  useEffect(() => {
    if (deweyCategories.length === 0) {
      loadDeweyCategories();
    }
  }, [deweyCategories.length, loadDeweyCategories]);

  useEffect(() => {
    if (selectedCode) {
      setSelectedBaseCode(selectedCode);
    }
  }, [selectedCode]);

  const handleBaseCodeSelect = async (deweyCode: string) => {
    setSelectedBaseCode(deweyCode);

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
          setNextSequence(sequence);
        } catch (error) {
          console.error('Failed to get next sequence:', error);
        } finally {
          setIsGenerating(false);
        }
      } else {
        setNextSequence('');
      }
    }
  };

  const handleUseGeneratedSequence = () => {
    if (nextSequence) {
      onSelect(nextSequence);
    }
  };

  const handleUseBaseCode = () => {
    if (selectedBaseCode) {
      onSelect(selectedBaseCode);
    }
  };

  if (loading) {
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
        selectedCode={selectedBaseCode}
        deweyCategories={deweyCategories}
      />

      {selectedBaseCode && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Selected Classification
          </h4>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <div className="font-mono text-sm font-medium">
                  {selectedBaseCode}
                </div>
                <div className="text-xs text-gray-600">Base classification</div>
              </div>
              <Button
                onClick={handleUseBaseCode}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Use This
              </Button>
            </div>

            {isGenerating && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  Generating next sequence number...
                </div>
              </div>
            )}

            {nextSequence && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <div className="font-mono text-sm font-medium">
                    {nextSequence}
                  </div>
                  <div className="text-xs text-gray-600">
                    Auto-generated sequence number
                  </div>
                </div>
                <Button
                  onClick={handleUseGeneratedSequence}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Use Auto Number
                </Button>
              </div>
            )}
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
