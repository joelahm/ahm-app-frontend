import { SettingsCitationDatabaseContent } from "@/components/dashboard/settings/settings-citation-database-content";
import { SettingsAdminOnlyGuard } from "@/components/dashboard/settings/settings-admin-only-guard";
import { SettingsAside } from "@/components/dashboard/settings/settings-aside";

const SettingsCitationDatabasePage = () => {
  return (
    <section className="relative pl-64">
      <SettingsAdminOnlyGuard />
      <SettingsAside activeKey="citation-database" />
      <div className="pl-6">
        <SettingsCitationDatabaseContent />
      </div>
    </section>
  );
};

export default SettingsCitationDatabasePage;
