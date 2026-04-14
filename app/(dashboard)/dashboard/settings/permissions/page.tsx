import { SettingsAside } from "@/components/dashboard/settings/settings-aside";
import { SettingsAdminOnlyGuard } from "@/components/dashboard/settings/settings-admin-only-guard";
import { SettingsPermissionsContent } from "@/components/dashboard/settings/settings-permissions-content";

const SettingsPermissionsPage = () => {
  return (
    <section className="relative pl-64">
      <SettingsAdminOnlyGuard />
      <SettingsAside activeKey="permissions" />
      <div className="pl-6">
        <SettingsPermissionsContent />
      </div>
    </section>
  );
};

export default SettingsPermissionsPage;
