import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/TagInput";

interface SearchBarProps {
  searchTerm: string;
  selectedTags: string[];
  availableTags: string[];
  onSearchTermChange: (term: string) => void;
  onSelectedTagsChange: (tags: string[]) => void;
}

export function SearchBar({ 
  searchTerm, 
  selectedTags, 
  availableTags, 
  onSearchTermChange, 
  onSelectedTagsChange 
}: SearchBarProps) {
  return (
    <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
      <div>
        <Label htmlFor="search">Search Recipes</Label>
        <Input
          id="search"
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          placeholder="Search by recipe name..."
          className="mt-1"
        />
      </div>
      
      <div>
        <Label>Filter by Tags</Label>
        <div className="mt-1">
          <TagInput
            tags={selectedTags}
            availableTags={availableTags}
            onTagsChange={onSelectedTagsChange}
            placeholder="Select tags to filter..."
          />
        </div>
      </div>
    </div>
  );
}