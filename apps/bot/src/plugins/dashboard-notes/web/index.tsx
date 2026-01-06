import {
  useState,
  useEffect,
  FormEvent,
  ReactRouterDOM,
} from "@jasper/elements";
import { Card, Button, Input, Table, Badge, Loader } from "@jasper/ui";
import { Trash2, Plus, Clipboard } from "lucide-react";

interface Note {
  id: string;
  content: string;
  createdAt: number;
}

// --- Shared Logic ---
const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = async () => {
    try {
      const res = await fetch("/api/plugins/dashboard-notes/notes");
      const data = await res.json();
      setNotes(data.notes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addNote = async (content: string) => {
    await fetch("/api/plugins/dashboard-notes/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    fetchNotes();
  };

  const deleteNote = async (id: string) => {
    await fetch(`/api/plugins/dashboard-notes/notes/${id}`, {
      method: "DELETE",
    });
    fetchNotes();
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  return { notes, loading, addNote, deleteNote, refresh: fetchNotes };
};

// --- Widget Component ---
export const NotesWidget = () => {
  const { notes, loading } = useNotes();
  const navigate = ReactRouterDOM.useNavigate();

  return (
    <Card className="h-full flex flex-col p-0 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
        <h3 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Clipboard className="w-4 h-4 text-blue-500" />
          Quick Notes
        </h3>
        <Badge
          variant="info"
          className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-0"
        >
          {notes.length}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {loading ? (
          <div className="flex justify-center p-4">
            <Loader />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 mb-2">No notes yet</p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate("/plugins/dashboard-notes")}
            >
              Create Note
            </Button>
          </div>
        ) : (
          notes.slice(0, 3).map((note) => (
            <div
              key={note.id}
              className="text-sm p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate("/plugins/dashboard-notes")}
            >
              <p className="line-clamp-2 text-gray-700 dark:text-gray-300">
                {note.content}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(note.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-gray-100 dark:border-gray-800">
        <Button
          variant="ghost"
          className="w-full text-sm justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          onClick={() => navigate("/plugins/dashboard-notes")}
        >
          Manage Notes
        </Button>
      </div>
    </Card>
  );
};

// --- Page Component ---
export const NotesPage = () => {
  const { notes, loading, addNote, deleteNote } = useNotes();
  const [newNote, setNewNote] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    addNote(newNote);
    setNewNote("");
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Dashboard Notes</h1>
        <Badge variant="info">{notes.length} Notes</Badge>
      </div>

      <Card className="mb-8">
        <form onSubmit={handleSubmit} className="flex gap-4 items-start">
          <div className="flex-1">
            <Input
              placeholder="Write a new note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={!newNote.trim()}
            className="whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Note
          </Button>
        </form>
      </Card>

      <Card>
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader />
          </div>
        ) : (
          <Table>
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-3 font-semibold text-gray-900 dark:text-gray-100">
                  Content
                </th>
                <th className="text-left w-48 p-3 font-semibold text-gray-900 dark:text-gray-100">
                  Created At
                </th>
                <th className="text-right w-24 p-3 font-semibold text-gray-900 dark:text-gray-100">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {notes.map((note) => (
                <tr
                  key={note.id}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="p-3 text-gray-800 dark:text-gray-200">
                    {note.content}
                  </td>
                  <td className="text-gray-500 dark:text-gray-400 text-sm p-3">
                    {new Date(note.createdAt).toLocaleString()}
                  </td>
                  <td className="text-right p-3">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteNote(note.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {notes.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="text-center py-12 text-gray-500 dark:text-gray-400"
                  >
                    No notes found. Add one above!
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
};
