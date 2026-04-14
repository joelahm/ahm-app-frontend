import { SettingsAside } from "@/components/dashboard/settings/settings-aside";
import { SettingsAdminOnlyGuard } from "@/components/dashboard/settings/settings-admin-only-guard";
import { SettingsUsersTable } from "@/components/dashboard/settings/settings-users-table";

const SettingsUsers = () => {
  return (
    <section className="relative pl-64">
      <SettingsAdminOnlyGuard />
      <SettingsAside activeKey="users" />
      <div className="pl-6">
        <SettingsUsersTable />
      </div>
    </section>
  );
};

export default SettingsUsers;
