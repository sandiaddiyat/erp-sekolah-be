import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { Permission, Role, RoleWithCounts } from "@/lib/types";
import { RolesClient } from "./roles-client";

export const metadata = { title: "Role & Hak Akses" };

export default async function RolesPage() {
  const current = await requirePermission(PERMISSIONS.rolesView);
  const supabase = await createClient();

  const [rolesResult, permissionsResult, rolePermissionsResult, userRolesResult, schoolsResult] =
    await Promise.all([
      supabase
        .from("roles")
        .select("*")
        .order("is_system", { ascending: false })
        .order("name"),
      supabase
        .from("permissions")
        .select("*")
        .order("module")
        .order("action"),
      supabase.from("role_permissions").select("role_id, permission_id"),
      supabase.from("user_roles").select("role_id"),
      current.isSuperAdmin
        ? supabase.from("schools").select("id, name").order("name")
        : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
    ]);

  const loadError =
    rolesResult.error ??
    permissionsResult.error ??
    rolePermissionsResult.error ??
    userRolesResult.error ??
    schoolsResult.error;
  if (loadError) {
    return <DataError message="Gagal memuat data role." />;
  }

  const rolePermissions: Record<string, string[]> = {};
  const permissionCount = new Map<string, number>();

  for (const row of (rolePermissionsResult.data ?? []) as {
    role_id: string;
    permission_id: string;
  }[]) {
    rolePermissions[row.role_id] = rolePermissions[row.role_id] ?? [];
    rolePermissions[row.role_id].push(row.permission_id);
    permissionCount.set(
      row.role_id,
      (permissionCount.get(row.role_id) ?? 0) + 1
    );
  }

  const userCount = new Map<string, number>();
  for (const row of (userRolesResult.data ?? []) as { role_id: string }[]) {
    userCount.set(row.role_id, (userCount.get(row.role_id) ?? 0) + 1);
  }

  const roles: RoleWithCounts[] = ((rolesResult.data ?? []) as Role[]).map(
    (role) => ({
      ...role,
      permission_count: permissionCount.get(role.id) ?? 0,
      user_count: userCount.get(role.id) ?? 0,
    })
  );

  const canUpdate = can(
    current.permissions,
    PERMISSIONS.rolesUpdate,
    current.isSuperAdmin
  );

  return (
    <RolesClient
      roles={roles}
      permissions={(permissionsResult.data ?? []) as Permission[]}
      rolePermissions={rolePermissions}
      schools={(schoolsResult.data ?? []) as { id: string; name: string }[]}
      isSuperAdmin={current.isSuperAdmin}
      abilities={{
        create: can(
          current.permissions,
          PERMISSIONS.rolesCreate,
          current.isSuperAdmin
        ),
        update: canUpdate,
        delete: can(
          current.permissions,
          PERMISSIONS.rolesDelete,
          current.isSuperAdmin
        ),
      }}
      canAssignRole={canUpdate}
    />
  );
}
