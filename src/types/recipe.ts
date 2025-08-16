export interface Recipe {
  id: number;
  name: string;
  page?: string;
  url?: string;
  tags: string[];
  createdAt: Date;
  notes?: string;
  rating?: number;
}
