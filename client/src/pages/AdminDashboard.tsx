import { useState, useEffect } from "react";
import { Shield, Users, ChevronDown } from "lucide-react";
import { useStore, authFetch } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

export default function AdminDashboard() {
  const { toast } = useToast();
  const { userId: adminUserId } = useStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      const res = await authFetch("/api/admin/users", { headers: { "x-user-id": adminUserId || "" } });
      const data = await res.json();
      setUsers(data);
    } catch {
      toast({ title: "Failed to load users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      const res = await authFetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": adminUserId || "" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed");
      await loadUsers();
      toast({ title: `Role updated to ${role}` });
    } catch {
      toast({ title: "Failed to update role", variant: "destructive" });
    }
  };

  const handleCoachAssign = async (userId: string, coachId: string) => {
    try {
      const res = await authFetch(`/api/admin/users/${userId}/coach`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-id": adminUserId || "" },
        body: JSON.stringify({ coachId: coachId || null }),
      });
      if (!res.ok) throw new Error("Failed");
      await loadUsers();
      toast({ title: coachId ? "Coach assigned" : "Coach removed" });
    } catch {
      toast({ title: "Failed to assign coach", variant: "destructive" });
    }
  };

  const coaches = users.filter((u) => u.role === "coach" || u.role === "admin");
  const adminCount = users.filter((u) => u.role === "admin").length;
  const coachCount = users.filter((u) => u.role === "coach").length;
  const clientCount = users.filter((u) => u.role === "client").length;

  return (
    <div className="p-5 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#1e3a5f]/10 rounded-xl flex items-center justify-center">
          <Shield className="text-[#1e3a5f]" size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900" data-testid="text-admin-title">Admin Dashboard</h1>
          <p className="text-xs text-gray-400">{users.length} total users</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-[#1e3a5f]" data-testid="text-admin-count">{adminCount}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Admins</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-[#c41e3a]" data-testid="text-coach-count">{coachCount}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Coaches</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-[#8fbc8f]" data-testid="text-client-count">{clientCount}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Clients</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading users...</div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="glass-card rounded-xl p-4" data-testid={`card-user-${u.id}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 text-sm truncate" data-testid={`text-username-${u.id}`}>
                    {u.name || u.firstName || u.username || "Unnamed"}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{u.email || "No email"}</p>
                  {u.createdAt && (
                    <p className="text-[10px] text-gray-300 mt-0.5">
                      Joined {new Date(u.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="relative ml-2">
                  <select
                    data-testid={`select-role-${u.id}`}
                    value={u.role || "client"}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 pr-7 text-xs font-medium text-gray-700 cursor-pointer focus:outline-none focus:border-[#1e3a5f]"
                  >
                    <option value="admin">Admin</option>
                    <option value="coach">Coach</option>
                    <option value="client">Client</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {u.role === "client" && (
                <div className="border-t border-gray-100 pt-2">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Assign Coach</label>
                  <select
                    data-testid={`select-coach-${u.id}`}
                    value={u.coachId || ""}
                    onChange={(e) => handleCoachAssign(u.id, e.target.value)}
                    className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 cursor-pointer focus:outline-none focus:border-[#1e3a5f]"
                  >
                    <option value="">No coach assigned</option>
                    {coaches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || c.firstName || c.username || "Coach"} ({c.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
