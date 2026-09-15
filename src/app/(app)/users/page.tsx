import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role, UserWithRoles } from "@/lib/types";
import { UsersClient } from "./users-client";

export const metadata = { title: "User" };

type RoleRef = Pick<Role, "id" | "name" | "slug" | "school_id">;

type ProfileRow = Profile & {
  user_roles: { roles: Omit<RoleRef, "school_id"> | null }[] | null;
};

type SchoolOption = { id: string; name: string };

export default async function UsersPage() {
  const current = await requirePermission(PERMISSIONS.usersView);
  const supabase = await createClient();

  const [usersResult, rolesResult, schoolsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("*, user_roles ( roles ( id, name, slug ) )")
      .order("created_at", { ascending: true }),
    supabase.from("roles").select("id, name, slug, school_id").order("name"),
    current.isSuperAdmin
      ? supabase.from("schools").select("id, name").order("name")
      : Promise.resolve({ data: [] as SchoolOption[], error: null }),
  ]);

  const loadError = usersResult.error ?? rolesResult.error ?? schoolsResult.error;
  if (loadError) {
    return <DataError message="Gagal memuat data user." />;
  }

  const rows = (usersResult.data ?? []) as ProfileRow[];

  const users: UserWithRoles[] = rows.map(({ user_roles, ...profile }) => ({
    ...profile,
    roles: (user_roles ?? [])
      .map((item) => item.roles)
      .filter(
        (role): role is Omit<RoleRef, "school_id"> => Boolean(role)
      ),
  }));

  const roles = (rolesResult.data ?? []) as RoleRef[];
  const schools = (schoolsResult.data ?? []) as SchoolOption[];

  const permissions = {
    create: can(current.permissions, PERMISSIONS.usersCreate, current.isSuperAdmin),
    update: can(current.permissions, PERMISSIONS.usersUpdate, current.isSuperAdmin),
    delete: can(current.permissions, PERMISSIONS.usersDelete, current.isSuperAdmin),
    assignRole: can(
      current.permissions,
      PERMISSIONS.usersAssignRole,
      current.isSuperAdmin
    ),
  };

  return (
    <UsersClient
      users={users}
      roles={roles}
      schools={schools}
      isSuperAdmin={current.isSuperAdmin}
      currentSchoolId={current.profile.school_id}
      permissions={permissions}
      currentUserId={current.id}
    />
  );
}
