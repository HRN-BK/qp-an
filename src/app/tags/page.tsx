import { auth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface TagWithCount {
  id: string;
  name: string;
  color?: string;
  vocabulary_count: number;
}

export default async function TagsPage() {
  const { userId } = await auth();
  
  if (!userId) {
    return <div>Please sign in to view tags.</div>;
  }

  const supabase = createServerClient();

  // Get all tags with vocabulary count
  const { data: tags, error } = await supabase
    .from('tags')
    .select(`
      id,
      name,
      color,
      vocabulary_tags (
        vocabulary_id
      )
    `)
    .eq('user_id', userId)
    .order('name');

  if (error) {
    console.error('Error fetching tags:', error);
    return <div>Error loading tags.</div>;
  }

  // Transform data to include count
  const tagsWithCount: TagWithCount[] = tags?.map(tag => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
    vocabulary_count: tag.vocabulary_tags?.length || 0
  })) || [];

  // Sort by vocabulary count descending
  tagsWithCount.sort((a, b) => b.vocabulary_count - a.vocabulary_count);

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Tags</h1>
          <p className="text-muted-foreground">
            Organize your vocabulary with tags
          </p>
        </div>

        {tagsWithCount.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tagsWithCount.map((tag) => (
              <Link key={tag.id} href={`/tags/${encodeURIComponent(tag.name)}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{tag.name}</span>
                      <Badge variant="secondary">
                        {tag.vocabulary_count}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {tag.vocabulary_count === 1 
                        ? "1 vocabulary" 
                        : `${tag.vocabulary_count} vocabularies`}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No tags yet</h3>
            <p className="text-muted-foreground mb-6">
              Tags will appear here when you add them to your vocabularies.
            </p>
            <Link href="/vocabulary/new">
              <Badge variant="outline" className="cursor-pointer">
                Add your first vocabulary
              </Badge>
            </Link>
          </div>
        )}

        {/* Statistics */}
        {tagsWithCount.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{tagsWithCount.length}</p>
                  <p className="text-sm text-muted-foreground">Total Tags</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">
                    {tagsWithCount.reduce((sum, tag) => sum + tag.vocabulary_count, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Associations</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">
                    {Math.round(tagsWithCount.reduce((sum, tag) => sum + tag.vocabulary_count, 0) / tagsWithCount.length) || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Avg per Tag</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedLayout>
  );
}
