import { useState } from "react";
import { useStore } from "@/lib/store";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { triggerHaptic } from "@/lib/capacitor";

const AUTH_VIDEOS = [
  "/videos/nepali_bg_loop.mp4",
  "/videos/sherpa_training.mp4",
  "/videos/pixar_climbing.mp4",
];

export default function AuthPage() {
  const { loginUser } = useStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoIdx] = useState(() => Math.floor(Math.random() * AUTH_VIDEOS.length));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    triggerHaptic('medium');
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body: any = { username: username.trim().toLowerCase(), password };
      if (mode === "register") body.name = name.trim() || username.trim();
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        triggerHaptic('error');
        throw new Error(data.message || "Something went wrong");
      }
      triggerHaptic('success');
      loginUser(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-fullscreen" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100dvh", background: "#000", overflow: "hidden" }} data-testid="auth-page">
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.35 }}
      >
        <source src={AUTH_VIDEOS[videoIdx]} type="video/mp4" />
      </video>

      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 45%, rgba(0,0,0,0.2) 100%)", zIndex: 10 }} />

      <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex", flexDirection: "column" }}>
        <motion.div
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingBottom: 20 }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <img
            src="/images/sherpafit_logo_new.png"
            alt="SherpaFit"
            style={{ width: 80, height: "auto", marginBottom: 12, filter: "drop-shadow(0 4px 20px rgba(0,0,0,0.5))" }}
            data-testid="img-logo-auth"
          />
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "#fff",
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
            data-testid="text-app-title"
          >
            {mode === "login" ? "Welcome Back" : "Join SherpaFit"}
          </h1>
        </motion.div>

        <motion.div
          className="safe-pad-bottom"
          style={{ flexShrink: 0, padding: "0 20px", paddingBottom: 20 }}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div style={{
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 24,
            padding: 20,
          }}>
            <div style={{ display: "flex", background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: 3, marginBottom: 16 }} data-testid="auth-mode-toggle">
              <button
                onClick={() => { triggerHaptic('selection'); setMode("login"); setError(null); }}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", transition: "all 0.2s",
                  background: mode === "login" ? "#fff" : "transparent",
                  color: mode === "login" ? "#000" : "rgba(255,255,255,0.5)",
                  boxShadow: mode === "login" ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
                }}
                data-testid="tab-login"
              >
                Sign In
              </button>
              <button
                onClick={() => { triggerHaptic('selection'); setMode("register"); setError(null); }}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", transition: "all 0.2s",
                  background: mode === "register" ? "#fff" : "transparent",
                  color: mode === "register" ? "#000" : "rgba(255,255,255,0.5)",
                  boxShadow: mode === "register" ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
                }}
                data-testid="tab-register"
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {mode === "register" && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>Display Name</label>
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                    style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 15, color: "#fff", outline: "none", boxSizing: "border-box" }}
                    data-testid="input-name"
                  />
                </div>
              )}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>Username</label>
                <input
                  type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" autoComplete="username"
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 15, color: "#fff", outline: "none", boxSizing: "border-box" }}
                  data-testid="input-username"
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    style={{ width: "100%", padding: "12px 44px 12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 15, color: "#fff", outline: "none", boxSizing: "border-box" }}
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => { triggerHaptic('light'); setShowPassword(!showPassword); }}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", padding: 0 }}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {error && (
                <div style={{ fontSize: 13, color: "#fca5a5", background: "rgba(239,68,68,0.1)", padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(239,68,68,0.2)", marginBottom: 12 }} data-testid="text-error">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading || !username || !password}
                style={{
                  width: "100%", padding: "14px 0", borderRadius: 14,
                  background: loading || !username || !password ? "rgba(255,255,255,0.3)" : "#fff",
                  color: "#000", fontWeight: 700, fontSize: 15, border: "none",
                  cursor: loading || !username || !password ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.3)", marginTop: 4, transition: "all 0.2s",
                }}
                data-testid="button-submit"
              >
                {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : mode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
