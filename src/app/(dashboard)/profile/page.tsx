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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 pb-12">
      <h1 className="text-3xl font-mono font-bold text-stone-900 tracking-tight mb-2">
        Your Profile
      </h1>
      <p className="text-stone-600 font-mono text-sm mb-8">
        Manage your personal information and learning preferences.
      </p>

      {message.text && (
        <div className={`p-4 rounded-xl mb-6 font-mono text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl shadow-orange-500/5 border border-orange-200/80 p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Profile Picture section */}
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-mono font-bold overflow-hidden border-2 border-white shadow-md shrink-0 relative group">
              {formData.profilePicture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={formData.profilePicture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">{formData.name ? formData.name.charAt(0).toUpperCase() : 'U'}</span>
              )}
            </div>
            <div className="flex-1 w-full space-y-1.5">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-stone-700">Profile Picture URL</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ImageIcon className="h-4 w-4 text-orange-400" />
                </div>
                <input
                  type="url"
                  name="profilePicture"
                  value={formData.profilePicture}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-2.5 border border-orange-200 rounded-xl bg-stone-50/50 text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm placeholder:text-stone-400 placeholder:text-xs"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
              <p className="text-xs font-mono text-stone-400">Provide a direct URL for your avatar image.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-stone-700">Full Name</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              className="block w-full px-3.5 py-2.5 border border-orange-200 rounded-xl bg-stone-50/50 text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-stone-700">Bio</label>
            <textarea
              name="bio"
              rows={3}
              value={formData.bio}
              onChange={handleInputChange}
              className="block w-full px-3.5 py-2.5 border border-orange-200 rounded-xl bg-stone-50/50 text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm placeholder:text-stone-400 placeholder:text-xs resize-none"
              placeholder="Tell us a bit about yourself..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-stone-700">Learning Goal</label>
            <textarea
              name="learningGoal"
              rows={2}
              value={formData.learningGoal}
              onChange={handleInputChange}
              className="block w-full px-3.5 py-2.5 border border-orange-200 rounded-xl bg-stone-50/50 text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm placeholder:text-stone-400 placeholder:text-xs resize-none"
              placeholder="What do you want to achieve?"
            />
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-orange-100">
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2.5 border border-rose-200 text-rose-600 rounded-xl font-mono font-bold text-sm hover:bg-rose-50 transition-colors disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete Account
            </button>
            
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-mono font-bold text-sm shadow-md hover:shadow-orange-500/20 transition-all disabled:opacity-50"
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
