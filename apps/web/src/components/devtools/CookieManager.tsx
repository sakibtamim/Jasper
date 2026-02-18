import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button, Input, Badge, Card } from "@jasper/ui";
import { formatDistanceToNow } from "date-fns";

interface Cookie {
  id: number;
  name: string;
  isActive: boolean;
  successCount: number;
  failureCount: number;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
}

export const CookieManager: React.FC = () => {
  const [cookies, setCookies] = useState<Cookie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCookieName, setNewCookieName] = useState("");
  const [newCookieContent, setNewCookieContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchCookies = async () => {
    try {
      const response = await fetch("/api/devtools/cookies");
      if (!response.ok) throw new Error("Failed to fetch cookies");
      const data = await response.json();
      setCookies(data.cookies);
    } catch (err) {
      setError("Failed to load cookies");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchCookies();
  }, []);

  const handleAddCookie = async () => {
    console.log("Adding cookie...");
    if (!newCookieName || !newCookieContent) return;

    try {
      const response = await fetch("/api/devtools/cookies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCookieName,
          content: newCookieContent,
        }),
      });

      if (!response.ok) throw new Error("Failed to add cookie");

      setNewCookieName("");
      setNewCookieContent("");
      setIsAddDialogOpen(false);
      fetchCookies();
    } catch (err) {
      setError("Failed to add cookie");
      console.error(err);
    }
  };

  const handleDeleteCookie = async (id: number) => {
    if (!confirm("Are you sure you want to delete this cookie?")) return;

    try {
      const response = await fetch(`/api/devtools/cookies/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete cookie");

      fetchCookies();
    } catch (err) {
      setError("Failed to delete cookie");
      console.error(err);
    }
  };

  const handleToggleCookie = async (id: number, enabled: boolean) => {
    try {
      const response = await fetch(`/api/devtools/cookies/${id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) throw new Error("Failed to toggle cookie");

      fetchCookies();
    } catch (err) {
      setError("Failed to toggle cookie");
      console.error(err);
    }
  };

  const getSuccessRate = (success: number, failure: number) => {
    const total = success + failure;
    if (total === 0) return "N/A";
    return `${((success / total) * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            YouTube Cookies
          </h2>
          <p className="text-muted-foreground text-gray-500 dark:text-gray-400 mt-1">
            Manage cookies for yt-dlp to bypass "Sign in to confirm you’re not a
            bot" errors.
          </p>
        </div>
        <Button
          onClick={() => {
            console.log("Opening add dialog");
            setIsAddDialogOpen(true);
          }}
          className="shrink-0"
        >
          Add Cookie
        </Button>
      </div>

      {/* Modal Overlay using Portal to escape stacking contexts */}
      {mounted &&
        isAddDialogOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              backgroundColor: "rgba(0,0,0,0.6)",
            }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Add New Cookie
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Paste your Netscape-formatted cookies below.
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Friendly Name
                  </label>
                  <Input
                    id="name"
                    placeholder="e.g. Premium Account (Chrome)"
                    value={newCookieName}
                    onChange={(e) => setNewCookieName(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="content"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Cookie Content
                  </label>
                  <textarea
                    id="content"
                    placeholder="# Netscape HTTP Cookie File&#10;.youtube.com	TRUE	/	FALSE	1735689600	VISITOR_INFO1_LIVE	..."
                    className="w-full h-48 p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-mono focus:ring-2 focus:ring-brand-primary focus:border-transparent resize-none"
                    value={newCookieContent}
                    onChange={(e) => setNewCookieContent(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <span className="inline-block w-4 h-4 bg-blue-100 text-blue-600 rounded-full text-center leading-4 font-bold text-[10px]">
                      i
                    </span>
                    Export using a "Get cookies.txt" extension for your browser.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddCookie}
                  disabled={!newCookieName || !newCookieContent}
                >
                  Save Cookie
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 p-4 rounded-lg text-sm flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5 shrink-0"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </div>
      )}

      <Card className="overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Stored Cookies
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Active cookies will be rotated automatically during playback.
          </p>
        </div>
        <div className="overflow-x-auto">
          {/* Using native HTML table to ensure correct layout */}
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-900/50 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Success Rate
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Usage
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Last Used
                </th>
                <th scope="col" className="px-6 py-3 font-medium text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {cookies.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-2xl">
                        🍪
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        No cookies found
                      </p>
                      <p className="text-sm text-gray-500">
                        Add a cookie to improve playback reliability.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                cookies.map((cookie) => (
                  <tr
                    key={cookie.id}
                    className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {cookie.name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            handleToggleCookie(cookie.id, !cookie.isActive)
                          }
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 ${cookie.isActive ? "bg-brand-primary" : "bg-gray-200 dark:bg-gray-700"}`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${cookie.isActive ? "translate-x-5" : "translate-x-1"}`}
                          />
                        </button>
                        <span
                          className={`text-xs font-medium ${cookie.isActive ? "text-green-600 dark:text-green-400" : "text-gray-500"}`}
                        >
                          {cookie.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          cookie.failureCount === 0 && cookie.successCount > 0
                            ? "success"
                            : cookie.failureCount > cookie.successCount
                              ? "error"
                              : "default"
                        }
                        className="font-mono"
                      >
                        {getSuccessRate(
                          cookie.successCount,
                          cookie.failureCount,
                        )}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm font-mono">
                        <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          {cookie.successCount}
                        </span>
                        <span className="text-gray-300 dark:text-gray-600">
                          /
                        </span>
                        <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          {cookie.failureCount}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {cookie.lastUsed
                        ? formatDistanceToNow(new Date(cookie.lastUsed), {
                            addSuffix: true,
                          })
                        : "Never"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteCookie(cookie.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
