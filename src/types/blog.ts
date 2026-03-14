export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  author: string;
  tags: string[];
  published: boolean;
  archived: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
