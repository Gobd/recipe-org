import { Database } from 'bun:sqlite';
import type { Recipe } from '@/types/recipe';

// Database setup
const db = new Database('recipes.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    page TEXT,
    url TEXT,
    notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS recipe_tags (
    recipe_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (recipe_id, tag_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS recipe_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    content BLOB NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
  )
`);

// Recipe database operations
export const RecipeDB = {
  // File operations
  addFile(
    recipeId: string | number,
    filename: string,
    content: ArrayBuffer,
  ): { id: number; filename: string } {
    const id = parseInt(recipeId.toString(), 10);
    const query = db.query(
      'INSERT INTO recipe_files (recipe_id, filename, content) VALUES (?, ?, ?) RETURNING id',
    );
    const result = query.get(id, filename, new Uint8Array(content)) as any;
    return {
      filename: filename,
      id: result.id,
    };
  },
  addRecipe(recipe: Omit<Recipe, 'id' | 'createdAt'>): Recipe {
    const createdAt = new Date();

    // Insert recipe
    const recipeQuery = db.query(
      'INSERT INTO recipes (name, page, url, notes, rating, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
    );
    const result = recipeQuery.get(
      recipe.name,
      recipe.page || null,
      recipe.url || null,
      recipe.notes || null,
      recipe.rating || null,
      createdAt.toISOString(),
    ) as any;
    const recipeId = result.id;

    // Handle tags
    for (const tagName of recipe.tags) {
      // Insert tag if it doesn't exist (or get existing one)
      const insertTagQuery = db.query(
        'INSERT OR IGNORE INTO tags (name) VALUES (?)',
      );
      insertTagQuery.run(tagName);

      // Get tag ID
      const getTagQuery = db.query('SELECT id FROM tags WHERE name = ?');
      const tag = getTagQuery.get(tagName) as any;

      // Link recipe to tag
      const linkQuery = db.query(
        'INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)',
      );
      linkQuery.run(recipeId, tag.id);
    }

    return {
      createdAt,
      id: recipeId,
      name: recipe.name,
      notes: recipe.notes,
      page: recipe.page,
      rating: recipe.rating,
      tags: recipe.tags,
      url: recipe.url,
    };
  },

  cleanupOrphanedTags(): void {
    // First, remove recipe_tags entries that reference non-existent recipes
    const deleteOrphanedAssociationsQuery = db.query(`
      DELETE FROM recipe_tags 
      WHERE recipe_id NOT IN (
        SELECT id FROM recipes
      )
    `);
    deleteOrphanedAssociationsQuery.run();

    // Then, remove tags that have no recipe associations
    const deleteOrphanedTagsQuery = db.query(`
      DELETE FROM tags 
      WHERE id NOT IN (
        SELECT DISTINCT tag_id FROM recipe_tags
      )
    `);
    deleteOrphanedTagsQuery.run();
  },

  deleteFile(fileId: string | number): void {
    const id = parseInt(fileId.toString(), 10);
    const query = db.query('DELETE FROM recipe_files WHERE id = ?');
    query.run(id);
  },

  deleteRecipe(id: string | number): void {
    const query = db.query('DELETE FROM recipes WHERE id = ?');
    query.run(parseInt(id.toString(), 10));
    this.cleanupOrphanedTags();
  },
  getAllRecipes(): Recipe[] {
    const recipesQuery = db.query(
      'SELECT * FROM recipes ORDER BY created_at DESC',
    );
    const recipes = recipesQuery.all() as any[];

    return recipes.map((recipe) => {
      const tagsQuery = db.query(`
        SELECT t.name 
        FROM tags t 
        JOIN recipe_tags rt ON t.id = rt.tag_id 
        WHERE rt.recipe_id = ?
      `);
      const tags = tagsQuery.all(recipe.id) as any[];

      return {
        createdAt: new Date(recipe.created_at),
        id: recipe.id,
        name: recipe.name,
        notes: recipe.notes || undefined,
        page: recipe.page || undefined,
        rating: recipe.rating || undefined,
        tags: tags.map((tag) => tag.name),
        url: recipe.url || undefined,
      };
    });
  },

  getAllTags(): string[] {
    const query = db.query('SELECT name FROM tags ORDER BY name');
    const rows = query.all() as any[];
    return rows.map((row) => row.name);
  },

  getFileById(
    fileId: string | number,
  ): { filename: string; content: Uint8Array } | null {
    const id = parseInt(fileId.toString(), 10);
    const query = db.query(
      'SELECT filename, content FROM recipe_files WHERE id = ?',
    );
    const file = query.get(id) as any;
    if (!file) return null;
    return {
      content: file.content,
      filename: file.filename,
    };
  },

  getFilesByRecipeId(
    recipeId: string | number,
  ): Array<{ id: number; filename: string }> {
    const id = parseInt(recipeId.toString(), 10);
    const query = db.query(
      'SELECT id, filename FROM recipe_files WHERE recipe_id = ? ORDER BY created_at DESC',
    );
    const files = query.all(id) as any[];
    return files.map((file) => ({
      filename: file.filename,
      id: file.id,
    }));
  },

  getNextRecipe(currentId: string | number): Recipe | null {
    const recipeId = parseInt(currentId.toString(), 10);

    // Get the next recipe (newer) - one with a more recent created_at
    const recipeQuery = db.query(`
      SELECT * FROM recipes 
      WHERE created_at > (
        SELECT created_at FROM recipes WHERE id = ?
      )
      ORDER BY created_at ASC 
      LIMIT 1
    `);
    const recipe = recipeQuery.get(recipeId) as any;

    if (!recipe) return null;

    const tagsQuery = db.query(`
      SELECT t.name 
      FROM tags t 
      JOIN recipe_tags rt ON t.id = rt.tag_id 
      WHERE rt.recipe_id = ?
    `);
    const tags = tagsQuery.all(recipe.id) as any[];

    return {
      createdAt: new Date(recipe.created_at),
      id: recipe.id,
      name: recipe.name,
      notes: recipe.notes || undefined,
      page: recipe.page || undefined,
      rating: recipe.rating || undefined,
      tags: tags.map((tag) => tag.name),
    };
  },

  getPreviousRecipe(currentId: string | number): Recipe | null {
    const recipeId = parseInt(currentId.toString(), 10);

    // Get the previous recipe (older) - one with an earlier created_at
    const recipeQuery = db.query(`
      SELECT * FROM recipes 
      WHERE created_at < (
        SELECT created_at FROM recipes WHERE id = ?
      )
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    const recipe = recipeQuery.get(recipeId) as any;

    if (!recipe) return null;

    const tagsQuery = db.query(`
      SELECT t.name 
      FROM tags t 
      JOIN recipe_tags rt ON t.id = rt.tag_id 
      WHERE rt.recipe_id = ?
    `);
    const tags = tagsQuery.all(recipe.id) as any[];

    return {
      createdAt: new Date(recipe.created_at),
      id: recipe.id,
      name: recipe.name,
      notes: recipe.notes || undefined,
      page: recipe.page || undefined,
      rating: recipe.rating || undefined,
      tags: tags.map((tag) => tag.name),
    };
  },

  getRecipeById(id: string | number): Recipe | null {
    const recipeId = parseInt(id.toString(), 10);
    const recipeQuery = db.query('SELECT * FROM recipes WHERE id = ?');
    const recipe = recipeQuery.get(recipeId) as any;

    if (!recipe) return null;

    const tagsQuery = db.query(`
      SELECT t.name 
      FROM tags t 
      JOIN recipe_tags rt ON t.id = rt.tag_id 
      WHERE rt.recipe_id = ?
    `);
    const tags = tagsQuery.all(recipeId) as any[];

    const filesQuery = db.query(
      'SELECT id, filename FROM recipe_files WHERE recipe_id = ? ORDER BY created_at DESC',
    );
    const files = filesQuery.all(recipeId) as any[];

    return {
      createdAt: new Date(recipe.created_at),
      files: files.map((file) => ({
        filename: file.filename,
        id: file.id,
      })),
      id: recipe.id,
      name: recipe.name,
      notes: recipe.notes || undefined,
      page: recipe.page || undefined,
      rating: recipe.rating || undefined,
      tags: tags.map((tag) => tag.name),
      url: recipe.url || undefined,
    };
  },

  getTagsWithCounts(): Array<{ name: string; count: number }> {
    const query = db.query(`
      SELECT t.name, COUNT(rt.recipe_id) as count
      FROM tags t
      LEFT JOIN recipe_tags rt ON t.id = rt.tag_id
      GROUP BY t.id, t.name
      ORDER BY count DESC, t.name ASC
    `);
    const rows = query.all() as any[];
    return rows.map((row) => ({ count: row.count, name: row.name }));
  },

  searchRecipes(searchTerm: string, selectedTags: string[]): Recipe[] {
    let recipes: any[] = [];

    if (selectedTags.length > 0) {
      // Find recipes that have ALL selected tags
      const placeholders = selectedTags.map(() => '?').join(', ');
      const sql = `
        SELECT r.* FROM recipes r
        WHERE r.id IN (
          SELECT rt.recipe_id 
          FROM recipe_tags rt
          JOIN tags t ON rt.tag_id = t.id
          WHERE t.name IN (${placeholders})
          GROUP BY rt.recipe_id
          HAVING COUNT(DISTINCT t.name) = ?
        )
        ORDER BY r.created_at DESC
      `;
      const query = db.query(sql);
      recipes = query.all(...selectedTags, selectedTags.length) as any[];
    } else {
      // Get all recipes
      const query = db.query('SELECT * FROM recipes ORDER BY created_at DESC');
      recipes = query.all() as any[];
    }

    // Filter by search term if provided
    if (searchTerm) {
      recipes = recipes.filter((recipe) => {
        // Check recipe name
        if (recipe.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return true;
        }

        // Check tags
        const tagsQuery = db.query(`
          SELECT t.name 
          FROM tags t 
          JOIN recipe_tags rt ON t.id = rt.tag_id 
          WHERE rt.recipe_id = ?
        `);
        const tags = tagsQuery.all(recipe.id) as any[];
        return tags.some((tag) =>
          tag.name.toLowerCase().includes(searchTerm.toLowerCase()),
        );
      });
    }

    return recipes.map((recipe) => {
      const tagsQuery = db.query(`
        SELECT t.name 
        FROM tags t 
        JOIN recipe_tags rt ON t.id = rt.tag_id 
        WHERE rt.recipe_id = ?
      `);
      const tags = tagsQuery.all(recipe.id) as any[];

      return {
        createdAt: new Date(recipe.created_at),
        id: recipe.id,
        name: recipe.name,
        notes: recipe.notes || undefined,
        page: recipe.page || undefined,
        rating: recipe.rating || undefined,
        tags: tags.map((tag) => tag.name),
        url: recipe.url || undefined,
      };
    });
  },

  updateRecipe(
    id: string | number,
    updates: {
      name?: string;
      page?: string;
      url?: string;
      notes?: string;
      rating?: number;
      tags?: string[];
    },
  ): Recipe {
    const recipeId = parseInt(id.toString(), 10);

    // Update recipe name if provided
    if (updates.name !== undefined) {
      const updateNameQuery = db.query(
        'UPDATE recipes SET name = ? WHERE id = ?',
      );
      updateNameQuery.run(updates.name, recipeId);
    }

    // Update recipe page if provided
    if (updates.page !== undefined) {
      const updatePageQuery = db.query(
        'UPDATE recipes SET page = ? WHERE id = ?',
      );
      updatePageQuery.run(updates.page || null, recipeId);
    }

    // Update recipe URL if provided
    if (updates.url !== undefined) {
      const updateUrlQuery = db.query(
        'UPDATE recipes SET url = ? WHERE id = ?',
      );
      updateUrlQuery.run(updates.url || null, recipeId);
    }

    // Update recipe notes if provided
    if (updates.notes !== undefined) {
      const updateNotesQuery = db.query(
        'UPDATE recipes SET notes = ? WHERE id = ?',
      );
      updateNotesQuery.run(updates.notes || null, recipeId);
    }

    // Update recipe rating if provided
    if (updates.rating !== undefined) {
      const updateRatingQuery = db.query(
        'UPDATE recipes SET rating = ? WHERE id = ?',
      );
      updateRatingQuery.run(updates.rating || null, recipeId);
    }

    // Update tags if provided
    if (updates.tags) {
      // Remove all existing tags for this recipe
      const removeTagsQuery = db.query(
        'DELETE FROM recipe_tags WHERE recipe_id = ?',
      );
      removeTagsQuery.run(recipeId);

      // Add new tags
      for (const tagName of updates.tags) {
        // Insert tag if it doesn't exist (or get existing one)
        const insertTagQuery = db.query(
          'INSERT OR IGNORE INTO tags (name) VALUES (?)',
        );
        insertTagQuery.run(tagName);

        // Get tag ID
        const getTagQuery = db.query('SELECT id FROM tags WHERE name = ?');
        const tag = getTagQuery.get(tagName) as any;

        // Link recipe to tag
        const linkQuery = db.query(
          'INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)',
        );
        linkQuery.run(recipeId, tag.id);
      }

      // Clean up orphaned tags after tag changes
      this.cleanupOrphanedTags();
    }

    // Return updated recipe
    const recipeQuery = db.query('SELECT * FROM recipes WHERE id = ?');
    const recipe = recipeQuery.get(recipeId) as any;

    const tagsQuery = db.query(`
      SELECT t.name 
      FROM tags t 
      JOIN recipe_tags rt ON t.id = rt.tag_id 
      WHERE rt.recipe_id = ?
    `);
    const tags = tagsQuery.all(recipeId) as any[];

    return {
      createdAt: new Date(recipe.created_at),
      id: recipe.id,
      name: recipe.name,
      notes: recipe.notes || undefined,
      page: recipe.page || undefined,
      rating: recipe.rating || undefined,
      tags: tags.map((tag) => tag.name),
      url: recipe.url || undefined,
    };
  },
};
