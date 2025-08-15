import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RecipeDB } from '@/lib/database';

export function TagsPage() {
  const navigate = useNavigate();
  const [tagsWithCounts, setTagsWithCounts] = useState<
    Array<{ name: string; count: number }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTagsWithCounts = async () => {
      try {
        const data = await RecipeDB.getTagsWithCounts();
        setTagsWithCounts(data);
      } catch (error) {
        console.error('Failed to load tags with counts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTagsWithCounts();
  }, []);

  const handleTagClick = (tagName: string) => {
    navigate(`/?tags=${encodeURIComponent(tagName)}`);
  };

  const handleBackClick = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8 max-w-4xl">
        <div className="text-center">Loading tags...</div>
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
          Back
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">All Tags</h1>
      </div>

      {tagsWithCounts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600 text-center">
              No tags found. Start by adding recipes with tags!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {tagsWithCounts.map((tag) => (
            <Card
              key={tag.name}
              onClick={() => handleTagClick(tag.name)}
              className="hover:shadow-md transition-shadow cursor-pointer"
            >
              <CardContent className="pt-6">
                <button
                  type="button"
                  onClick={() => handleTagClick(tag.name)}
                  className="w-full text-left flex justify-between items-center"
                >
                  <span className="text-lg font-medium text-gray-900 cursor-pointer">
                    {tag.name}
                  </span>
                  <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
                    {tag.count} recipe{tag.count !== 1 ? 's' : ''}
                  </span>
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
