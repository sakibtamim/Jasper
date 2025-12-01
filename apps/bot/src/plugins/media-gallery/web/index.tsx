import { React, useState, useEffect, FormEvent, ReactRouterDOM } from '@jasper/elements';

import { Card, Button, Input, Loader } from '@jasper/ui';
import { usePluginStorage } from '@jasper/hooks';
import { Upload, ExternalLink, Trash2 } from 'lucide-react';

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
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Media Gallery</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your plugin assets</p>
                </div>
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
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white cursor-pointer hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Upload className="w-4 h-4" />
                        <span className="font-medium">{uploading ? 'Uploading...' : 'Upload Image'}</span>
                    </label>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2">
                    <span className="font-bold">Error:</span> {error}
                </div>
            )}

            {loading && files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Loader className="w-8 h-8 mb-4 text-blue-500" />
                    <p>Loading your gallery...</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {files.map(file => (
                        <div key={file} className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300">
                            <img src={getUrl(file)} alt={file} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />

                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3 p-4">
                                <div className="flex gap-2">
                                    <a
                                        href={getUrl(file)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors"
                                        title="View full size"
                                    >
                                        <ExternalLink className="w-5 h-5" />
                                    </a>
                                    <button
                                        onClick={() => handleDelete(file)}
                                        className="p-2.5 bg-red-500/80 hover:bg-red-600/80 rounded-full text-white backdrop-blur-md transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                                <p className="text-white/90 text-xs font-medium truncate w-full text-center px-2">
                                    {file}
                                </p>
                            </div>
                        </div>
                    ))}
                    {files.length === 0 && !loading && (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
                            <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                <Upload className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-lg font-medium">No images yet</p>
                            <p className="text-sm mt-1">Upload an image to get started</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export { GalleryWidget, GalleryPage };
