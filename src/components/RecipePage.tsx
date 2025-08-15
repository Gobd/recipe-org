import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/TagInput";
import { RecipeDB } from "@/lib/database";
import type { Recipe } from "@/types/recipe";
import { X, ArrowLeft, Save } from "lucide-react";

export function RecipePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [recipeName, setRecipeName] = useState("");
  const [recipePage, setRecipePage] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecipe();
    loadAvailableTags();
  }, [id]);

  const loadRecipe = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const recipeData = await RecipeDB.getRecipeById(id);
      if (recipeData) {
        setRecipe(recipeData);
        setRecipeName(recipeData.name);
        setRecipePage(recipeData.page || "");
        setTags(recipeData.tags);
      } else {
        setError("Recipe not found");
      }
    } catch (error) {
      console.error('Failed to load recipe:', error);
      setError("Failed to load recipe");
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTags = async () => {
    try {
      const tagsData = await RecipeDB.getAllTags();
      setAvailableTags(tagsData);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const handleSave = async () => {
    if (!id || !recipe) return;
    
    const hasNameChanges = recipeName !== recipe.name;
    const hasPageChanges = recipePage !== (recipe.page || "");
    
    if (!hasNameChanges && !hasPageChanges) return;
    
    try {
      setSaving(true);
      const updates: { name?: string; page?: string } = {};
      
      if (hasNameChanges) {
        updates.name = recipeName;
      }
      
      if (hasPageChanges) {
        updates.page = recipePage;
      }
      
      const updatedRecipe = await RecipeDB.updateRecipe(id, updates);
      setRecipe(updatedRecipe);
    } catch (error) {
      console.error('Failed to save recipe:', error);
      setError("Failed to save recipe");
    } finally {
      setSaving(false);
    }
  };

  const handleTagsChange = async (newTags: string[]) => {
    if (!id || !recipe) return;
    
    setTags(newTags);
    
    // Auto-save tags immediately
    try {
      const updatedRecipe = await RecipeDB.updateRecipe(id, { tags: newTags });
      setRecipe(updatedRecipe);
      loadAvailableTags(); // Refresh available tags in case new ones were added
    } catch (error) {
      console.error('Failed to save tags:', error);
      setError("Failed to save tags");
    }
  };

  const handleDeleteRecipe = async () => {
    if (!id || !recipe) return;
    
    if (confirm(`Are you sure you want to delete "${recipe.name}"?`)) {
      try {
        await RecipeDB.deleteRecipe(id);
        navigate("/");
      } catch (error) {
        console.error('Failed to delete recipe:', error);
        setError("Failed to delete recipe");
      }
    }
  };


  if (loading) {
    return (
      <div className="container mx-auto p-8 max-w-4xl">
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="container mx-auto p-8 max-w-4xl">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error || "Recipe not found"}</p>
          <Link to="/" className="text-blue-600 hover:underline">
            ← Back to recipes
          </Link>
        </div>
      </div>
    );
  }

  const hasChanges = recipeName !== recipe.name || recipePage !== (recipe.page || "");

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-6">
        <Link 
          to="/" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to recipes
        </Link>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Recipe</h1>
            <p className="text-gray-600">
              Created {recipe.createdAt.toLocaleDateString()}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            
            <Button
              variant="destructive"
              onClick={handleDeleteRecipe}
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div>
              <Label htmlFor="recipe-name">Recipe Name</Label>
              <Input
                id="recipe-name"
                type="text"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
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
              <Label>Tags (auto-saved)</Label>
              <div className="mt-2">
                <TagInput
                  tags={tags}
                  availableTags={availableTags}
                  onTagsChange={handleTagsChange}
                  placeholder="Add new tags (press Enter to add)..."
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-yellow-800 text-sm">
            You have unsaved changes. Don't forget to save!
          </p>
        </div>
      )}
    </div>
  );
}