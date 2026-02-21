import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sessions as sessionsApi, SessionListItem } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { PathDoodle, SparklesDoodle } from "@/components/Doodles";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    done: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    generating: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    pending: "bg-muted text-muted-foreground",
    error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full ${styles[status] ?? styles.pending}`}
    >
      {status}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const History = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sessionsApi
      .list()
      .then(setItems)
      .catch((e) => setError(e.message ?? "Failed to load sessions"))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await sessionsApi.delete(id);
      setItems((prev) => prev.filter((s) => s.id !== id));
    } catch {
      /* show nothing — non-critical */
    }
  };

  return (
    <div className="relative min-h-screen px-4 py-10 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-blob blur-3xl opacity-30 pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-secondary/10 rounded-blob blur-3xl opacity-30 pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <PathDoodle className="w-7 h-7 text-primary" />
            <span className="text-xl font-display font-bold">Pathfinder</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>

        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-display font-bold">Your reflections</h1>
          <Button variant="hero" size="sm" asChild>
            <Link to="/write">
              <SparklesDoodle className="w-4 h-4 mr-1" />
              New reflection
            </Link>
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-2xl p-6 text-center">
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground font-body mb-6">
              No reflections yet. Start your first one!
            </p>
            <Button variant="hero" size="lg" asChild>
              <Link to="/write">
                <SparklesDoodle className="w-5 h-5 mr-1" />
                Write about your path
              </Link>
            </Button>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-card border-2 border-foreground/10 rounded-2xl p-5 shadow-playful hover:shadow-playful-hover transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <StatusBadge status={item.status} />
                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.created_at)}
                      </span>
                    </div>

                    {item.first_archetype && (
                      <p className="text-sm font-medium text-primary mb-1 truncate">
                        {item.first_archetype}
                      </p>
                    )}

                    <p className="text-sm text-muted-foreground line-clamp-2 font-body">
                      {item.user_text}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.status === "done" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/results/${item.id}`)}
                      >
                        View
                      </Button>
                    )}
                    {item.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/write?session=${item.id}`)}
                      >
                        Continue
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(item.id)}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Link
            to="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default History;
