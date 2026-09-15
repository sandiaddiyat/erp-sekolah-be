export type SchoolStatus = "trial" | "active" | "suspended";

export type School = {
  id: string;
  name: string;
  slug: string;
  npsn: string | null;
  level: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  status: SchoolStatus;
  active_until: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SchoolWithCounts = School & {
  user_count: number;
  role_count: number;
  notes: string;
};

export type Profile = {
  id: string;
  school_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  jabatan: string | null;
  is_active: boolean;
  is_super_admin: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Role = {
  id: string;
  school_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
};

export type Permission = {
  id: string;
  module: string;
  action: string;
  slug: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type RoleWithCounts = Role & {
  permission_count: number;
  user_count: number;
};

export type UserWithRoles = Profile & {
  roles: Pick<Role, "id" | "name" | "slug">[];
};

export type CurrentUser = {
  id: string;
  email: string | null;
  profile: Profile;
  school: School | null;
  roles: Pick<Role, "id" | "name" | "slug">[];
  permissions: string[];
  isSuperAdmin: boolean;
};

/** Hasil kembalian standar untuk semua Server Action (form submission). */
export type FormState = { error?: string; success?: string } | undefined;

