import { SQL, sql } from 'bun';
import type { DeweyCategory, Recipe } from '@/types/recipe';

// Database setup
const db = new SQL('sqlite://recipes.db');

db`
  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    page TEXT,
    url TEXT,
    notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;

db`
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  )
`;

db`
  CREATE TABLE IF NOT EXISTS recipe_tags (
    recipe_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (recipe_id, tag_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  )
`;

db`
  CREATE TABLE IF NOT EXISTS recipe_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    content BLOB NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
  )
`;

db`
  CREATE TABLE IF NOT EXISTS dewey_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dewey_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    level INTEGER NOT NULL,
    parent_code TEXT,
    is_active BOOLEAN DEFAULT 1
  )
`;

// Add dewey_decimal column to recipes table if it doesn't exist
try {
  db`ALTER TABLE recipes ADD COLUMN dewey_decimal TEXT`;
} catch (_error) {
  // Column already exists, ignore error
}

// Cache for database queries
const cache = new Map<string, any>();

// Clear specific cache keys
const clearRecipeCache = (): void => {
  cache.delete('getAllRecipes');
  clearTagCache();
};

const clearTagCache = (): void => {
  cache.delete('getAllTags');
  cache.delete('getTagsWithCounts');
};

const clearDeweyCache = (): void => {
  cache.delete('getAllDeweyCategories');
};

// Recipe database operations
export const RecipeDB = {
  // Dewey Category operations
  async addDeweyCategory(
    category: Omit<DeweyCategory, 'id'>,
  ): Promise<DeweyCategory> {
    const [result] = await db`INSERT INTO dewey_categories ${sql({
      dewey_code: category.deweyCode,
      is_active: category.isActive,
      level: category.level,
      name: category.name,
      parent_code: category.parentCode || null,
    })} RETURNING *`;

    clearDeweyCache();

    return {
      deweyCode: result.dewey_code,
      id: result.id,
      isActive: result.is_active,
      level: result.level,
      name: result.name,
      parentCode: result.parent_code || undefined,
    };
  },
  // File operations
  async addFile(
    recipeId: string | number,
    filename: string,
    content: ArrayBuffer,
  ): Promise<{ id: number; filename: string }> {
    const id = parseInt(recipeId.toString(), 10);
    const [result] = await db`INSERT INTO recipe_files ${sql({
      content: new Uint8Array(content),
      filename: filename,
      recipe_id: id,
    })} RETURNING id`;
    return {
      filename: filename,
      id: result.id,
    };
  },
  async addRecipe(recipe: Omit<Recipe, 'id' | 'createdAt'>): Promise<Recipe> {
    const createdAt = new Date();

    // Insert recipe
    const [result] = await db`INSERT INTO recipes ${sql({
      created_at: createdAt.toISOString(),
      dewey_decimal: recipe.deweyDecimal || null,
      name: recipe.name,
      notes: recipe.notes || null,
      page: recipe.page || null,
      rating: recipe.rating || null,
      url: recipe.url || null,
    })} RETURNING id`;
    const recipeId = result.id;

    // Handle tags
    for (const tagName of recipe.tags) {
      // Insert tag if it doesn't exist (or get existing one)
      await db`INSERT OR IGNORE INTO tags ${sql({ name: tagName })}`;

      // Get tag ID
      const [tag] = await db`SELECT id FROM tags WHERE name = ${tagName}`;

      // Link recipe to tag
      await db`INSERT INTO recipe_tags ${sql({
        recipe_id: recipeId,
        tag_id: tag.id,
      })}`;
    }

    clearRecipeCache();

    return {
      createdAt,
      deweyDecimal: recipe.deweyDecimal,
      id: recipeId,
      name: recipe.name,
      notes: recipe.notes,
      page: recipe.page,
      rating: recipe.rating,
      tags: recipe.tags,
      url: recipe.url,
    };
  },

  async cleanupOrphanedTags(): Promise<void> {
    // First, remove recipe_tags entries that reference non-existent recipes
    await db`DELETE FROM recipe_tags 
             WHERE recipe_id NOT IN (
               SELECT id FROM recipes
             )`;

    // Then, remove tags that have no recipe associations
    await db`DELETE FROM tags 
             WHERE id NOT IN (
               SELECT DISTINCT tag_id FROM recipe_tags
             )`;
    clearTagCache();
  },

  async deleteDeweyCategory(id: number): Promise<void> {
    await db`DELETE FROM dewey_categories WHERE id = ${id}`;
    clearDeweyCache();
  },

  async deleteFile(fileId: string | number): Promise<void> {
    const id = parseInt(fileId.toString(), 10);
    await db`DELETE FROM recipe_files WHERE id = ${id}`;
  },

  async deleteRecipe(id: string | number): Promise<void> {
    await db`DELETE FROM recipes WHERE id = ${parseInt(id.toString(), 10)}`;
    await this.cleanupOrphanedTags();
    clearRecipeCache();
  },

  async getAllDeweyCategories(): Promise<DeweyCategory[]> {
    const cacheKey = 'getAllDeweyCategories';
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const categories =
      await db`SELECT * FROM dewey_categories ORDER BY dewey_code`;

    const result = categories.map(
      (category: {
        dewey_code: string;
        id: number;
        is_active: boolean;
        level: number;
        name: string;
        parent_code: string | null;
      }) => ({
        deweyCode: category.dewey_code,
        id: category.id,
        isActive: category.is_active,
        level: category.level,
        name: category.name,
        parentCode: category.parent_code || undefined,
      }),
    );

    cache.set(cacheKey, result);
    return result;
  },
  async getAllRecipes(): Promise<Recipe[]> {
    const cacheKey = 'getAllRecipes';
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const recipes = await db`SELECT * FROM recipes ORDER BY created_at DESC`;

    const result = await Promise.all(
      recipes.map(
        async (recipe: {
          id: number;
          dewey_decimal: string | null;
          created_at: string;
          name: string;
          notes: string | null;
          page: number | null;
          rating: number | null;
          url: string | null;
        }) => {
          const tags = await db`SELECT t.name 
                            FROM tags t 
                            JOIN recipe_tags rt ON t.id = rt.tag_id 
                            WHERE rt.recipe_id = ${recipe.id}`;

          return {
            createdAt: new Date(recipe.created_at),
            deweyDecimal: recipe.dewey_decimal || undefined,
            id: recipe.id,
            name: recipe.name,
            notes: recipe.notes || undefined,
            page: recipe.page || undefined,
            rating: recipe.rating || undefined,
            tags: tags.map((tag: { name: string }) => tag.name),
            url: recipe.url || undefined,
          };
        },
      ),
    );

    cache.set(cacheKey, result);
    return result;
  },

  async getAllTags(): Promise<string[]> {
    const cacheKey = 'getAllTags';
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const rows = await db`SELECT name FROM tags ORDER BY name`;
    const result = rows.map((row: { name: string }) => row.name);

    cache.set(cacheKey, result);
    return result;
  },

  async getDeweyChildCategories(parentCode: string): Promise<DeweyCategory[]> {
    const allCategories = await this.getAllDeweyCategories();
    return allCategories
      .filter(
        (category) => category.parentCode === parentCode && category.isActive,
      )
      .sort((a, b) => a.deweyCode.localeCompare(b.deweyCode));
  },

  async getDeweyRootCategories(): Promise<DeweyCategory[]> {
    const allCategories = await this.getAllDeweyCategories();
    return allCategories
      .filter((category) => !category.parentCode && category.isActive)
      .sort((a, b) => a.deweyCode.localeCompare(b.deweyCode));
  },

  async getFileById(
    fileId: string | number,
  ): Promise<{ filename: string; content: Uint8Array } | null> {
    const id = parseInt(fileId.toString(), 10);
    const [file] =
      await db`SELECT filename, content FROM recipe_files WHERE id = ${id}`;
    if (!file) return null;
    return {
      content: file.content,
      filename: file.filename,
    };
  },

  async getFilesByRecipeId(
    recipeId: string | number,
  ): Promise<Array<{ id: number; filename: string }>> {
    const id = parseInt(recipeId.toString(), 10);
    const files =
      await db`SELECT id, filename FROM recipe_files WHERE recipe_id = ${id} ORDER BY created_at DESC`;
    return files.map((file: { id: number; filename: string }) => ({
      filename: file.filename,
      id: file.id,
    }));
  },

  async getNextDeweySequence(baseDeweyCode: string): Promise<string> {
    // Get all recipes with Dewey codes that start with the base code
    const [result] =
      await db`SELECT dewey_decimal FROM recipes WHERE dewey_decimal LIKE ${`${baseDeweyCode}.%`} ORDER BY dewey_decimal DESC LIMIT 1`;

    if (!result) {
      return `${baseDeweyCode}.001`;
    }

    const lastCode = result.dewey_decimal;
    const parts = lastCode.split('.');
    const lastNumber = parseInt(parts[parts.length - 1], 10);
    const nextNumber = (lastNumber + 1).toString().padStart(3, '0');

    return `${baseDeweyCode}.${nextNumber}`;
  },

  async getNextRecipe(currentId: string | number): Promise<Recipe | null> {
    const recipeId = parseInt(currentId.toString(), 10);

    // Get the next recipe (newer) - one with a more recent created_at
    const [recipe] = await db`SELECT * FROM recipes 
                              WHERE created_at > (
                                SELECT created_at FROM recipes WHERE id = ${recipeId}
                              )
                              ORDER BY created_at ASC 
                              LIMIT 1`;

    if (!recipe) return null;

    const tags = await db`SELECT t.name 
                          FROM tags t 
                          JOIN recipe_tags rt ON t.id = rt.tag_id 
                          WHERE rt.recipe_id = ${recipe.id}`;

    return {
      createdAt: new Date(recipe.created_at),
      id: recipe.id,
      name: recipe.name,
      notes: recipe.notes || undefined,
      page: recipe.page || undefined,
      rating: recipe.rating || undefined,
      tags: tags.map((tag: { name: string }) => tag.name),
    };
  },

  async getPreviousRecipe(currentId: string | number): Promise<Recipe | null> {
    const recipeId = parseInt(currentId.toString(), 10);

    // Get the previous recipe (older) - one with an earlier created_at
    const [recipe] = await db`SELECT * FROM recipes 
                              WHERE created_at < (
                                SELECT created_at FROM recipes WHERE id = ${recipeId}
                              )
                              ORDER BY created_at DESC 
                              LIMIT 1`;

    if (!recipe) return null;

    const tags = await db`SELECT t.name 
                          FROM tags t 
                          JOIN recipe_tags rt ON t.id = rt.tag_id 
                          WHERE rt.recipe_id = ${recipe.id}`;

    return {
      createdAt: new Date(recipe.created_at),
      id: recipe.id,
      name: recipe.name,
      notes: recipe.notes || undefined,
      page: recipe.page || undefined,
      rating: recipe.rating || undefined,
      tags: tags.map((tag: { name: string }) => tag.name),
    };
  },

  async getRecipeById(id: string | number): Promise<Recipe | null> {
    const recipeId = parseInt(id.toString(), 10);
    const [recipe] = await db`SELECT * FROM recipes WHERE id = ${recipeId}`;

    if (!recipe) return null;

    const tags = await db`SELECT t.name 
                          FROM tags t 
                          JOIN recipe_tags rt ON t.id = rt.tag_id 
                          WHERE rt.recipe_id = ${recipeId}`;

    const files =
      await db`SELECT id, filename FROM recipe_files WHERE recipe_id = ${recipeId} ORDER BY created_at DESC`;

    return {
      createdAt: new Date(recipe.created_at),
      deweyDecimal: recipe.dewey_decimal || undefined,
      files: files.map((file: { id: number; filename: string }) => ({
        filename: file.filename,
        id: file.id,
      })),
      id: recipe.id,
      name: recipe.name,
      notes: recipe.notes || undefined,
      page: recipe.page || undefined,
      rating: recipe.rating || undefined,
      tags: tags.map((tag: { name: string }) => tag.name),
      url: recipe.url || undefined,
    };
  },

  async getRecipesByDeweyCode(deweyCode: string): Promise<Recipe[]> {
    const recipes =
      await db`SELECT * FROM recipes WHERE dewey_decimal = ${deweyCode} ORDER BY created_at DESC`;

    return await Promise.all(
      recipes.map(
        async (recipe: {
          id: number;
          dewey_decimal: string | null;
          created_at: string;
          name: string;
          notes: string | null;
          page: number | null;
          rating: number | null;
          url: string | null;
        }) => {
          const tags = await db`SELECT t.name 
                            FROM tags t 
                            JOIN recipe_tags rt ON t.id = rt.tag_id 
                            WHERE rt.recipe_id = ${recipe.id}`;

          return {
            createdAt: new Date(recipe.created_at),
            deweyDecimal: recipe.dewey_decimal || undefined,
            id: recipe.id,
            name: recipe.name,
            notes: recipe.notes || undefined,
            page: recipe.page || undefined,
            rating: recipe.rating || undefined,
            tags: tags.map((tag: { name: string }) => tag.name),
            url: recipe.url || undefined,
          };
        },
      ),
    );
  },

  async getTagsWithCounts(): Promise<Array<{ name: string; count: number }>> {
    const cacheKey = 'getTagsWithCounts';
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const rows = await db`SELECT t.name, COUNT(rt.recipe_id) as count
                          FROM tags t
                          LEFT JOIN recipe_tags rt ON t.id = rt.tag_id
                          GROUP BY t.id, t.name
                          ORDER BY count DESC, t.name ASC`;
    const result = rows.map((row: { count: number; name: string }) => ({
      count: row.count,
      name: row.name,
    }));

    cache.set(cacheKey, result);
    return result;
  },

  async searchRecipes(
    searchTerm: string,
    selectedTags: string[],
  ): Promise<Recipe[]> {
    let recipes: any[] = [];

    if (selectedTags.length > 0) {
      recipes = await db.unsafe(`
        SELECT r.* FROM recipes r
        WHERE r.id IN (
          SELECT rt.recipe_id 
          FROM recipe_tags rt
          JOIN tags t ON rt.tag_id = t.id
          WHERE t.name IN (${selectedTags.map(()=>"?").join(", ")})
          GROUP BY rt.recipe_id
          HAVING COUNT(DISTINCT t.name) = ?
        )
        ORDER BY r.created_at DESC
      `, [...selectedTags, selectedTags.length]);
    } else {
      // Get all recipes
      recipes = await db`SELECT * FROM recipes ORDER BY created_at DESC`;
    }

    // Filter by search term if provided
    if (searchTerm) {
      const filteredRecipes = [];
      for (const recipe of recipes) {
        // Check recipe name
        if (recipe.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          filteredRecipes.push(recipe);
          continue;
        }

        // Check tags
        const tags = await db`SELECT t.name 
                              FROM tags t 
                              JOIN recipe_tags rt ON t.id = rt.tag_id 
                              WHERE rt.recipe_id = ${recipe.id}`;
        const hasMatchingTag = tags.some((tag: { name: string }) =>
          tag.name.toLowerCase().includes(searchTerm.toLowerCase()),
        );
        if (hasMatchingTag) {
          filteredRecipes.push(recipe);
        }
      }
      recipes = filteredRecipes;
    }

    return  Promise.all(
      recipes.map(async (recipe) => {
        const tags = await db`SELECT t.name 
                            FROM tags t 
                            JOIN recipe_tags rt ON t.id = rt.tag_id 
                            WHERE rt.recipe_id = ${recipe.id}`;

        return {
          createdAt: new Date(recipe.created_at),
          deweyDecimal: recipe.dewey_decimal || undefined,
          id: recipe.id,
          name: recipe.name,
          notes: recipe.notes || undefined,
          page: recipe.page || undefined,
          rating: recipe.rating || undefined,
          tags: tags.map((tag: { name: string }) => tag.name),
          url: recipe.url || undefined,
        };
      }),
    );
  },

  async updateDeweyCategory(
    id: number,
    updates: Partial<Omit<DeweyCategory, 'id'>>,
  ): Promise<DeweyCategory> {
    const updateData: Record<string, any> = {};

    if (updates.deweyCode !== undefined) {
      updateData.dewey_code = updates.deweyCode;
    }
    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }
    if (updates.level !== undefined) {
      updateData.level = updates.level;
    }
    if (updates.parentCode !== undefined) {
      updateData.parent_code = updates.parentCode || null;
    }
    if (updates.isActive !== undefined) {
      updateData.is_active = updates.isActive;
    }

    await db`UPDATE dewey_categories SET ${sql(updateData)} WHERE id = ${id}`;

    const [result] = await db`SELECT * FROM dewey_categories WHERE id = ${id}`;

    clearDeweyCache();

    return {
      deweyCode: result.dewey_code,
      id: result.id,
      isActive: result.is_active,
      level: result.level,
      name: result.name,
      parentCode: result.parent_code || undefined,
    };
  },

  async updateRecipe(
    id: string | number,
    updates: {
      name?: string;
      page?: string;
      url?: string;
      notes?: string;
      rating?: number;
      tags?: string[];
      deweyDecimal?: string;
    },
  ): Promise<Recipe> {
    const recipeId = parseInt(id.toString(), 10);

    // Build update object for all provided fields
    const updateData: Record<string, any> = {};

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }
    if (updates.page !== undefined) {
      updateData.page = updates.page || null;
    }
    if (updates.url !== undefined) {
      updateData.url = updates.url || null;
    }
    if (updates.notes !== undefined) {
      updateData.notes = updates.notes || null;
    }
    if (updates.rating !== undefined) {
      updateData.rating = updates.rating || null;
    }
    if (updates.deweyDecimal !== undefined) {
      updateData.dewey_decimal = updates.deweyDecimal || null;
    }

    // Apply all recipe field updates at once if any fields are being updated
    if (Object.keys(updateData).length > 0) {
      await db`UPDATE recipes SET ${sql(updateData)} WHERE id = ${recipeId}`;
    }

    // Update tags if provided
    if (updates.tags) {
      // Remove all existing tags for this recipe
      await db`DELETE FROM recipe_tags WHERE recipe_id = ${recipeId}`;

      // Add new tags
      for (const tagName of updates.tags) {
        // Insert tag if it doesn't exist (or get existing one)
        await db`INSERT OR IGNORE INTO tags ${sql({ name: tagName })}`;

        // Get tag ID
        const [tag] = await db`SELECT id FROM tags WHERE name = ${tagName}`;

        // Link recipe to tag
        await db`INSERT INTO recipe_tags ${sql({
          recipe_id: recipeId,
          tag_id: tag.id,
        })}`;
      }

      // Clean up orphaned tags after tag changes
      await this.cleanupOrphanedTags();
    }

    // Return updated recipe
    const [recipe] = await db`SELECT * FROM recipes WHERE id = ${recipeId}`;

    const tags = await db`SELECT t.name 
                          FROM tags t 
                          JOIN recipe_tags rt ON t.id = rt.tag_id 
                          WHERE rt.recipe_id = ${recipeId}`;

    clearRecipeCache();

    return {
      createdAt: new Date(recipe.created_at),
      deweyDecimal: recipe.dewey_decimal || undefined,
      id: recipe.id,
      name: recipe.name,
      notes: recipe.notes || undefined,
      page: recipe.page || undefined,
      rating: recipe.rating || undefined,
      tags: tags.map((tag: { name: string }) => tag.name),
      url: recipe.url || undefined,
    };
  },
};
