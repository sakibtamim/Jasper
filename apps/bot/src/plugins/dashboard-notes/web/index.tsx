import { useState, useEffect, FormEvent } from '@jasper/elements';
import { Card, Button, Input, Table, Badge, Loader } from '@jasper/ui';
import { Trash2, Plus, Clipboard } from 'lucide-react';

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
            const res = await fetch('/api/plugins/dashboard-notes/notes');
            const data = await res.json();
            setNotes(data.notes || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const addNote = async (content: string) => {
        await fetch('/api/plugins/dashboard-notes/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        fetchNotes();
    };

    const deleteNote = async (id: string) => {
        await fetch(`/api/plugins/dashboard-notes/notes/${id}`, {
            method: 'DELETE'
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

    return (
        <Card className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                    <Clipboard className="w-4 h-4" />
                    Quick Notes
                </h3>
                <Badge variant="info">{notes.length}</Badge>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                {loading ? (
                    <div className="flex justify-center p-4"><Loader /></div>
                ) : notes.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No notes yet.</p>
                ) : (
                    notes.slice(0, 3).map(note => (
                        <div key={note.id} className="text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700">
                            {note.content}
                        </div>
                    ))
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Button variant="ghost" className="w-full text-sm" onClick={() => window.location.href = '/plugins/dashboard-notes'}>
                    Manage Notes
                </Button>
            </div>
        </Card>
    );
};

// --- Page Component ---
export const NotesPage = () => {
    const { notes, loading, addNote, deleteNote } = useNotes();
    const [newNote, setNewNote] = useState('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;
        addNote(newNote);
        setNewNote('');
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold">Dashboard Notes</h1>
                <Badge variant="info">{notes.length} Notes</Badge>
            </div>

            <Card className="mb-8">
                <form onSubmit={handleSubmit} className="flex gap-4">
                    <Input
                        placeholder="Write a new note..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="flex-1"
                    />
                    <Button type="submit" disabled={!newNote.trim()}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Note
                    </Button>
                </form>
            </Card>

            <Card>
                {loading ? (
                    <div className="flex justify-center p-8"><Loader /></div>
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <th className="text-left">Content</th>
                                <th className="text-left w-48">Created At</th>
                                <th className="text-right w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {notes.map(note => (
                                <tr key={note.id}>
                                    <td>{note.content}</td>
                                    <td className="text-gray-500 text-sm">
                                        {new Date(note.createdAt).toLocaleString()}
                                    </td>
                                    <td className="text-right">
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
                                    <td colSpan={3} className="text-center py-8 text-gray-500">
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
