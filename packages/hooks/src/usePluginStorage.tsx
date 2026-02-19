import { useCallback, useState } from '@jasper/elements';

interface StorageUploadResult {
    success: boolean;
    uri: string;
    url: string;
}

interface StorageListResult {
    files: string[];
}

export function usePluginStorage(pluginId: string) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getUrl = useCallback(
        (filename: string) => {
            return `/api/plugins/${pluginId}/storage/${filename}`;
        },
        [pluginId],
    );

    const list = useCallback(async (): Promise<string[]> => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/plugins/${pluginId}/storage`);
            if (!response.ok) throw new Error('Failed to list files');
            const data: StorageListResult = await response.json();
            return data.files;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            return [];
        } finally {
            setLoading(false);
        }
    }, [pluginId]);

    const upload = useCallback(
        async (file: File): Promise<StorageUploadResult> => {
            setLoading(true);
            setError(null);
            try {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch(`/api/plugins/${pluginId}/storage`, {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) throw new Error('Failed to upload file');
                return await response.json();
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Unknown error';
                setError(msg);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [pluginId],
    );

    const remove = useCallback(
        async (filename: string): Promise<void> => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/plugins/${pluginId}/storage/${filename}`, {
                    method: 'DELETE',
                });

                if (!response.ok) throw new Error('Failed to delete file');
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Unknown error';
                setError(msg);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [pluginId],
    );

    return {
        loading,
        error,
        getUrl,
        list,
        upload,
        delete: remove,
    };
}
