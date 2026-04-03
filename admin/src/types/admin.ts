export type AdminRole = "super_admin" | "viewer";

export type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  role: AdminRole;
  created_at: string;
  updated_at: string;
};
