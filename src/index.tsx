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
          const categories = RecipeDB.getAllDeweyCategories();
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
          const newCategory = RecipeDB.addDeweyCategory(category);
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
          const updatedCategory = RecipeDB.updateDeweyCategory(id, updates);
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
          const nextSequence = RecipeDB.getNextDeweySequence(baseCode);
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
          const file = RecipeDB.getFileById(fileId);

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
              ? RecipeDB.searchRecipes(searchTerm, selectedTags)
              : RecipeDB.getAllRecipes();

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
          const newRecipe = RecipeDB.addRecipe(recipe);
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
          RecipeDB.deleteRecipe(id);
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
          const recipe = RecipeDB.getRecipeById(id);
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
          const updatedRecipe = RecipeDB.updateRecipe(id, updates);
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
          const fileRecord = RecipeDB.addFile(recipeId, file.name, content);

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
          const nextRecipe = RecipeDB.getNextRecipe(id);
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
          const previousRecipe = RecipeDB.getPreviousRecipe(id);
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
          const recipes = RecipeDB.getRecipesByDeweyCode(deweyCode);
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

    '/api/tags': {
      async GET() {
        try {
          const tags = RecipeDB.getAllTags();
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
          const tagsWithCounts = RecipeDB.getTagsWithCounts();
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
