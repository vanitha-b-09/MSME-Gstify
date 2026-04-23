import { createContext, useContext, useEffect, useState } from "react";
import API from "../api/api";
import { USE_MOCKS } from "@/lib/api";
import { mock } from "@/lib/mockApi";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>(null!);

const TOKEN_KEY = "token";
const USER_KEY = "gst_auth_user";

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const boot = async () => {
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        const cachedUser = localStorage.getItem(USER_KEY);
        if (!token) return;

        // If you previously used mock mode, you'll have a mock token stored.
        // In live mode this will always 401, so clear it to avoid loops.
        if (!USE_MOCKS && token.startsWith("mock.")) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setUser(null);
          return;
        }

        if (cachedUser) {
          setUser(JSON.parse(cachedUser));
          return;
        }

        // Fallback: ask backend who we are (or decode JWT in middleware path)
        const res = await API.get("/auth/me");
        if (res?.data?.user) {
          localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
          setUser(res.data.user);
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    void boot();
  }, []);

  const login = async (email: string, password: string) => {
    const res = USE_MOCKS
      ? await mock.login(email, password)
      : (await API.post("/auth/login", { email, password })).data;

    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setUser(res.user);
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    role: string
  ) => {
    const res = USE_MOCKS
      ? await mock.signup(name, email, password, role as any)
      : (await API.post("/auth/signup", { name, email, password, role })).data;

    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);