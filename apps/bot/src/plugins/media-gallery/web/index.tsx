import { React, useState, useEffect, FormEvent, ReactRouterDOM } from '@jasper/elements';

import { Card, Button, Input } from '@jasper/ui';
import { usePluginStorage } from '@jasper/hooks';

const PLUGIN_ID = 'media-gallery';

function GalleryWidget() {
    const { list, getUrl, loading } = usePluginStorage(PLUGIN_ID);
    const [images, setImages] = useState<string[]>([]);
    const navigate = ReactRouterDOM.useNavigate();

    useEffect(() => {
        list().then(files => {
            // Filter for images and take top 3
            const imgs = files.filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f)).slice(0, 3);
            setImages(imgs);
        });
    }, [list]);

    if (loading && images.length === 0) return <Card>Loading gallery...</Card>;

    return (
        <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Recent Media</h3>
                <button
                    onClick={() => navigate('/plugins/media-gallery')}
                    className="text-sm text-blue-500 hover:underline bg-transparent border-0 p-0 cursor-pointer"
                >
                    View All
                </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {images.length > 0 ? (
                    images.map(img => (
                        <div key={img} className="aspect-square rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800">
                            <img src={getUrl(img)} alt={img} className="w-full h-full object-cover" />
                        </div>
                    ))
                ) : (
                    <div className="col-span-3 text-center text-gray-500 py-4">No images yet</div>
                )}
            </div>
        </Card>
    );
}

function GalleryPage() {
    const { list, upload, delete: remove, getUrl, loading, error } = usePluginStorage(PLUGIN_ID);
    const [files, setFiles] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    const refresh = () => {
        list().then(setFiles);
    };

    useEffect(() => {
        refresh();
    }, [list]);

    const handleUpload = async (e: FormEvent<HTMLInputElement>) => {
        const file = e.currentTarget.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            await upload(file);
            refresh();
        } catch (err) {
            console.error(err);
        } finally {
            setUploading(false);
            e.currentTarget.value = ''; // Reset input
        }
    };

    const handleDelete = async (filename: string) => {
        if (!confirm(`Delete ${filename}?`)) return;
        try {
            await remove(filename);
            refresh();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Media Gallery</h1>
                <div className="relative">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleUpload}
                        className="hidden"
                        id="gallery-upload"
                        disabled={uploading}
                    />
                    <label
                        htmlFor="gallery-upload"
                        className={`px-4 py-2 rounded-md bg-blue-600 text-white cursor-pointer hover:bg-blue-700 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {uploading ? 'Uploading...' : 'Upload Image'}
                    </label>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
                    {error}
                </div>
            )}

            {loading && files.length === 0 ? (
                <div className="text-center py-12">Loading...</div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {files.map(file => (
                        <div key={file} className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                            <img src={getUrl(file)} alt={file} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <a
                                    href={getUrl(file)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm"
                                    title="View full size"
                                >
                                    View
                                </a>
                                <button
                                    onClick={() => handleDelete(file)}
                                    className="p-2 bg-red-500/80 hover:bg-red-600/80 rounded-full text-white backdrop-blur-sm"
                                    title="Delete"
                                >
                                    Delete
                                </button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 text-white text-xs truncate">
                                {file}
                            </div>
                        </div>
                    ))}
                    {files.length === 0 && !loading && (
                        <div className="col-span-full text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                            No images found. Upload one to get started!
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export { GalleryWidget, GalleryPage };
