"use client";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { UserCircle, Save, Trash2, Loader2, Image as ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Profile() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const [formData, setFormData] = useState({
    name: "",
    profilePicture: "",
    bio: "",
    learningGoal: ""
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await fetch("/api/user");
        if (res.ok) {
          const data = await res.json();
          setFormData({
            name: data.user.name || "",
            profilePicture: data.user.profilePicture || "",
            bio: data.user.bio || "",
            learningGoal: data.user.learningGoal || ""
          });
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user?.id) {
      fetchUserProfile();
    }
  }, [session]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ text: "", type: "" });

    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ text: "Profile updated successfully!", type: "success" });
        // Force NextAuth to update session data
        await update({ name: formData.name });
      } else {
        setMessage({ text: data.message || "Failed to update profile", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "An error occurred while updating", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const res = await fetch("/api/user", {
        method: "DELETE",
      });

      if (res.ok) {
        signOut({ callbackUrl: "/sign-up" });
      } else {
        const data = await res.json();
        setMessage({ text: data.message || "Failed to delete account", type: "error" });
        setIsDeleting(false);
      }
    } catch (error) {
      setMessage({ text: "An error occurred while deleting account", type: "error" });
      setIsDeleting(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
    );
  }

  return (
      <div className="max-w-3xl mx-auto pb-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Your Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Manage your personal information and learning preferences.
        </p>

        {message.text && (
          <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Profile Picture section */}
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm shrink-0 relative group">
                {formData.profilePicture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={formData.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">{formData.name ? formData.name.charAt(0).toUpperCase() : 'U'}</span>
                )}
              </div>
              <div className="flex-1 w-full space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Profile Picture URL</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ImageIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="url"
                    name="profilePicture"
                    value={formData.profilePicture}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white sm:text-sm"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
                <p className="text-xs text-gray-500">Provide a URL for your avatar image.</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white sm:text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bio</label>
              <textarea
                name="bio"
                rows={3}
                value={formData.bio}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white sm:text-sm"
                placeholder="Tell us a bit about yourself..."
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Learning Goal</label>
              <textarea
                name="learningGoal"
                rows={2}
                value={formData.learningGoal}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white sm:text-sm"
                placeholder="What do you want to achieve?"
              />
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-800">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 border border-red-300 dark:border-red-900 text-red-700 dark:text-red-400 rounded-md shadow-sm hover:bg-red-50 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete Account
              </button>
              
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 border border-transparent text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
  );
}
