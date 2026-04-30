import { SettingsAside } from "@/components/dashboard/settings/settings-aside";
import { SettingsAdminOnlyGuard } from "@/components/dashboard/settings/settings-admin-only-guard";
import { SettingsNotificationsContent } from "@/components/dashboard/settings/settings-notifications-content";

const SettingsNotifications = () => {
  return (
    <section className="relative pl-64">
      <SettingsAdminOnlyGuard />
      <SettingsAside activeKey="notifications" />
      <div className="pl-6">
        <SettingsNotificationsContent />
      </div>
    </section>
  );
};

export default SettingsNotifications;
