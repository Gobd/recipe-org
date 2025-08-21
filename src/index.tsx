import { serve } from 'bun';
import { RecipeDB } from './db';
import index from './index.html';

type FileWithHeaders = {
  path: string;
  headers: Record<string, string>;
};

let indexFile: FileWithHeaders | undefined;
const otherFiles: Record<string, FileWithHeaders> = {};
if (index?.files) {
  for (const file of index.files) {
    const p = file.path.split('/').pop() || '';
    if (!p || /index-.+\.html$/.test(file.path)) {
      continue;
    }
    otherFiles[p] = file;
  }
  indexFile = index.files.find((file) => /index-.+\.html$/.test(file.path));
}

// Helper function to parse CSV line handling quoted fields
const parseCSVLine = (line: string): string[] => {
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

const server = serve({
  development: process.env.NODE_ENV !== 'production' && {
    // Echo console logs from the browser to the server
    console: true,
    // Enable browser hot reloading in development
    hmr: true,
  },
  routes: {
    // Serve React app for all other routes
    '/*': index?.files
      ? {
          async GET(req: Bun.BunRequest) {
            const url = new URL(req.url);
            const requestedPath = url.pathname.split('/').pop() || '';

            if (otherFiles[requestedPath]) {
              return new Response(Bun.file(otherFiles[requestedPath].path), {
                headers: otherFiles[requestedPath].headers,
              });
            }

            if (indexFile) {
              return new Response(Bun.file(indexFile.path), {
                headers: indexFile.headers,
              });
            }

            return new Response('Not Found', { status: 404 });
          },
        }
      : index,

    '/api/dewey': {
      async GET() {
        try {
          const categories = await RecipeDB.getAllDeweyCategories();
          return Response.json(categories);
        } catch (error) {
          console.error('API Error:', error);
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
      async POST(req: Bun.BunRequest) {
        try {
          const category = await req.json();
          const newCategory = await RecipeDB.addDeweyCategory(category);
          return Response.json(newCategory);
        } catch (error) {
          console.error('API Error:', error);
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
    },

    '/api/dewey/:id': {
      async DELETE(req: Bun.BunRequest) {
        try {
          const id = parseInt((req.params as any).id, 10);
          RecipeDB.deleteDeweyCategory(id);
          return Response.json({ success: true });
        } catch (error) {
          console.error('API Error:', error);
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
      async PUT(req: Bun.BunRequest) {
        try {
          const id = parseInt((req.params as any).id, 10);
          const updates = await req.json();
          const updatedCategory = await RecipeDB.updateDeweyCategory(id, updates);
          return Response.json(updatedCategory);
        } catch (error) {
          console.error('API Error:', error);
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
    },

    '/api/dewey/next-sequence/:baseCode': {
      async GET(req: Bun.BunRequest) {
        try {
          const baseCode = (req.params as any).baseCode;
          const nextSequence = await RecipeDB.getNextDeweySequence(baseCode);
          return Response.json({ nextSequence });
        } catch (error) {
          console.error('API Error:', error);
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
    },

    '/api/files/:id': {
      async DELETE(req: Bun.BunRequest) {
        try {
          const fileId = (req.params as any).id;
          RecipeDB.deleteFile(fileId);
          return Response.json({ success: true });
        } catch (error) {
          console.error('API Error:', error);
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
      async GET(req: Bun.BunRequest) {
        try {
          const fileId = (req.params as any).id;
          const file = await RecipeDB.getFileById(fileId);

          if (!file) {
            return Response.json({ error: 'File not found' }, { status: 404 });
          }

          return new Response(new Uint8Array(file.content), {
            headers: {
              'Content-Disposition': `attachment; filename="${file.filename}"`,
              'Content-Type': 'application/octet-stream',
            },
          });
        } catch (error) {
          console.error('API Error:', error);
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
    },
    // API Routes
    '/api/recipes': {
      async GET(req) {
        try {
          const url = new URL(req.url);
          const searchTerm = url.searchParams.get('search') || '';
          const tags = url.searchParams.get('tags');
          const selectedTags = tags ? JSON.parse(tags) : [];

          const recipes =
            searchTerm || selectedTags.length > 0
              ? await RecipeDB.searchRecipes(searchTerm, selectedTags)
              : await RecipeDB.getAllRecipes();

          return Response.json(recipes);
        } catch (error) {
          console.error('API Error:', error);
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },

      async POST(req: Bun.BunRequest) {
        try {
          const recipe = await req.json();
          const newRecipe = await RecipeDB.addRecipe(recipe);
          return Response.json(newRecipe);
        } catch (error) {
          console.error('API Error:', error);
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
    },

    '/api/recipes/:id': {
      async DELETE(req: Bun.BunRequest) {
        try {
          const id = (req.params as any).id;
          await RecipeDB.deleteRecipe(id);
          return Response.json({ success: true });
        } catch (error) {
          console.error('API Error:', error);
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
      async GET(req: Bun.BunRequest) {
        try {
          const id = (req.params as any).id;
          const recipe = await RecipeDB.getRecipeById(id);
          if (recipe) {
            return Response.json(recipe);
          } else {
            return Response.json(
              { error: 'Recipe not found' },
              { status: 404 },
            );
          }
        } catch (error) {
          console.error('API Error:', error);
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },

      async PUT(req: Bun.BunRequest) {
        try {
          const id = (req.params as any).id;
          const updates = await req.json();
          const updatedRecipe = await RecipeDB.updateRecipe(id, updates);
          return Response.json(updatedRecipe);
        } catch (error) {
          console.error('API Error:', error);
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
    },

    '/api/recipes/:id/files': {
      async POST(req: Bun.BunRequest) {
        try {
          const recipeId = (req.params as any).id;
          const formData = await req.formData();
          const file = formData.get('file') as File;

          if (!file) {
            return Response.json(
              { error: 'No file provided' },
              { status: 400 },
            );
          }

          const content = await file.arrayBuffer();
          const fileRecord = await RecipeDB.addFile(
            recipeId,
            file.name,
            content,
          );

          return Response.json(fileRecord);
        } catch (error) {
          console.error('API Error:', error);
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
    },

    '/api/recipes/:id/next': {
      async GET(req: Bun.BunRequest) {
        try {
          const id = (req.params as any).id;
          const nextRecipe = await RecipeDB.getNextRecipe(id);
          if (nextRecipe) {
            return Response.json(nextRecipe);
          } else {
            return Response.json(null);
          }
        } catch (error) {
          console.error('API Error:', error);
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
    },

    '/api/recipes/:id/previous': {
      async GET(req: Bun.BunRequest) {
        try {
          const id = (req.params as any).id;
          const previousRecipe = await RecipeDB.getPreviousRecipe(id);
          if (previousRecipe) {
            return Response.json(previousRecipe);
          } else {
            return Response.json(null);
          }
        } catch (error) {
          console.error('API Error:', error);
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
    },

    '/api/recipes/dewey/:deweyCode': {
      async GET(req: Bun.BunRequest) {
        try {
          const deweyCode = decodeURIComponent((req.params as any).deweyCode);
          const recipes = await RecipeDB.getRecipesByDeweyCode(deweyCode);
          return Response.json(recipes);
        } catch (error) {
          console.error('API Error:', error);
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
    },

    '/api/recipes/upload-csv': {
      async POST(req: Bun.BunRequest) {
        try {
          const formData = await req.formData();
          const file = formData.get('file') as File;

          if (!file) {
            return Response.json(
              { error: 'No file provided' },
              { status: 400 },
            );
          }

          if (!file.name.toLowerCase().endsWith('.csv')) {
            return Response.json(
              { error: 'File must be a CSV' },
              { status: 400 },
            );
          }

          const text = await file.text();
          const lines = text.split('\n').filter((line) => line.trim());

          if (lines.length === 0) {
            return Response.json(
              { error: 'CSV file is empty' },
              { status: 400 },
            );
          }

          // Skip header line if present
          const dataLines = lines.slice(1);
          let importedCount = 0;
          let updatedCount = 0;
          const errors: string[] = [];

          for (const line of dataLines) {
            if (!line.trim()) continue;

            try {
              // Parse CSV line handling quoted fields
              const fields = parseCSVLine(line);

              // Expected format: ID, Name, Page, URL, Notes, Rating, Tags, Created Date
              if (fields.length < 7) {
                errors.push(`Invalid line format: ${line.substring(0, 50)}...`);
                continue;
              }

              const [idStr, name, page, url, notes, ratingStr, tagsStr] =
                fields;

              if (!name?.trim()) {
                errors.push(`Missing recipe name: ${line.substring(0, 50)}...`);
                continue;
              }

              // Parse ID
              let recipeId = 0;
              if (idStr?.trim()) {
                const parsedId = parseInt(idStr.trim(), 10);
                if (!Number.isNaN(parsedId)) {
                  recipeId = parsedId;
                }
              }

              // Parse rating
              let rating: number | undefined;
              if (ratingStr?.trim()) {
                const parsedRating = parseFloat(ratingStr);
                if (!Number.isNaN(parsedRating)) {
                  rating = parsedRating;
                }
              }

              // Parse tags from comma-separated string
              const tags = tagsStr
                ? tagsStr
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter((tag) => tag.length > 0)
                : [];

              // Create recipe object
              const recipe = {
                name: name.trim(),
                notes: notes?.trim() || undefined,
                page: page?.trim() || undefined,
                rating: rating,
                tags: tags,
                url: url?.trim() || undefined,
              };

              const existingRecipe = recipeId
                ? RecipeDB.getRecipeById(recipeId)
                : false;
              if (existingRecipe) {
                // Update existing recipe
                RecipeDB.updateRecipe(recipeId, recipe);
                updatedCount++;
              } else {
                RecipeDB.addRecipe(recipe);
                importedCount++;
              }
            } catch (error) {
              console.error(`Error importing line: ${line}`, error);
              errors.push(
                `Line "${line.substring(0, 50)}...": ${error instanceof Error ? error.message : 'Unknown error'}`,
              );
            }
          }

          return Response.json({
            errorCount: errors.length,
            errors: errors.slice(0, 10), // Return first 10 errors
            importedCount,
            success: true,
            updatedCount,
          });
        } catch (error) {
          console.error('CSV Upload Error:', error);
          return Response.json(
            { error: 'Failed to process CSV file' },
            { status: 500 },
          );
        }
      },
    },

    '/api/tags': {
      async GET() {
        try {
          const tags = await RecipeDB.getAllTags();
          return Response.json(tags);
        } catch (error) {
          console.error('API Error:', error);
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
    },

    '/api/tags/counts': {
      async GET() {
        try {
          const tagsWithCounts = await RecipeDB.getTagsWithCounts();
          return Response.json(tagsWithCounts);
        } catch (error) {
          console.error('API Error:', error);
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
    },
  },
});

console.log(`🚀 Server running at ${server.url}`);
