import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Edit2,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRecipeStore } from '@/store/recipeStore';
import type { DeweyCategory } from '@/types/recipe';

interface CategoryFormData {
  deweyCode: string;
  name: string;
  level: number;
  parentCode: string;
  isActive: boolean;
}

export function DeweyAdminPage() {
  const {
    deweyCategories: categories,
    loading,
    error,
    loadDeweyCategories,
    addDeweyCategory,
    updateDeweyCategory,
    deleteDeweyCategory,
    setError,
    clearError,
  } = useRecipeStore();
  const [editingCategory, setEditingCategory] = useState<DeweyCategory | null>(
    null,
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [formData, setFormData] = useState<CategoryFormData>({
    deweyCode: '',
    isActive: true,
    level: 1,
    name: '',
    parentCode: '',
  });

  useEffect(() => {
    loadDeweyCategories();
  }, [loadDeweyCategories]);

  const handleAddCategory = async () => {
    try {
      await addDeweyCategory({
        deweyCode: formData.deweyCode,
        isActive: formData.isActive,
        level: formData.level,
        name: formData.name,
        parentCode: formData.parentCode || undefined,
      });
      setShowAddForm(false);
      resetForm();
    } catch (error) {
      console.error('Failed to add category:', error);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;

    try {
      await updateDeweyCategory(editingCategory.id, {
        deweyCode: formData.deweyCode,
        isActive: formData.isActive,
        level: formData.level,
        name: formData.name,
        parentCode: formData.parentCode || undefined,
      });
      setEditingCategory(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const handleDeleteCategory = async (category: DeweyCategory) => {
    if (
      !confirm(
        `Are you sure you want to delete "${category.deweyCode} - ${category.name}"?`,
      )
    ) {
      return;
    }

    // Check if this category has children
    const hasChildren = categories.some(
      (cat) => cat.parentCode === category.deweyCode,
    );
    if (hasChildren) {
      alert(
        'Cannot delete a category that has child categories. Please delete the child categories first.',
      );
      return;
    }

    try {
      await deleteDeweyCategory(category.id);
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const handleClearAllCategories = async () => {
    if (
      !confirm(
        'Are you sure you want to delete ALL Dewey categories? This cannot be undone.',
      )
    ) {
      return;
    }

    try {
      // Delete all categories
      for (const category of categories) {
        await deleteDeweyCategory(category.id);
      }
      alert('All categories have been deleted.');
    } catch (error) {
      console.error('Failed to clear categories:', error);
    }
  };

  const startEditing = (category: DeweyCategory) => {
    setEditingCategory(category);
    setFormData({
      deweyCode: category.deweyCode,
      isActive: category.isActive,
      level: category.level,
      name: category.name,
      parentCode: category.parentCode || '',
    });
    setShowAddForm(false);
  };

  const startAdding = (parentCode?: string) => {
    setShowAddForm(true);
    setEditingCategory(null);

    if (parentCode) {
      const parentCategory = categories.find(
        (cat) => cat.deweyCode === parentCode,
      );
      const nextChildCode = getNextAvailableChildCode(parentCode);
      setFormData({
        deweyCode: nextChildCode,
        isActive: true,
        level: parentCategory ? parentCategory.level + 1 : 1,
        name: '',
        parentCode: parentCode,
      });
    } else {
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      deweyCode: '',
      isActive: true,
      level: 1,
      name: '',
      parentCode: '',
    });
    setShowAddForm(false);
    setEditingCategory(null);
  };

  const processCSVFile = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter((line) => line.trim());

      let importedCount = 0;
      const errors: string[] = [];
      const categoriesMap = new Map<string, DeweyCategory>(); // Track imported categories

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          // Parse CSV line - each field contains "code name" format
          const fields = line.split(',');

          // Process each field that contains data
          for (const field of fields) {
            const trimmedField = field.trim();
            if (!trimmedField) continue;

            // Parse the field to extract code and name
            const { code, name } = parseCodeAndName(trimmedField);
            if (!code || !name) continue;

            // Skip if already processed
            if (categoriesMap.has(code)) continue;

            // Check if category already exists in database
            const existingCategory = categories.find(
              (cat) => cat.deweyCode === code,
            );
            if (existingCategory) {
              categoriesMap.set(code, existingCategory);
              continue;
            }

            // Determine level based on dewey code length
            const level = getDeweyLevel(code);

            // Determine parent code based on dewey hierarchy
            const parentCode = getDeweyParentCode(code);

            // Create the category
            const newCategory = await addDeweyCategory({
              deweyCode: code,
              isActive: true,
              level,
              name,
              parentCode: parentCode || undefined,
            });

            categoriesMap.set(code, newCategory);
            importedCount++;
          }
        } catch (error) {
          console.error(`Error importing line: ${line}`, error);
          errors.push(
            `Line "${line.substring(0, 50)}...": ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      if (errors.length > 0) {
        setError(
          `Import completed with ${errors.length} errors. Imported ${importedCount} categories. First error: ${errors[0]}`,
        );
      } else {
        alert(`Successfully imported ${importedCount} categories!`);
      }
    } catch (error) {
      console.error('Failed to import CSV:', error);
      setError(
        `Failed to import CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  };

  const handleLoadDefaults = async () => {
    if (
      !confirm(
        'Load default Dewey categories? This will add standard categories to the database.',
      )
    ) {
      return;
    }

    try {
      clearError();

      // Fetch the default CSV file from the server
      const response = await fetch('/api/dewey/default-csv');
      if (!response.ok) {
        throw new Error('Failed to load default CSV file');
      }

      const text = await response.text();

      // Create a File object from the text to reuse existing import logic
      const file = new File([text], 'dewey.csv', { type: 'text/csv' });

      // Use the existing CSV import logic
      await processCSVFile(file);
    } catch (error) {
      console.error('Failed to load default categories:', error);
      setError(
        `Failed to load default categories: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  };

  const handleImportFromCSV = async () => {
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
          `Import categories from "${file.name}"? This will add new categories to the database.`,
        )
      ) {
        return;
      }

      try {
        await processCSVFile(file);
      } finally {
        document.body.removeChild(fileInput);
      }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
  };

  // Helper function to parse CSV line handling quoted fields
  const _parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result.map((field) => field.replace(/^"|"$/g, '').trim());
  };

  // Helper function to calculate level based on dewey code format
  const _calculateLevel = (deweyCode: string): number => {
    if (!deweyCode) return 1;

    // Count periods to determine depth
    const periods = (deweyCode.match(/\./g) || []).length;
    return periods + 1;
  };

  // Helper function to get parent code from dewey code
  const _getParentCode = (deweyCode: string): string | undefined => {
    if (!deweyCode || !deweyCode.includes('.')) return undefined;

    const lastPeriodIndex = deweyCode.lastIndexOf('.');
    return deweyCode.substring(0, lastPeriodIndex);
  };

  // Helper function to parse code and name from a field like "000 Chicken"
  const parseCodeAndName = (field: string): { code: string; name: string } => {
    if (!field.trim()) return { code: '', name: '' };

    // Match pattern like "000 Chicken" or "000.0 Breast"
    const match = field.match(/^([0-9.]+)\s+(.+)$/);
    if (match?.[1] && match[2]) {
      return { code: match[1].trim(), name: match[2].trim() };
    }

    // If no numeric code found, treat entire field as name
    return { code: '', name: field.trim() };
  };

  // Helper function to determine level based on dewey code hierarchy
  const getDeweyLevel = (deweyCode: string): number => {
    if (!deweyCode) return 1;

    // Handle decimal hierarchy
    if (deweyCode.includes('.')) {
      const parts = deweyCode.split('.');
      const beforeDot = parts[0] || '';
      const afterDot = parts[1] || '';

      // Level = base level from digits + decimal level
      // "000.0" = 3 (from "000") + 1 (from ".0") = 4
      // "000.00" = 3 (from "000") + 2 (from ".00") = 5
      return beforeDot.length + afterDot.length;
    }

    // Handle digit hierarchy: "0" = 1, "00" = 2, "000" = 3
    return deweyCode.length;
  };

  // Helper function to get parent code based on dewey hierarchy
  const getDeweyParentCode = (deweyCode: string): string | undefined => {
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

  const getCategoryTree = () => {
    const rootCategories = categories.filter((cat) => !cat.parentCode);
    return rootCategories.sort((a, b) =>
      a.deweyCode.localeCompare(b.deweyCode),
    );
  };

  const getChildCategories = (parentCode: string) => {
    return categories
      .filter((cat) => cat.parentCode === parentCode)
      .sort((a, b) => a.deweyCode.localeCompare(b.deweyCode));
  };

  const toggleExpanded = (categoryCode: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryCode)) {
      newExpanded.delete(categoryCode);
    } else {
      newExpanded.add(categoryCode);
    }
    setExpandedCategories(newExpanded);
  };

  const isExpanded = (categoryCode: string) => {
    return expandedCategories.has(categoryCode);
  };

  const hasChildren = (categoryCode: string) => {
    return categories.some((cat) => cat.parentCode === categoryCode);
  };

  const getChildrenCount = (categoryCode: string) => {
    return categories.filter((cat) => cat.parentCode === categoryCode).length;
  };

  const getNextAvailableChildCode = (parentCode: string): string => {
    const existingChildren = categories
      .filter((cat) => cat.parentCode === parentCode)
      .map((cat) => cat.deweyCode);

    if (existingChildren.length === 0) {
      // No existing children, default to decimal notation for consistency
      return `${parentCode}.0`;
    }

    // Analyze existing children to determine the pattern
    const hasDecimalNotation = existingChildren.some((code) =>
      code.startsWith(`${parentCode}.`),
    );

    if (hasDecimalNotation) {
      // Use decimal notation: parent.0, parent.1, parent.2, etc.
      const existingNumbers = existingChildren
        .filter((code) => code.startsWith(`${parentCode}.`))
        .map((code) => {
          const suffix = code.substring(parentCode.length + 1);
          return parseInt(suffix, 10);
        })
        .filter((num) => !Number.isNaN(num));

      // Find the next available number
      for (let i = 0; i <= 99; i++) {
        if (!existingNumbers.includes(i)) {
          return `${parentCode}.${i}`;
        }
      }

      // Fallback
      return `${parentCode}.0`;
    } else {
      // Use direct concatenation: parent0, parent1, parent2, etc.
      for (let i = 0; i <= 9; i++) {
        const candidateCode = `${parentCode}${i}`;
        if (!existingChildren.includes(candidateCode)) {
          return candidateCode;
        }
      }

      // If 0-9 are all taken, continue with 10, 11, 12, etc.
      for (let i = 10; i <= 99; i++) {
        const candidateCode = `${parentCode}${i}`;
        if (!existingChildren.includes(candidateCode)) {
          return candidateCode;
        }
      }

      // Fallback
      return `${parentCode}0`;
    }
  };

  const renderCategoryTree = (cats: DeweyCategory[], level = 0) => {
    return cats.map((category) => {
      const categoryHasChildren = hasChildren(category.deweyCode);
      const expanded = isExpanded(category.deweyCode);
      const childCategories = getChildCategories(category.deweyCode);
      const childrenCount = getChildrenCount(category.deweyCode);

      return (
        <div key={category.id} className="mb-2">
          <div
            className={`flex items-center justify-between p-3 rounded-lg border ${
              category.isActive ? 'bg-white' : 'bg-gray-100'
            } ${editingCategory?.id === category.id ? 'ring-2 ring-blue-500' : ''}`}
            style={{ marginLeft: `${level * 20}px` }}
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                {categoryHasChildren && (
                  <button
                    type="button"
                    onClick={() => toggleExpanded(category.deweyCode)}
                    className="flex items-center justify-center w-5 h-5 rounded hover:bg-gray-200 transition-colors"
                    aria-label={expanded ? 'Collapse' : 'Expand'}
                  >
                    {expanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                )}
                {!categoryHasChildren && <div className="w-5" />}
                <span className="font-mono text-sm font-medium min-w-[80px]">
                  {category.deweyCode}
                </span>
                <span
                  className={`text-sm ${!category.isActive ? 'text-gray-500' : ''}`}
                >
                  {category.name}
                </span>
                <span className="text-xs text-gray-400">
                  (Level {category.level})
                </span>
                {childrenCount > 0 && (
                  <span className="text-xs text-blue-600 font-medium">
                    ({childrenCount}{' '}
                    {childrenCount === 1 ? 'child' : 'children'})
                  </span>
                )}
                {!category.isActive && (
                  <span className="text-xs text-red-500 font-medium">
                    INACTIVE
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => startAdding(category.deweyCode)}
                size="sm"
                variant="outline"
                className="flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Child
              </Button>
              <Button
                onClick={() => startEditing(category)}
                size="sm"
                variant="outline"
                className="flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                Edit
              </Button>
              <Button
                onClick={() => handleDeleteCategory(category)}
                size="sm"
                variant="destructive"
                className="flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </Button>
            </div>
          </div>

          {categoryHasChildren && (
            <div
              className="mt-2"
              style={{
                contentVisibility: expanded ? 'visible' : 'auto',
                display: expanded ? 'block' : 'none',
              }}
            >
              {expanded && renderCategoryTree(childCategories, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8 max-w-6xl">
        <div className="text-center py-8">Loading categories...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to recipes
        </Link>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Dewey Decimal System Administration
            </h1>
            <p className="text-gray-600">
              Manage the Dewey decimal classification categories
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => startAdding()}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Root Category
            </Button>
            <Button
              onClick={handleImportFromCSV}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Import from CSV
            </Button>
            <Button
              onClick={handleClearAllCategories}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
          <Button
            onClick={clearError}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Dismiss
          </Button>
        </div>
      )}

      {(showAddForm || editingCategory) && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dewey-code">Dewey Code</Label>
                  <Input
                    id="dewey-code"
                    value={formData.deweyCode}
                    onChange={(e) =>
                      setFormData({ ...formData, deweyCode: e.target.value })
                    }
                    placeholder="e.g., 000.00"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Computer Science"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="level">Level</Label>
                  <Input
                    id="level"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.level}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        level: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="parent-code">Parent Code (optional)</Label>
                  <Input
                    id="parent-code"
                    value={formData.parentCode}
                    onChange={(e) =>
                      setFormData({ ...formData, parentCode: e.target.value })
                    }
                    placeholder="e.g., 000"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="is-active"
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <Label htmlFor="is-active" className="cursor-pointer">
                  Active
                </Label>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={
                    editingCategory ? handleUpdateCategory : handleAddCategory
                  }
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingCategory ? 'Update' : 'Add'} Category
                </Button>
                <Button
                  onClick={resetForm}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              Category Tree ({categories.length} total categories)
            </h3>

            {categories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-4">
                  No categories found. Import from CSV or add categories
                  manually.
                </p>
                <div className="flex justify-center gap-2">
                  <Button
                    onClick={handleLoadDefaults}
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Load Default Categories
                  </Button>
                  <Button
                    onClick={handleImportFromCSV}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Import Custom CSV
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {renderCategoryTree(getCategoryTree())}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
